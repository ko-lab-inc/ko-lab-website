'use client'

import { useState } from 'react'

/**
 * Champ mot de passe avec bouton œil — brief du 1er septembre (test sur
 * téléphone réel) : un mot de passe partagé, tapé dans le noir sur un
 * téléphone, mérite de pouvoir être relu avant de soumettre.
 *
 * ⚠️ État `visible` en `useState` local, RIEN d'autre — jamais persisté
 * (pas de localStorage, pas de cookie) : chaque chargement de page repart
 * masqué par défaut, exactement la contrainte du brief.
 */
export function ChampMotDePasse() {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative mt-2">
      <input
        id="motDePasse"
        type={visible ? 'text' : 'password'}
        name="motDePasse"
        required
        autoFocus
        className="w-full rounded-lg border border-white/15 bg-transparent px-4 py-3 pr-14 text-base text-white outline-none focus:border-cyan-400/60"
      />
      {/* type="button" impératif : dans un <form>, un <button> sans type
          explicite soumet le formulaire — exactement ce que le brief
          interdit pour ce bouton. Cible tactile large (48px) pour un usage
          au pouce, avec des gants. */}
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-300"
      >
        {visible ? <IconeOeilBarre className="h-5 w-5" /> : <IconeOeil className="h-5 w-5" />}
      </button>
    </div>
  )
}

function IconeOeil({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className} aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function IconeOeilBarre({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className} aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M6.6 6.7C4 8.4 2 12 2 12s3.5 7 10 7c1.3 0 2.5-.2 3.6-.6M10 5.2c.6-.1 1.3-.2 2-.2 6.5 0 10 7 10 7a15.7 15.7 0 0 1-3.1 4" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  )
}
