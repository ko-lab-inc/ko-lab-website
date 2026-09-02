'use server'

import { revalidatePath } from 'next/cache'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'

import {
  COOKIE_SESSION_STAFF,
  DUREE_SESSION_STAFF_SECONDES,
  creerValeurSessionStaff,
  dansNMinutesQuebec,
  motDePasseStaffValide,
  sessionStaffValide,
} from '@/lib/mission-nerf'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { adresseDepuis } from '@/lib/utils/adresseClient'
import { rateLimit } from '@/lib/utils/rateLimit'

const CHEMIN_STAFF = '/mission-nerf/staff'

/**
 * Garde RÉELLE des Server Actions ci-dessous — pas l'affichage conditionnel
 * de la page. Une Server Action reste invocable directement (POST + en-tête
 * Next-Action) sans repasser par l'interface qui masque les boutons : c'est
 * exactement le contournement documenté pour /admin (lib/auth/garde.ts, audit
 * du 30 juillet 2026). Chaque action qui écrit en base commence donc par
 * cet appel, jamais seulement par le rendu conditionnel de la page.
 */
async function assurerSessionStaff(): Promise<void> {
  const magasin = await cookies()
  if (!sessionStaffValide(magasin.get(COOKIE_SESSION_STAFF)?.value)) {
    throw new Error('[mission-nerf/staff] Session invalide ou expirée.')
  }
}

export async function connexionStaff(formData: FormData): Promise<void> {
  const entetes = await headers()

  // Un mot de passe unique, partagé, mérite un frein contre le brute-force —
  // même bibliothèque que le reste du site (voir sa docstring pour ses limites
  // réelles : compteur en mémoire de processus, pas une garantie stricte).
  if (rateLimit(`mission-nerf-staff-login:${adresseDepuis(entetes)}`, { max: 8, windowMs: 5 * 60_000 })) {
    redirect(`${CHEMIN_STAFF}?erreur=trop_de_tentatives`)
  }

  const motDePasse = String(formData.get('motDePasse') ?? '')

  if (!motDePasseStaffValide(motDePasse)) {
    redirect(`${CHEMIN_STAFF}?erreur=1`)
  }

  const magasin = await cookies()
  magasin.set(COOKIE_SESSION_STAFF, creerValeurSessionStaff(), {
    httpOnly: true,
    // `false` en développement UNIQUEMENT : un cookie Secure est
    // silencieusement ignoré par le navigateur sur http://localhost — le
    // set() réussirait sans erreur, mais la session ne survivrait jamais à
    // un rechargement, ce qui a l'air d'un bug de logique alors que c'est le
    // navigateur qui refuse le cookie.
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: DUREE_SESSION_STAFF_SECONDES,
    path: CHEMIN_STAFF,
  })

  redirect(CHEMIN_STAFF)
}

export async function deconnexionStaff(): Promise<void> {
  const magasin = await cookies()
  magasin.delete({ name: COOKIE_SESSION_STAFF, path: CHEMIN_STAFF })
  redirect(CHEMIN_STAFF)
}

/**
 * Bascule zone_ouverte — l'action la plus fréquente de la soirée (brief).
 * Lecture puis écriture plutôt qu'un simple `not(zone_ouverte)` en une
 * requête : PostgREST ne sait pas exprimer « inverse la valeur actuelle »
 * sans la relire d'abord, et le volume ici (une poignée de bascules par
 * soirée) rend le coût de l'aller-retour supplémentaire non pertinent.
 *
 * ⚠️ FERMER LA ZONE EFFACE `prochain_depart` — brief du soir du 1er
 * septembre 2026, observé en production : zone_ouverte et prochain_depart
 * étaient deux données indépendantes, donc fermer la zone ne touchait
 * jamais l'heure. Une fois un départ réglé, la carte du dashboard restait
 * condamnée à SESSION EN COURS jusqu'à minuit (aucune heure future à
 * régler en fin de soirée) — et pire, affichait ZONE FERMÉE + SESSION EN
 * COURS simultanément, deux affirmations qui ne peuvent pas être vraies
 * ensemble.
 *
 * DÉCISION (pas de bouton « Terminer la session » séparé) : un geste de
 * plus à oublier dans un panneau déjà chargé — fermer la zone EST le
 * signal que la session est terminée, l'effacement de l'heure en découle
 * automatiquement, dans la MÊME écriture (jamais deux requêtes séparées :
 * un état intermédiaire où l'heure serait encore là mais la zone déjà
 * fermée ne doit jamais être observable, même une fraction de seconde).
 *
 * OUVRIR la zone ne touche PAS `prochain_depart` — le premier groupe n'est
 * pas toujours formé à l'ouverture ; le bandeau ambre existant
 * (« Zone ouverte, aucun départ annoncé ») couvre déjà ce cas.
 */
export async function basculerZone(): Promise<void> {
  await assurerSessionStaff()

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.from('etat_zone_nerf').select('zone_ouverte').single()
  if (error) throw error

  const zoneVaSouvrir = !data.zone_ouverte

  const { error: erreurMaj } = await supabase
    .from('etat_zone_nerf')
    .update(zoneVaSouvrir ? { zone_ouverte: true } : { zone_ouverte: false, prochain_depart: null })
    .eq('verrou_singleton', true)
  if (erreurMaj) throw erreurMaj

  revalidatePath(CHEMIN_STAFF)
}

const FORMAT_HEURE = /^([01]\d|2[0-3]):[0-5]\d$/

/**
 * Une seule action pour les deux façons de régler l'heure (brief §2) :
 *   - `minutes` présent (boutons de raccourci) -> calculée ICI, côté
 *     serveur, dans le fuseau de l'événement (voir dansNMinutesQuebec) —
 *     jamais avec l'horloge de l'appareil du staff.
 *   - `heure` présent (input natif) -> revalidée par regex avant écriture :
 *     un <input type="time"> garantit ce format côté navigateur, mais rien
 *     de ce qui vient du réseau n'est digne de confiance côté serveur.
 */
export async function definirProchainDepart(formData: FormData): Promise<void> {
  await assurerSessionStaff()

  const minutesBrut = formData.get('minutes')
  const heure = minutesBrut ? dansNMinutesQuebec(Number(minutesBrut)) : String(formData.get('heure') ?? '')

  if (!FORMAT_HEURE.test(heure)) {
    throw new Error('[mission-nerf/staff] Heure invalide reçue par definirProchainDepart : ' + heure)
  }

  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('etat_zone_nerf')
    .update({ prochain_depart: heure })
    .eq('verrou_singleton', true)
  if (error) throw error

  revalidatePath(CHEMIN_STAFF)
}

/**
 * Remise à zéro des COMPTEURS — jamais une suppression. Avance
 * `derniere_remise_a_zero` ; `lireCompteursDuJour` (lib/mission-nerf.ts)
 * l'utilise pour filtrer participants/décharges. Aucune ligne
 * d'`inscriptions_nerf` n'est jamais touchée — voir la docstring de cette
 * fonction pour le raisonnement complet (décision approuvée, Prompt 3).
 */
export async function remettreCompteursAZero(): Promise<void> {
  await assurerSessionStaff()

  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('etat_zone_nerf')
    .update({ derniere_remise_a_zero: new Date().toISOString() })
    .eq('verrou_singleton', true)
  if (error) throw error

  revalidatePath(CHEMIN_STAFF)
}
