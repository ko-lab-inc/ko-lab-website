'use client'

import { useState, useTransition } from 'react'

import { remettreCompteursAZero } from './actions'

/**
 * Remise à zéro — action destructrice au sens du brief (§5), même si aucune
 * ligne n'est réellement supprimée en base (voir actions.ts) : elle change
 * ce que TOUT LE MONDE voit sur la TV, une confirmation reste due.
 *
 * Deux taps plutôt que `window.confirm()` : un modal navigateur a un rendu
 * incohérent selon l'appareil et peut se fermer d'un tap accidentel — un
 * second bouton, dans la page, avec un texte qui dit explicitement ce qui va
 * se passer, est plus sûr sur un téléphone tenu vite fait pendant l'événement.
 */
export function BoutonRemiseAZero() {
  const [arme, setArme] = useState(false)
  const [enCours, demarrer] = useTransition()

  if (!arme) {
    return (
      <button
        type="button"
        onClick={() => setArme(true)}
        className="w-full rounded-lg border border-amber-400/30 bg-amber-400/10 py-3 text-sm font-semibold text-amber-300"
      >
        Remettre les compteurs à zéro
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-amber-200">
        Les compteurs « Participants » et « Décharges » repartiront à 0 sur le dashboard.
        Aucune inscription n&apos;est supprimée — l&apos;historique complet reste en base.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setArme(false)}
          disabled={enCours}
          className="flex-1 rounded-lg border border-white/15 py-3 text-sm text-slate-300"
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={enCours}
          onClick={() => {
            demarrer(async () => {
              await remettreCompteursAZero()
              setArme(false)
            })
          }}
          className="flex-1 rounded-lg border border-amber-400/50 bg-amber-400 py-3 text-sm font-semibold text-black disabled:opacity-60"
        >
          {enCours ? 'Remise à zéro…' : 'Confirmer'}
        </button>
      </div>
    </div>
  )
}
