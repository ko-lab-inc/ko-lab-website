import fs from 'node:fs'

import { expect, test, type APIRequestContext } from '@playwright/test'

/**
 * /admin/carrieres — attribution d'une photo de poste (photo_url, migration
 * 0032) : sélection dans le dropdown, aperçu, enregistrement, persistance
 * après un rechargement complet de la page.
 *
 * Compte de test (`editor` suffit — postes_maj_equipe, 0002) et restauration
 * par PATCH direct : contrairement à /admin/medias-emplacements, cette
 * action n'invalide aucun cache (voir attribuerPhotoPoste), donc pas de
 * risque de laisser une valeur de test servie par un cache stale — un PATCH
 * direct suffit ici.
 */

const env: Record<string, string> = {}
for (const ligne of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = ligne.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m?.[1]) env[m[1]] = (m[2] ?? '').replace(/^['"]|['"]$/g, '')
}

function variable(nom: string): string {
  const valeur = env[nom]
  if (!valeur) throw new Error(`${nom} absente de .env.local — requise pour carrieres-photo-poste.spec.ts`)
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
  const email = `zzaudit_photo_poste_${Date.now()}@ko-lab.test`
  const rep = await request.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: enTeteService,
    data: { email, password: MOT_DE_PASSE, email_confirm: true, user_metadata: { nom: 'Audit Photo Poste' } },
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

async function lirePoste(request: APIRequestContext, titre: string) {
  const rep = await request.get(
    `${SUPABASE_URL}/rest/v1/postes_carrieres?select=id,photo_url&titre_fr=eq.${encodeURIComponent(titre)}`,
    { headers: enTeteService },
  )
  const corps = await rep.json()
  return corps[0] as { id: string; photo_url: string | null }
}

async function restaurerPoste(request: APIRequestContext, id: string, photo_url: string | null) {
  const rep = await request.patch(`${SUPABASE_URL}/rest/v1/postes_carrieres?id=eq.${id}`, {
    headers: enTeteService,
    data: { photo_url },
  })
  if (rep.status() >= 400) throw new Error(`restauration du poste échouée : ${await rep.text()}`)
}

const TITRE_POSTE = 'Chauffeur-livreur'

test('attribuer une photo depuis /admin/carrieres, aperçu puis persistance après reload', async ({
  page,
  request,
}) => {
  const original = await lirePoste(request, TITRE_POSTE)

  try {
    const compte = await creerCompteEditor(request)

    await page.goto('/fr/connexion')
    await page.getByLabel(/Courriel/i).fill(compte.email)
    await page.getByLabel('Mot de passe', { exact: true }).fill(MOT_DE_PASSE)
    await page.getByRole('button', { name: /^Se connecter$/ }).click()
    await page.waitForURL('**/admin', { timeout: 10_000 })

    await page.goto('/fr/admin/carrieres')
    const ligne = page.locator('li', { hasText: TITRE_POSTE })
    await ligne.getByRole('button', { name: /Modifier la photo/i }).click()

    const dialogue = page.locator('dialog[open]')
    await expect(dialogue).toBeVisible()

    const select = dialogue.getByLabel(/Choisir un fichier/i)
    // Premier fichier réel proposé (l'option 0 est « Aucune photo »).
    const valeurChoisie = await select.locator('option').nth(1).getAttribute('value')
    expect(valeurChoisie, 'le dropdown devrait proposer au moins un fichier').toBeTruthy()
    await select.selectOption(valeurChoisie!)

    // Aperçu affiché — une image apparaît dans le cadre 200×200 du modal.
    await expect(dialogue.locator('img')).toBeVisible()

    await dialogue.getByRole('button', { name: /^Enregistrer$/ }).click()
    // Le modal se ferme sur succès.
    await expect(dialogue).toBeHidden({ timeout: 10_000 })

    // Persistance réelle en base, pas seulement l'état React local.
    const enBase = await lirePoste(request, TITRE_POSTE)
    expect(enBase.photo_url).toBe(valeurChoisie)

    // Reload complet de la page — la vignette doit refléter la nouvelle photo.
    // ⚠️ Cibler le BOUTON vignette précisément, pas n'importe quel <img> du
    // <li> : le <dialog> fermé reste dans le DOM (patron natif <dialog>) et
    // son aperçu 200×200 matcherait aussi un sélecteur `img` générique.
    await page.reload()
    const ligneApres = page.locator('li', { hasText: TITRE_POSTE })
    const vignetteApres = ligneApres.getByRole('button', { name: /Modifier la photo/i })
    await expect(vignetteApres.locator('img')).toBeVisible({ timeout: 10_000 })
    const srcVignette = await vignetteApres.locator('img').getAttribute('src')
    expect(decodeURIComponent(srcVignette ?? '')).toContain(valeurChoisie!.split('/storage/v1/object/public/medias/')[1] ?? '')
  } finally {
    await restaurerPoste(request, original.id, original.photo_url)
  }
})
