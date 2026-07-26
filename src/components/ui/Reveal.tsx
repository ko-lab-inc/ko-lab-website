'use client'

import { useReveal } from '@/hooks/useReveal'
import { cn } from '@/lib/utils/cn'

import type { ReactNode } from 'react'

/**
 * Enveloppe cliente minimale pour la révélation au scroll.
 *
 * Pourquoi ce composant plutôt qu'un `'use client'` sur chaque section :
 * useReveal est un hook, il impose donc un Client Component. Sans cette
 * enveloppe, toute section animée basculerait entièrement côté client — textes,
 * traductions et balisage compris — alors que le skill 01 impose les Server
 * Components par défaut et que le skill 12 vise un LCP sous 2,5 s.
 *
 * Ici, seules ces quelques lignes partent dans le bundle : les enfants sont
 * rendus sur le serveur et passés en `children`.
 *
 * La cascade de délais (80 / 160 / 240 ms) vient du CSS via :nth-child dans
 * globals.css — plusieurs Reveal frères s'échelonnent donc automatiquement.
 */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useReveal<HTMLDivElement>()

  return (
    <div ref={ref} className={cn('reveal', className)}>
      {children}
    </div>
  )
}
