import fs from 'node:fs'

import { expect, test, type APIRequestContext } from '@playwright/test'

/**
 * Branchement public de `galeries_photos` — étape 3/3 (migration 0043,
 * 27 août 2026).
 *
 * ---------------------------------------------------------------------------
 * CE QUE CE FICHIER PROUVE
 *
 * Contrairement à galeries-photos-admin.spec.ts (étape 2/3, qui ne prouve
 * que l'écriture en base), ce fichier prouve la BOUCLE COMPLÈTE : une
 * écriture depuis l'admin traverse `updateTag(ETIQUETTE_GALERIES)` et
 * ressort sur la page PUBLIQUE, servie par `createStaticClient()` +
 * `unstable_cache` (lib/galeries.ts) — jamais testé avant cette étape,
 * puisqu'aucune page publique ne lisait encore cette étiquette.
 *
 * Requêtes publiques faites via `request` (APIRequestContext propre, pas la
 * session `page` du navigateur) : `createStaticClient()` ignore les cookies
 * de toute façon, mais `request` élimine tout doute — c'est la même réponse
 * qu'un visiteur anonyme recevrait.
 *
 * Même discipline que les fichiers voisins : compte jetable créé par API
 * Auth (clé de service), élevé en `editor`, connexion par la vraie
 * interface, fichier de test supprimé du bucket dans un `finally` — le
 * retrait d'une galerie ne supprime QUE la ligne (patron de l'étape 2), le
 * fichier doit donc être nettoyé séparément ici comme dans
 * galeries-photos-admin.spec.ts.
 * ---------------------------------------------------------------------------
 */

const env: Record<string, string> = {}
for (const ligne of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = ligne.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m?.[1]) env[m[1]] = (m[2] ?? '').replace(/^['"]|['"]$/g, '')
}

function variable(nom: string): string {
  const valeur = env[nom]
  if (!valeur) throw new Error(`${nom} absente de .env.local — requise pour galeries-photos-public.spec.ts`)
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

const JPEG_MINIMAL = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDQ0NDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wgARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
  'base64',
)

let compteId: string | null = null
let cheminDepose: string | null = null
let ligneGalerieId: string | null = null

test.afterEach(async ({ request }) => {
  if (ligneGalerieId) {
    await request
      .delete(`${SUPABASE_URL}/rest/v1/galeries_photos?id=eq.${ligneGalerieId}`, { headers: enTeteService })
      .catch(() => {})
    ligneGalerieId = null
  }
  if (cheminDepose) {
    await request
      .delete(`${SUPABASE_URL}/storage/v1/object/medias`, { headers: enTeteService, data: { prefixes: [cheminDepose] } })
      .catch(() => {})
    cheminDepose = null
  }
  if (compteId) {
    await request.delete(`${SUPABASE_URL}/auth/v1/admin/users/${compteId}`, { headers: enTeteService }).catch(() => {})
    compteId = null
  }
})

async function creerCompteEditor(request: APIRequestContext) {
  const email = `zzaudit_galeries_pub_${Date.now()}@ko-lab.test`
  const rep = await request.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: enTeteService,
    data: { email, password: MOT_DE_PASSE, email_confirm: true, user_metadata: { nom: 'Audit Galeries Public' } },
  })
  const corps = await rep.json()
  if (!corps.id) throw new Error(`création du compte impossible : ${JSON.stringify(corps)}`)
  compteId = corps.id

  const elevation = await request.patch(`${SUPABASE_URL}/rest/v1/profils?id=eq.${corps.id}`, {
    headers: enTeteService,
    data: { role: 'editor' },
  })
  if (elevation.status() >= 400) throw new Error(`élévation en editor impossible : ${await elevation.text()}`)

  return { id: corps.id as string, email }
}

test('galerie Location — écrit depuis l’admin, ressort sur la page publique après invalidation du cache', async ({
  page,
  request,
}) => {
  const compte = await creerCompteEditor(request)

  await page.goto('/fr/connexion')
  await page.getByLabel(/Courriel/i).fill(compte.email)
  await page.getByLabel('Mot de passe', { exact: true }).fill(MOT_DE_PASSE)
  await page.getByRole('button', { name: /^Se connecter$/ }).click()
  await page.waitForURL('**/admin', { timeout: 10_000 })

  const altTest = `AUDIT public ${Date.now()}`

  // ---------------------------- Avant écriture — absent des deux pages ----------------------------
  const avantFr = await request.get('/fr/location')
  expect(await avantFr.text()).not.toContain(altTest)
  const avantEn = await request.get('/en/location')
  expect(await avantEn.text()).not.toContain(altTest)

  // ---------------------------- Ajout depuis l'admin ----------------------------
  await page.goto('/fr/admin/medias-emplacements?onglet=galeries')
  const sectionLocation = page.locator('#galerie-location')
  await sectionLocation.locator('input[type="file"]').setInputFiles({
    name: 'audit-galerie-public.jpg',
    mimeType: 'image/jpeg',
    buffer: JPEG_MINIMAL,
  })
  await sectionLocation.locator('#alt-fr-location').fill(altTest)
  await sectionLocation.getByRole('button', { name: /^Téléverser$/ }).click()

  let ligne: { id: string; url_stockage: string } | undefined
  await expect(async () => {
    const rep = await request.get(
      `${SUPABASE_URL}/rest/v1/galeries_photos?select=id,url_stockage&page=eq.location&alt_fr=eq.${encodeURIComponent(altTest)}`,
      { headers: enTeteService },
    )
    const lignes = await rep.json()
    expect(lignes.length).toBe(1)
    ligne = lignes[0]
  }).toPass({ timeout: 20_000 })
  if (!ligne) throw new Error('ligne introuvable après téléversement')
  ligneGalerieId = ligne.id
  cheminDepose = ligne.url_stockage.split('/storage/v1/object/public/medias/')[1]

  // ---------------------------- Apparaît sur la page publique (FR et EN — repli FR car alt_en NULL) ----------------------------
  await expect(async () => {
    const repFr = await request.get('/fr/location')
    expect(await repFr.text()).toContain(altTest)
  }).toPass({ timeout: 20_000 })

  // Cache-key DISTINCT de /fr/location (locale différente) : invalidée par
  // le même tag, mais régénérée à sa propre première requête post-écriture
  // — même `toPass()` que ci-dessus, pas une requête unique.
  await expect(async () => {
    const repEn = await request.get('/en/location')
    expect(await repEn.text(), 'alt_en NULL au téléversement -> repli FR même sur /en').toContain(altTest)
  }).toPass({ timeout: 20_000 })

  // ---------------------------- alt_en rempli depuis l'admin -> la version EN l'affiche ----------------------------
  const altEnTest = `AUDIT EN public ${Date.now()}`
  await page.reload()
  // Même patron que galeries-photos-admin.spec.ts (bouton retirer) : cible
  // la carte exacte via la classe de `CartePhotoGalerie` filtrée par l'input
  // dont la valeur correspond — pas `#galerie-location > div` (qui matche le
  // conteneur de grille tout entier, ambigu sur les 4 cartes qu'il contient).
  const carte = page
    .locator('#galerie-location div.border.border-ko-line.bg-ko-white.p-3')
    .filter({ has: page.locator(`input[value="${altTest}"]`) })
  await carte.getByLabel('Texte alternatif (anglais)').fill(altEnTest)
  await page.keyboard.press('Tab')

  await expect(async () => {
    const verif = await request.get(`${SUPABASE_URL}/rest/v1/galeries_photos?select=alt_en&id=eq.${ligneGalerieId}`, {
      headers: enTeteService,
    })
    expect((await verif.json())[0].alt_en).toBe(altEnTest)
  }).toPass({ timeout: 10_000 })

  await expect(async () => {
    const repEn = await request.get('/en/location')
    expect(await repEn.text()).toContain(altEnTest)
  }).toPass({ timeout: 20_000 })

  // Les AUTRES photos de la galerie restent en français sur /en — alt_en
  // reste NULL pour les 3 photos d'origine, jamais deviné.
  const repEnApresAltEn = await request.get('/en/location')
  const texteEnApresAltEn = await repEnApresAltEn.text()
  expect(texteEnApresAltEn).toContain('Salle aménagée avec mobilier loué')
  expect(texteEnApresAltEn).toContain('Structures louées installées sur site')
  expect(texteEnApresAltEn).toContain("Ambiance d'un site aménagé avec du mobilier loué")

  // ---------------------------- Retrait depuis l'admin -> disparaît des deux pages ----------------------------
  await page.reload()
  const boutonRetirer = page
    .locator('#galerie-location div.border.border-ko-line.bg-ko-white.p-3')
    .filter({ has: page.locator(`input[value="${altTest}"]`) })
    .getByRole('button', { name: /Retirer cette photo/i })
  page.once('dialog', (dialog) => dialog.accept())
  await boutonRetirer.click()

  await expect(async () => {
    const verif = await request.get(`${SUPABASE_URL}/rest/v1/galeries_photos?select=id&page=eq.location&alt_fr=eq.${encodeURIComponent(altTest)}`, {
      headers: enTeteService,
    })
    expect(await verif.json()).toEqual([])
  }).toPass({ timeout: 20_000 })
  ligneGalerieId = null

  await expect(async () => {
    const repFr = await request.get('/fr/location')
    expect(await repFr.text()).not.toContain(altTest)
    const repEn = await request.get('/en/location')
    expect(await repEn.text()).not.toContain(altEnTest)
  }).toPass({ timeout: 20_000 })

  // Le fichier reste dans le bucket — retrait de galerie = suppression de la
  // ligne uniquement, jamais du fichier (même patron que l'étape 2).
  const repFichier = await request.get(`${SUPABASE_URL}/storage/v1/object/public/medias/${cheminDepose}`)
  expect(repFichier.status(), 'le fichier doit rester dans le bucket après le retrait de la ligne').toBe(200)
})
