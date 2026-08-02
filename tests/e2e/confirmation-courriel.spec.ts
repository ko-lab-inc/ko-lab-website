import fs from 'node:fs'

import { expect, test, type APIRequestContext } from '@playwright/test'

/**
 * /api/auth/confirmer — mécanisme token_hash, insensible à l'appareil.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI CE FICHIER EXISTE
 *
 * Constaté par Christian en testant réellement : un lien de confirmation de
 * compte ouvert sur un AUTRE appareil que celui où le compte a été créé
 * échouait. Cause documentée par Supabase : le flux PKCE
 * (`{{ .ConfirmationURL }}`, `exchangeCodeForSession`) exige un cookie
 * `code_verifier` posé sur le MÊME navigateur qui a lancé l'inscription.
 * `verifyOtp({ token_hash, type })` n'a besoin d'aucun cookie — c'est ce que
 * ce fichier prouve, en appelant la route SANS JAMAIS partager de cookie
 * avec quoi que ce soit qui aurait pu créer le compte (`request.get()` d'un
 * contexte API neuf, exactement l'équivalent d'un second appareil).
 *
 * `generate_link` (API admin) donne le `hashed_token` directement, sans
 * jamais passer par le mailer de Supabase — indépendant du quota déjà
 * documenté comme épuisé ailleurs dans ce projet.
 * ---------------------------------------------------------------------------
 */

const env: Record<string, string> = {}
for (const ligne of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = ligne.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m?.[1]) env[m[1]] = (m[2] ?? '').replace(/^['"]|['"]$/g, '')
}

function variable(nom: string): string {
  const valeur = env[nom]
  if (!valeur) throw new Error(`${nom} absente de .env.local — requise pour tests/e2e/confirmation-courriel.spec.ts`)
  return valeur
}

const SUPABASE_URL = variable('NEXT_PUBLIC_SUPABASE_URL')
const CLE_SERVICE = variable('SUPABASE_SERVICE_ROLE_KEY')

const enTeteService = {
  apikey: CLE_SERVICE,
  Authorization: `Bearer ${CLE_SERVICE}`,
  'Content-Type': 'application/json',
  'User-Agent': 'node',
}

let comptesDeCetEssai: string[] = []

test.beforeEach(() => {
  comptesDeCetEssai = []
})

test.afterEach(async ({ request }) => {
  for (const id of comptesDeCetEssai) {
    await request.delete(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, { headers: enTeteService }).catch(() => {})
  }
})

/** `generate_link` crée le compte ET renvoie son `hashed_token`, sans jamais passer par le mailer. */
async function genererLienConfirmation(
  request: APIRequestContext,
  params: { type: 'signup'; email: string; password: string; redirectTo: string },
): Promise<{ id: string; tokenHash: string }>
async function genererLienConfirmation(
  request: APIRequestContext,
  params: { type: 'recovery'; email: string; redirectTo: string },
): Promise<{ id: string; tokenHash: string }>
async function genererLienConfirmation(
  request: APIRequestContext,
  params: { type: 'signup' | 'recovery'; email: string; password?: string; redirectTo: string },
) {
  const rep = await request.post(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    headers: enTeteService,
    data: {
      type: params.type,
      email: params.email,
      ...(params.password ? { password: params.password } : {}),
      options: { redirect_to: params.redirectTo },
    },
  })
  const corps = await rep.json()
  if (!corps.hashed_token) throw new Error(`generate_link n'a pas renvoyé de hashed_token : ${JSON.stringify(corps)}`)
  return { id: corps.id as string, tokenHash: corps.hashed_token as string }
}

test.describe('/api/auth/confirmer — token_hash', () => {
  test('signup — fonctionne SANS AUCUN cookie partagé (preuve cross-device), redirige vers /connexion', async ({
    request,
  }) => {
    const email = `zzaudit.confcourriel.signup.${Date.now()}@ko-lab.test`

    // Compte confirmé au préalable pour créer un utilisateur réel dont
    // generate_link peut fabriquer un nouveau jeton de type signup — le
    // mot de passe n'est pas ré-exigé ici, seul le jeton compte.
    const creation = await request.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
      headers: enTeteService,
      data: { email, password: 'Zz!Avant9Aa', email_confirm: false },
    })
    const compte = await creation.json()
    if (!compte.id) throw new Error(`création du compte impossible : ${JSON.stringify(compte)}`)
    comptesDeCetEssai.push(compte.id)

    const { tokenHash } = await genererLienConfirmation(request, {
      type: 'signup',
      email,
      password: 'Zz!Avant9Aa',
      redirectTo: 'http://localhost:3000/fr/boutique/commande/details',
    })

    const suivant = encodeURIComponent('/fr/boutique/commande/details')
    const rep = await request.get(
      `http://localhost:3000/api/auth/confirmer?token_hash=${tokenHash}&type=signup&suivant=${suivant}`,
      { maxRedirects: 0 },
    )

    expect(rep.status()).toBe(307)
    expect(rep.headers()['location']).toBe(
      'http://localhost:3000/fr/connexion?suivant=%2Ffr%2Fboutique%2Fcommande%2Fdetails',
    )
    // La session EST établie (cookie posé) — verifyOtp a réussi malgré
    // l'absence totale de cookie code_verifier préexistant.
    expect(rep.headers()['set-cookie']).toBeTruthy()
  })

  test('recovery — redirige DIRECTEMENT vers la destination, jamais via /connexion', async ({ request }) => {
    const email = `zzaudit.confcourriel.recovery.${Date.now()}@ko-lab.test`

    const creation = await request.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
      headers: enTeteService,
      data: { email, password: 'Zz!Avant9Aa', email_confirm: true },
    })
    const compte = await creation.json()
    if (!compte.id) throw new Error(`création du compte impossible : ${JSON.stringify(compte)}`)
    comptesDeCetEssai.push(compte.id)

    const { tokenHash } = await genererLienConfirmation(request, {
      type: 'recovery',
      email,
      redirectTo: 'http://localhost:3000/fr/mot-de-passe/nouveau',
    })

    const suivant = encodeURIComponent('/fr/mot-de-passe/nouveau')
    const rep = await request.get(
      `http://localhost:3000/api/auth/confirmer?token_hash=${tokenHash}&type=recovery&suivant=${suivant}`,
      { maxRedirects: 0 },
    )

    expect(rep.status()).toBe(307)
    // DIRECT — la page /mot-de-passe/nouveau a besoin de la session
    // temporaire tout de suite, pas d'un détour par /connexion.
    expect(rep.headers()['location']).toBe('http://localhost:3000/fr/mot-de-passe/nouveau')
    expect(rep.headers()['set-cookie']).toBeTruthy()
  })

  test('token_hash invalide — refusé proprement, jamais de session', async ({ request }) => {
    const rep = await request.get(
      'http://localhost:3000/api/auth/confirmer?token_hash=invalide-de-toutes-pieces&type=signup&suivant=%2Ffr%2Fcompte',
      { maxRedirects: 0 },
    )
    expect(rep.status()).toBe(307)
    expect(rep.headers()['location']).toBe('http://localhost:3000/fr/connexion?lien=invalide')
    expect(rep.headers()['set-cookie']).toBeFalsy()
  })
})
