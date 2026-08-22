import fs from 'node:fs'

import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

/**
 * /nos-capacites/le-lab — galerie des 7 emplacements lab_1..lab_7.
 *
 * Même discipline que architecture-media-integration.spec.ts : compte admin
 * temporaire, restauration par l'INTERFACE (pas par PATCH direct — un PATCH
 * direct corrige la base mais n'invalide jamais le cache ISR, voir le
 * commentaire de ce fichier-là pour la preuve mesurée).
 */

const env: Record<string, string> = {}
for (const ligne of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = ligne.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m?.[1]) env[m[1]] = (m[2] ?? '').replace(/^['"]|['"]$/g, '')
}

function variable(nom: string): string {
  const valeur = env[nom]
  if (!valeur) throw new Error(`${nom} absente de .env.local — requise pour lab-galerie-integration.spec.ts`)
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
  const email = `zzaudit_lab_galerie_${Date.now()}@ko-lab.test`
  const rep = await request.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: enTeteService,
    data: { email, password: MOT_DE_PASSE, email_confirm: true, user_metadata: { nom: 'Audit Lab Galerie' } },
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

async function lireLab1(request: APIRequestContext) {
  const rep = await request.get(
    `${SUPABASE_URL}/rest/v1/medias_emplacements?select=url_stockage,alt_text_fr,alt_text_en&cle=eq.lab_1`,
    { headers: enTeteService },
  )
  const corps = await rep.json()
  return corps[0] as { url_stockage: string; alt_text_fr: string; alt_text_en: string | null }
}

async function connecter(page: Page, email: string) {
  await page.goto('/fr/connexion')
  await page.getByLabel(/Courriel/i).fill(email)
  await page.getByLabel('Mot de passe', { exact: true }).fill(MOT_DE_PASSE)
  await page.getByRole('button', { name: /^Se connecter$/ }).click()
  await page.waitForURL('**/admin', { timeout: 10_000 })
}

async function editerLab1ParUi(page: Page, url: string, alt: string) {
  await page.goto('/fr/admin/medias-emplacements')
  const ligne = page.locator('tr', { has: page.getByText('lab_1', { exact: true }) })
  await ligne.getByRole('button', { name: /Modifier/i }).click()
  await ligne.getByRole('textbox', { name: /Nouvelle URL/i }).fill(url)
  await ligne.getByRole('textbox', { name: /Texte alternatif \(français\)/i }).fill(alt)
  await ligne.getByRole('button', { name: /^Enregistrer$/ }).click()
  await ligne.getByText(url, { exact: false }).waitFor({ timeout: 10_000 })
}

test('1. La galerie du LAB affiche 7 images, aucune 404', async ({ page }) => {
  const reponse = await page.goto('/fr/nos-capacites/le-lab')
  expect(reponse?.status()).toBeLessThan(400)

  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let total = 0
      const timer = setInterval(() => {
        window.scrollBy(0, 400)
        total += 400
        if (total >= document.body.scrollHeight) {
          clearInterval(timer)
          resolve(undefined)
        }
      }, 120)
    })
  })
  await page.waitForTimeout(500)

  // 7 vignettes dans la grille + 1 image de hero (PageCapacite) = 8 <img>
  // minimum sur cette page (sans compter nav/footer, qui n'en ont pas ici).
  const brisees = await page.evaluate(() =>
    Array.from(document.images).filter((img) => img.complete && img.naturalWidth === 0).length,
  )
  expect(brisees, 'aucune image cassée attendue').toBe(0)

  const nbVignettesGrille = await page.locator('main img').count()
  expect(nbVignettesGrille, 'hero + 7 vignettes de la grille = 8 <img> au moins').toBeGreaterThanOrEqual(8)
})

test('2. Changer lab_1 depuis /admin/medias-emplacements change la photo dans la galerie', async ({
  page,
  request,
}) => {
  const original = await lireLab1(request)

  try {
    const compte = await creerCompteAdmin(request)
    await connecter(page, compte.email)

    const nouvelleUrl = `${SUPABASE_URL}/storage/v1/object/public/medias/rental/location-ambiance-2026.webp`
    const nouvelAlt = `AUDIT galerie lab ${Date.now()}`

    await editerLab1ParUi(page, nouvelleUrl, nouvelAlt)

    // Re-navigue plutôt que de dépendre d'un seul goto — updateTag invalide
    // en stale-while-revalidate, voir architecture-media-integration.spec.ts
    // pour la preuve mesurée de ce comportement.
    await expect(async () => {
      await page.goto('/fr/nos-capacites/le-lab')
      await expect(page.locator(`img[alt="${nouvelAlt}"]`).first()).toBeVisible({ timeout: 2_000 })
    }).toPass({ timeout: 30_000, intervals: [500, 1_000, 2_000, 3_000] })

    const img = page.locator(`img[alt="${nouvelAlt}"]`).first()
    const src = await img.getAttribute('src')
    expect(decodeURIComponent(src ?? '')).toContain('location-ambiance-2026.webp')
  } finally {
    // Restauration par l'INTERFACE — un PATCH direct laisserait le cache ISR
    // sur la valeur de test (même piège déjà rencontré et corrigé pour
    // architecture-media-integration.spec.ts).
    await editerLab1ParUi(page, original.url_stockage, original.alt_text_fr)
  }
})
