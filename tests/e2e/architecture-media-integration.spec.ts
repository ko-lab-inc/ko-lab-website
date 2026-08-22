import fs from 'node:fs'

import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

/**
 * Intégration route A — les 5 composants branchés sur medias_emplacements
 * affichent bien ce que la base contient, et suivent un changement fait
 * depuis /admin/medias-emplacements sans redéploiement.
 *
 * ---------------------------------------------------------------------------
 * PÉRIMÈTRE
 *
 * 1. Accueil et pages capacités chargent sans rupture — les URLs déjà en
 *    base (copiées d'images.ts par la migration 0031) sont bien celles
 *    rendues.
 * 2. Modifier besoin_1 depuis l'admin change la photo réellement affichée à
 *    l'accueil, sans redéploiement — preuve que la base est lue ET que le
 *    cache (updateTag + revalidatePath) est invalidé correctement.
 *
 * Compte de test et restauration : même discipline que les deux specs
 * précédentes (admin.spec.ts, medias-emplacements.spec.ts).
 * ---------------------------------------------------------------------------
 */

const env: Record<string, string> = {}
for (const ligne of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = ligne.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m?.[1]) env[m[1]] = (m[2] ?? '').replace(/^['"]|['"]$/g, '')
}

function variable(nom: string): string {
  const valeur = env[nom]
  if (!valeur) throw new Error(`${nom} absente de .env.local — requise pour architecture-media-integration.spec.ts`)
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
  const email = `zzaudit_integration_${Date.now()}@ko-lab.test`
  const rep = await request.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: enTeteService,
    data: { email, password: MOT_DE_PASSE, email_confirm: true, user_metadata: { nom: 'Audit Integration' } },
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

async function connecter(page: Page, email: string) {
  await page.goto('/fr/connexion')
  await page.getByLabel(/Courriel/i).fill(email)
  await page.getByLabel('Mot de passe', { exact: true }).fill(MOT_DE_PASSE)
  await page.getByRole('button', { name: /^Se connecter$/ }).click()
  await page.waitForURL('**/admin', { timeout: 10_000 })
}

test('1. Accueil et pages capacités chargent sans rupture (URLs déjà en base)', async ({ page, request }) => {
  const besoin1 = await lireBesoin1(request)

  // Re-navigue plutôt que de dépendre d'un seul goto : un test précédent (ou
  // un admin réel) peut avoir édité besoin_1 juste avant ce test, et la page
  // ISR sert alors sa version en cache le temps d'une régénération en
  // arrière-plan (stale-while-revalidate) — même raisonnement que le test 2
  // ci-dessous, voir son commentaire pour la preuve mesurée.
  await expect(async () => {
    const reponse = await page.goto('/fr')
    expect(reponse?.status()).toBeLessThan(400)
    await expect(page.locator('img[alt="' + besoin1.alt_text_fr + '"]').first()).toBeVisible({ timeout: 2_000 })
  }).toPass({ timeout: 30_000, intervals: [500, 1_000, 2_000, 3_000] })

  // La carte « Déployer » (besoin_1) doit afficher exactement l'URL qui est
  // en base aujourd'hui — pas une valeur ancienne d'images.ts figée dans le
  // HTML, pas un repli déclenché par erreur.
  const imgBesoin1 = page.locator('img[alt="' + besoin1.alt_text_fr + '"]').first()
  const srcAttribut = await imgBesoin1.getAttribute('src')
  // next/image ré-encode l'URL d'origine dans le paramètre ?url= de son
  // optimiseur — on vérifie qu'elle y est bien, pas une égalité stricte.
  expect(decodeURIComponent(srcAttribut ?? '')).toContain(besoin1.url_stockage)

  for (const chemin of [
    '/fr/nos-capacites/installations',
    '/fr/nos-capacites/le-lab',
    '/fr/nos-capacites/operations-terrain',
    '/fr/nos-capacites/equipements',
  ]) {
    const reponse = await page.goto(chemin)
    expect(reponse?.status(), `${chemin} a répondu ${reponse?.status()}`).toBeLessThan(400)
    // Aucune image cassée sur la page (naturalWidth de 0 = échec de
    // chargement) — sonde générique, pas spécifique à une clé.
    const brisees = await page.evaluate(() =>
      Array.from(document.images).filter((img) => img.complete && img.naturalWidth === 0).length,
    )
    expect(brisees, `${chemin} contient ${brisees} image(s) cassée(s)`).toBe(0)
  }
})

test('2. Changer besoin_1 depuis /admin/medias-emplacements change la photo à l’accueil, sans redéploiement', async ({
  page,
  request,
}) => {
  const original = await lireBesoin1(request)

  try {
    const compte = await creerCompteAdmin(request)
    await connecter(page, compte.email)

    // Étape demandée : changer besoin_1 vers un autre fichier réel du bucket
    // medias (lab-machine-2026.webp).
    const nouvelleUrl = `${SUPABASE_URL}/storage/v1/object/public/medias/lab/lab-machine-2026.webp`
    const nouvelAlt = `AUDIT intégration ${Date.now()}`

    await page.goto('/fr/admin/medias-emplacements')
    const ligne = page.locator('tr', { has: page.getByText('besoin_1', { exact: true }) })
    await ligne.getByRole('button', { name: /Modifier/i }).click()
    await ligne.getByRole('textbox', { name: /Nouvelle URL/i }).fill(nouvelleUrl)
    await ligne.getByRole('textbox', { name: /Texte alternatif \(français\)/i }).fill(nouvelAlt)
    await ligne.getByRole('button', { name: /^Enregistrer$/ }).click()
    await expect(page.getByText(nouvelleUrl, { exact: false })).toBeVisible({ timeout: 10_000 })

    // Rafraîchit la page d'accueil — SANS redémarrer le serveur, SANS
    // redéployer : seuls updateTag + revalidatePath (actions.ts) doivent
    // avoir invalidé le cache pour qu'un GET reflète la nouvelle valeur.
    //
    // ⚠️ RE-NAVIGUER, pas seulement laisser `toBeVisible` réessayer sur un
    // DOM déjà chargé. `updateTag` invalide en stale-while-revalidate : la
    // toute première requête après l'invalidation peut encore recevoir la
    // page mise en cache pendant qu'une régénération se fait en arrière-plan
    // (confirmé par sonde directe — t=0 encore l'ancien alt, ~500ms plus
    // tard le nouveau). Un seul `page.goto` figé suivi d'un `toBeVisible` qui
    // ne fait que repoller le même DOM ne peut jamais voir cette
    // régénération arriver — exactement ce qui a fait échouer ce test au
    // premier jet, en dev ET en production, à tort. Une personne réelle qui
    // rafraîchit une seconde fois verrait la nouvelle photo ; ce test
    // reproduit ce geste au lieu d'exiger une fraîcheur instantanée que
    // l'architecture ISR ne promet pas.
    await expect(async () => {
      await page.goto('/fr')
      await expect(page.locator(`img[alt="${nouvelAlt}"]`).first()).toBeVisible({ timeout: 2_000 })
    }).toPass({ timeout: 30_000, intervals: [500, 1_000, 2_000, 3_000] })

    const imgBesoin1 = page.locator(`img[alt="${nouvelAlt}"]`).first()
    const srcApres = await imgBesoin1.getAttribute('src')
    expect(decodeURIComponent(srcApres ?? '')).toContain('lab-machine-2026.webp')
  } finally {
    // ⚠️ Restaurer par l'INTERFACE, pas seulement par PATCH direct (clé de
    // service). Un PATCH direct corrige la base mais n'appelle jamais
    // updateTag/revalidatePath — la page ISR continue de servir la valeur de
    // test indéfiniment (jusqu'à revalidate: 3600), exactement le problème
    // que ce test vérifie par ailleurs. C'est ce qui a fait échouer le test 1
    // juste après celui-ci lors de la mise au point : mes propres sondes de
    // diagnostic restauraient par PATCH direct et laissaient le cache local
    // sur une valeur AUDIT. Le PATCH direct reste en filet de sécurité, pour
    // la donnée seule, si la restauration par l'interface échoue elle-même.
    try {
      await page.goto('/fr/admin/medias-emplacements')
      const ligne = page.locator('tr', { has: page.getByText('besoin_1', { exact: true }) })
      await ligne.getByRole('button', { name: /Modifier/i }).click()
      await ligne.getByRole('textbox', { name: /Nouvelle URL/i }).fill(original.url_stockage)
      await ligne.getByRole('textbox', { name: /Texte alternatif \(français\)/i }).fill(original.alt_text_fr)
      await ligne.getByRole('button', { name: /^Enregistrer$/ }).click()
      await ligne.getByText(original.url_stockage, { exact: false }).waitFor({ timeout: 10_000 })
    } finally {
      await restaurerBesoin1(request, original)
    }
  }
})
