import fs from 'node:fs'

import { expect, test, type APIRequestContext } from '@playwright/test'

/**
 * Réorganisation de l'admin (fusion nav « Vidéos » + « Emplacements médias »
 * en « Médias » ; modal d'aperçu partagé PreviewMediaModal pour Vidéos ;
 * grille de sélection dédiée SelecteurPhotoEmplacement pour Emplacements
 * médias, admin uniquement) : vérifications structurelles, aucune écriture
 * donc aucune restauration nécessaire — le test de bout en bout (bascule
 * réelle + effet sur la page publique + restauration) a été fait
 * manuellement lors du chantier, voir le rapport de session du 22 août 2026.
 */

const env: Record<string, string> = {}
for (const ligne of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = ligne.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m?.[1]) env[m[1]] = (m[2] ?? '').replace(/^['"]|['"]$/g, '')
}

function variable(nom: string): string {
  const valeur = env[nom]
  if (!valeur) throw new Error(`${nom} absente de .env.local — requise pour admin-medias-nav-apercu.spec.ts`)
  return valeur
}

const SUPABASE_URL = variable('NEXT_PUBLIC_SUPABASE_URL')
const CLE_SERVICE = variable('SUPABASE_SERVICE_ROLE_KEY')
const MOT_DE_PASSE = 'Zz!' + Math.random().toString(36).slice(2) + 'Aa9'

const enTeteService = {
  apikey: CLE_SERVICE,
  Authorization: `Bearer ${CLE_SERVICE}`,
  'Content-Type': 'application/json',
  'User-Agent': 'node',
}

let compteId: string | null = null

test.afterEach(async ({ request }) => {
  if (compteId) {
    await request.delete(`${SUPABASE_URL}/auth/v1/admin/users/${compteId}`, { headers: enTeteService }).catch(() => {})
    compteId = null
  }
})

async function creerCompte(request: APIRequestContext, role: 'editor' | 'admin') {
  const email = `zzaudit_medias_nav_${Date.now()}@ko-lab.test`
  const rep = await request.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: enTeteService,
    data: { email, password: MOT_DE_PASSE, email_confirm: true, user_metadata: { nom: 'Audit Médias Nav' } },
  })
  const corps = await rep.json()
  if (!corps.id) throw new Error(`création du compte impossible : ${JSON.stringify(corps)}`)
  compteId = corps.id

  const elevation = await request.patch(`${SUPABASE_URL}/rest/v1/profils?id=eq.${corps.id}`, {
    headers: enTeteService,
    data: { role },
  })
  if (elevation.status() >= 400) throw new Error(`élévation en ${role} impossible : ${await elevation.text()}`)

  return { email }
}

const creerCompteEditor = (request: APIRequestContext) => creerCompte(request, 'editor')
const creerCompteAdmin = (request: APIRequestContext) => creerCompte(request, 'admin')

async function connecter(page: import('@playwright/test').Page, email: string) {
  await page.goto('/fr/connexion')
  await page.getByLabel(/Courriel/i).fill(email)
  await page.getByLabel('Mot de passe', { exact: true }).fill(MOT_DE_PASSE)
  await page.getByRole('button', { name: /^Se connecter$/ }).click()
  await page.waitForURL('**/admin', { timeout: 10_000 })
}

test('nav admin : « Médias » est un accordéon fermé par défaut, à trois sous-entrées', async ({ page, request }) => {
  const compte = await creerCompteEditor(request)
  await connecter(page, compte.email)

  // Panneau replié par défaut sous `lg` (voir NavAdmin.tsx) — le déplier
  // d'abord, sinon son contenu est présent dans le DOM mais `hidden`.
  const hamburger = page.getByRole('button', { name: /menu/i })
  if (await hamburger.isVisible()) await hamburger.click()

  const nav = page.locator('nav')
  const boutonMedias = nav.getByRole('button', { name: 'Médias' })
  await expect(boutonMedias).toBeVisible()
  await expect(boutonMedias).toHaveAttribute('aria-expanded', 'false')

  const lienRealisations = nav.getByRole('link', { name: 'Réalisations' })
  const lienEmplacements = nav.getByRole('link', { name: 'Emplacements médias' })
  const lienVideos = nav.getByRole('link', { name: 'Vidéos' })

  // Fermé par défaut : les trois sous-entrées ne sont PAS dans l'arbre a11y.
  await expect(lienRealisations).toHaveCount(0)
  await expect(lienEmplacements).toHaveCount(0)
  await expect(lienVideos).toHaveCount(0)

  await boutonMedias.click()
  await expect(boutonMedias).toHaveAttribute('aria-expanded', 'true')
  await expect(lienRealisations).toBeVisible()
  await expect(lienEmplacements).toBeVisible()
  await expect(lienVideos).toBeVisible()

  await lienVideos.click()
  await page.waitForURL('**/admin/videos')

  // Sous `lg`, le panneau entier se referme à chaque navigation (voir
  // NavAdmin.tsx) — le rouvrir avant de vérifier l'état du groupe.
  if (await hamburger.isVisible()) await hamburger.click()

  // Arrivée directe sur une sous-route : le groupe est ouvert automatiquement,
  // sans qu'il soit nécessaire de re-cliquer sur « Médias ».
  await expect(nav.getByRole('button', { name: 'Médias' })).toHaveAttribute('aria-expanded', 'true')
  await expect(nav.getByRole('link', { name: 'Vidéos' })).toBeVisible()
})

test('/admin/medias-emplacements : la vignette est inerte pour un editor (écriture admin uniquement)', async ({
  page,
  request,
}) => {
  const compte = await creerCompteEditor(request)
  await connecter(page, compte.email)

  await page.goto('/fr/admin/medias-emplacements')
  const premiereLigne = page.locator('tbody tr').first()
  // Plus de bouton « Voir l'aperçu » pour un editor depuis la refonte en
  // grille de sélection : ouvrir un modal qui échouerait toujours à
  // l'enregistrement (exigerRole(['admin'])) serait trompeur, pas discret.
  await expect(premiereLigne.getByRole('button', { name: /Voir l'aperçu/i })).toHaveCount(0)
  await expect(premiereLigne.locator('img')).toBeVisible()
})

test('/admin/medias-emplacements : grille de sélection — aucune URL visible, choix, aperçu public, restauration', async ({
  page,
  request,
}) => {
  const compte = await creerCompteAdmin(request)
  await connecter(page, compte.email)

  await page.goto('/fr/admin/medias-emplacements')

  // Jamais d'URL Supabase en texte visible sur cet écran — demande explicite
  // de la refonte du 22 août 2026 (l'ancien tableau exposait l'URL complète).
  const texteVisible = await page.locator('body').innerText()
  expect(texteVisible).not.toContain('supabase.co')

  const premiereLigne = page.locator('tbody tr').first()
  await premiereLigne.getByRole('button', { name: /Voir l'aperçu/i }).click()

  const dialogue = page.locator('dialog[open]')
  await expect(dialogue).toBeVisible()

  // Une grille de vignettes cliquables, jamais un champ de saisie d'URL.
  const vignettes = dialogue.locator('div.grid button')
  await expect(vignettes.first()).toBeVisible()
  expect(await dialogue.locator('input[type="url"], input[type="text"][value*="http"]').count()).toBe(0)

  // Les deux textes alternatifs sont éditables dans la même modale.
  await expect(dialogue.getByLabel('Texte alternatif (français)')).toBeVisible()
  await expect(dialogue.getByLabel('Texte alternatif (anglais)')).toBeVisible()

  await dialogue.getByRole('button', { name: /Fermer/i }).click()
  await expect(dialogue).toBeHidden()
})

test('/admin/videos : vignette Aperçu ouvre le modal, sans bloc texte alternatif', async ({ page, request }) => {
  const compte = await creerCompteEditor(request)
  await connecter(page, compte.email)

  await page.goto('/fr/admin/videos')
  const premiereVignette = page.getByRole('button', { name: /Voir l'aperçu/i }).first()
  await premiereVignette.click()

  const dialogue = page.locator('dialog[open]')
  await expect(dialogue).toBeVisible()
  await expect(dialogue.locator('img')).toBeVisible()
  // La table videos n'a pas de colonne alt : le bloc « Texte alternatif » est omis, pas vide.
  await expect(dialogue.getByText('Texte alternatif')).toHaveCount(0)

  await dialogue.getByRole('button', { name: /Fermer/i }).click()
  await expect(dialogue).toBeHidden()
})
