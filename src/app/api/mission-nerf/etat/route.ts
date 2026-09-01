import { NextResponse, type NextRequest } from 'next/server'

import { dateEvenementQuebec, heureQuebec } from '@/lib/mission-nerf'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { adresseDepuis } from '@/lib/utils/adresseClient'
import { rateLimit } from '@/lib/utils/rateLimit'

/**
 * Lecture pour le dashboard Mission NERF — compteurs, état de la zone,
 * 4 dernières inscriptions.
 *
 * ---------------------------------------------------------------------------
 * PAS DE JETON ICI — à la différence de /api/mission-nerf/decharges
 * ---------------------------------------------------------------------------
 * Cette route est appelée depuis le JAVASCRIPT DU NAVIGATEUR (le dashboard
 * est public, ouvert dans OBS sans session). Un jeton lu depuis le code
 * client serait visible dans le code source de la page — inutile comme
 * secret. La protection ne vient pas d'une authentification, mais du fait
 * que cette route ne renvoie JAMAIS que des champs déjà sans risque
 * (compteurs, prénom seul) — voir la fonction `verSortie` plus bas, qui est
 * le SEUL endroit qui construit la réponse JSON.
 *
 * `inscriptions_nerf` et `etat_zone_nerf` (migration 0046) ont RLS activé
 * sans policy et leur GRANT SELECT par défaut révoqué pour anon/authenticated
 * — seul service_role (getSupabaseAdmin()) peut les lire, d'où cette route
 * plutôt qu'un accès direct depuis le navigateur.
 *
 * ---------------------------------------------------------------------------
 * COUNT(DISTINCT decharge_id) SANS RPC NI MIGRATION
 * ---------------------------------------------------------------------------
 * PostgREST ne sait pas produire un COUNT(DISTINCT ...) directement sur la
 * table de base. Plutôt qu'ajouter une fonction SQL (hors périmètre de ce
 * prompt — « Aucune migration »), la colonne `decharge_id` de la journée est
 * lue ici, CÔTÉ SERVEUR, et dédupliquée avec un Set — le navigateur ne voit
 * jamais ces UUID, seulement le nombre final. Le volume (au plus quelques
 * centaines de lignes par soirée) rend ça largement suffisant.
 */

export const dynamic = 'force-dynamic'

/** Jamais de cache — CDN ou navigateur — sur des compteurs en direct. */
const SANS_CACHE = { 'Cache-Control': 'no-store' }

type LigneInscription = { prenom: string; recu_le: string; statut: string }

/**
 * Seul endroit qui décide de ce qui sort vers le navigateur — un futur ajout
 * de colonne à `inscriptions_nerf` (nom, âge, etc.) ne fuira jamais tant que
 * cette fonction n'est pas modifiée pour l'inclure explicitement.
 */
function verSortie(params: {
  zoneOuverte: boolean
  prochainDepart: string | null
  participants: number
  decharges: number
  dernieres: readonly LigneInscription[]
}) {
  return {
    zoneOuverte: params.zoneOuverte,
    prochainDepart: params.prochainDepart ? params.prochainDepart.slice(0, 5) : null,
    participants: params.participants,
    decharges: params.decharges,
    dernieres: params.dernieres.map((r) => ({
      prenom: r.prenom,
      heure: heureQuebec(r.recu_le),
      statut: r.statut,
    })),
  }
}

export async function GET(req: NextRequest) {
  // Généreux (le dashboard interroge cette route en continu, voir
  // DonneesEnDirect.tsx) : protège contre un client qui s'emballerait, pas
  // contre l'usage normal d'un seul écran.
  if (rateLimit(`mission-nerf-etat:${adresseDepuis(req.headers)}`, { max: 120, windowMs: 60_000 })) {
    return NextResponse.json({ erreur: 'trop_de_requetes' }, { status: 429, headers: SANS_CACHE })
  }

  const supabase = getSupabaseAdmin()
  const aujourdhui = dateEvenementQuebec()

  try {
    const [participantsRes, dechargesRes, etatRes, dernieresRes] = await Promise.all([
      supabase
        .from('inscriptions_nerf')
        .select('id', { count: 'exact', head: true })
        .eq('date_evenement', aujourdhui),
      supabase.from('inscriptions_nerf').select('decharge_id').eq('date_evenement', aujourdhui),
      supabase.from('etat_zone_nerf').select('zone_ouverte, prochain_depart').single(),
      supabase
        .from('inscriptions_nerf')
        .select('prenom, recu_le, statut')
        .eq('date_evenement', aujourdhui)
        .order('recu_le', { ascending: false })
        .limit(4),
    ])

    if (participantsRes.error) throw participantsRes.error
    if (dechargesRes.error) throw dechargesRes.error
    if (etatRes.error) throw etatRes.error
    if (dernieresRes.error) throw dernieresRes.error

    const decharges = new Set(dechargesRes.data.map((r) => r.decharge_id)).size

    return NextResponse.json(
      verSortie({
        zoneOuverte: etatRes.data.zone_ouverte,
        prochainDepart: etatRes.data.prochain_depart,
        participants: participantsRes.count ?? 0,
        decharges,
        dernieres: dernieresRes.data,
      }),
      { headers: SANS_CACHE },
    )
  } catch (err) {
    console.error('[api/mission-nerf/etat] échec lecture', err)
    return NextResponse.json({ erreur: 'serveur' }, { status: 500, headers: SANS_CACHE })
  }
}
