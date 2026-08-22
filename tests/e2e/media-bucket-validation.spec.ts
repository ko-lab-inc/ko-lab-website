import fs from 'node:fs'

import { expect, test, type APIRequestContext } from '@playwright/test'

/**
 * Validation post-migration 0030 — sécurisation du bucket `medias`.
 *
 * ---------------------------------------------------------------------------
 * CE QUE CE FICHIER PROUVE, ET COMMENT
 *
 * 0030 a posé une limite de taille, une restriction MIME et quatre politiques
 * RLS sur `storage.objects` pour `medias` (lecture publique, écriture équipe).
 * Un fichier `.sql` ne prouve pas qu'il a produit l'effet voulu — ces quatre
 * tests sondent la base réelle, pas le texte de la migration.
 *
 * Même discipline que tests/e2e/admin.spec.ts : compte de test créé par API
 * Auth admin (clé de service), élevé en `editor`, détruit en `afterEach`.
 * Aucune trace laissée dans Storage non plus — le fichier déposé au Test 4
 * est retiré dans un `finally`, par clé de service.
 * ---------------------------------------------------------------------------
 */

const env: Record<string, string> = {}
for (const ligne of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = ligne.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m?.[1]) env[m[1]] = (m[2] ?? '').replace(/^['"]|['"]$/g, '')
}

function variable(nom: string): string {
  const valeur = env[nom]
  if (!valeur) throw new Error(`${nom} absente de .env.local — requise pour media-bucket-validation.spec.ts`)
  return valeur
}

const SUPABASE_URL = variable('NEXT_PUBLIC_SUPABASE_URL')
const CLE_ANON = variable('NEXT_PUBLIC_SUPABASE_ANON_KEY')
const CLE_SERVICE = variable('SUPABASE_SERVICE_ROLE_KEY')
const MOT_DE_PASSE = 'Zz!' + Math.random().toString(36).slice(2) + 'Aa9'

const enTeteService = {
  apikey: CLE_SERVICE,
  Authorization: `Bearer ${CLE_SERVICE}`,
  'Content-Type': 'application/json',
  'User-Agent': 'node',
}

/**
 * JPEG 1×1 minimal, valide (vrais octets magiques `FF D8 FF`) — le contenu
 * n'a aucune importance, seul le fait qu'il soit reconnaissable comme
 * `image/jpeg` compte, au cas où Supabase Storage sniffe le contenu plutôt
 * que de se fier au seul en-tête déclaré.
 */
const JPEG_MINIMAL = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDQ0NDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wgARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
  'base64',
)

let compteId: string | null = null

test.afterEach(async ({ request }) => {
  if (compteId) {
    await request.delete(`${SUPABASE_URL}/auth/v1/admin/users/${compteId}`, { headers: enTeteService }).catch(() => {})
    compteId = null
  }
})

async function creerCompteEditor(request: APIRequestContext) {
  const email = `zzaudit_media_${Date.now()}@ko-lab.test`
  const rep = await request.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: enTeteService,
    data: { email, password: MOT_DE_PASSE, email_confirm: true, user_metadata: { nom: 'Audit Media' } },
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

/**
 * Retire un fichier de test du bucket `medias`, par clé de service.
 *
 * ⚠️ PAS `DELETE /storage/v1/object/{bucket}/{chemin}` — ce format n'a
 * silencieusement rien supprimé lors du premier jet de ce fichier (deux
 * fichiers `AUDIT_0030_*` laissés dans le Storage du client, retirés à la
 * main après coup). Le bon format, celui que `nettoyer()` utilise déjà dans
 * scripts/audit-supabase.mjs pour le bucket `cv` : `DELETE
 * /storage/v1/object/{bucket}` avec `{ prefixes: [chemin] }` en corps.
 *
 * Échoue bruyamment (assertion, pas `.catch(() => {})`) : un nettoyage qui
 * échoue en silence est exactement ce qui a causé le problème.
 */
async function supprimer(request: APIRequestContext, chemin: string) {
  const rep = await request.delete(`${SUPABASE_URL}/storage/v1/object/medias`, {
    headers: enTeteService,
    data: { prefixes: [chemin] },
  })
  expect(rep.status(), `échec du nettoyage de ${chemin} : ${await rep.text()}`).toBe(200)
}

async function jetonAuthentifie(request: APIRequestContext, email: string) {
  const rep = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: CLE_ANON, 'Content-Type': 'application/json' },
    data: { email, password: MOT_DE_PASSE },
  })
  const corps = await rep.json()
  if (!corps.access_token) throw new Error(`connexion impossible : ${JSON.stringify(corps)}`)
  return corps.access_token as string
}

test.describe('Bucket medias — validation post-migration 0030', () => {
  test('1. Lecture publique conservée sur 3 dossiers différents', async ({ request }) => {
    const fichiers = [
      'lab/lab-machine-2026.webp',
      'operations/operations-crew-2026.webp',
      // ⚠️ home/hero-site-2026.webp n'existe pas dans le bucket (vérifié avant
      // d'écrire ce test — listing réel de medias/home/) : substitué par un
      // fichier réel du même dossier pour ne pas faire échouer la validation
      // sur un mauvais fixture plutôt que sur un vrai problème RLS.
      'home/besoin-installer-2026.webp',
    ]

    for (const chemin of fichiers) {
      const rep = await request.get(`${SUPABASE_URL}/storage/v1/object/public/medias/${chemin}`)
      expect(rep.status(), `${chemin} devrait rester lisible publiquement`).toBe(200)
    }
  })

  test('2. Sonde anonyme (POST) toujours refusée après 0030', async ({ request }) => {
    const cible = `test/AUDIT_0030_sonde_anon_${Date.now()}.jpg`
    const rep = await request.post(`${SUPABASE_URL}/storage/v1/object/medias/${cible}`, {
      headers: { apikey: CLE_ANON, Authorization: `Bearer ${CLE_ANON}`, 'Content-Type': 'image/jpeg' },
      data: JPEG_MINIMAL,
    })
    const corps = await rep.json().catch(() => null)

    // ⚠️ PAS rep.status() seul — même piège que bucketPhotos() dans
    // scripts/audit-supabase.mjs : l'API Storage renvoie un HTTP 400
    // générique, le vrai code (403) vit dans corps.statusCode (string).
    expect(
      rep.status() === 400 && corps?.statusCode === '403',
      `attendu HTTP 400 + statusCode 403, reçu HTTP ${rep.status()} : ${JSON.stringify(corps)}`,
    ).toBe(true)
    expect(corps?.message ?? '').toContain('row-level security policy')

    // Défensif : si jamais ça n'avait pas échoué, ne rien laisser derrière.
    if (rep.status() === 200 || rep.status() === 201) {
      await supprimer(request, cible)
    }
  })

  test('3. Fichier déposé avant 0030 reste lisible, avec son vrai Content-Type', async ({ request }) => {
    // lab-machine-2026.webp est du lot du 18-20 août 2026, donc déposé AVANT
    // l'exécution de 0030 (21-22 août) — c'est le fichier qui prouve que la
    // restriction MIME posée sur le bucket ne revalide pas rétroactivement
    // les lignes déjà présentes dans storage.objects.
    const rep = await request.get(`${SUPABASE_URL}/storage/v1/object/public/medias/lab/lab-machine-2026.webp`)
    expect(rep.status()).toBe(200)
    expect(rep.headers()['content-type']).toBe('image/webp')
  })

  test('4. IMPORTANT — écriture équipe (editor) réussit sans clé de service', async ({ request }) => {
    const compte = await creerCompteEditor(request)
    const jeton = await jetonAuthentifie(request, compte.email)

    const cible = `test/AUDIT_0030_${Date.now()}.jpg`
    let statutEcriture = -1
    let corpsEcriture: unknown = null

    try {
      const rep = await request.post(`${SUPABASE_URL}/storage/v1/object/medias/${cible}`, {
        headers: { apikey: CLE_ANON, Authorization: `Bearer ${jeton}`, 'Content-Type': 'image/jpeg' },
        data: JPEG_MINIMAL,
      })
      statutEcriture = rep.status()
      corpsEcriture = await rep.json().catch(() => null)
    } finally {
      // Nettoyage garanti, que l'écriture ait réussi ou non — clé de service,
      // seule à avoir un accès de suppression inconditionnel.
      await supprimer(request, cible)
    }

    expect(
      statutEcriture,
      `attendu 200/201 (écriture equipe autorisée), reçu ${statutEcriture} : ${JSON.stringify(corpsEcriture)}`,
    ).toBeGreaterThanOrEqual(200)
    expect(statutEcriture).toBeLessThan(300)
  })
})
