import fs from 'node:fs'

import { expect, test } from '@playwright/test'

const env: Record<string, string> = {}
for (const ligne of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = ligne.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m?.[1]) env[m[1]] = (m[2] ?? '').replace(/^['"]|['"]$/g, '')
}
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL!
const CLE_SERVICE = env.SUPABASE_SERVICE_ROLE_KEY!
const MOT_DE_PASSE = 'Zz!' + Math.random().toString(36).slice(2) + 'Aa9'
const enTeteService = {
  apikey: CLE_SERVICE,
  Authorization: `Bearer ${CLE_SERVICE}`,
  'Content-Type': 'application/json',
  'User-Agent': 'node',
}

async function creerCompteAdmin(request: import('@playwright/test').APIRequestContext, prefixe: string) {
  const email = `zzaudit_${prefixe}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@ko-lab.test`
  const rep = await request.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: enTeteService,
    data: { email, password: MOT_DE_PASSE, email_confirm: true },
  })
  const compteId = (await rep.json()).id
  await request.patch(`${SUPABASE_URL}/rest/v1/profils?id=eq.${compteId}`, {
    headers: enTeteService,
    data: { role: 'admin' },
  })
  return { email, compteId }
}

async function connecter(page: import('@playwright/test').Page, email: string) {
  await page.goto('/fr/connexion')
  await page.getByLabel(/Courriel/i).fill(email)
  await page.getByLabel('Mot de passe', { exact: true }).fill(MOT_DE_PASSE)
  await page.getByRole('button', { name: /^Se connecter$/ }).click()
  await page.waitForURL('**/admin', { timeout: 10_000 })
}

async function idPosteLivreur(request: import('@playwright/test').APIRequestContext) {
  const r = await request.get(`${SUPABASE_URL}/rest/v1/postes_carrieres?titre_fr=eq.Chauffeur-livreur&select=id`, {
    headers: enTeteService,
  })
  const rows = await r.json()
  return rows[0]?.id as string
}

async function creerCandidature(
  request: import('@playwright/test').APIRequestContext,
  { email, posteId, posteIdNull }: { email: string; posteId: string; posteIdNull?: boolean },
) {
  const r = await request.post(`${SUPABASE_URL}/rest/v1/candidatures`, {
    headers: { ...enTeteService, Prefer: 'return=representation' },
    data: {
      nom: `AUDIT candidat ${Date.now()}`,
      telephone: '819-555-0100',
      email,
      ville: 'Gatineau',
      postes: ['Chauffeur-livreur'],
      disponibilites: 'Semaine',
      travail_exterieur: true,
      a_experience: true,
      statut: 'nouveau',
      canal: 'interne',
      poste_id: posteIdNull ? null : posteId,
    },
  })
  const rows = await r.json()
  return rows[0]?.id as string
}

async function supprimerCandidature(request: import('@playwright/test').APIRequestContext, id: string) {
  await request.delete(`${SUPABASE_URL}/rest/v1/candidatures?id=eq.${id}`, { headers: enTeteService }).catch(() => {})
}

async function supprimerCompteParEmail(request: import('@playwright/test').APIRequestContext, email: string) {
  const r = await request.get(`${SUPABASE_URL}/auth/v1/admin/users?per_page=200`, { headers: enTeteService })
  const users: { id: string; email?: string }[] = (await r.json()).users ?? []
  const cible = users.find((u) => u.email === email)
  if (cible) await request.delete(`${SUPABASE_URL}/auth/v1/admin/users/${cible.id}`, { headers: enTeteService }).catch(() => {})
}

test.describe('candidatures — statuts et invitation livreur (étape 3/3)', () => {
  test('cinq statuts proposés sur /admin/candidatures', async ({ page, request }) => {
    const { email, compteId } = await creerCompteAdmin(request, 'cand_statuts')
    const posteId = await idPosteLivreur(request)
    const candId = await creerCandidature(request, { email: `zzaudit_c1_${Date.now()}@ko-lab.test`, posteId })

    try {
      await connecter(page, email)
      await page.goto('/fr/admin/candidatures')

      const ligne = page.locator('li').filter({ hasText: 'AUDIT candidat' }).first()
      await expect(ligne).toBeVisible()
      const options = await ligne.locator('select').first().locator('option').allTextContents()
      expect(options).toEqual(expect.arrayContaining(['Nouveau', 'Lu', 'Traité', 'Retenue', 'Refusée']))
    } finally {
      await supprimerCandidature(request, candId)
      await request.delete(`${SUPABASE_URL}/auth/v1/admin/users/${compteId}`, { headers: enTeteService }).catch(() => {})
    }
  })

  test('retenue + poste livreur : apparaît dans Livreurs, confirmation avant envoi, compte créé, puis affiche la date', async ({
    page,
    context,
    request,
  }) => {
    const { email: emailAdmin, compteId: adminId } = await creerCompteAdmin(request, 'cand_flux')
    const posteId = await idPosteLivreur(request)
    const emailCandidat = `zzaudit_livreur_${Date.now()}@ko-lab.test`
    const candId = await creerCandidature(request, { email: emailCandidat, posteId })

    let compteCreeId: string | null = null

    try {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'])
      await connecter(page, emailAdmin)

      // 1. Passer au statut retenue depuis /admin/candidatures.
      await page.goto('/fr/admin/candidatures')
      const ligneCand = page.locator('li').filter({ hasText: 'AUDIT candidat' }).first()
      await ligneCand.locator('select').first().selectOption('retenue')
      await page.waitForTimeout(1000)

      // 2. Apparaît dans Livreurs, bloc "Candidatures retenues".
      await page.goto('/fr/admin/livreurs')
      await expect(page.getByText('Candidatures retenues')).toBeVisible()
      const ligneLivreur = page.locator('li').filter({ hasText: emailCandidat })
      await expect(ligneLivreur).toBeVisible()

      // 3. Bouton d'invitation demande confirmation.
      let messageConfirm = ''
      page.once('dialog', async (dialog) => {
        messageConfirm = dialog.message()
        await dialog.dismiss()
      })
      await ligneLivreur.getByRole('button', { name: /Inviter comme livreur/i }).click()
      await page.waitForTimeout(500)
      expect(messageConfirm).toContain(emailCandidat)
      expect(messageConfirm.toLowerCase()).toContain('livreur')
      // Rejetée : rien n'a dû partir.
      const r1 = await request.get(`${SUPABASE_URL}/rest/v1/candidatures?id=eq.${candId}&select=invitation_envoyee_le`, {
        headers: enTeteService,
      })
      expect((await r1.json())[0].invitation_envoyee_le).toBeNull()

      // 4. Accepter cette fois : l'envoi part.
      page.once('dialog', (dialog) => dialog.accept())
      await ligneLivreur.getByRole('button', { name: /Inviter comme livreur/i }).click()

      await expect(ligneLivreur.getByText(/Invitation envoyée|courriel non envoyé/i)).toBeVisible({ timeout: 15_000 })
      const champLien = ligneLivreur.locator('#lien-activation')
      await expect(champLien).toBeVisible()
      const lien = await champLien.inputValue()
      expect(lien).toContain('/api/auth/confirmer')
      expect(lien).toContain('token_hash=')

      // Colonnes candidature.
      const r2 = await request.get(
        `${SUPABASE_URL}/rest/v1/candidatures?id=eq.${candId}&select=invitation_envoyee_le,compte_id`,
        { headers: enTeteService },
      )
      const c2 = (await r2.json())[0]
      expect(c2.invitation_envoyee_le).not.toBeNull()
      expect(c2.compte_id).not.toBeNull()
      compteCreeId = c2.compte_id

      // Compte créé avec le rôle livreur.
      const r3 = await request.get(`${SUPABASE_URL}/rest/v1/profils?id=eq.${compteCreeId}&select=role,email`, {
        headers: enTeteService,
      })
      const profil = (await r3.json())[0]
      expect(profil.role).toBe('livreur')
      expect(profil.email).toBe(emailCandidat)

      // 5. Ne propose plus l'invitation — disparaît du bloc « Candidatures
      // retenues » (fraîche navigation, aucun état local du navigateur ne
      // reste) : le titre du bloc n'apparaît plus du tout puisqu'il n'y a
      // plus aucune candidature retenue non invitée. L'adresse reste
      // visible ailleurs sur la page — c'est le COMPTE créé, dans
      // ListeProfils juste au-dessus, exactement ce que demande le point 3
      // (« la personne passe dans le bloc des comptes »).
      await page.goto('/fr/admin/livreurs')
      await expect(page.getByText('Candidatures retenues')).not.toBeVisible()
      await expect(page.getByText(emailCandidat)).toBeVisible()

      await page.goto('/fr/admin/candidatures')
      await page.locator('li').filter({ hasText: 'AUDIT candidat' }).first().getByRole('button', { name: /Voir/i }).click()
      const modal = page.locator('dialog[open]')
      await expect(modal).toBeVisible()
      await expect(modal.getByText(/Invitée le/i)).toBeVisible()
      await expect(modal.getByRole('button', { name: /Inviter comme livreur/i })).not.toBeVisible()
      await expect(modal.getByRole('link', { name: 'Voir le compte' })).toBeVisible()
    } finally {
      await supprimerCandidature(request, candId)
      if (compteCreeId) await request.delete(`${SUPABASE_URL}/auth/v1/admin/users/${compteCreeId}`, { headers: enTeteService }).catch(() => {})
      await request.delete(`${SUPABASE_URL}/auth/v1/admin/users/${adminId}`, { headers: enTeteService }).catch(() => {})
    }
  })

  test('rattachement incertain (poste_id NULL) : signalé, mais invitation possible', async ({ page, context, request }) => {
    const { email: emailAdmin, compteId: adminId } = await creerCompteAdmin(request, 'cand_incert')
    const posteId = await idPosteLivreur(request)
    const emailCandidat = `zzaudit_postenul_${Date.now()}@ko-lab.test`
    const candId = await creerCandidature(request, { email: emailCandidat, posteId, posteIdNull: true })
    await request.patch(`${SUPABASE_URL}/rest/v1/candidatures?id=eq.${candId}`, {
      headers: enTeteService,
      data: { statut: 'retenue' },
    })

    let compteCreeId: string | null = null

    try {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'])
      await connecter(page, emailAdmin)
      await page.goto('/fr/admin/livreurs')

      const ligne = page.locator('li').filter({ hasText: emailCandidat })
      await expect(ligne).toBeVisible()
      await expect(ligne.getByText(/incertain/i)).toBeVisible()

      page.once('dialog', (dialog) => dialog.accept())
      await ligne.getByRole('button', { name: /Inviter comme livreur/i }).click()
      await expect(ligne.getByText(/Invitation envoyée|courriel non envoyé/i)).toBeVisible({ timeout: 15_000 })

      const r = await request.get(`${SUPABASE_URL}/rest/v1/candidatures?id=eq.${candId}&select=compte_id`, {
        headers: enTeteService,
      })
      compteCreeId = (await r.json())[0].compte_id
      expect(compteCreeId).not.toBeNull()
    } finally {
      await supprimerCandidature(request, candId)
      if (compteCreeId) await request.delete(`${SUPABASE_URL}/auth/v1/admin/users/${compteCreeId}`, { headers: enTeteService }).catch(() => {})
      await request.delete(`${SUPABASE_URL}/auth/v1/admin/users/${adminId}`, { headers: enTeteService }).catch(() => {})
    }
  })

  test('bloc vide : aucune candidature retenue non invitée → ni titre ni message sur Livreurs', async ({ page, request }) => {
    const { email, compteId } = await creerCompteAdmin(request, 'cand_vide')
    try {
      await connecter(page, email)
      await page.goto('/fr/admin/livreurs')
      await expect(page.getByText('Candidatures retenues')).not.toBeVisible()
      await expect(page.getByText(/candidature retenue pour ce poste/i)).not.toBeVisible()
    } finally {
      await request.delete(`${SUPABASE_URL}/auth/v1/admin/users/${compteId}`, { headers: enTeteService }).catch(() => {})
    }
  })
})
