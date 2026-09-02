'use client'

import { useEffect, useState } from 'react'

import { secondesRestantesQuebec } from '@/lib/mission-nerf-fuseau'

/**
 * Chrono de session — brief du soir du 1er septembre 2026, DEUXIÈME partie
 * (complément à l'état SESSION EN COURS du dashboard TV, commit 96b8126).
 *
 * ⚠️ SUR LE PANNEAU STAFF UNIQUEMENT, jamais sur le dashboard — décision du
 * brief : un temps écoulé sur la TV serait lu par un parent comme un temps
 * d'ATTENTE, ce qui annulerait la clarté tout juste gagnée avec SESSION EN
 * COURS. Le staff, lui, est DANS la zone avec son téléphone et a besoin du
 * temps écoulé pour décider quand arrêter le groupe — un besoin différent,
 * un écran différent.
 *
 * ---------------------------------------------------------------------------
 * UN SEUL setInterval, MÊME PATTERN QUE dashboard/useDecompteDepart.ts
 * ---------------------------------------------------------------------------
 * Posé dans un useEffect à dépendances vides : monté une fois, jamais
 * recréé. Le tick ne fait que forcer un rendu (`setSignal`) — il ne capture
 * ni ne mémorise `prochainDepart`. C'est le RENDU qui relit la prop à jour
 * et recalcule `secondesRestantesQuebec` à chaque appel : aucune fermeture
 * ne peut devenir périmée, donc rien à réinitialiser si le staff règle une
 * nouvelle heure pendant que ce composant est monté — le tick SUIVANT (au
 * plus 1 s plus tard) la prend en compte automatiquement.
 *
 * ⚠️ CALCUL DE FUSEAU — jamais réimplémenté ici. `secondesRestantesQuebec`
 * (mission-nerf-fuseau.ts) gère la conversion America/Toronto ET le passage
 * de minuit (seuil de 12 h, voir sa docstring) ; Supabase stocke en UTC, un
 * calcul naïf avec l'horloge du téléphone donnerait plusieurs heures de
 * décalage selon le fuseau système de l'appareil.
 *
 * Disparaît (retourne `null`) dès qu'un départ FUTUR est réglé (`diff >=
 * 0`) — pas de bascule, pas de confirmation, juste absent. Fusionne ici le
 * rappel « régler le prochain départ » qui vivait avant dans une bannière
 * statique séparée de staff/page.tsx (calculée une fois par rendu de page,
 * jamais en direct) — les deux se déclenchaient sur EXACTEMENT la même
 * condition ; les garder séparés aurait affiché deux bandeaux ambre
 * redondants l'un sous l'autre sur un écran de téléphone déjà étroit.
 */
export function ChronoSession({ prochainDepart }: { prochainDepart: string | null }) {
  const [, setSignal] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setSignal((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  if (!prochainDepart) return null

  const diff = secondesRestantesQuebec(prochainDepart)
  if (diff >= 0) return null

  const ecoule = -diff
  const minutes = Math.floor(ecoule / 60)
  const secondes = ecoule % 60

  return (
    <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-5 py-4 text-center">
      <p className="text-lg font-semibold uppercase tracking-wide text-amber-200">
        Session en cours — {minutes}:{String(secondes).padStart(2, '0')}
      </p>
      <p className="mt-1 text-sm text-amber-200/80">Régler le prochain départ à la sortie du groupe.</p>
    </div>
  )
}
