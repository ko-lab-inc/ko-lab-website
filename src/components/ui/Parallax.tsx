'use client'

import { useEffect, useRef } from 'react'

import { cn } from '@/lib/utils/cn'

import type { ReactNode } from 'react'

/**
 * Parallaxe de scroll, sans librairie externe.
 *
 * Le projet n'embarque aucune bibliothèque d'animation, et il n'y a pas de
 * raison d'en ajouter une pour trente lignes : framer-motion pèse plus lourd
 * que tout le JavaScript client actuel du site.
 *
 * Le déplacement est appliqué en `translate3d`, donc composité par le GPU :
 * aucun recalcul de mise en page, aucun repaint. Les lectures de position sont
 * regroupées dans une frame d'animation, ce qui borne le travail à une fois par
 * rafraîchissement même si l'événement scroll se déclenche cent fois par seconde.
 *
 * ⚠️ Le skill 20 proscrit la « parallaxe excessive ». 60px sur la traversée
 * d'un écran entier reste sous le seuil du perceptible-mais-discret : le
 * mouvement se sent, il ne se voit pas.
 */
type ParallaxProps = {
  children: ReactNode
  /** Amplitude du déplacement vers le haut, en pixels, sur une traversée d'écran. */
  distance?: number
  className?: string
}

export function Parallax({ children, distance = 60, className }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Mouvement réduit : on ne pose aucun écouteur et on laisse l'élément au
    // repos. Le CSS de globals.css ne peut rien ici, le transform étant appliqué
    // en style inline par ce composant.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let framePrevue = false

    const appliquer = () => {
      framePrevue = false
      const rect = el.getBoundingClientRect()

      // Progression de 0 (section en bas de l'écran) à 1 (entièrement remontée).
      // Bornée : au-delà, l'élément est hors champ, inutile de continuer à bouger.
      const progression = Math.min(Math.max(-rect.top / window.innerHeight, 0), 1)

      el.style.transform = `translate3d(0, ${-(progression * distance).toFixed(2)}px, 0)`
    }

    const surScroll = () => {
      if (framePrevue) return
      framePrevue = true
      requestAnimationFrame(appliquer)
    }

    appliquer()
    window.addEventListener('scroll', surScroll, { passive: true })
    window.addEventListener('resize', surScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', surScroll)
      window.removeEventListener('resize', surScroll)
    }
  }, [distance])

  return (
    <div ref={ref} className={cn('will-change-transform', className)}>
      {children}
    </div>
  )
}
