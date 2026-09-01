'use client'

import { useEffect } from 'react'

/**
 * Filet d'erreur du dashboard — dernier recours si un rendu plante
 * (donnée inattendue, exception non prévue). Le polling lui-même
 * (MissionNerfProvider) ne devrait jamais déclencher ceci : ses échecs sont
 * déjà attrapés et gérés par l'indicateur de connexion, pas par une
 * exception. Ce filet couvre le reste — jamais un écran blanc ni la
 * page d'erreur générique de Next sur une TV sans personne pour l'actualiser.
 *
 * Même identité visuelle que le reste du dashboard (fond marine, pas le
 * design system KO-LAB) : un filet d'erreur qui rompt le style serait aussi
 * déroutant qu'un écran blanc pour quiconque regarde la TV.
 */
export default function ErreurDashboard({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[mission-nerf/dashboard] erreur de rendu', error)

    // Nouvelle tentative automatique après 10 s — personne ne surveille cet
    // écran pour cliquer un bouton « réessayer » un soir d'événement.
    const id = setTimeout(reset, 10_000)
    return () => clearTimeout(id)
  }, [error, reset])

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-3 bg-[#050a16] p-8 text-center text-white">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber-400">Mission NERF</p>
      <p className="text-lg text-slate-300">Rechargement de l&apos;écran en cours…</p>
    </div>
  )
}
