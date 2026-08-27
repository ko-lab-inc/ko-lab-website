import fs from 'node:fs'

import { expect, test, type APIRequestContext } from '@playwright/test'

/**
 * medias-emplacements — repli bilingue de resoudreEmplacement (27 août 2026).
 *
 * ---------------------------------------------------------------------------
 * CE QUE CE FICHIER PROUVE
 *
 * `resoudreEmplacement` lisait `alt_text_en` en base mais ne l'appliquait
 * jamais — `/en/*` affichait systématiquement le texte français. Corrigé en
 * ajoutant un paramètre `locale` (medias-emplacements.ts) et en le faisant
 * suivre par les 11 appelants. Ce test prouve trois choses avec de vraies
 * pages, pas une lecture du code :
 *   1. `/en` affiche bien l'anglais pour besoin_1 ET besoin_2 (deux
 *      emplacements distincts, pour écarter un faux positif à un seul).
 *   2. Vider alt_text_en sur UNE SEULE ligne ne fait retomber en français
 *      QUE cette ligne — les autres emplacements restent en anglais.
 *   3. Restaurer PAR L'INTERFACE (pas par PATCH direct) rétablit l'anglais —
 *      voir medias-emplacements-televersement.spec.ts pour pourquoi un PATCH
 *      direct laisserait le cache de page bloqué sur la valeur de test.
 *
 * Même discipline que les fichiers voisins : compte admin de test créé par
 * API Auth (clé de service), ligne `besoin_1` restaurée PAR L'INTERFACE,
 * filet de sécurité par PATCH direct dans l'afterEach si cette étape échoue.
 * ---------------------------------------------------------------------------
 */

const env: Record<string, string> = {}
for (const ligne of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = ligne.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m?.[1]) env[m[1]] = (m[2] ?? '').replace(/^['"]|['"]$/g, '')
}

function variable(nom: string): string {
  const valeur = env[nom]
  if (!valeur) {
    throw new Error(`${nom} absente de .env.local — requise pour medias-emplacements-bilingue.spec.ts`)
  }
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
let besoin1Original: { url_stockage: string; alt_text_fr: string; alt_text_en: string | null } | null = null

test.afterEach(async ({ request }) => {
  if (besoin1Original) {
    // Filet de sécurité pour la DONNÉE seule — le test lui-même restaure déjà
    // par l'interface avant d'arriver ici dans le cas nominal.
    await request
      .patch(`${SUPABASE_URL}/rest/v1/medias_emplacements?cle=eq.besoin_1`, {
        headers: enTeteService,
        data: besoin1Original,
      })
      .catch(() => {})
    besoin1Original = null
  }
  if (compteId) {
    await request.delete(`${SUPABASE_URL}/auth/v1/admin/users/${compteId}`, { headers: enTeteService }).catch(() => {})
    compteId = null
  }
})

async function creerCompteAdmin(request: APIRequestContext) {
  const email = `zzaudit_bilingue_${Date.now()}@ko-lab.test`
  const rep = await request.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: enTeteService,
    data: { email, password: MOT_DE_PASSE, email_confirm: true, user_metadata: { nom: 'Audit Bilingue' } },
  })
  const corps = await rep.json()
  if (!corps.id) throw new Error(`création du compte impossible : ${JSON.stringify(corps)}`)
  compteId = corps.id

  const elevation = await request.patch(`${SUPABASE_URL}/rest/v1/profils?id=eq.${corps.id}`, {
    headers: enTeteService,
    data: { role: 'admin' },
  })
  if (elevation.status() >= 400) throw new Error(`élévation en admin impossible : ${await elevation.text()}`)

  return { id: corps.id as string, email }
}

test('resoudreEmplacement applique alt_text_en sur /en, replie en FR ligne par ligne', async ({ page, request }) => {
  // ---------------------------- 1. /en affiche l'anglais ----------------------------
  const avant = await request.get(
    `${SUPABASE_URL}/rest/v1/medias_emplacements?select=url_stockage,alt_text_fr,alt_text_en&cle=eq.besoin_1`,
    { headers: enTeteService },
  )
  besoin1Original = (await avant.json())[0]
  expect(besoin1Original?.alt_text_en, 'besoin_1 doit avoir un alt_text_en en base pour ce test').toBeTruthy()

  await page.goto('/en')
  await expect(page.locator(`img[alt="${besoin1Original!.alt_text_en}"]`).first()).toBeVisible({ timeout: 10_000 })
  // Le texte FRANÇAIS ne doit apparaître nulle part comme alt sur /en pour
  // cet emplacement — sans ça le test pourrait passer par coïncidence (les
  // deux textes partageraient un mot).
  expect(await page.locator(`img[alt="${besoin1Original!.alt_text_fr}"]`).count()).toBe(0)

  const besoin2 = await request.get(
    `${SUPABASE_URL}/rest/v1/medias_emplacements?select=alt_text_en&cle=eq.besoin_2`,
    { headers: enTeteService },
  )
  const besoin2AltEn = (await besoin2.json())[0]?.alt_text_en as string
  expect(besoin2AltEn, 'besoin_2 doit avoir un alt_text_en en base pour ce test').toBeTruthy()
  await expect(page.locator(`img[alt="${besoin2AltEn}"]`).first()).toBeVisible()

  // ---------------------------- Connexion admin ----------------------------
  const compte = await creerCompteAdmin(request)
  await page.goto('/fr/connexion')
  await page.getByLabel(/Courriel/i).fill(compte.email)
  await page.getByLabel('Mot de passe', { exact: true }).fill(MOT_DE_PASSE)
  await page.getByRole('button', { name: /^Se connecter$/ }).click()
  await page.waitForURL('**/admin', { timeout: 10_000 })

  // ---------------------------- 2. Vider alt_text_en sur besoin_1 seul ----------------------------
  await page.goto('/fr/admin/medias-emplacements')
  const ligne = page.locator('tr', { has: page.getByText('besoin_1', { exact: true }) })
  await ligne.getByRole('button', { name: /Modifier/i }).click()

  const modal = page.locator('dialog[open]')
  await expect(modal).toBeVisible()
  await modal.getByLabel(/Texte alternatif \(anglais\)/i).fill('')
  await modal.getByRole('button', { name: /^Enregistrer$/ }).click()
  await expect(modal).toBeHidden({ timeout: 10_000 })

  // ---------------------------- Reflet sur /en : besoin_1 en FR, besoin_2 toujours EN ----------------------------
  await expect(async () => {
    await page.goto('/en')
    await expect(page.locator(`img[alt="${besoin1Original!.alt_text_fr}"]`).first()).toBeVisible({ timeout: 2_000 })
  }).toPass({ timeout: 30_000, intervals: [500, 1_000, 2_000, 3_000] })

  expect(
    await page.locator(`img[alt="${besoin1Original!.alt_text_en}"]`).count(),
    'alt_text_en vidé : le texte anglais original ne doit plus apparaître pour besoin_1',
  ).toBe(0)
  await expect(
    page.locator(`img[alt="${besoin2AltEn}"]`).first(),
    'besoin_2 (non touché) doit rester en anglais',
  ).toBeVisible()

  // ---------------------------- 3. Restauration PAR L'INTERFACE ----------------------------
  await page.goto('/fr/admin/medias-emplacements')
  await ligne.getByRole('button', { name: /Modifier/i }).click()
  const modal2 = page.locator('dialog[open]')
  await expect(modal2).toBeVisible()
  await modal2.getByLabel(/Texte alternatif \(anglais\)/i).fill(besoin1Original!.alt_text_en!)
  await modal2.getByRole('button', { name: /^Enregistrer$/ }).click()
  await expect(modal2).toBeHidden({ timeout: 10_000 })

  await expect(async () => {
    await page.goto('/en')
    await expect(page.locator(`img[alt="${besoin1Original!.alt_text_en}"]`).first()).toBeVisible({ timeout: 2_000 })
  }).toPass({ timeout: 30_000, intervals: [500, 1_000, 2_000, 3_000] })
})
