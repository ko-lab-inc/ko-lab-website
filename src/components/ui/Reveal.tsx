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
type RevealProps = {
  children: ReactNode
  className?: string
  /**
   * Mode « hôte » : le conteneur ne s'anime pas, il ne fait que recevoir `.in`.
   * Ses enfants portant `.mot-anime`, `.cascade-item` ou `.numero-slide` s'en
   * servent comme signal de départ (voir globals.css).
   *
   * Sans ce mode, animer des enfants échelonnés imposerait soit un observateur
   * par enfant — quinze pour une phrase de quinze mots — soit une double
   * animation, le bloc entier disparaissant avant que ses enfants n'entrent.
   */
  groupe?: boolean
}

export function Reveal({ children, className, groupe = false }: RevealProps) {
  const ref = useReveal<HTMLDivElement>()

  return (
    <div ref={ref} className={cn(groupe ? 'reveal-hote' : 'reveal', className)}>
      {children}
    </div>
  )
}
