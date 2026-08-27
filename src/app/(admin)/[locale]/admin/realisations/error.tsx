'use client'

import { useEffect } from 'react'

import { buttonVariants } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'

/**
 * Filet d'erreur — bug 2 (corrigé le 27 août 2026, migration des bugs de
 * la modale d'ajout de photos).
 *
 * ---------------------------------------------------------------------------
 * POURQUOI CE FICHIER, PAS UN TRY/CATCH DANS actions.ts
 *
 * Le dépassement du plafond global (`experimental.serverActions.bodySizeLimit`,
 * next.config.ts, 7 Mo) est rejeté par Next AVANT que `modifierRealisation`/
 * `creerRealisation` ne s'exécutent — aucun code applicatif de ce projet n'a
 * la main à ce moment-là, donc rien à entourer d'un `try/catch` pour CE cas
 * précis. `FormulaireRealisation.tsx` valide désormais la taille cumulée des
 * nouvelles photos avant l'envoi (voir TAILLE_MAX_CUMULEE_PHOTOS) — la
 * protection normale. Ce fichier est le FILET pour tout ce qui contournerait
 * cette validation (JavaScript désactivé, appel direct à l'action) ou toute
 * autre exception non prévue sur cet écran : sans lui, l'admin retombait sur
 * la page brute du navigateur (« This page couldn't load »), React
 * entièrement démonté — reproduit et constaté avant ce correctif.
 *
 * Convention Next.js App Router : `error.tsx` doit être un Client Component,
 * reçoit `{ error, reset }`, et n'intercepte que les erreurs survenant DANS
 * ce segment de route (/admin/realisations) — le reste de l'admin n'est pas
 * concerné par ce fichier.
 * ---------------------------------------------------------------------------
 */
export default function ErreurRealisations({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[admin/realisations] erreur non gérée', error)
  }, [error])

  return (
    <div className="border border-ko-line bg-ko-white p-8 text-center">
      <p className="ko-h3 text-[20px] text-ko-ink">Quelque chose s&apos;est mal passé</p>
      <p className="mt-3 text-sm leading-relaxed text-ko-muted">
        L&apos;action n&apos;a pas pu aboutir. Si vous ajoutiez plusieurs photos à la fois, essayez
        d&apos;en envoyer moins d&apos;un coup — sinon, réessayez, ou prévenez Moussa si ça persiste.
      </p>
      <button type="button" onClick={reset} className={cn('mt-6', buttonVariants({ variant: 'primary', size: 'sm' }))}>
        Réessayer
      </button>
    </div>
  )
}
