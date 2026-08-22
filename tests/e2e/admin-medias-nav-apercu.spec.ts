import fs from 'node:fs'

import { expect, test, type APIRequestContext } from '@playwright/test'

/**
 * Réorganisation de l'admin (fusion nav « Vidéos » + « Emplacements médias »
 * en « Médias », modal d'aperçu partagé PreviewMediaModal) : trois vérifications
 * en lecture seule, aucune écriture donc aucune restauration nécessaire.
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

async function creerCompteEditor(request: APIRequestContext) {
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
    data: { role: 'editor' },
  })
  if (elevation.status() >= 400) throw new Error(`élévation en editor impossible : ${await elevation.text()}`)

  return { email }
}

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

test('/admin/medias-emplacements : vignette Aperçu ouvre le modal en lecture seule', async ({ page, request }) => {
  const compte = await creerCompteEditor(request)
  await connecter(page, compte.email)

  await page.goto('/fr/admin/medias-emplacements')
  const premiereLigne = page.locator('tbody tr').first()
  await premiereLigne.getByRole('button', { name: /Voir l'aperçu/i }).click()

  const dialogue = page.locator('dialog[open]')
  await expect(dialogue).toBeVisible()
  await expect(dialogue.locator('img')).toBeVisible()
  // Le texte alternatif s'affiche en lecture seule (aucun <input>/<select> dans ce modal).
  await expect(dialogue.locator('input, select, textarea')).toHaveCount(0)

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
