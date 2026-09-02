'use client'

import { useEffect, useState } from 'react'

import { DELAI_GRACE_DEPART_SECONDES, secondesRestantesQuebec } from '@/lib/mission-nerf-fuseau'

/**
 * Délai de grâce pendant lequel « DÉPART IMMINENT » reste affiché après
 * l'heure réglée, avant que la carte ne bascule sur un état « session en
 * cours ». Valeur (5 min) dans `DELAI_GRACE_DEPART_SECONDES`
 * (mission-nerf-fuseau.ts) — partagée avec le bandeau de rappel du panneau
 * staff (staff/page.tsx), voir sa docstring pour la justification complète
 * du chiffre.
 *
 * ⚠️ CORRECTION DU SOIR DU 1er SEPTEMBRE 2026 — un départ réglé à 21:45
 * affichait « DÉPART IMMINENT » à 21:47 (correct), « À VENIR » à 21:51
 * (délai de grâce déclenché comme prévu) — mais « À VENIR » ment : passé
 * l'heure de départ, la partie EST en cours, elle n'est pas « à venir ».
 * Un parent qui arrive à ce moment-là lit qu'un groupe n'est pas encore
 * parti alors qu'il est déjà dans le labyrinthe. Nouvel état `enCours`
 * (« SESSION EN COURS ») pour ce cas précis ; `aucun` (« À VENIR ») ne sert
 * plus QUE quand aucune heure n'a jamais été réglée.
 *
 * Ne modifie ni ne lit `etat_zone_nerf.prochain_depart` en base — purement un
 * délai d'AFFICHAGE, côté navigateur. Le panneau staff n'utilise pas cet
 * état pour SON propre affichage de l'heure (toujours « actuellement
 * hh:mm », sans bascule — écran de pilotage, pas d'annonce), mais lit le
 * même seuil pour son bandeau de rappel (voir staff/page.tsx).
 */
export type EtatDecompte =
  | { etat: 'compte'; texte: string }
  | { etat: 'imminent'; texte: 'DÉPART IMMINENT' }
  | { etat: 'enCours'; texte: 'SESSION EN COURS' }
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
  if (ecoule <= DELAI_GRACE_DEPART_SECONDES) return { etat: 'imminent', texte: 'DÉPART IMMINENT' }

  return { etat: 'enCours', texte: 'SESSION EN COURS' }
}
