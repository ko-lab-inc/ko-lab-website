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
  /**
   * Zoom appliqué sur la même progression : 0.1 mène de scale(1) à scale(1.1).
   * Cumulable avec `distance` — les deux composent un seul `transform`, donc
   * une seule propriété composée par le GPU.
   */
  zoom?: number
  /**
   * Comment la progression 0 → 1 est calculée.
   *
   * `sortie` — 0 quand l'élément est en haut de l'écran, 1 quand il en est
   * entièrement sorti. Convient à un hero, qui est déjà visible au chargement.
   *
   * `traversee` — 0 quand l'élément apparaît par le bas, 1 quand il disparaît
   * par le haut. Indispensable pour une section en milieu de page : avec
   * `sortie`, l'effet reste bloqué à 0 pendant tout le temps où la section est
   * confortablement visible, et ne se déclenche qu'au moment où elle s'en va.
   */
  mode?: 'sortie' | 'traversee'
  className?: string
}

export function Parallax({
  children,
  distance = 60,
  zoom = 0,
  mode = 'sortie',
  className,
}: ParallaxProps) {
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

      const ecran = window.innerHeight

      const brute =
        mode === 'traversee'
          ? // L'élément parcourt une distance de (écran + sa hauteur) entre le
            // moment où son sommet touche le bas de l'écran et celui où sa base
            // en franchit le haut.
            (ecran - rect.top) / (ecran + rect.height)
          : -rect.top / ecran

      // Bornée : hors de cette plage l'élément est hors champ, inutile de
      // continuer à calculer un déplacement que personne ne voit.
      const progression = Math.min(Math.max(brute, 0), 1)

      const y = -(progression * distance).toFixed(2)
      const echelle = (1 + progression * zoom).toFixed(4)

      el.style.transform = `translate3d(0, ${y}px, 0) scale(${echelle})`
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
  }, [distance, zoom, mode])

  return (
    <div ref={ref} className={cn('will-change-transform', className)}>
      {children}
    </div>
  )
}
