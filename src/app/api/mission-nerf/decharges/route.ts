import { randomUUID, timingSafeEqual } from 'node:crypto'

import { NextResponse, type NextRequest } from 'next/server'

import { dateEvenementQuebec } from '@/lib/mission-nerf'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { adresseDepuis } from '@/lib/utils/adresseClient'
import { rateLimit } from '@/lib/utils/rateLimit'
import { schemaDechargeNerf } from '@/lib/validation'

/**
 * Réception d'une décharge Mission NERF, depuis l'Apps Script du Google
 * Form — voir mission-nerf-apps-script.js (racine du dépôt, à coller dans
 * l'éditeur Apps Script, non déployé par ce projet).
 *
 * Une soumission = jusqu'à 5 participants = jusqu'à 5 lignes
 * `inscriptions_nerf`, toutes partageant le même `decharge_id` généré ICI.
 *
 * Authentification : jeton partagé dans l'en-tête `X-Mission-Nerf-Token`,
 * comparé à temps constant — pas de session, pas de JWT, cette route n'a
 * qu'un seul appelant légitime (le script Google) et rien à négocier avec
 * lui de plus complexe qu'un secret fixe.
 *
 * Ordre des contrôles, du moins coûteux au plus coûteux — même discipline
 * que /api/contact : type de contenu, débit, jeton, validation, écriture.
 */

/** Cette route écrit en base : elle ne doit jamais être mise en cache. */
export const dynamic = 'force-dynamic'

function jetonValide(recu: string | null): boolean {
  const attendu = process.env.MISSION_NERF_WEBHOOK_TOKEN

  // Jeton non configuré : refuser plutôt que de comparer contre une chaîne
  // vide, ce qui accepterait n'importe quel en-tête absent.
  if (!attendu || !recu) return false

  const bufAttendu = Buffer.from(attendu)
  const bufRecu = Buffer.from(recu)

  // timingSafeEqual exige deux buffers de MÊME longueur — un jeton reçu
  // plus court ou plus long est rejeté avant la comparaison à temps
  // constant, qui ne porte donc que sur le CONTENU, jamais la longueur.
  if (bufRecu.length !== bufAttendu.length) return false

  return timingSafeEqual(bufRecu, bufAttendu)
}

export async function POST(req: NextRequest) {
  if (!req.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ erreur: 'Type de contenu invalide' }, { status: 415 })
  }

  // Clé préfixée par la route — voir la docstring de rateLimit.
  if (
    rateLimit(`mission-nerf-decharges:${adresseDepuis(req.headers)}`, { max: 30, windowMs: 60_000 })
  ) {
    return NextResponse.json({ erreur: 'trop_de_requetes' }, { status: 429 })
  }

  if (!jetonValide(req.headers.get('x-mission-nerf-token'))) {
    return NextResponse.json({ erreur: 'non_autorise' }, { status: 401 })
  }

  let brut: unknown
  try {
    brut = await req.json()
  } catch {
    return NextResponse.json({ erreur: 'JSON invalide' }, { status: 400 })
  }

  const analyse = schemaDechargeNerf.safeParse(brut)
  if (!analyse.success) {
    return NextResponse.json({ erreur: 'Données invalides' }, { status: 400 })
  }

  // Partagé par toutes les lignes de CETTE soumission — voir la migration
  // 0046 pour pourquoi c'est la route, et non la base, qui le génère.
  const dechargeId = randomUUID()
  // Voir mission-nerf.ts : fuseau de l'événement, pas celui du serveur.
  const dateEvenement = dateEvenementQuebec()

  const lignes = analyse.data.participants.map((p) => ({
    prenom: p.prenom,
    nom: p.nom,
    age: p.age,
    decharge_id: dechargeId,
    date_evenement: dateEvenement,
  }))

  try {
    const { error } = await getSupabaseAdmin().from('inscriptions_nerf').insert(lignes)
    if (error) throw error
  } catch (err) {
    // Message générique côté appelant : ne pas divulguer la structure de la
    // base (skill 15) — Apps Script n'a besoin que de savoir que ça a échoué.
    console.error('[api/mission-nerf/decharges] échec insertion', err)
    return NextResponse.json({ erreur: 'serveur' }, { status: 500 })
  }

  return NextResponse.json({ succes: true, dechargeId, participants: lignes.length })
}
