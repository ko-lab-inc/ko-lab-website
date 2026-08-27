import fs from 'node:fs'

import { expect, test, type APIRequestContext } from '@playwright/test'

/**
 * Deux bugs de la modale d'ajout de photos — /admin/realisations
 * (corrigés le 27 août 2026).
 *
 * ---------------------------------------------------------------------------
 * CE QUE CE FICHIER PROUVE
 *
 * Bug 1 — une photo ajoutée apparaît IMMÉDIATEMENT après Enregistrer, sans
 * fermer/rouvrir la modale (TableauRealisations ne fige plus `edite` sur un
 * objet périmé, FormulaireRealisation resynchronise son état local sur la
 * prop fraîche).
 *
 * Bug 2 — plusieurs fichiers dont la somme dépasse le plafond global de
 * next.config.ts (7 Mo) sont refusés par un message lisible AVANT l'envoi,
 * jamais par une page d'erreur brute ; plusieurs fichiers légers passent
 * tous.
 * ---------------------------------------------------------------------------
 */

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

let compteId: string | null = null
let realisationId: string | null = null
let cheminsDeposes: string[] = []

test.afterEach(async ({ request }) => {
  if (realisationId) {
    await request.delete(`${SUPABASE_URL}/rest/v1/realisations?id=eq.${realisationId}`, { headers: enTeteService }).catch(() => {})
    realisationId = null
  }
  if (cheminsDeposes.length > 0) {
    await request
      .delete(`${SUPABASE_URL}/storage/v1/object/realisations`, {
        headers: enTeteService,
        data: { prefixes: cheminsDeposes },
      })
      .catch(() => {})
    cheminsDeposes = []
  }
  if (compteId) {
    await request.delete(`${SUPABASE_URL}/auth/v1/admin/users/${compteId}`, { headers: enTeteService }).catch(() => {})
    compteId = null
  }
})

async function creerCompteAdmin(request: APIRequestContext) {
  const email = `zzaudit_realisations_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@ko-lab.test`
  const rep = await request.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: enTeteService,
    data: { email, password: MOT_DE_PASSE, email_confirm: true },
  })
  const corps = await rep.json()
  if (!corps.id) throw new Error(`création du compte impossible : ${JSON.stringify(corps)}`)
  compteId = corps.id
  await request.patch(`${SUPABASE_URL}/rest/v1/profils?id=eq.${corps.id}`, {
    headers: enTeteService,
    data: { role: 'admin' },
  })
  return { id: corps.id as string, email }
}

test('bug 1 — une photo ajoutée à une réalisation EXISTANTE apparaît sans fermer la modale', async ({
  page,
  request,
}) => {
  // Le bug touche la modale de MODIFICATION, pas de création : `realisation`
  // (la prop) reste `undefined` du début à la fin d'une création, la
  // resynchronisation ne peut donc rien y prouver. Une réalisation créée à
  // l'avance, avec zéro photo, isole le scénario réel décrit dans le rapport.
  const titreTest = `AUDIT BUG1 ${Date.now()}`
  const slug = `audit-bug1-${Date.now()}`
  const repCreation = await request.post(`${SUPABASE_URL}/rest/v1/realisations`, {
    headers: { ...enTeteService, Prefer: 'return=representation' },
    data: { titre_fr: titreTest, slug, categorie: 'terrain', images: [], publie: false, ordre: 0 },
  })
  const creee = (await repCreation.json())[0]
  realisationId = creee.id

  const admin = await creerCompteAdmin(request)

  await page.goto('/fr/connexion')
  await page.getByLabel(/Courriel/i).fill(admin.email)
  await page.getByLabel('Mot de passe', { exact: true }).fill(MOT_DE_PASSE)
  await page.getByRole('button', { name: /^Se connecter$/ }).click()
  await page.waitForURL('**/admin', { timeout: 10_000 })

  await page.goto('/fr/admin/realisations')
  const ligneTableau = page.locator('li', { has: page.getByText(titreTest, { exact: true }) })
  await expect(ligneTableau).toBeVisible()
  await ligneTableau.getByRole('button', { name: /^Modifier/ }).click()

  const modal = page.locator('dialog[open]')
  await expect(modal).toBeVisible()
  // Confirme le point de départ : la modale de modification s'ouvre bien
  // sans aucune photo, comme la réalisation créée pour ce test.
  await expect(modal.locator('img')).toHaveCount(0)

  await modal.locator('input[type="file"]').setInputFiles({
    name: 'audit-bug1.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from(
      '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDQ0NDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wgARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
      'base64',
    ),
  })

  await modal.getByRole('button', { name: /^Enregistrer$/ }).click()

  // Confirme d'abord que l'écriture a réellement eu lieu en base — sans ça,
  // le test ne prouverait rien même si l'affichage se rafraîchit.
  await expect(async () => {
    const rep = await request.get(`${SUPABASE_URL}/rest/v1/realisations?select=images&id=eq.${realisationId}`, {
      headers: enTeteService,
    })
    const lignes = await rep.json()
    expect(lignes[0].images.length).toBe(1)
    cheminsDeposes = [lignes[0].images[0].url.split('/storage/v1/object/public/realisations/')[1]]
  }).toPass({ timeout: 10_000 })

  // Le cœur du test : SANS fermer/rouvrir la modale, la photo doit être
  // visible dans la liste de la modale elle-même (une vignette de plus).
  await expect(modal.locator('img')).toHaveCount(1, { timeout: 10_000 })

  // Et sans fermer la modale, la ligne du tableau (visible derrière) doit
  // aussi montrer le nouveau compteur de photos.
  await expect(ligneTableau.getByText(/1 photo/i)).toBeVisible({ timeout: 10_000 })
})

test.describe('bug 2 — plafond de taille cumulée', () => {
  test('trois fichiers dont la somme dépasse 7 Mo : message lisible, jamais de page d’erreur', async ({
    page,
    request,
  }) => {
    const admin = await creerCompteAdmin(request)

    await page.goto('/fr/connexion')
    await page.getByLabel(/Courriel/i).fill(admin.email)
    await page.getByLabel('Mot de passe', { exact: true }).fill(MOT_DE_PASSE)
    await page.getByRole('button', { name: /^Se connecter$/ }).click()
    await page.waitForURL('**/admin', { timeout: 10_000 })

    await page.goto('/fr/admin/realisations')
    await page.getByRole('button', { name: /^Ajouter une réalisation$/ }).click()
    const modal = page.locator('dialog[open]')
    await expect(modal).toBeVisible()
    await modal.getByLabel(/Titre \(français\)/i).fill(`AUDIT BUG2 TROP LOURD ${Date.now()}`)

    const taille = 2.6 * 1024 * 1024
    const fichiers = [1, 2, 3].map((i) => ({
      name: `audit-lourd-${i}.jpg`,
      mimeType: 'image/jpeg',
      buffer: Buffer.alloc(taille, i),
    }))
    await modal.locator('input[type="file"]').setInputFiles(fichiers)

    // Message lisible AVANT tout envoi — dès le choix des fichiers.
    await expect(modal.getByRole('alert').filter({ hasText: /Mo/ })).toBeVisible({ timeout: 5_000 })
    const texteMessage = await modal.getByRole('alert').filter({ hasText: /Mo/ }).textContent()
    console.log('message affiché :', texteMessage)
    expect(texteMessage).toMatch(/\d/) // chiffre(s) de Mo ou de fichiers présents

    // Le bouton d'envoi doit être désactivé — rien ne doit pouvoir partir.
    await expect(modal.getByRole('button', { name: /^Ajouter une réalisation$/ })).toBeDisabled()

    let erreurPage = false
    page.on('pageerror', () => {
      erreurPage = true
    })

    // Filet : tente quand même de soumettre (Enter dans un champ texte, par
    // exemple) — la garde côté onSubmit doit empêcher l'envoi.
    await modal.getByLabel(/Titre \(français\)/i).press('Enter').catch(() => {})
    await page.waitForTimeout(1500)

    expect(erreurPage, 'aucune exception cliente ne doit survenir').toBe(false)
    await expect(page).toHaveURL(/\/admin\/realisations/)
    await expect(modal).toBeVisible()

    // Rien n'a été créé.
    const rep = await request.get(
      `${SUPABASE_URL}/rest/v1/realisations?select=id&titre_fr=ilike.AUDIT BUG2 TROP LOURD*`,
      { headers: enTeteService },
    )
    expect(await rep.json()).toEqual([])
  })

  test('trois fichiers légers : les trois sont ajoutés', async ({ page, request }) => {
    const admin = await creerCompteAdmin(request)

    await page.goto('/fr/connexion')
    await page.getByLabel(/Courriel/i).fill(admin.email)
    await page.getByLabel('Mot de passe', { exact: true }).fill(MOT_DE_PASSE)
    await page.getByRole('button', { name: /^Se connecter$/ }).click()
    await page.waitForURL('**/admin', { timeout: 10_000 })

    await page.goto('/fr/admin/realisations')
    await page.getByRole('button', { name: /^Ajouter une réalisation$/ }).click()
    const modal = page.locator('dialog[open]')
    await expect(modal).toBeVisible()

    const titreTest = `AUDIT BUG2 LEGER ${Date.now()}`
    await modal.getByLabel(/Titre \(français\)/i).fill(titreTest)

    const jpegMinimal = Buffer.from(
      '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDQ0NDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wgARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
      'base64',
    )
    const fichiers = [1, 2, 3].map((i) => ({ name: `audit-leger-${i}.jpg`, mimeType: 'image/jpeg', buffer: jpegMinimal }))
    await modal.locator('input[type="file"]').setInputFiles(fichiers)

    // Aucun message d'erreur de taille pour une sélection légère.
    await expect(modal.getByRole('alert').filter({ hasText: /Mo/ })).toHaveCount(0)

    await modal.getByRole('button', { name: /^Ajouter une réalisation$/ }).click()

    await expect(async () => {
      const rep = await request.get(
        `${SUPABASE_URL}/rest/v1/realisations?select=id,images&titre_fr=eq.${encodeURIComponent(titreTest)}`,
        { headers: enTeteService },
      )
      const lignes = await rep.json()
      expect(lignes.length).toBe(1)
      expect(lignes[0].images.length).toBe(3)
      realisationId = lignes[0].id
      cheminsDeposes = lignes[0].images.map(
        (im: { url: string }) => im.url.split('/storage/v1/object/public/realisations/')[1],
      )
    }).toPass({ timeout: 10_000 })
  })
})
