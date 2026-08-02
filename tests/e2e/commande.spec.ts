import fs from 'node:fs'

import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

/**
 * Confirmation de commande — parcours simplifié (Christian, 1er août 2026).
 *
 * ---------------------------------------------------------------------------
 * CE QUI A CHANGÉ DEPUIS LA VERSION PRÉCÉDENTE DE CE FICHIER
 *
 * Plus de modale : /boutique/demande ne montre qu'un récapitulatif et un
 * bouton « Confirmer ma commande ». La connexion/inscription se fait par
 * VRAIE navigation de page (/connexion, /inscription), avec un `suivant` qui
 * ramène automatiquement vers /boutique/commande/details — la nouvelle page
 * qui demande téléphone, organisation, mode de livraison et adresse
 * (uniquement si expédition). Nom et courriel ne sont plus demandés nulle
 * part dans ce parcours : creerCommande les lit depuis la session.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI DES COMPTES RÉELS CRÉÉS PAR L'API ADMIN, PAS PAR /inscription
 *
 * Le quota d'envoi de courriels de Supabase (mailer intégré) est épuisé en
 * continu depuis l'audit du 2026-08-01 — /inscription répond correctement
 * par un message clair (« service de courriel momentanément saturé »), mais
 * aucune inscription réelle n'aboutit tant que ce quota n'est pas réglé côté
 * tableau de bord Supabase (SMTP personnalisé). Passer par l'API admin
 * (`email_confirm: true`) contourne ce mailer sans rien tester de moins : le
 * point à vérifier ici est le parcours de CONNEXION, `suivant`, et la page de
 * détails — pas le mailer de Supabase, déjà documenté ailleurs comme un
 * problème d'infrastructure distinct.
 * ---------------------------------------------------------------------------
 */

const env: Record<string, string> = {}
for (const ligne of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = ligne.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m?.[1]) env[m[1]] = (m[2] ?? '').replace(/^['"]|['"]$/g, '')
}

function variable(nom: string): string {
  const valeur = env[nom]
  if (!valeur) throw new Error(`${nom} absente de .env.local — requise pour tests/e2e/commande.spec.ts`)
  return valeur
}

const SUPABASE_URL = variable('NEXT_PUBLIC_SUPABASE_URL')
const CLE_SERVICE = variable('SUPABASE_SERVICE_ROLE_KEY')
const CLE_ANON = variable('NEXT_PUBLIC_SUPABASE_ANON_KEY')
const MOT_DE_PASSE = 'Zz!' + Math.random().toString(36).slice(2) + 'Aa9'

/** Voir la note équivalente dans les versions précédentes : sans ce
 * User-Agent, Supabase bloque la clé de service avec 403 « secret API key ». */
const enTeteService = {
  apikey: CLE_SERVICE,
  Authorization: `Bearer ${CLE_SERVICE}`,
  'Content-Type': 'application/json',
  'User-Agent': 'node',
}

let comptesDeCetEssai: string[] = []
let commandesDeCetEssai: string[] = []

test.beforeEach(() => {
  comptesDeCetEssai = []
  commandesDeCetEssai = []
})

/** `afterEach`, pas `finally` dans le test — survit à un timeout, voir historique. */
test.afterEach(async ({ request }) => {
  for (const id of commandesDeCetEssai) {
    await request.delete(`${SUPABASE_URL}/rest/v1/commandes?id=eq.${id}`, { headers: enTeteService }).catch(() => {})
  }
  for (const id of comptesDeCetEssai) {
    await request.delete(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, { headers: enTeteService }).catch(() => {})
  }
})

async function creerCompteConfirme(request: APIRequestContext, suffixe: string) {
  const email = `zzaudit.commande.${suffixe}.${Date.now()}@ko-lab.test`
  const rep = await request.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: enTeteService,
    data: { email, password: MOT_DE_PASSE, email_confirm: true, user_metadata: { nom: 'Test E2E' } },
  })
  const corps = await rep.json()
  if (!corps.id) throw new Error(`création du compte impossible : ${JSON.stringify(corps)}`)
  comptesDeCetEssai.push(corps.id)
  return { id: corps.id as string, email }
}

/** Jeton d'accès réel pour un compte — sert aux sondes RLS directes. */
async function seConnecterEnDirect(request: APIRequestContext, email: string) {
  const rep = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: CLE_ANON, 'Content-Type': 'application/json' },
    data: { email, password: MOT_DE_PASSE },
  })
  const corps = await rep.json()
  if (!corps.access_token) throw new Error(`connexion impossible : ${JSON.stringify(corps)}`)
  return corps.access_token as string
}

async function ajouterUnProduit(page: Page) {
  const badge = page.getByRole('link', { name: /Voir ma sélection/ }).first()
  await expect(async () => {
    if ((await badge.count()) === 0) {
      await page.getByRole('button', { name: /Ajouter au panier/ }).first().click()
    }
    await expect(badge).toContainText('1', { timeout: 3_000 })
  }).toPass({ timeout: 15_000 })
}

/** Remplit et soumet le VRAI formulaire de /connexion (plus de modale). */
async function seConnecterViaPage(page: Page, email: string) {
  await page.getByLabel(/Courriel/i).fill(email)
  // Exact : la version non ancrée matche AUSSI le bouton
  // aria-label="Afficher le mot de passe" (strict mode violation constatée).
  await page.getByLabel('Mot de passe', { exact: true }).fill(MOT_DE_PASSE)
  await page.getByRole('button', { name: /^Se connecter$/ }).click()
}

test.describe('Confirmation de commande — parcours simplifié par navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/fr/boutique')
    await page.evaluate(() => {
      for (const cle of Object.keys(window.localStorage)) {
        if (cle.startsWith('kolab_panier')) window.localStorage.removeItem(cle)
      }
    })
    await page.reload()
  })

  test('1 · anonyme — Confirmer envoie vers /connexion avec suivant, panier intact', async ({ page }) => {
    await ajouterUnProduit(page)
    await page.goto('/fr/boutique/demande')

    // Plus de formulaire visible sur cette page — seulement le récapitulatif
    // et le bouton, exactement la simplification demandée.
    await expect(page.getByLabel(/Téléphone/i)).toHaveCount(0)

    await page.getByRole('button', { name: /Confirmer ma commande/ }).click()
    await page.waitForURL('**/connexion**', { timeout: 10_000 })

    expect(page.url()).toContain('/connexion')
    expect(decodeURIComponent(page.url())).toContain('/boutique/commande/details')

    // Le panier survit à l'aller vers /connexion — aucune navigation ne le vide.
    const panier = await page.evaluate(() => {
      const cle = Object.keys(window.localStorage).find((c) => c.startsWith('kolab_panier'))
      return cle ? JSON.parse(window.localStorage.getItem(cle) ?? '[]') : []
    })
    expect(panier).toHaveLength(1)

    // Le lien « Créer un compte » de /connexion doit reporter le même suivant.
    const lienInscription = page.getByRole('link', { name: /Créer un compte/i })
    await expect(lienInscription).toBeVisible()
    expect(decodeURIComponent(await lienInscription.getAttribute('href') ?? '')).toContain(
      '/boutique/commande/details',
    )
  })

  test('2 · anonyme → connexion → retour automatique → commande créée (ramassage)', async ({ page, request }) => {
    const compte = await creerCompteConfirme(request, 'flux')

    await ajouterUnProduit(page)
    await page.goto('/fr/boutique/demande')
    await page.getByRole('button', { name: /Confirmer ma commande/ }).click()
    await page.waitForURL('**/connexion**', { timeout: 10_000 })

    await seConnecterViaPage(page, compte.email)

    // Retour AUTOMATIQUE sur la page de détails — pas de second clic, pas de
    // passage par /compte. C'est le point clé de la tâche 2.
    await page.waitForURL('**/boutique/commande/details', { timeout: 10_000 })
    await expect(page.getByRole('radio', { name: /Ramassage/i })).toBeChecked()

    await page.getByRole('button', { name: /Confirmer ma commande/ }).click()
    await page.waitForURL('**/compte/commandes/**', { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: /CMD-/ })).toBeVisible()

    const idCommande = page.url().split('/').pop()
    if (idCommande) commandesDeCetEssai.push(idCommande)

    // Panier vidé après succès, seulement à la toute fin.
    const panierRestant = await page.evaluate(() => {
      const cle = Object.keys(window.localStorage).find((c) => c.startsWith('kolab_panier'))
      return cle ? JSON.parse(window.localStorage.getItem(cle) ?? '[]') : []
    })
    expect(panierRestant).toHaveLength(0)
  })

  test('3 · déjà connecté — clic direct vers la page de détails, sans passer par /connexion', async ({
    browser,
    request,
  }) => {
    const compte = await creerCompteConfirme(request, 'direct')

    const contexte = await browser.newContext()
    const page = await contexte.newPage()

    // Connexion directe, hors du parcours panier — un compte 'client' sans
    // `suivant` atterrit sur /compte (voir connexion/actions.ts).
    await page.goto('/fr/connexion')
    await seConnecterViaPage(page, compte.email)
    await page.waitForURL('**/compte', { timeout: 10_000 })

    // Nouvel onglet du MÊME contexte (mêmes cookies) — session persistante.
    const onglet2 = await contexte.newPage()
    await onglet2.goto('/fr/boutique')
    await ajouterUnProduit(onglet2)
    await onglet2.goto('/fr/boutique/demande')

    await onglet2.getByRole('button', { name: /Confirmer ma commande/ }).click()
    await onglet2.waitForURL('**/boutique/commande/details', { timeout: 10_000 })
    expect(onglet2.url()).not.toContain('/connexion')

    await contexte.close()
  })

  test('4 · expédition avec adresse incomplète — refus propre, aucune commande créée', async ({ page, request }) => {
    const compte = await creerCompteConfirme(request, 'expedition')

    await ajouterUnProduit(page)
    await page.goto('/fr/boutique/demande')
    await page.getByRole('button', { name: /Confirmer ma commande/ }).click()
    await page.waitForURL('**/connexion**', { timeout: 10_000 })
    await seConnecterViaPage(page, compte.email)
    await page.waitForURL('**/boutique/commande/details', { timeout: 10_000 })

    await page.getByRole('radio', { name: /Expédition/i }).check()

    // Adresse non vide (passe l'attribut HTML `required`) mais sous le seuil
    // du .refine() serveur (schemaCommande exige ≥ 3 caractères) — ça vérifie
    // la validation CÔTÉ SERVEUR, pas seulement l'attribut required du DOM.
    await page.getByLabel(/Adresse/i).fill('X')
    await page.getByLabel(/Ville/i).fill('Gatineau')
    await page.getByLabel(/Province/i).fill('Québec')
    await page.getByLabel(/Code postal/i).fill('J8X 1A1')

    await page.getByRole('button', { name: /Confirmer ma commande/ }).click()

    // `p[role="alert"]`, pas getByRole('alert') seul : Next.js injecte son
    // propre annonceur de route (`__next-route-announcer__`), lui aussi
    // role="alert" — constaté en violation de strict mode.
    await expect(page.locator('p[role="alert"]')).toContainText(/invalides/i)
    // Toujours sur la page de détails : le refus n'a rien créé.
    expect(page.url()).toContain('/boutique/commande/details')
  })

  test('5 · RLS croisée — le compte B ne lit ni ne modifie une commande du compte A', async ({ request }) => {
    const A = await creerCompteConfirme(request, 'a')
    const B = await creerCompteConfirme(request, 'b')

    const jetonA = await seConnecterEnDirect(request, A.email)
    const jetonB = await seConnecterEnDirect(request, B.email)

    // A crée une commande avec SA session — même chemin que l'application
    // (client de session, jamais la service role key).
    const creation = await request.post(`${SUPABASE_URL}/rest/v1/commandes`, {
      headers: {
        apikey: CLE_ANON,
        Authorization: `Bearer ${jetonA}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      data: { client_id: A.id, nom: 'Compte A', email: A.email, mode_livraison: 'ramassage' },
    })
    expect(creation.status(), await creation.text()).toBe(201)
    const [commandeA] = await creation.json()
    commandesDeCetEssai.push(commandeA.id)

    // B tente de LIRE la commande de A, en devinant son id exact.
    const lectureParB = await request.get(
      `${SUPABASE_URL}/rest/v1/commandes?id=eq.${commandeA.id}&select=id,nom`,
      { headers: { apikey: CLE_ANON, Authorization: `Bearer ${jetonB}` } },
    )
    expect(lectureParB.status()).toBe(200)
    expect(await lectureParB.json()).toHaveLength(0)

    // B tente de la MODIFIER — même id, sa propre session.
    const modifParB = await request.patch(`${SUPABASE_URL}/rest/v1/commandes?id=eq.${commandeA.id}`, {
      headers: {
        apikey: CLE_ANON,
        Authorization: `Bearer ${jetonB}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      data: { statut: 'annulee' },
    })
    expect(modifParB.status()).toBe(200)
    expect(await modifParB.json()).toHaveLength(0)

    // Preuve que la commande existe toujours, intacte, pour A lui-même.
    const relectureParA = await request.get(
      `${SUPABASE_URL}/rest/v1/commandes?id=eq.${commandeA.id}&select=id,statut`,
      { headers: { apikey: CLE_ANON, Authorization: `Bearer ${jetonA}` } },
    )
    const [releA] = await relectureParA.json()
    expect(releA?.statut).toBe('nouvelle')
  })
})
