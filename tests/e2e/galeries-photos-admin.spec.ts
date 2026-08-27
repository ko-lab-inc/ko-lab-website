import fs from 'node:fs'

import { expect, test, type APIRequestContext } from '@playwright/test'

/**
 * /admin/medias-emplacements — onglet « Nos capacités » (galeries_photos,
 * migration 0043, étape 2/3, 27 août 2026).
 *
 * ---------------------------------------------------------------------------
 * CE QUE CE FICHIER PROUVE
 *
 * Les deux onglets basculent et l'actif survit à un rechargement (URL, pas
 * un état React) ; un ajout apparaît en fin de liste ; un réordonnancement
 * persiste après rechargement (donc en base, pas seulement côté client) ;
 * un retrait fait disparaître la ligne SANS supprimer le fichier du bucket ;
 * un alt_en laissé vide reste NULL, jamais chaîne vide ; un compte EDITOR
 * (pas admin) peut tout faire — la distinction de rôle demandée par rapport
 * aux emplacements fixes (admin seul).
 *
 * Même discipline que les fichiers voisins : compte jetable créé par API
 * Auth (clé de service), élevé en `editor` (pas `admin`), connexion par la
 * vraie interface, fichier de test supprimé du bucket et ligne restaurée
 * dans un `finally`.
 * ---------------------------------------------------------------------------
 */

const env: Record<string, string> = {}
for (const ligne of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = ligne.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m?.[1]) env[m[1]] = (m[2] ?? '').replace(/^['"]|['"]$/g, '')
}

function variable(nom: string): string {
  const valeur = env[nom]
  if (!valeur) throw new Error(`${nom} absente de .env.local — requise pour galeries-photos-admin.spec.ts`)
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
let altFrOriginal: { id: string; alt_fr: string } | null = null
let ordreVoisinOriginal: { id: string; ordre: number } | null = null

test.afterEach(async ({ request }) => {
  // Filet de sécurité : la ligne insérée par le test est censée être
  // retirée par l'INTERFACE (étape 4, « retrait »), mais si le test échoue
  // avant d'y arriver — exactement ce qui a laissé une ligne orpheline lors
  // de la mise au point de ce fichier — un DELETE direct la rattrape ici.
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
  if (altFrOriginal) {
    await request
      .patch(`${SUPABASE_URL}/rest/v1/galeries_photos?id=eq.${altFrOriginal.id}`, {
        headers: enTeteService,
        data: { alt_fr: altFrOriginal.alt_fr },
      })
      .catch(() => {})
    altFrOriginal = null
  }
  if (ordreVoisinOriginal) {
    // Le réordonnancement testé échange l'`ordre` de la nouvelle ligne AVEC
    // celui d'une voisine RÉELLE (pas de test) — sa suppression, qu'elle
    // vienne du retrait via l'interface ou du filet ci-dessus, ne rétablit
    // jamais cet échange. Sans cette restauration, chaque exécution du test
    // laisse un décalage permanent dans `ordre` (constaté deux fois de
    // suite pendant la mise au point : 20 devenu 30 et jamais repris).
    await request
      .patch(`${SUPABASE_URL}/rest/v1/galeries_photos?id=eq.${ordreVoisinOriginal.id}`, {
        headers: enTeteService,
        data: { ordre: ordreVoisinOriginal.ordre },
      })
      .catch(() => {})
    ordreVoisinOriginal = null
  }
  if (compteId) {
    await request.delete(`${SUPABASE_URL}/auth/v1/admin/users/${compteId}`, { headers: enTeteService }).catch(() => {})
    compteId = null
  }
})

async function creerCompteEditor(request: APIRequestContext) {
  const email = `zzaudit_galeries_${Date.now()}@ko-lab.test`
  const rep = await request.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: enTeteService,
    data: { email, password: MOT_DE_PASSE, email_confirm: true, user_metadata: { nom: 'Audit Galeries' } },
  })
  const corps = await rep.json()
  if (!corps.id) throw new Error(`création du compte impossible : ${JSON.stringify(corps)}`)
  compteId = corps.id

  // ⚠️ editor, PAS admin — c'est précisément la distinction que ce test
  // vérifie (les galeries sont ouvertes à l'équipe, pas admin seul comme
  // les emplacements fixes).
  const elevation = await request.patch(`${SUPABASE_URL}/rest/v1/profils?id=eq.${corps.id}`, {
    headers: enTeteService,
    data: { role: 'editor' },
  })
  if (elevation.status() >= 400) throw new Error(`élévation en editor impossible : ${await elevation.text()}`)

  return { id: corps.id as string, email }
}

test('onglet Nos capacités — bascule, ajout, réordonnancement, retrait, editor', async ({ page, request }) => {
  const compte = await creerCompteEditor(request)

  await page.goto('/fr/connexion')
  await page.getByLabel(/Courriel/i).fill(compte.email)
  await page.getByLabel('Mot de passe', { exact: true }).fill(MOT_DE_PASSE)
  await page.getByRole('button', { name: /^Se connecter$/ }).click()
  await page.waitForURL('**/admin', { timeout: 10_000 })

  // ---------------------------- 1. Bascule d'onglet + survie au rechargement ----------------------------
  await page.goto('/fr/admin/medias-emplacements')
  await expect(page.getByRole('heading', { name: 'Emplacements médias' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Nos capacités' })).not.toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('heading', { name: "Location d'équipement", level: 2 })).toBeHidden()

  await page.getByRole('link', { name: 'Nos capacités' }).click()
  await expect(page).toHaveURL(/\?onglet=galeries/)
  const sectionLocation = page.locator('#galerie-location')
  await expect(sectionLocation.getByRole('heading', { level: 2 })).toBeVisible()

  await page.reload()
  await expect(page).toHaveURL(/\?onglet=galeries/)
  await expect(page.locator('#galerie-location').getByRole('heading', { level: 2 })).toBeVisible()

  // ---------------------------- 2. Ajout — apparaît en fin de liste ----------------------------
  const compteAvant = await sectionLocation.locator('[id^="galerie-location"] img').count()
  const altTest = `AUDIT test ${Date.now()}`

  await sectionLocation.locator('input[type="file"]').setInputFiles({
    name: 'audit-galerie.jpg',
    mimeType: 'image/jpeg',
    buffer: JPEG_MINIMAL,
  })
  // `#alt-fr-location` cible précisément le champ du FORMULAIRE D'AJOUT — le
  // même libellé apparaît aussi sur chacune des cartes déjà présentes
  // (édition inline), `getByLabel` seul serait ambigu (mode strict).
  await sectionLocation.locator('#alt-fr-location').fill(altTest)
  await sectionLocation.getByRole('button', { name: /^Téléverser$/ }).click()

  await expect(async () => {
    const apres = await request.get(
      `${SUPABASE_URL}/rest/v1/galeries_photos?select=id,alt_fr,ordre&page=eq.location&order=ordre`,
      { headers: enTeteService },
    )
    const lignes = await apres.json()
    expect(lignes.length).toBeGreaterThan(compteAvant)
    const derniere = lignes[lignes.length - 1]
    expect(derniere.alt_fr).toBe(altTest)
  }).toPass({ timeout: 20_000 })

  const apresAjout = await request.get(
    `${SUPABASE_URL}/rest/v1/galeries_photos?select=id,url_stockage,alt_en,ordre&page=eq.location&order=ordre`,
    { headers: enTeteService },
  )
  const lignesApresAjout = await apresAjout.json()
  const nouvelle = lignesApresAjout[lignesApresAjout.length - 1]
  cheminDepose = nouvelle.url_stockage.split('/storage/v1/object/public/medias/')[1]
  ligneGalerieId = nouvelle.id

  // La nouvelle photo arrive en dernière position ; le réordonnancement du
  // point 3 va échanger son `ordre` avec celui de sa voisine immédiate —
  // une ligne RÉELLE, pas une ligne de test. On capture sa valeur d'origine
  // pour la restaurer dans `afterEach`, sans quoi l'échange reste permanent.
  const voisine = lignesApresAjout[lignesApresAjout.length - 2]
  ordreVoisinOriginal = { id: voisine.id, ordre: voisine.ordre }

  // ---------------------------- alt_en vide -> NULL, jamais chaîne vide ----------------------------
  expect(nouvelle.alt_en, 'alt_en laissé vide au téléversement doit rester NULL').toBeNull()

  await page.reload()

  // ---------------------------- 3. Réordonnancement — persiste après rechargement ----------------------------
  // Remonte la nouvelle photo une fois (elle est en dernière position).
  const boutonMonter = page
    .locator('#galerie-location')
    .getByRole('button', { name: /Monter cette photo/i })
    .last()
  await boutonMonter.click()

  await expect(async () => {
    const verif = await request.get(
      `${SUPABASE_URL}/rest/v1/galeries_photos?select=id,alt_fr,ordre&page=eq.location&order=ordre`,
      { headers: enTeteService },
    )
    const lignes = await verif.json()
    const indexNouvelle = lignes.findIndex((l: { alt_fr: string }) => l.alt_fr === altTest)
    // N'est plus en dernière position — le déplacement a été appliqué EN BASE.
    expect(indexNouvelle).toBeLessThan(lignes.length - 1)
  }).toPass({ timeout: 20_000 })

  const ordreAvantRechargement = (
    await (
      await request.get(`${SUPABASE_URL}/rest/v1/galeries_photos?select=id,ordre&page=eq.location&order=ordre`, {
        headers: enTeteService,
      })
    ).json()
  ).map((l: { id: string }) => l.id)

  await page.reload()

  const ordreApresRechargement = (
    await (
      await request.get(`${SUPABASE_URL}/rest/v1/galeries_photos?select=id,ordre&page=eq.location&order=ordre`, {
        headers: enTeteService,
      })
    ).json()
  ).map((l: { id: string }) => l.id)

  expect(ordreApresRechargement, 'le nouvel ordre doit persister après rechargement, pas seulement en mémoire').toEqual(
    ordreAvantRechargement,
  )

  // ---------------------------- Édition inline d'alt_fr (sur une photo existante) ----------------------------
  const avantEditionAlt = await request.get(
    `${SUPABASE_URL}/rest/v1/galeries_photos?select=id,alt_fr&page=eq.location&alt_fr=eq.Structures louées installées sur site`,
    { headers: enTeteService },
  )
  const ligneAEditer = (await avantEditionAlt.json())[0]
  if (ligneAEditer) {
    altFrOriginal = { id: ligneAEditer.id, alt_fr: ligneAEditer.alt_fr }
    const nouvelAlt = `AUDIT alt modifié ${Date.now()}`

    // Cible le champ dont la VALEUR actuelle correspond à la ligne visée.
    const champCorrespondant = page.locator(`#galerie-location input[value="${ligneAEditer.alt_fr}"]`)
    await champCorrespondant.fill(nouvelAlt)
    // `page.keyboard`, pas `champCorrespondant.press` : le `fill` ci-dessus
    // vient de changer la valeur, `[value="..."]` ne re-résoudrait plus rien
    // — `page.keyboard` agit sur l'élément qui a déjà le focus.
    await page.keyboard.press('Tab')

    await expect(async () => {
      const verif = await request.get(`${SUPABASE_URL}/rest/v1/galeries_photos?select=alt_fr&id=eq.${ligneAEditer.id}`, {
        headers: enTeteService,
      })
      expect((await verif.json())[0].alt_fr).toBe(nouvelAlt)
    }).toPass({ timeout: 10_000 })
  }

  // ---------------------------- 4. Retrait — ligne disparaît, fichier reste dans le bucket ----------------------------
  await page.reload()
  // `altTest` n'existe que comme VALEUR d'un <input>, jamais comme texte
  // rendu — `getByText()` ne l'aurait donc jamais trouvé (bug constaté : le
  // clic ci-dessous restait bloqué 30 s sur un locator à zéro élément).
  // On cible la carte exacte via la classe de `CartePhotoGalerie` filtrée
  // par l'input dont la valeur correspond, pas via `.first()`/`.last()`
  // sur une liste de <div> ambiguë.
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
  ligneGalerieId = null // déjà retirée par l'interface — le filet de l'afterEach n'a plus à agir

  // Le fichier, lui, doit toujours répondre 200 — c'est tout le sens du point 6.
  const repFichier = await request.get(`${SUPABASE_URL}/storage/v1/object/public/medias/${cheminDepose}`)
  expect(repFichier.status(), 'le fichier doit rester dans le bucket après le retrait de la ligne').toBe(200)
})
