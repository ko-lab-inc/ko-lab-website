'use client'

import { useEffect } from 'react'

import { buttonVariants } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'

/**
 * Filet d'erreur — TOUT l'espace admin, pas une route à la fois.
 *
 * ---------------------------------------------------------------------------
 * DEUXIÈME OCCURRENCE DU MÊME BUG, SUR UNE AUTRE ROUTE (27 août 2026)
 *
 * Un premier `error.tsx` avait été posé sous `admin/realisations/` après le
 * bug d'ajout de photos sur cet écran — mais en App Router, un `error.tsx`
 * ne couvre que SON segment et ses descendants. Le même symptôme (page
 * brute de Chrome « This page couldn't load », React entièrement démonté)
 * s'est reproduit sur /admin/medias-emplacements (onglet Nos capacités),
 * un segment frère jamais couvert par ce premier fichier. Reproduit :
 * `Error: Body exceeded 7mb limit.` — un seul fichier assez volumineux
 * suffit, aucun `multiple` requis, dès qu'un écran d'ajout de photo n'a
 * pas de garde-fou de taille côté client.
 *
 * Ce fichier remplace celui de `admin/realisations/` : posé ici, à côté du
 * layout admin (`[locale]/layout.tsx`), il couvre TOUT `/admin/*` — chaque
 * écran d'ajout de photo (réalisations, galeries, concours, emplacements)
 * en profite sans avoir à poser son propre filet.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI CE FICHIER, PAS UN TRY/CATCH DANS actions.ts
 *
 * Le dépassement du plafond global (`experimental.serverActions.bodySizeLimit`,
 * next.config.ts, 7 Mo) est rejeté par Next AVANT que l'action ne s'exécute —
 * aucun code applicatif de ce projet n'a la main à ce moment-là, donc rien à
 * entourer d'un `try/catch` pour CE cas précis. Les formulaires d'ajout
 * valident désormais la taille du fichier avant l'envoi — la protection
 * normale. Ce fichier est le FILET pour tout ce qui la contournerait
 * (JavaScript désactivé, appel direct à l'action) ou toute autre exception
 * non prévue, n'importe où dans l'admin.
 *
 * Convention Next.js App Router : `error.tsx` doit être un Client Component,
 * reçoit `{ error, reset }`, et n'intercepte que les erreurs survenant DANS
 * son segment et ses descendants — `[locale]/` couvre `[locale]/admin/**`
 * en entier, qui est le seul enfant de ce segment.
 * ---------------------------------------------------------------------------
 */
export default function ErreurAdmin({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[admin] erreur non gérée', error)
  }, [error])

  return (
    <div className="border border-ko-line bg-ko-white p-8 text-center">
      <p className="ko-h3 text-[20px] text-ko-ink">Quelque chose s&apos;est mal passé</p>
      <p className="mt-3 text-sm leading-relaxed text-ko-muted">
        L&apos;action n&apos;a pas pu aboutir. Si vous ajoutiez une photo trop lourde, essayez avec un
        fichier plus léger — sinon, réessayez, ou prévenez Moussa si ça persiste.
      </p>
      <button type="button" onClick={reset} className={cn('mt-6', buttonVariants({ variant: 'primary', size: 'sm' }))}>
        Réessayer
      </button>
    </div>
  )
}
