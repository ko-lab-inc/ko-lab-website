import fs from 'node:fs'

import { expect, test, type APIRequestContext } from '@playwright/test'

/**
 * SelecteurPhotoEmplacement — modale simplifiée (27 août 2026).
 *
 * ---------------------------------------------------------------------------
 * CE QUE CE FICHIER PROUVE
 *
 * Photo actuelle en grand à l'ouverture, grille fermée par défaut,
 * téléversement possible sans jamais déplier la grille, dépliage atteignable
 * et actionnable au clavier, et la grille — une fois dépliée — se comporte
 * toujours comme avant (sélection, persistance).
 *
 * Même discipline que les fichiers voisins : compte admin de test créé par
 * API Auth (clé de service), `besoin_1` restaurée PAR L'INTERFACE à chaque
 * étape (jamais un PATCH direct, qui laisserait le cache de page bloqué —
 * voir medias-emplacements-televersement.spec.ts), fichier de test supprimé
 * du bucket.
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
    throw new Error(`${nom} absente de .env.local — requise pour medias-emplacements-modale-simplifiee.spec.ts`)
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

/** JPEG 1×1 minimal, vrais octets magiques — même fixture que les fichiers voisins. */
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
    // Filet de sécurité pour la donnée seule — le test restaure déjà par
    // l'interface avant d'arriver ici dans le cas nominal.
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
  const email = `zzaudit_modale_${Date.now()}@ko-lab.test`
  const rep = await request.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: enTeteService,
    data: { email, password: MOT_DE_PASSE, email_confirm: true, user_metadata: { nom: 'Audit Modale' } },
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

test('modale simplifiée — photo en grand, grille repliée, téléversement sans déplier, grille au clavier', async ({
  page,
  request,
}) => {
  const avant = await request.get(
    `${SUPABASE_URL}/rest/v1/medias_emplacements?select=url_stockage,alt_text_fr,alt_text_en&cle=eq.besoin_1`,
    { headers: enTeteService },
  )
  besoin1Original = (await avant.json())[0]
  const cheminOriginal = besoin1Original!.url_stockage.split('/storage/v1/object/public/medias/')[1]!

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

  // ---------------------------- 1. Ouverture : photo en grand, grille fermée ----------------------------
  const grosPlan = modal.locator('img').first()
  await expect(grosPlan).toBeVisible()
  const srcInitial = await grosPlan.getAttribute('src')
  expect(decodeURIComponent(srcInitial ?? ''), 'le gros plan doit montrer la photo actuelle à l\'ouverture').toContain(
    cheminOriginal,
  )

  const details = modal.locator('details')
  await expect(details, 'la grille doit être repliée par défaut').not.toHaveAttribute('open', '')
  const grille = modal.locator('[aria-pressed]')
  // Présente dans le DOM (le <details> ne la retire pas), mais pas visible.
  await expect(grille.first()).toBeHidden()

  // ---------------------------- 2. Téléversement SANS déplier la grille ----------------------------
  await modal
    .getByLabel(/Remplacer par une nouvelle photo/i)
    .setInputFiles({ name: 'audit-modale.jpg', mimeType: 'image/jpeg', buffer: JPEG_MINIMAL })

  await expect(async () => {
    const src = await grosPlan.getAttribute('src')
    expect(decodeURIComponent(src ?? '')).toContain('/operations/besoin-1-')
  }).toPass({ timeout: 20_000 })

  // La grille est toujours fermée — le téléversement ne l'a pas ouverte.
  await expect(details).not.toHaveAttribute('open', '')

  await modal.getByRole('button', { name: /^Enregistrer$/ }).click()
  await expect(modal).toBeHidden({ timeout: 10_000 })

  const apresUpload = await request.get(
    `${SUPABASE_URL}/rest/v1/medias_emplacements?select=url_stockage&cle=eq.besoin_1`,
    { headers: enTeteService },
  )
  const urlApresUpload = (await apresUpload.json())[0].url_stockage as string
  expect(urlApresUpload).toContain('/storage/v1/object/public/medias/operations/besoin-1-')
  cheminDepose = urlApresUpload.split('/storage/v1/object/public/medias/')[1] ?? null

  // ---------------------------- 3. Dépliage AU CLAVIER ----------------------------
  await ligne.getByRole('button', { name: /Modifier/i }).click()
  const modal2 = page.locator('dialog[open]')
  await expect(modal2).toBeVisible()

  const details2 = modal2.locator('details')
  const summary2 = modal2.locator('summary')
  await expect(details2).not.toHaveAttribute('open', '')

  await summary2.focus()
  await expect(summary2).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(details2, 'Entrée sur le <summary> focalisé doit déplier la grille').toHaveAttribute('open', '')

  const grille2 = modal2.locator('[aria-pressed]')
  await expect(grille2.first()).toBeVisible()

  // ---------------------------- 4. Choisir une photo existante dans la grille dépliée ----------------------------
  // Premier bouton dont le titre (chemin réel du fichier) diffère de la photo
  // actuelle — n'importe lequel convient, on vérifie juste que le geste
  // fonctionne « comme avant ».
  //
  // ⚠️ `chemin.includes('/')` élimine l'entrée synthétique de la « photo
  // actuelle » que le composant ajoute quand elle n'est ni dans
  // `fichiersDisponibles` ni dans `fichiersTeleverses` (cas de ce test :
  // photo tout juste déposée, absente des deux) — son `title` vaut alors la
  // CLÉ de l'emplacement (`besoin_1`), pas un chemin de bucket, et pointe de
  // toute façon vers `photoActuelle` : la choisir ne changerait rien.
  const boutons = grille2
  const compteBoutons = await boutons.count()
  let choisi: { chemin: string; locator: ReturnType<typeof boutons.nth> } | null = null
  for (let i = 0; i < compteBoutons; i += 1) {
    const bouton = boutons.nth(i)
    const chemin = await bouton.getAttribute('title')
    if (chemin?.includes('/') && chemin !== cheminOriginal && !chemin.startsWith('operations/besoin-1-')) {
      choisi = { chemin, locator: bouton }
      break
    }
  }
  expect(choisi, 'la grille dépliée doit proposer au moins une photo différente de besoin_1').not.toBeNull()

  await choisi!.locator.click()
  await expect(choisi!.locator).toHaveAttribute('aria-pressed', 'true')

  await modal2.getByRole('button', { name: /^Enregistrer$/ }).click()
  await expect(modal2).toBeHidden({ timeout: 10_000 })

  const apresChoixGrille = await request.get(
    `${SUPABASE_URL}/rest/v1/medias_emplacements?select=url_stockage&cle=eq.besoin_1`,
    { headers: enTeteService },
  )
  const urlApresChoixGrille = (await apresChoixGrille.json())[0].url_stockage as string
  expect(urlApresChoixGrille, 'la grille dépliée doit toujours permettre de choisir une photo existante').toContain(
    choisi!.chemin,
  )

  // ---------------------------- Restauration PAR L'INTERFACE ----------------------------
  await page.goto('/fr/admin/medias-emplacements')
  await ligne.getByRole('button', { name: /Modifier/i }).click()
  const modalFinale = page.locator('dialog[open]')
  await modalFinale.locator('summary').click()
  await modalFinale.locator(`button[title="${cheminOriginal}"]`).click()
  await modalFinale.getByRole('button', { name: /^Enregistrer$/ }).click()
  await expect(modalFinale).toBeHidden({ timeout: 10_000 })
})
