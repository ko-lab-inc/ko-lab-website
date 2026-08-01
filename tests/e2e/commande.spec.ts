import fs from 'node:fs'

import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

/**
 * Confirmation de commande — migration 0021.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI DES COMPTES RÉELS, ET PAS UNE SIMULATION COMME compte.spec.ts
 *
 * `connecterCommeSi` (compte.spec.ts) fait répondre /api/session comme si
 * quelqu'un était connecté — parfait pour tester le CLOISONNEMENT du panier
 * anonyme, insuffisant ici : `creerCommande` vérifie `auth.getUser()` via de
 * VRAIS cookies Supabase, que /api/session ne contrôle pas. Sans une vraie
 * session, la commande ne serait jamais créée et ces tests ne prouveraient
 * rien. Les comptes sont créés par l'API admin (`email_confirm: true`, pas de
 * courriel envoyé) et détruits dans un `finally` — même discipline que les
 * scripts d'audit : base unique, aucune trace laissée.
 * ---------------------------------------------------------------------------
 */

const env: Record<string, string> = {}
for (const ligne of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = ligne.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m?.[1]) env[m[1]] = (m[2] ?? '').replace(/^['"]|['"]$/g, '')
}

/** `.env.local` incomplet : mieux vaut un échec net ici qu'un `undefined` qui voyage jusque dans un en-tête HTTP. */
function variable(nom: string): string {
  const valeur = env[nom]
  if (!valeur) throw new Error(`${nom} absente de .env.local — requise pour tests/e2e/commande.spec.ts`)
  return valeur
}

const SUPABASE_URL = variable('NEXT_PUBLIC_SUPABASE_URL')
const CLE_SERVICE = variable('SUPABASE_SERVICE_ROLE_KEY')
const CLE_ANON = variable('NEXT_PUBLIC_SUPABASE_ANON_KEY')
const MOT_DE_PASSE = 'Zz!' + Math.random().toString(36).slice(2) + 'Aa9'

/**
 * ⚠️ `User-Agent: node` N'EST PAS DE LA DÉCORATION.
 *
 * Constaté en le retirant : Supabase répond
 * `403 "Forbidden use of secret API key in browser"` à la clé de service dès
 * que la requête porte un User-Agent de navigateur — précisément celui que le
 * contexte `request` de Playwright envoie par défaut (il partage la pile
 * réseau du navigateur testé). Un `fetch()` Node nu ne déclenche jamais ce
 * refus ; c'est cet en-tête, et lui seul, qui fait la différence — vérifié en
 * reproduisant le refus puis en l'enlevant.
 */
const enTeteService = {
  apikey: CLE_SERVICE,
  Authorization: `Bearer ${CLE_SERVICE}`,
  'Content-Type': 'application/json',
  'User-Agent': 'node',
}

/**
 * ⚠️ NETTOYAGE PAR `afterEach`, PAS PAR `try/finally` DANS LE TEST.
 *
 * Première version : chaque test créait son compte et le supprimait dans un
 * `finally`. Sur un test qui échoue par TIMEOUT (pas par une assertion qui
 * lève proprement — `page.waitForURL` qui n'aboutit jamais, par exemple),
 * Playwright peut interrompre l'exécution du corps du test avant que ce
 * `finally` n'ait fini son propre appel réseau. Constaté : trois comptes
 * `zzaudit.commande.connexion.*` laissés dans la base du client après une
 * série d'essais qui échouaient tous au même endroit (table absente, voir
 * plus bas). Un hook `afterEach`, lui, s'exécute même après un timeout —
 * c'est la garantie qu'un `finally` dans le corps du test n'a pas.
 */
let comptesDeCetEssai: string[] = []
let commandesDeCetEssai: string[] = []

test.beforeEach(() => {
  comptesDeCetEssai = []
  commandesDeCetEssai = []
})

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
    data: { email, password: MOT_DE_PASSE, email_confirm: true },
  })
  const corps = await rep.json()
  if (!corps.id) throw new Error(`création du compte impossible : ${JSON.stringify(corps)}`)
  comptesDeCetEssai.push(corps.id)
  return { id: corps.id as string, email }
}

/** Jeton d'accès réel pour un compte — sert aux sondes RLS directes (test 4). */
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

async function connecterViaModale(page: Page, email: string) {
  await page.getByRole('button', { name: /Se connecter ou créer un compte/ }).click()
  const dialogue = page.locator('dialog[open]')
  await expect(dialogue).toBeVisible()
  await dialogue.getByLabel(/Courriel/i).fill(email)
  await dialogue.getByLabel(/^Mot de passe$/i).fill(MOT_DE_PASSE)
  await dialogue.getByRole('button', { name: /^Se connecter$/ }).click()
}

test.describe('Confirmation de commande — compte requis à l’instant de confirmer', () => {
  test.beforeEach(async ({ page }) => {
    // Repart d'un panier vide, comme panier.spec.ts.
    await page.goto('/fr/boutique')
    await page.evaluate(() => {
      for (const cle of Object.keys(window.localStorage)) {
        if (cle.startsWith('kolab_panier')) window.localStorage.removeItem(cle)
      }
    })
    await page.reload()
  })

  test('1 · anonyme — la modale apparaît, aucune navigation', async ({ page }) => {
    await ajouterUnProduit(page)
    await page.goto('/fr/boutique/demande')

    await expect(page.getByRole('link', { name: /Confirmer ma sélection/ })).toHaveCount(0)
    const bouton = page.getByRole('button', { name: /Se connecter ou créer un compte/ })
    await expect(bouton).toBeVisible()

    await bouton.click()
    await expect(page.locator('dialog[open]')).toBeVisible()
    // Toujours sur /boutique/demande : pas de redirection vers /connexion.
    expect(page.url()).toContain('/boutique/demande')
  })

  test('2 · connexion depuis la modale — commande créée sans second clic', async ({ page, request }) => {
    const compte = await creerCompteConfirme(request, 'connexion')

    await ajouterUnProduit(page)
    await page.goto('/fr/boutique/demande')

    await connecterViaModale(page, compte.email)

    // Le formulaire de commande doit apparaître SANS navigation ni second
    // clic sur un lien de connexion — c'est le point clé de la demande.
    const champNom = page.getByLabel(/Nom complet/i)
    await expect(champNom).toBeVisible({ timeout: 10_000 })

    await champNom.fill('Test E2E')
    await page.getByLabel(/Courriel/i).fill(compte.email)
    await page.getByRole('radio', { name: /Ramassage/i }).check()
    await page.getByRole('button', { name: /Confirmer ma commande/ }).click()

    await page.waitForURL('**/compte/commandes/**', { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: /CMD-/ })).toBeVisible()

    // Retrouvée pour le nettoyage : l'id est dans l'URL de la page atteinte.
    const idCommande = page.url().split('/').pop()
    if (idCommande) commandesDeCetEssai.push(idCommande)

    // Panier vidé après succès — même exigence que l'ancien flux contact.
    const panierRestant = await page.evaluate(() => {
      const cle = Object.keys(window.localStorage).find((c) => c.startsWith('kolab_panier'))
      return cle ? JSON.parse(window.localStorage.getItem(cle) ?? '[]') : []
    })
    expect(panierRestant).toHaveLength(0)
  })

  test('3 · session déjà active — aucune ré-authentification demandée', async ({ browser, request }) => {
    const compte = await creerCompteConfirme(request, 'session')

    const contexte = await browser.newContext()
    const page = await contexte.newPage()

    // Première « visite » : connexion.
    await page.goto('/fr/boutique')
    await ajouterUnProduit(page)
    await page.goto('/fr/boutique/demande')
    await connecterViaModale(page, compte.email)
    await expect(page.getByLabel(/Nom complet/i)).toBeVisible({ timeout: 10_000 })

    // Nouvel onglet du MÊME contexte (mêmes cookies) — la session Supabase
    // persiste par cookies, pas par un état écrit par ce test.
    const secondOnglet = await contexte.newPage()
    await secondOnglet.goto('/fr/boutique')
    await secondOnglet.evaluate(() => {
      for (const cle of Object.keys(window.localStorage)) {
        if (cle.startsWith('kolab_panier:anonyme')) window.localStorage.removeItem(cle)
      }
    })
    await secondOnglet.reload()
    await ajouterUnProduit(secondOnglet)
    await secondOnglet.goto('/fr/boutique/demande')

    // Toujours connecté : le formulaire de commande apparaît directement,
    // jamais l'invite à se connecter.
    await expect(secondOnglet.getByRole('button', { name: /Se connecter ou créer un compte/ })).toHaveCount(0)
    await expect(secondOnglet.getByLabel(/Nom complet/i)).toBeVisible({ timeout: 10_000 })

    await contexte.close()
  })

  test('4 · RLS croisée — le compte B ne lit ni ne modifie une commande du compte A', async ({ request }) => {
    const A = await creerCompteConfirme(request, 'a')
    const B = await creerCompteConfirme(request, 'b')

    const jetonA = await seConnecterEnDirect(request, A.email)
    const jetonB = await seConnecterEnDirect(request, B.email)

    // A crée une commande avec SA session — même chemin que l'application
    // (client de session, jamais la service role key).
    const creation = await request.post(`${SUPABASE_URL}/rest/v1/commandes`, {
      headers: { apikey: CLE_ANON, Authorization: `Bearer ${jetonA}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
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
    const modifParB = await request.patch(
      `${SUPABASE_URL}/rest/v1/commandes?id=eq.${commandeA.id}`,
      {
        headers: { apikey: CLE_ANON, Authorization: `Bearer ${jetonB}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
        data: { statut: 'annulee' },
      },
    )
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
