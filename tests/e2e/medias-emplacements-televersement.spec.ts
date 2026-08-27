import fs from 'node:fs'

import { expect, test, type APIRequestContext } from '@playwright/test'

/**
 * /admin/medias-emplacements — téléversement direct depuis la modale
 * (SelecteurPhotoEmplacement, actions.ts — 27 août 2026).
 *
 * ---------------------------------------------------------------------------
 * CE QUE CE FICHIER PROUVE
 *
 * Dépôt réel dans le bucket, sélection automatique de la vignette déposée,
 * persistance après Enregistrer, reflet sur la page publique correspondante
 * (Besoins.tsx, accueil, via besoin_1), et rejet SERVEUR — pas seulement
 * l'attribut `accept` du champ — d'un fichier trop lourd et d'un type hors
 * liste, avec un message lisible dans les deux cas.
 *
 * Même discipline que medias-emplacements.spec.ts : compte admin de test créé
 * par API Auth (clé de service), connexion par la vraie interface, ligne
 * `besoin_1` restaurée et fichier déposé supprimé du Storage dans un
 * `finally` — base unique, aucune trace laissée (CLAUDE.md).
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
    throw new Error(`${nom} absente de .env.local — requise pour medias-emplacements-televersement.spec.ts`)
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

/** JPEG 1×1 minimal, vrais octets magiques — même fixture que media-bucket-validation.spec.ts. */
const JPEG_MINIMAL = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDQ0NDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wgARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
  'base64',
)

let compteId: string | null = null
let cheminDepose: string | null = null
let besoin1Original: { url_stockage: string; alt_text_fr: string; alt_text_en: string | null } | null = null

test.afterEach(async ({ request }) => {
  if (cheminDepose) {
    await request
      .delete(`${SUPABASE_URL}/storage/v1/object/medias`, {
        headers: enTeteService,
        data: { prefixes: [cheminDepose] },
      })
      .catch(() => {})
    cheminDepose = null
  }
  if (besoin1Original) {
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
  const email = `zzaudit_upload_${Date.now()}@ko-lab.test`
  const rep = await request.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: enTeteService,
    data: { email, password: MOT_DE_PASSE, email_confirm: true, user_metadata: { nom: 'Audit Televersement' } },
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

test('téléverser une photo depuis la modale — sélection, persistance, reflet public, rejets', async ({
  page,
  request,
}) => {
  const avant = await request.get(
    `${SUPABASE_URL}/rest/v1/medias_emplacements?select=url_stockage,alt_text_fr,alt_text_en&cle=eq.besoin_1`,
    { headers: enTeteService },
  )
  besoin1Original = (await avant.json())[0]

  const compte = await creerCompteAdmin(request)

  await page.goto('/fr/connexion')
  await page.getByLabel(/Courriel/i).fill(compte.email)
  await page.getByLabel('Mot de passe', { exact: true }).fill(MOT_DE_PASSE)
  await page.getByRole('button', { name: /^Se connecter$/ }).click()
  await page.waitForURL('**/admin', { timeout: 10_000 })

  await page.goto('/fr/admin/medias-emplacements')
  const ligne = page.locator('tr', { has: page.getByText('besoin_1', { exact: true }) })
  await ligne.getByRole('button', { name: /Modifier/i }).click()

  const modal = page.locator('dialog[open]')
  await expect(modal).toBeVisible()
  const compteAvant = await modal.locator('[aria-pressed]').count()

  // ---------------------------- 1. Téléversement valide ----------------------------
  await modal
    .getByLabel(/Ou téléverser une nouvelle photo/i)
    .setInputFiles({ name: 'audit-televersement.jpg', mimeType: 'image/jpeg', buffer: JPEG_MINIMAL })

  await expect(async () => {
    expect(await modal.locator('[aria-pressed]').count()).toBe(compteAvant + 1)
  }).toPass({ timeout: 20_000 })

  const nouvelleVignette = modal.locator('[aria-pressed="true"]').first()
  await expect(nouvelleVignette).toBeVisible()

  await modal.getByRole('button', { name: /^Enregistrer$/ }).click()
  await expect(modal).toBeHidden({ timeout: 10_000 })

  const apres = await request.get(
    `${SUPABASE_URL}/rest/v1/medias_emplacements?select=url_stockage&cle=eq.besoin_1`,
    { headers: enTeteService },
  )
  const urlPersistee = (await apres.json())[0].url_stockage as string
  expect(urlPersistee, `URL persistée inattendue : ${urlPersistee}`).toContain(
    '/storage/v1/object/public/medias/operations/besoin-1-',
  )
  cheminDepose = urlPersistee.split('/storage/v1/object/public/medias/')[1] ?? null

  // ---------------------------- Reflet sur la page publique ----------------------------
  // besoin_1 alimente la première carte de Besoins.tsx, section accueil.
  const basename = cheminDepose?.split('/').pop() ?? ''
  expect(basename).not.toBe('')
  const accueil = await request.get('/fr')
  const html = await accueil.text()
  expect(html, 'la nouvelle photo devrait apparaître sur /fr après invalidation du cache').toContain(basename)

  // ---------------------------- 2. Rejet — fichier > 5 Mo ----------------------------
  await ligne.getByRole('button', { name: /Modifier/i }).click()
  const modal2 = page.locator('dialog[open]')
  await expect(modal2).toBeVisible()
  const compteApresUpload = await modal2.locator('[aria-pressed]').count()

  const troisPlusGros = Buffer.alloc(6 * 1024 * 1024, 0)
  await modal2
    .getByLabel(/Ou téléverser une nouvelle photo/i)
    .setInputFiles({ name: 'trop-gros.jpg', mimeType: 'image/jpeg', buffer: troisPlusGros })

  await expect(modal2.getByRole('alert')).toBeVisible({ timeout: 20_000 })
  expect(await modal2.locator('[aria-pressed]').count(), 'aucune nouvelle vignette pour un fichier refusé').toBe(
    compteApresUpload,
  )

  // ---------------------------- 3. Rejet — mauvais type (PDF) ----------------------------
  const pdfMinimal = Buffer.from('%PDF-1.4\n%%EOF')
  await modal2
    .getByLabel(/Ou téléverser une nouvelle photo/i)
    .setInputFiles({ name: 'document.pdf', mimeType: 'application/pdf', buffer: pdfMinimal })

  await expect(modal2.getByRole('alert')).toBeVisible({ timeout: 20_000 })
  expect(await modal2.locator('[aria-pressed]').count(), 'aucune nouvelle vignette pour un PDF refusé').toBe(
    compteApresUpload,
  )

  // ---------------------------- Restauration par l'interface ----------------------------
  // ⚠️ Ne PAS se contenter d'un PATCH direct (clé de service, `afterEach`
  // ci-dessus) pour la restauration : ça corrige la ligne, mais n'appelle
  // jamais `updateTag`/`revalidatePath`, donc la page d'accueil continue de
  // servir la photo de test depuis le cache jusqu'à `revalidate: 3600`.
  // Même piège déjà rencontré et documenté dans
  // architecture-media-integration.spec.ts (test 2) pour EXACTEMENT ce
  // fichier de cache — restaurer par un vrai Enregistrer (donc par
  // `mettreAJourEmplacement`) est ce qui invalide correctement. Le PATCH
  // direct de l'afterEach reste un filet de sécurité pour la donnée seule si
  // cette étape échoue.
  await page.goto('/fr/admin/medias-emplacements')
  await ligne.getByRole('button', { name: /Modifier/i }).click()
  const modalFinale = page.locator('dialog[open]')
  const cheminOriginal = besoin1Original!.url_stockage.split('/storage/v1/object/public/medias/')[1]
  await modalFinale.locator(`button[title="${cheminOriginal}"]`).click()
  await modalFinale.getByRole('button', { name: /^Enregistrer$/ }).click()
  await expect(modalFinale).toBeHidden({ timeout: 10_000 })
})
