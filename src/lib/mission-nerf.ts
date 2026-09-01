import { createHmac, timingSafeEqual } from 'node:crypto'

import 'server-only'

import { dateEvenementQuebec } from '@/lib/mission-nerf-fuseau'
import type { Database } from '@/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Mission NERF — utilitaires partagés par les routes API et le panneau staff
 * du chantier.
 *
 * Fichier séparé plutôt qu'inliné dans la route POST : la route de lecture
 * du dashboard ET le panneau staff (prompts 2 et 3) ont besoin exactement du
 * même calcul de date et de compteurs, et une divergence entre eux serait
 * invisible jusqu'au soir de l'événement.
 *
 * ⚠️ Les calculs de fuseau (dateEvenementQuebec, heureQuebec,
 * dansNMinutesQuebec) vivent désormais dans mission-nerf-fuseau.ts, un
 * fichier SANS `import 'server-only'` — le décompte de la carte « Prochain
 * départ » (dashboard/useDecompteDepart.ts) tourne dans le NAVIGATEUR et a
 * besoin du même calcul de fuseau que celui-ci, sans jamais pouvoir importer
 * ce fichier-ci (qui porte l'authentification staff, laquelle ne doit
 * jamais atterrir dans un bundle client). Réexportées ci-dessous pour que
 * rien ne change côté appelants existants.
 */
export { dateEvenementQuebec, heureQuebec, dansNMinutesQuebec } from '@/lib/mission-nerf-fuseau'

type LigneEtatZone = {
  zone_ouverte: boolean
  prochain_depart: string | null
  derniere_remise_a_zero: string | null
}

export type CompteursMissionNerf = {
  zoneOuverte: boolean
  prochainDepart: string | null
  participants: number
  decharges: number
}

/**
 * Compteurs « aujourd'hui » — partagés par la route de lecture du dashboard
 * (Prompt 2) et le panneau staff (Prompt 3), pour que les deux affichent
 * TOUJOURS le même nombre. Toute divergence entre les deux serait le genre
 * de bug qui ne se voit qu'un soir d'événement, staff et TV sous les yeux du
 * même parent.
 *
 * ⚠️ Filtre `recu_le > derniere_remise_a_zero` — c'est la « remise à zéro »
 * du panneau staff (voir staff/actions.ts) : AUCUNE ligne n'est jamais
 * supprimée d'`inscriptions_nerf`, seule cette date de référence avance.
 * Une remise à zéro faite un jour précédent n'affecte pas le compte
 * d'aujourd'hui sans code particulier : toute inscription du jour a de toute
 * façon un `recu_le` postérieur à hier.
 *
 * `decharges` = COUNT(DISTINCT decharge_id) — PostgREST n'exprime pas ça
 * nativement (voir la route GET /api/mission-nerf/etat) : la colonne est
 * relue en entier pour la période comptée et dédupliquée avec un Set,
 * jamais renvoyée telle quelle au navigateur.
 */
export async function lireCompteursDuJour(
  supabase: SupabaseClient<Database>,
): Promise<CompteursMissionNerf> {
  const aujourdhui = dateEvenementQuebec()

  const { data: etat, error: erreurEtat } = await supabase
    .from('etat_zone_nerf')
    .select('zone_ouverte, prochain_depart, derniere_remise_a_zero')
    .single<LigneEtatZone>()
  if (erreurEtat) throw erreurEtat

  let requeteParticipants = supabase
    .from('inscriptions_nerf')
    .select('id', { count: 'exact', head: true })
    .eq('date_evenement', aujourdhui)
  let requeteDecharges = supabase
    .from('inscriptions_nerf')
    .select('decharge_id')
    .eq('date_evenement', aujourdhui)

  if (etat.derniere_remise_a_zero) {
    requeteParticipants = requeteParticipants.gt('recu_le', etat.derniere_remise_a_zero)
    requeteDecharges = requeteDecharges.gt('recu_le', etat.derniere_remise_a_zero)
  }

  const [participantsRes, dechargesRes] = await Promise.all([requeteParticipants, requeteDecharges])
  if (participantsRes.error) throw participantsRes.error
  if (dechargesRes.error) throw dechargesRes.error

  return {
    zoneOuverte: etat.zone_ouverte,
    prochainDepart: etat.prochain_depart ? etat.prochain_depart.slice(0, 5) : null,
    participants: participantsRes.count ?? 0,
    decharges: new Set(dechargesRes.data.map((r) => r.decharge_id)).size,
  }
}

/**
 * -----------------------------------------------------------------------------
 * AUTHENTIFICATION DU PANNEAU STAFF — mot de passe unique, sans compte
 * -----------------------------------------------------------------------------
 * Un seul secret (`MISSION_NERF_STAFF_PASSWORD`), partagé par l'équipe,
 * comparé à temps constant — même discipline que le jeton du webhook
 * (`/api/mission-nerf/decharges`). Contraintes du brief : rien en clair dans
 * une URL (comparaison faite dans une Server Action, donc en POST, jamais en
 * query string), pas de nouvelle table ni migration, session qui tient toute
 * la soirée sans redemander le mot de passe.
 *
 * Le cookie de session NE CONTIENT JAMAIS le mot de passe — sa valeur est
 * une signature HMAC-SHA256 calculée AVEC le mot de passe comme clé. Vérifier
 * une session revient à recalculer cette même signature et à la comparer
 * (à temps constant) à ce que le cookie transporte, sans jamais avoir besoin
 * de relire le mot de passe lui-même depuis le cookie.
 *
 * ⚠️ CONSÉQUENCE ASSUMÉE, À CONNAÎTRE AVANT DE CHANGER LE MOT DE PASSE UN
 * SOIR D'ÉVÉNEMENT : la signature dépend de `MISSION_NERF_STAFF_PASSWORD`.
 * Changer cette variable rend INSTANTANÉMENT invalide TOUTE session déjà
 * ouverte, sur TOUS les téléphones de l'équipe — pas seulement les nouvelles
 * connexions. Décision du brief : ce n'est pas un cas à géré en code (pas de
 * rotation en douceur, pas de période de grâce), seulement à documenter ici.
 *
 * ⚠️ LIMITE ASSUMÉE, SANS SOLUTION SIMPLE SANS TABLE : un mot de passe
 * partagé sur plusieurs téléphones ne permet pas de révoquer LA session d'UN
 * SEUL appareil perdu ou prêté — la seule façon de couper l'accès est de
 * changer le mot de passe, ce qui déconnecte TOUTE l'équipe d'un coup (voir
 * ci-dessus). Une révocation par appareil demanderait de tracer chaque
 * session individuellement quelque part (une table, une migration) — hors
 * périmètre explicite de ce prompt. Accepté tel quel pour un écran
 * d'événement d'une soirée, pas une piste retenue à corriger ici.
 */

export const COOKIE_SESSION_STAFF = 'mission_nerf_staff'
/** 12 h — la durée d'une soirée d'événement (décision du brief) : assez
 *  long pour ne jamais redéconnecter le staff en pleine soirée, assez court
 *  pour qu'une session oubliée sur un téléphone d'équipe ne traîne pas des
 *  jours. */
export const DUREE_SESSION_STAFF_SECONDES = 12 * 60 * 60

function signatureSessionStaff(): string {
  const motDePasse = process.env.MISSION_NERF_STAFF_PASSWORD ?? ''
  return createHmac('sha256', motDePasse).update('mission-nerf-staff-session').digest('hex')
}

/** Compare le mot de passe soumis à `MISSION_NERF_STAFF_PASSWORD`, à temps
 *  constant — identique dans l'esprit à la vérification du jeton webhook. */
export function motDePasseStaffValide(soumis: string): boolean {
  const attendu = process.env.MISSION_NERF_STAFF_PASSWORD
  if (!attendu || !soumis) return false

  const bufSoumis = Buffer.from(soumis)
  const bufAttendu = Buffer.from(attendu)
  if (bufSoumis.length !== bufAttendu.length) return false

  return timingSafeEqual(bufSoumis, bufAttendu)
}

/** Valeur à écrire dans le cookie de session après une connexion réussie. */
export function creerValeurSessionStaff(): string {
  return signatureSessionStaff()
}

/** Vérifie qu'une valeur de cookie correspond à une session staff valide —
 *  à appeler dans CHAQUE Server Action qui modifie une donnée, pas
 *  seulement dans le rendu de la page : une Server Action reste
 *  invocable directement (POST + en-tête Next-Action) sans repasser par
 *  l'interface, exactement le contournement documenté pour /admin
 *  (lib/auth/garde.ts) — la page qui masque le bouton ne protège rien à
 *  elle seule. */
export function sessionStaffValide(valeurCookie: string | undefined): boolean {
  if (!valeurCookie) return false

  const attendu = signatureSessionStaff()
  const bufCookie = Buffer.from(valeurCookie)
  const bufAttendu = Buffer.from(attendu)
  if (bufCookie.length !== bufAttendu.length) return false

  return timingSafeEqual(bufCookie, bufAttendu)
}
