import { NextResponse, type NextRequest } from 'next/server'

import { enregistrerVisite } from '@/lib/analytique'
import { adresseDepuis } from '@/lib/utils/adresseClient'
import { rateLimit } from '@/lib/utils/rateLimit'

/**
 * Capture d'une visite — appelée par le beacon client `CaptureVisite`.
 *
 * ⚠️ Route nommée `/api/vue`, PAS `/api/stats` : un nom contenant « stats » est
 * filtré par beaucoup de bloqueurs de pub/pistage même en same-origin (la
 * visite du boss n'arrivait pas, 13 octobre 2026). Un nom neutre passe.
 *
 * ---------------------------------------------------------------------------
 * SÉCURITÉ
 *
 * - Point d'entrée PUBLIC (un visiteur anonyme le déclenche), donc traité
 *   comme tel : limite de débit par IP AVANT tout travail, corps validé et
 *   borné, et l'insertion passe par `enregistrerVisite` (service role,
 *   lib/analytique.ts) qui nettoie chaque champ. Le public n'a aucun accès
 *   direct à la table `evenements_visite` (RLS + grants révoqués, 0058).
 * - Aucune donnée personnelle n'est acceptée ni stockée : seulement un chemin,
 *   un domaine de provenance et une langue. L'IP et le user-agent servent au
 *   hash journalier anonyme puis sont oubliés (jamais stockés).
 * - Réponse 204 systématique, sans détail : rien à apprendre pour un abuseur,
 *   et le client n'attend rien en retour (sendBeacon est sans réponse).
 *
 * `force-dynamic` : une capture ne se met jamais en cache.
 */
export const dynamic = 'force-dynamic'

// 120 visites/minute par IP : large pour une navigation humaine (chaque page
// vue = un appel), assez bas pour qu'un script ne noie pas la table. Même
// ralentisseur en mémoire que les autres routes (voir rateLimit.ts).
const LIMITE = { max: 120, windowMs: 60_000 }

export async function POST(req: NextRequest) {
  const ip = adresseDepuis(req.headers)
  if (rateLimit(`vue:${ip}`, LIMITE)) {
    return new NextResponse(null, { status: 429 })
  }

  let corps: unknown
  try {
    corps = await req.json()
  } catch {
    // Corps absent ou illisible : on ne journalise rien, 204 quand même.
    return new NextResponse(null, { status: 204 })
  }

  const c = (corps ?? {}) as Record<string, unknown>

  await enregistrerVisite({
    chemin: c.chemin,
    referrer: c.referrer,
    locale: c.locale,
    ip,
    ua: req.headers.get('user-agent'),
    // En-tête géo posé par Vercel en production. Absent en local : pays = null.
    pays: req.headers.get('x-vercel-ip-country'),
  })

  return new NextResponse(null, { status: 204 })
}
