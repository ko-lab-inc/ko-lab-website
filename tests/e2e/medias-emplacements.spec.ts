import fs from 'node:fs'

import { expect, test, type APIRequestContext } from '@playwright/test'

/**
 * /admin/medias-emplacements — modification d'un emplacement, cache invalidé.
 *
 * ---------------------------------------------------------------------------
 * CE QUE CE FICHIER PROUVE
 *
 * Même discipline que tests/e2e/admin.spec.ts : compte de test créé en
 * `admin` (le bouton Modifier n'existe QUE pour ce rôle), connexion par la
 * vraie interface, détruit en `afterEach`.
 *
 * La ligne modifiée (`besoin_1`) est remise à sa valeur d'origine dans un
 * `finally`, par clé de service — base unique, aucune trace laissée, même
 * règle que pour un compte de test (CLAUDE.md).
 * ---------------------------------------------------------------------------
 */

const env: Record<string, string> = {}
for (const ligne of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = ligne.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m?.[1]) env[m[1]] = (m[2] ?? '').replace(/^['"]|['"]$/g, '')
}

function variable(nom: string): string {
  const valeur = env[nom]
  if (!valeur) throw new Error(`${nom} absente de .env.local — requise pour medias-emplacements.spec.ts`)
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

async function creerCompteAdmin(request: APIRequestContext) {
  const email = `zzaudit_medias_${Date.now()}@ko-lab.test`
  const rep = await request.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: enTeteService,
    data: { email, password: MOT_DE_PASSE, email_confirm: true, user_metadata: { nom: 'Audit Medias' } },
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

async function lireBesoin1(request: APIRequestContext) {
  const rep = await request.get(
    `${SUPABASE_URL}/rest/v1/medias_emplacements?select=url_stockage,alt_text_fr,alt_text_en&cle=eq.besoin_1`,
    { headers: enTeteService },
  )
  const corps = await rep.json()
  return corps[0] as { url_stockage: string; alt_text_fr: string; alt_text_en: string | null }
}

async function restaurerBesoin1(
  request: APIRequestContext,
  valeurs: { url_stockage: string; alt_text_fr: string; alt_text_en: string | null },
) {
  const rep = await request.patch(`${SUPABASE_URL}/rest/v1/medias_emplacements?cle=eq.besoin_1`, {
    headers: enTeteService,
    data: valeurs,
  })
  if (rep.status() >= 400) throw new Error(`restauration de besoin_1 échouée : ${await rep.text()}`)
}

test('modifier un emplacement depuis /admin/medias-emplacements, persistance + cache invalidé', async ({
  page,
  request,
}) => {
  const original = await lireBesoin1(request)

  try {
    const compte = await creerCompteAdmin(request)

    await page.goto('/fr/connexion')
    await page.getByLabel(/Courriel/i).fill(compte.email)
    await page.getByLabel('Mot de passe', { exact: true }).fill(MOT_DE_PASSE)
    await page.getByRole('button', { name: /^Se connecter$/ }).click()
    await page.waitForURL('**/admin', { timeout: 10_000 })

    await page.goto('/fr/admin/medias-emplacements')
    await expect(page.getByRole('heading', { name: 'Emplacements médias' })).toBeVisible()

    // Ligne besoin_1 — ouvre l'édition, change l'URL et l'alt FR, enregistre.
    const nouvelleUrl = `${original.url_stockage}?audit=${Date.now()}`
    const nouvelAlt = `AUDIT test E2E ${Date.now()}`

    const ligne = page.locator('tr', { has: page.getByText('besoin_1', { exact: true }) })
    await ligne.getByRole('button', { name: /Modifier/i }).click()

    const champUrl = ligne.getByRole('textbox', { name: /Nouvelle URL/i })
    await champUrl.fill(nouvelleUrl)

    const champAltFr = ligne.getByRole('textbox', { name: /Texte alternatif \(français\)/i })
    await champAltFr.fill(nouvelAlt)

    await ligne.getByRole('button', { name: /^Enregistrer$/ }).click()

    // La ligne repasse en lecture avec les nouvelles valeurs — signal de succès.
    await expect(page.getByText(nouvelleUrl, { exact: false })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(nouvelAlt, { exact: true })).toBeVisible()

    // Persistance réelle en base, pas seulement l'état React local.
    const apresEnregistrement = await lireBesoin1(request)
    expect(apresEnregistrement.url_stockage).toBe(nouvelleUrl)
    expect(apresEnregistrement.alt_text_fr).toBe(nouvelAlt)

    // Cache invalidé : un rechargement complet de la page redemande les
    // données au serveur et doit refléter la nouvelle valeur, pas l'ancienne
    // servie depuis un cache non invalidé (updateTag + revalidatePath).
    await page.reload()
    await expect(page.getByText(nouvelleUrl, { exact: false })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(nouvelAlt, { exact: true })).toBeVisible()
  } finally {
    await restaurerBesoin1(request, original)
  }
})
