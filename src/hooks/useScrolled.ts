'use client'

import { useEffect, useState } from 'react'

/**
 * Indique si la page a défilé au-delà d'un seuil — skill 20.
 *
 * Sert à faire apparaître la bordure basse de la nav au scroll :
 *
 *     const scrolled = useScrolled()
 *     <header className={cn('…', scrolled && 'border-b border-ko-line')}>
 *
 * @param threshold Distance en pixels avant bascule (30 — skill 20).
 */
export function useScrolled(threshold = 30): boolean {
  // false au premier rendu : le serveur ne connaît pas la position de scroll.
  // Toute autre valeur initiale provoquerait une divergence d'hydratation.
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > threshold)

    // Lecture immédiate, ABSENTE du code du skill. Sans elle, l'état reste faux
    // tant que l'utilisateur n'a pas défilé — or la page peut déjà être défilée
    // au montage : restauration de position au rafraîchissement, retour arrière
    // du navigateur, ou arrivée sur une ancre. La nav s'afficherait alors sans
    // sa bordure alors qu'on est au milieu de la page.
    handler()

    // passive: true — le navigateur sait que l'on n'appellera pas
    // preventDefault() et n'a pas à attendre le handler pour défiler.
    window.addEventListener('scroll', handler, { passive: true })

    return () => window.removeEventListener('scroll', handler)
  }, [threshold])

  return scrolled
}
