import fs from 'node:fs'

import { expect, test, type APIRequestContext } from '@playwright/test'

/**
 * Fumée admin — pages qui n'avaient jamais été visitées par un test réel.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI CE FICHIER EXISTE
 *
 * /admin/commandes renvoyait un 500 en production : TableauCommandes.tsx
 * appelait `useFormatter()` (hook next-intl) côté client, alors que la
 * section admin ne pose AUCUN `NextIntlClientProvider` — contrairement au
 * site public. Toutes les preuves précédentes (audit RLS, E2E commande.spec)
 * passaient par l'API ou par le site public ; aucune ne cliquait jamais
 * jusqu'à cette page. Corrigé en formatant le total côté serveur, comme
 * `dateFormatee` le faisait déjà.
 *
 * Compte élevé en 'admin' via la clé de service pour la durée du test, puis
 * détruit — même discipline que commande.spec.ts : base unique, aucune trace
 * laissée.
 * ---------------------------------------------------------------------------
 */

const env: Record<string, string> = {}
for (const ligne of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = ligne.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m?.[1]) env[m[1]] = (m[2] ?? '').replace(/^['"]|['"]$/g, '')
}

function variable(nom: string): string {
  const valeur = env[nom]
  if (!valeur) throw new Error(`${nom} absente de .env.local — requise pour tests/e2e/admin.spec.ts`)
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
  const email = `zzaudit.admin.${Date.now()}@ko-lab.test`
  const rep = await request.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: enTeteService,
    data: { email, password: MOT_DE_PASSE, email_confirm: true, user_metadata: { nom: 'Audit Admin' } },
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

test.describe('Espace admin — fumée', () => {
  test('les pages listées dans la nav répondent sans 500', async ({ page, request }) => {
    const compte = await creerCompteAdmin(request)

    await page.goto('/fr/connexion')
    await page.getByLabel(/Courriel/i).fill(compte.email)
    await page.getByLabel('Mot de passe', { exact: true }).fill(MOT_DE_PASSE)
    await page.getByRole('button', { name: /^Se connecter$/ }).click()
    await page.waitForURL('**/admin', { timeout: 10_000 })

    // Une page par lien de la nav gestion — la même erreur (un hook next-intl
    // appelé côté client sans NextIntlClientProvider) toucherait n'importe
    // laquelle de la même façon, pas seulement /admin/commandes.
    const pages = [
      '/fr/admin',
      '/fr/admin/commandes',
      '/fr/admin/demandes',
      '/fr/admin/catalogue',
      '/fr/admin/realisations',
      '/fr/admin/videos',
      '/fr/admin/carrieres',
      '/fr/admin/candidatures',
      '/fr/admin/utilisateurs',
      '/fr/admin/vendeurs',
      '/fr/admin/livreurs',
      '/fr/admin/reglages',
    ]

    for (const chemin of pages) {
      // `waitUntil: 'load'` (défaut) — pas `networkidle` : le tableau de bord
      // admin est resté accroché 30s dessus, probablement un widget qui sonde
      // en continu et empêche le réseau de jamais paraître inactif.
      const reponse = await page.goto(chemin)
      expect(reponse?.status(), `${chemin} a répondu ${reponse?.status()}`).toBeLessThan(500)
    }
  })

  test('/admin/commandes affiche le tableau sans erreur console (régression useFormatter)', async ({
    page,
    request,
  }) => {
    const compte = await creerCompteAdmin(request)
    const erreursConsole: string[] = []
    page.on('pageerror', (err) => erreursConsole.push(err.message))

    await page.goto('/fr/connexion')
    await page.getByLabel(/Courriel/i).fill(compte.email)
    await page.getByLabel('Mot de passe', { exact: true }).fill(MOT_DE_PASSE)
    await page.getByRole('button', { name: /^Se connecter$/ }).click()
    await page.waitForURL('**/admin', { timeout: 10_000 })

    const reponse = await page.goto('/fr/admin/commandes', { waitUntil: 'networkidle' })
    expect(reponse?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: 'Commandes' })).toBeVisible()
    expect(erreursConsole).toHaveLength(0)
  })
})
