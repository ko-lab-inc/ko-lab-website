import fs from 'node:fs'

import { expect, test, type APIRequestContext } from '@playwright/test'

/**
 * Invitation + CRUD utilisateurs — étape 2/3 (migration 0045).
 *
 * ---------------------------------------------------------------------------
 * CE QUE CE FICHIER PROUVE
 *
 * L'écran unifié /admin/utilisateurs (filtre par rôle, bouton d'invitation) ;
 * une invitation crée un compte avec le rôle choisi (pas 'client' par
 * défaut), refuse un courriel déjà utilisé ; le lien d'invitation mène à
 * /mot-de-passe/nouveau (pas /connexion, l'ancien cul-de-sac) où la case de
 * consentement apparaît pour un compte qui n'a jamais consenti et se valide
 * réellement côté serveur ; un compte qui a déjà consenti ne la revoit pas à
 * une vraie réinitialisation ; le rate limit répond une erreur lisible.
 *
 * Comptes de test toujours @ko-lab.test (domaine réservé IANA, ne résout
 * jamais) — Resend accepte l'envoi (preuve que le mécanisme fonctionne),
 * la livraison elle-même échoue silencieusement, aucune boîte réelle n'est
 * jamais visée.
 * ---------------------------------------------------------------------------
 */

const env: Record<string, string> = {}
for (const ligne of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = ligne.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m?.[1]) env[m[1]] = (m[2] ?? '').replace(/^['"]|['"]$/g, '')
}

function variable(nom: string): string {
  const valeur = env[nom]
  if (!valeur) throw new Error(`${nom} absente de .env.local — requise pour invitation-utilisateurs.spec.ts`)
  return valeur
}

const SUPABASE_URL = variable('NEXT_PUBLIC_SUPABASE_URL')
const ANON_KEY = variable('NEXT_PUBLIC_SUPABASE_ANON_KEY')
const CLE_SERVICE = variable('SUPABASE_SERVICE_ROLE_KEY')
const MOT_DE_PASSE_ADMIN = 'Zz!' + Math.random().toString(36).slice(2) + 'Aa9'

const enTeteService = {
  apikey: CLE_SERVICE,
  Authorization: `Bearer ${CLE_SERVICE}`,
  'Content-Type': 'application/json',
  'User-Agent': 'node',
}

const comptesADetruire: string[] = []

test.afterEach(async ({ request }) => {
  for (const id of comptesADetruire.splice(0)) {
    await request.delete(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, { headers: enTeteService }).catch(() => {})
  }
})

async function creerCompte(
  request: APIRequestContext,
  prefixe: string,
  role: string,
  // `false` reproduit l'état exact d'un compte créé par inviterUtilisateur
  // (createUser({ email_confirm: false })) — nécessaire pour tester
  // generateLink(type:'invite') dessus : confirmé empiriquement pendant la
  // mise au point que Supabase refuse ce type pour un compte DÉJÀ confirmé
  // (« email_exists »), même s'il n'a jamais reçu de vraie invitation.
  emailConfirme = true,
) {
  const email = `zzaudit_${prefixe}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@ko-lab.test`
  const rep = await request.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: enTeteService,
    data: { email, password: MOT_DE_PASSE_ADMIN, email_confirm: emailConfirme },
  })
  const corps = await rep.json()
  if (!corps.id) throw new Error(`création du compte impossible : ${JSON.stringify(corps)}`)
  comptesADetruire.push(corps.id)
  if (role !== 'client') {
    await request.patch(`${SUPABASE_URL}/rest/v1/profils?id=eq.${corps.id}`, {
      headers: enTeteService,
      data: { role },
    })
  }
  return { id: corps.id as string, email }
}

async function connecterAdmin(page: import('@playwright/test').Page, email: string) {
  await page.goto('/fr/connexion')
  await page.getByLabel(/Courriel/i).fill(email)
  await page.getByLabel('Mot de passe', { exact: true }).fill(MOT_DE_PASSE_ADMIN)
  await page.getByRole('button', { name: /^Se connecter$/ }).click()
  await page.waitForURL('**/admin', { timeout: 10_000 })
}

test.describe('écran unifié + invitation', () => {
  test('filtre par rôle survit au rechargement, invitation crée un compte avec le bon rôle, refuse un doublon', async ({
    page,
    request,
  }) => {
    const admin = await creerCompte(request, 'admin', 'admin')
    await connecterAdmin(page, admin.email)

    // ---------------------------- Filtre par rôle ----------------------------
    // Scopé au nav du filtre : « Vendeurs » existe aussi dans la barre latérale
    // (lien direct vers /admin/vendeurs), ambigu en `getByRole` seul.
    await page.goto('/fr/admin/utilisateurs')
    const navFiltre = page.getByLabel('Filtrer les comptes par rôle')
    await expect(navFiltre.getByRole('link', { name: 'Vendeurs' })).not.toHaveAttribute('aria-current', 'page')
    await navFiltre.getByRole('link', { name: 'Vendeurs' }).click()
    await expect(page).toHaveURL(/\?role=vendeur/)
    await page.reload()
    await expect(page).toHaveURL(/\?role=vendeur/)
    await expect(navFiltre.getByRole('link', { name: 'Vendeurs' })).toHaveAttribute('aria-current', 'page')

    // ---------------------------- Invitation — rôle choisi ----------------------------
    const emailInvite = `zzaudit_invite_${Date.now()}@ko-lab.test`
    await page.getByRole('button', { name: /^Inviter un utilisateur$/ }).click()
    const modal = page.locator('dialog[open]')
    await expect(modal).toBeVisible()
    await modal.getByLabel('Courriel').fill(emailInvite)
    await modal.getByLabel('Rôle').selectOption('vendeur')
    await modal.getByRole('button', { name: /^Envoyer l.invitation$/ }).click()

    await expect(modal.getByText('Invitation envoyée')).toBeVisible({ timeout: 15_000 })

    let idInvite: string | undefined
    await expect(async () => {
      const rep = await request.get(
        `${SUPABASE_URL}/rest/v1/profils?select=id,role&email=eq.${encodeURIComponent(emailInvite)}`,
        { headers: enTeteService },
      )
      const lignes = await rep.json()
      expect(lignes.length).toBe(1)
      expect(lignes[0].role).toBe('vendeur')
      idInvite = lignes[0].id
    }).toPass({ timeout: 10_000 })
    if (idInvite) comptesADetruire.push(idInvite)

    // invited_at doit être posé — c'est le signal qui distingue une
    // invitation d'une inscription publique (voir la reconnaissance).
    const repAuth = await request.get(`${SUPABASE_URL}/auth/v1/admin/users/${idInvite}`, { headers: enTeteService })
    const utilisateurAuth = await repAuth.json()
    expect(utilisateurAuth.invited_at, 'invited_at doit être posé pour un compte créé par invitation').toBeTruthy()
    expect(utilisateurAuth.email_confirmed_at, "pas encore activé avant le clic sur le lien").toBeFalsy()

    // ---------------------------- Doublon refusé ----------------------------
    // Ferme puis rouvre : ContenuInvitation est remonté à chaque ouverture
    // (voir ModaleInvitation.tsx) pour repartir d'un formulaire vide plutôt
    // que du message de succès de l'invitation précédente.
    await page.keyboard.press('Escape')
    await expect(modal).toBeHidden()
    await page.getByRole('button', { name: /^Inviter un utilisateur$/ }).click()
    await expect(modal).toBeVisible()
    await modal.getByLabel('Courriel').fill(emailInvite)
    await modal.getByLabel('Rôle').selectOption('livreur')
    await modal.getByRole('button', { name: /^Envoyer l.invitation$/ }).click()
    await expect(modal.getByText(/existe déjà/i)).toBeVisible({ timeout: 10_000 })

    // Le rôle du compte existant ne doit pas avoir bougé suite à la tentative refusée.
    const repApresDoublon = await request.get(`${SUPABASE_URL}/rest/v1/profils?select=role&id=eq.${idInvite}`, {
      headers: enTeteService,
    })
    expect((await repApresDoublon.json())[0].role).toBe('vendeur')
  })
})

test.describe('consentement à la pose du mot de passe', () => {
  test("compte invité : la case apparaît, refuse sans cocher, écrit consentement_le/version en cochant", async ({
    page,
    request,
  }) => {
    const compte = await creerCompte(request, 'consentinvite', 'client', false)

    // consentement_le doit déjà être NULL (posé uniquement par handle_new_user, id+email) —
    // condition de départ du test, vérifiée plutôt que supposée.
    const avant = await request.get(`${SUPABASE_URL}/rest/v1/profils?select=consentement_le&id=eq.${compte.id}`, {
      headers: enTeteService,
    })
    expect((await avant.json())[0].consentement_le).toBeNull()

    // Simule le clic sur le lien reçu par courriel : un jeton d'invitation
    // frais pour ce compte, consommé par /api/auth/confirmer comme un vrai
    // clic le ferait.
    const repLien = await request.post(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
      headers: enTeteService,
      data: { type: 'invite', email: compte.email },
    })
    const lien = await repLien.json()
    const tokenHash = lien.hashed_token ?? lien.properties?.hashed_token
    expect(tokenHash, `jeton introuvable dans la réponse : ${JSON.stringify(lien)}`).toBeTruthy()

    await page.goto(
      `/api/auth/confirmer?token_hash=${tokenHash}&type=invite&suivant=${encodeURIComponent('/fr/mot-de-passe/nouveau')}`,
    )
    await expect(page).toHaveURL(/\/mot-de-passe\/nouveau/)
    await expect(page.getByLabel(/Nouveau mot de passe/)).toBeVisible()

    const nouveauMdp = 'Zz!' + Math.random().toString(36).slice(2) + 'Aa9'

    // ---------------------------- Sans cocher : refusé côté serveur ----------------------------
    await page.getByLabel('Nouveau mot de passe', { exact: true }).fill(nouveauMdp)
    await page.getByLabel('Confirmer le mot de passe', { exact: true }).fill(nouveauMdp)
    await page.getByRole('button', { name: /^Enregistrer$/ }).click()
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 })
    await expect(page).toHaveURL(/\/mot-de-passe\/nouveau/)

    const apresRefus = await request.get(
      `${SUPABASE_URL}/rest/v1/profils?select=consentement_le&id=eq.${compte.id}`,
      { headers: enTeteService },
    )
    expect((await apresRefus.json())[0].consentement_le, 'aucune écriture sans consentement').toBeNull()

    // ---------------------------- Avec la case cochée : passe ----------------------------
    await page.getByLabel(/^J.ai lu et j.accepte/).check()
    await page.getByRole('button', { name: /^Enregistrer$/ }).click()
    await page.waitForURL(/\/connexion/, { timeout: 10_000 })

    const apresConsentement = await request.get(
      `${SUPABASE_URL}/rest/v1/profils?select=consentement_le,consentement_version&id=eq.${compte.id}`,
      { headers: enTeteService },
    )
    const ligne = (await apresConsentement.json())[0]
    expect(ligne.consentement_le, 'consentement_le doit être écrit').not.toBeNull()
    expect(ligne.consentement_version, 'consentement_version doit être écrit').not.toBeNull()

    // Le nouveau mot de passe doit réellement fonctionner.
    const repLogin = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
      data: { email: compte.email, password: nouveauMdp },
    })
    expect(repLogin.status(), 'le nouveau mot de passe doit permettre de se connecter').toBe(200)
  })

  test('compte qui a déjà consenti : réinitialisation ne réaffiche pas la case', async ({ page, request }) => {
    const compte = await creerCompte(request, 'dejaconsenti', 'client')

    await request.patch(`${SUPABASE_URL}/rest/v1/profils?id=eq.${compte.id}`, {
      headers: enTeteService,
      data: { consentement_le: new Date().toISOString(), consentement_version: 'AUDIT-2026-01-01' },
    })

    const repLien = await request.post(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
      headers: enTeteService,
      data: { type: 'recovery', email: compte.email },
    })
    const lien = await repLien.json()
    const tokenHash = lien.hashed_token ?? lien.properties?.hashed_token
    expect(tokenHash, `jeton introuvable dans la réponse : ${JSON.stringify(lien)}`).toBeTruthy()

    await page.goto(
      `/api/auth/confirmer?token_hash=${tokenHash}&type=recovery&suivant=${encodeURIComponent('/fr/mot-de-passe/nouveau')}`,
    )
    await expect(page).toHaveURL(/\/mot-de-passe\/nouveau/)
    await expect(page.getByLabel(/Nouveau mot de passe/)).toBeVisible()
    await expect(page.getByLabel(/^J.ai lu et j.accepte/)).toHaveCount(0)

    // Le changement doit passer sans case à cocher.
    const nouveauMdp = 'Zz!' + Math.random().toString(36).slice(2) + 'Aa9'
    await page.getByLabel('Nouveau mot de passe', { exact: true }).fill(nouveauMdp)
    await page.getByLabel('Confirmer le mot de passe', { exact: true }).fill(nouveauMdp)
    await page.getByRole('button', { name: /^Enregistrer$/ }).click()
    await page.waitForURL(/\/connexion/, { timeout: 10_000 })

    const apres = await request.get(
      `${SUPABASE_URL}/rest/v1/profils?select=consentement_version&id=eq.${compte.id}`,
      { headers: enTeteService },
    )
    // Version inchangée — cette réinitialisation n'a pas re-consenti, elle
    // n'avait pas à le faire.
    expect((await apres.json())[0].consentement_version).toBe('AUDIT-2026-01-01')
  })
})

test.describe('rate limit', () => {
  test('changerRole renvoie une erreur lisible au-delà de la limite', async ({ page, request }) => {
    const admin = await creerCompte(request, 'ratelimit', 'admin')
    const cible = await creerCompte(request, 'ratelimitcible', 'client')
    await connecterAdmin(page, admin.email)

    await page.goto('/fr/admin/utilisateurs?role=tous')
    const ligne = page.locator('li', { has: page.getByText(cible.email, { exact: true }) })
    await expect(ligne).toBeVisible()

    // max: 20 / 5 min sur changerRole — jusqu'à 25 changements rapprochés
    // depuis l'interface réelle (pas un appel direct à l'action, inatteignable
    // proprement hors navigateur) pour dépasser franchement la limite.
    let erreurVue = false
    for (let i = 0; i < 25; i++) {
      const select = ligne.locator('select')
      const roleActuel = await select.inputValue()
      await select.selectOption(roleActuel === 'vendeur' ? 'client' : 'vendeur')
      await ligne.getByRole('button', { name: /^Enregistrer$/ }).click()
      await page.waitForTimeout(150)
      if (await ligne.getByRole('alert').isVisible().catch(() => false)) {
        erreurVue = true
        break
      }
    }
    expect(erreurVue, 'le rate limit doit finir par afficher une erreur lisible').toBe(true)
  })
})
