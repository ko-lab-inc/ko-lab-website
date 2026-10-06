'use client'

import { useEffect, useRef, useState } from 'react'

import { texteRentman, type DemandePourRentman } from '@/lib/demandes/pourRentman'

/**
 * « Copier pour Rentman » — passerelle manuelle, en attendant l'écriture
 * automatique.
 *
 * Tant que le site n'a pas de clé Rentman en écriture, quelqu'un recopie la
 * demande à la main. Ce bouton met dans le presse-papiers un bloc qui porte
 * le NUMÉRO d'inventaire de chaque article, la seule donnée que le message
 * texte ne contient pas et qui évite de chercher un nom parmi 590 pièces.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI UN REPLI, ET PAS SEULEMENT UN MESSAGE D'ERREUR
 *
 * `navigator.clipboard` peut être refusé : navigateur ancien, page non
 * sécurisée, permission bloquée. Dans ce cas on n'annonce pas un échec sans
 * issue : on affiche le texte dans un champ déjà sélectionné, et un Ctrl+C
 * suffit. Une copie qui échoue ne doit jamais laisser la personne sans
 * solution devant une demande à traiter.
 * ---------------------------------------------------------------------------
 */
export function BoutonCopierRentman({
  demande,
  textes,
}: {
  demande: DemandePourRentman
  textes: { copier: string; copie: string; replis: string }
}) {
  const [etat, setEtat] = useState<'repos' | 'copie' | 'repli'>('repos')
  const champ = useRef<HTMLTextAreaElement>(null)

  const texte = texteRentman(demande)

  // Le retour « Copié » s'efface tout seul : un bouton qui reste figé sur
  // « Copié » ne dit plus rien de la copie suivante.
  useEffect(() => {
    if (etat !== 'copie') return
    const t = setTimeout(() => setEtat('repos'), 2500)
    return () => clearTimeout(t)
  }, [etat])

  // En repli, le texte est présélectionné : il ne reste que Ctrl+C à faire.
  useEffect(() => {
    if (etat === 'repli') champ.current?.select()
  }, [etat])

  return (
    <div>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(texte)
            setEtat('copie')
          } catch {
            setEtat('repli')
          }
        }}
        aria-live="polite"
        className="inline-flex min-h-[44px] items-center gap-2 border border-ko-line px-4 text-sm text-ko-ink transition-colors duration-200 hover:border-ko-blue"
      >
        {etat === 'copie' ? textes.copie : textes.copier}
      </button>

      {etat === 'repli' && (
        <div className="mt-3">
          <p className="text-sm text-ko-muted">{textes.replis}</p>
          <textarea
            ref={champ}
            readOnly
            rows={10}
            value={texte}
            className="mt-2 w-full resize-y border border-ko-line bg-ko-white p-3 font-mono text-xs leading-relaxed text-ko-ink"
          />
        </div>
      )}
    </div>
  )
}
