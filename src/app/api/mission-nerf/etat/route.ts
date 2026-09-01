import { NextResponse, type NextRequest } from 'next/server'

import { dateEvenementQuebec, heureQuebec, lireCompteursDuJour } from '@/lib/mission-nerf'
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
 * COMPTEURS PARTAGÉS AVEC LE PANNEAU STAFF (Prompt 3)
 * ---------------------------------------------------------------------------
 * `lireCompteursDuJour()` (lib/mission-nerf.ts) calcule participants et
 * décharges — y compris le filtre de remise à zéro (`derniere_remise_a_zero`)
 * posé par le panneau staff. Un calcul dupliqué ici aurait pu diverger de
 * celui du staff sans que ça se voie avant un soir d'événement, staff et TV
 * sous les yeux du même parent.
 *
 * COUNT(DISTINCT decharge_id) SANS RPC NI MIGRATION : PostgREST ne sait pas
 * le produire nativement — la colonne est dédupliquée avec un Set côté
 * serveur (voir `lireCompteursDuJour`), le navigateur ne voit jamais ces
 * UUID, seulement le nombre final.
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
    prochainDepart: params.prochainDepart,
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
    const [compteurs, dernieresRes] = await Promise.all([
      lireCompteursDuJour(supabase),
      supabase
        .from('inscriptions_nerf')
        .select('prenom, recu_le, statut')
        .eq('date_evenement', aujourdhui)
        .order('recu_le', { ascending: false })
        .limit(4),
    ])

    if (dernieresRes.error) throw dernieresRes.error

    return NextResponse.json(
      verSortie({
        zoneOuverte: compteurs.zoneOuverte,
        prochainDepart: compteurs.prochainDepart,
        participants: compteurs.participants,
        decharges: compteurs.decharges,
        dernieres: dernieresRes.data,
      }),
      { headers: SANS_CACHE },
    )
  } catch (err) {
    console.error('[api/mission-nerf/etat] échec lecture', err)
    return NextResponse.json({ erreur: 'serveur' }, { status: 500, headers: SANS_CACHE })
  }
}
