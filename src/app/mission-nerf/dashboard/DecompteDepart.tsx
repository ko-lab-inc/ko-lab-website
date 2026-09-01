'use client'

import { useEffect, useState } from 'react'

import { secondesRestantesQuebec } from '@/lib/mission-nerf-fuseau'

import { useMissionNerf } from './MissionNerfProvider'

/**
 * Décompte vivant sous l'heure de « Prochain départ » — se met à jour à la
 * seconde, calculé CÔTÉ NAVIGATEUR (le brief l'exige explicitement : pas un
 * aller-retour serveur par seconde alors que le poll de 10 s de
 * MissionNerfProvider suffit déjà à connaître l'heure cible).
 *
 * ---------------------------------------------------------------------------
 * NETTOYAGE DE L'INTERVALLE SUR 10 H (36 000 cycles à la seconde)
 * ---------------------------------------------------------------------------
 * Un seul `setInterval`, posé dans un `useEffect` à tableau de dépendances
 * VIDE (`[]`) : monté UNE FOIS au montage du composant, jamais recréé, et
 * nettoyé par la fonction de retour du `useEffect` au démontage. Le
 * composant ne démonte jamais en usage normal (page ouverte toute la
 * soirée) — l'intervalle tourne donc en continu du début à la fin, sans
 * jamais être recréé ni dupliqué en cours de route.
 *
 * Le tick lui-même NE FAIT RIEN d'autre que déclencher un rendu
 * (`setSignal`) — il ne capture ni ne mémorise l'heure cible. C'est le
 * RENDU qui relit `donnees?.prochainDepart` (contexte, à jour via le poll
 * de 10 s) et recalcule `secondesRestantesQuebec` à chaque appel. Aucune
 * fermeture (closure) sur une ancienne valeur ne peut donc devenir périmée
 * — si le staff change l'heure, le tick SUIVANT (au plus 1 s plus tard)
 * l'utilise automatiquement, sans logique de réinitialisation à écrire.
 *
 * ---------------------------------------------------------------------------
 * PAS DE REDÉMARRAGE AUTOMATIQUE
 * ---------------------------------------------------------------------------
 * Ce composant n'écrit jamais en base et ne réinitialise jamais
 * `prochainDepart` de lui-même — une fois à zéro, il reste sur
 * « DÉPART IMMINENT » jusqu'à ce que le staff règle une nouvelle heure
 * (brief : « le décompte ne repart pas tout seul »).
 */
export function DecompteDepart() {
  const { donnees } = useMissionNerf()
  const [, setSignal] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setSignal((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const cible = donnees?.prochainDepart
  if (!cible) return null

  const secondes = secondesRestantesQuebec(cible)
  const { texte, imminent } = formaterDecompte(secondes)

  return (
    <p
      className={
        imminent
          ? 'font-mono text-sm font-semibold uppercase tracking-wide text-rose-300 [animation:clignotement-lent_2.4s_ease-in-out_infinite]'
          : 'font-mono text-sm text-slate-300'
      }
    >
      {texte}
    </p>
  )
}

/**
 * Format du décompte (brief) :
 *   - > 1 min restante : « dans 14 min » (minutes entières, arrondi au sol —
 *     119 s à 60 s affichent tous « dans 1 min », transition nette vers le
 *     mode secondes exactement à 59 s).
 *   - dernière minute : « 0:47 », secondes qui défilent.
 *   - à zéro (ou déjà passé) : « DÉPART IMMINENT ».
 */
function formaterDecompte(secondes: number): { texte: string; imminent: boolean } {
  if (secondes <= 0) return { texte: 'DÉPART IMMINENT', imminent: true }
  if (secondes < 60) return { texte: `0:${String(secondes).padStart(2, '0')}`, imminent: false }
  return { texte: `dans ${Math.floor(secondes / 60)} min`, imminent: false }
}
