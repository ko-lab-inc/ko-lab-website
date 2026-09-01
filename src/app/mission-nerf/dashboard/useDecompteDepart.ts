'use client'

import { useEffect, useState } from 'react'

import { secondesRestantesQuebec } from '@/lib/mission-nerf-fuseau'

/**
 * Délai de grâce pendant lequel « DÉPART IMMINENT » reste affiché après
 * l'heure réglée, avant que la carte ne bascule sur « À VENIR ».
 *
 * ⚠️ CORRECTION DU 1er SEPTEMBRE 2026 — en production, un départ réglé à
 * 07:43 affichait encore « DÉPART IMMINENT » à 07:45 et au-delà, indéfiniment,
 * tant que le staff ne réglait pas l'heure suivante. Comportement voulu (le
 * décompte ne repart jamais seul), mais un écran qui annonce un départ passé
 * depuis vingt minutes a l'air cassé pour un parent qui le regarde en passant.
 *
 * 5 minutes retenues, ni plus ni moins :
 *   - ASSEZ LONG pour qu'un parent qui arrive juste après le départ voie
 *     encore « DÉPART IMMINENT » et comprenne qu'il vient tout juste de le
 *     manquer (ou qu'il faut se dépêcher), plutôt que de tomber sur un écran
 *     qui semble n'avoir rien annoncé.
 *   - ASSEZ COURT pour ne jamais empiéter sur le PROCHAIN départ : les
 *     raccourcis du panneau staff proposent des intervalles de 10 à 30 min
 *     (`dansNMinutesQuebec`) — à 5 min, la grâce est toujours largement
 *     écoulée avant même le plus court de ces intervalles, donc l'écran ne
 *     peut jamais laisser croire qu'un DEUXIÈME départ est imminent alors que
 *     c'est encore un écho du premier.
 *
 * Ne modifie ni ne lit `etat_zone_nerf.prochain_depart` en base — purement un
 * délai d'AFFICHAGE, côté navigateur. Le panneau staff n'utilise pas ce
 * délai : il affiche l'heure réglée telle quelle, sans bascule (écran de
 * pilotage, pas d'annonce — voir staff/page.tsx).
 */
const DELAI_GRACE_SECONDES = 5 * 60

export type EtatDecompte =
  | { etat: 'compte'; texte: string }
  | { etat: 'imminent'; texte: 'DÉPART IMMINENT' }
  | { etat: 'perime' }
  | { etat: 'aucun' }

/**
 * Un seul point de calcul, partagé par le grand chiffre ET la ligne de
 * décompte de la carte « Prochain départ » — voir `ElementsEnDirect.tsx`.
 *
 * ⚠️ UN SEUL `setInterval` POUR TOUTE LA CARTE (contrainte explicite du brief
 * du 1er septembre : « n'ajoute pas un deuxième intervalle »). Avant cette
 * révision, seule la ligne de décompte (ex-`DecompteDepart.tsx`) possédait ce
 * tick — le grand chiffre, lui, ne se redessinait qu'au poll de 10 s du
 * contexte, ce qui suffisait pour afficher une heure fixe mais pas pour
 * détecter, seconde par seconde, le moment où le délai de grâce expire.
 * Plutôt que de dupliquer le tick dans un second composant, le calcul est
 * remonté ici, dans un hook appelé UNE FOIS par `CartesStats` : le grand
 * chiffre et la ligne de décompte lisent tous les deux le résultat du même
 * appel, donc le même `setInterval`.
 *
 * Le tick ne fait toujours que forcer un rendu (`setSignal`) ; tout le calcul
 * relit `cible` en direct à chaque appel — mêmes garanties qu'avant
 * (aucune fermeture périmée, heure changée en cours de route prise en compte
 * au tick suivant, aucun redémarrage automatique une fois périmé).
 */
export function useDecompteDepart(cible: string | null | undefined): EtatDecompte {
  const [, setSignal] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setSignal((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  if (!cible) return { etat: 'aucun' }

  const diff = secondesRestantesQuebec(cible)

  if (diff > 0) {
    if (diff < 60) return { etat: 'compte', texte: `0:${String(diff).padStart(2, '0')}` }
    return { etat: 'compte', texte: `dans ${Math.floor(diff / 60)} min` }
  }

  const ecoule = -diff
  if (ecoule <= DELAI_GRACE_SECONDES) return { etat: 'imminent', texte: 'DÉPART IMMINENT' }

  return { etat: 'perime' }
}
