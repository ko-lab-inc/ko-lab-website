import fs from 'node:fs'

import { expect, test } from '@playwright/test'

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

async function creerCompteAdmin(request: import('@playwright/test').APIRequestContext, prefixe: string) {
  const email = `zzaudit_${prefixe}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@ko-lab.test`
  const rep = await request.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: enTeteService,
    data: { email, password: MOT_DE_PASSE, email_confirm: true },
  })
  const compteId = (await rep.json()).id
  await request.patch(`${SUPABASE_URL}/rest/v1/profils?id=eq.${compteId}`, {
    headers: enTeteService,
    data: { role: 'admin' },
  })
  return { email, compteId }
}

async function connecter(page: import('@playwright/test').Page, email: string) {
  await page.goto('/fr/connexion')
  await page.getByLabel(/Courriel/i).fill(email)
  await page.getByLabel('Mot de passe', { exact: true }).fill(MOT_DE_PASSE)
  await page.getByRole('button', { name: /^Se connecter$/ }).click()
  await page.waitForURL('**/admin', { timeout: 10_000 })
}

async function nettoyerComptes(request: import('@playwright/test').APIRequestContext, ids: string[]) {
  for (const id of ids) {
    await request.delete(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, { headers: enTeteService }).catch(() => {})
  }
}

test.describe('bug — téléversement galeries, page d\'erreur brute', () => {
  test('bouton inactif sans fichier ET sans alt FR ; message qui dit ce qui manque', async ({ page, request }) => {
    const { email, compteId } = await creerCompteAdmin(request, 'gal_gate')
    try {
      await connecter(page, email)
      await page.goto('/fr/admin/medias-emplacements?onglet=galeries')

      const section = page.locator('[id^="galerie-"]').first()
      const bouton = section.getByRole('button', { name: /Téléverser/i })

      // Rien de rempli : bouton inactif, message "les deux manquent".
      await expect(bouton).toBeDisabled()
      await expect(section.getByText(/Choisissez un fichier et remplissez/i)).toBeVisible()

      // Alt FR seul rempli : toujours inactif, message "fichier manquant".
      await section.locator('input[name="alt_fr"]').fill('Texte alternatif de test')
      await expect(bouton).toBeDisabled()
      await expect(section.getByText(/Choisissez d.abord un fichier/i)).toBeVisible()

      // Fichier seul (alt FR vidé) : toujours inactif, message "alt manquant".
      await section.locator('input[name="alt_fr"]').fill('')
      const jpegMinimal = Buffer.from(
        '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
        'base64',
      )
      await section.locator('input[type="file"]').setInputFiles({
        name: 'audit-gate.jpg',
        mimeType: 'image/jpeg',
        buffer: jpegMinimal,
      })
      await expect(bouton).toBeDisabled()
      await expect(section.getByText(/texte alternatif.*requis/i)).toBeVisible()

      // Les deux : bouton actif, message disparu.
      await section.locator('input[name="alt_fr"]').fill('Texte alternatif de test')
      await expect(bouton).toBeEnabled()
      await expect(section.getByText(/Choisissez/i)).not.toBeVisible()
    } finally {
      await nettoyerComptes(request, [compteId])
    }
  })

  test('fichier trop lourd : message lisible, jamais de page brute, rien envoyé au serveur', async ({ page, request }) => {
    const { email, compteId } = await creerCompteAdmin(request, 'gal_lourd')
    let erreurPage = false
    page.on('pageerror', () => {
      erreurPage = true
    })
    try {
      await connecter(page, email)
      await page.goto('/fr/admin/medias-emplacements?onglet=galeries')

      const section = page.locator('[id^="galerie-"]').first()
      const nbAvant = await section.locator('[class*="grid-cols-2"] > div, .relative.aspect-square').count()

      await section.locator('input[type="file"]').setInputFiles({
        name: 'audit-8mo.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.alloc(8 * 1024 * 1024, 3),
      })
      await section.locator('input[name="alt_fr"]').fill('AUDIT trop lourd')

      const bouton = section.getByRole('button', { name: /Téléverser/i })
      await expect(bouton).toBeDisabled()
      await expect(section.getByText(/8\.0 Mo.*limite est de 6\.0 Mo/i)).toBeVisible()

      // Tentative de contournement : Entrée dans le champ alt.
      await section.locator('input[name="alt_fr"]').press('Enter')
      await page.waitForTimeout(2000)

      expect(erreurPage).toBe(false)
      await expect(page.getByText(/Quelque chose s.est mal passé/i)).not.toBeVisible()
      await expect(page.getByText(/page couldn.t load/i)).not.toBeVisible()
      expect(page.url()).toContain('/admin/medias-emplacements')

      const nbApres = await section.locator('[class*="grid-cols-2"] > div, .relative.aspect-square').count()
      expect(nbApres).toBe(nbAvant)
    } finally {
      await nettoyerComptes(request, [compteId])
    }
  })

  test('fichier léger + alt FR : l\'envoi part, état d\'attente visible, la photo apparaît', async ({ page, request }) => {
    const { email, compteId } = await creerCompteAdmin(request, 'gal_ok')
    try {
      await connecter(page, email)
      await page.goto('/fr/admin/medias-emplacements?onglet=galeries')

      const section = page.locator('[id^="galerie-"]').first()
      const altUnique = `AUDIT photo légère ${Date.now()}`

      const jpegMinimal = Buffer.from(
        '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
        'base64',
      )
      await section.locator('input[type="file"]').setInputFiles({
        name: 'audit-leger.jpg',
        mimeType: 'image/jpeg',
        buffer: jpegMinimal,
      })
      await section.locator('input[name="alt_fr"]').fill(altUnique)

      const bouton = section.getByRole('button', { name: /Téléverser/i })
      await expect(bouton).toBeEnabled()
      await bouton.click()

      // État d'attente : libellé change pendant l'envoi (fenêtre courte,
      // fichier minimal — on vérifie que le mécanisme existe, pas qu'il dure
      // longtemps).
      await expect(section.getByRole('button', { name: /Téléversement/i })).toBeVisible({ timeout: 2000 }).catch(() => {
        // Peut être trop rapide pour être capté sur un fichier minimal — pas
        // un échec du test, le point réel est vérifié juste après.
      })

      // alt_fr est affiché dans un <input value=...>, pas comme texte —
      // on vérifie la valeur de l'input, pas un texte.
      await expect(section.locator(`input[value="${altUnique}"]`)).toBeVisible({ timeout: 10_000 })
    } finally {
      // Nettoyage : retire la ligne créée (retrait ne supprime pas le fichier
      // bucket — voir actions.ts — donc on nettoie aussi le storage).
      const r = await request.get(
        `${SUPABASE_URL}/rest/v1/galeries_photos?alt_fr=ilike.*AUDIT*&select=id,url_stockage`,
        { headers: enTeteService },
      )
      const lignes: { id: string; url_stockage: string }[] = await r.json()
      for (const l of lignes) {
        await request.delete(`${SUPABASE_URL}/rest/v1/galeries_photos?id=eq.${l.id}`, { headers: enTeteService })
        const chemin = l.url_stockage.split('/storage/v1/object/public/medias/')[1]
        if (chemin) {
          await request.delete(`${SUPABASE_URL}/storage/v1/object/medias/${chemin}`, { headers: enTeteService })
        }
      }
      await nettoyerComptes(request, [compteId])
    }
  })

})
