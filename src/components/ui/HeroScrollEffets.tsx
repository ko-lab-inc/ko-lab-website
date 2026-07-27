'use client'

import { useEffect, useRef } from 'react'

import type { ReactNode } from 'react'

/**
 * Effets de scroll du hero d'accueil.
 *
 * Le titre s'efface et rétrécit, la photo prend de la profondeur, la carte de
 * stats remonte — le tout indexé sur la progression du scroll, pas sur un
 * déclencheur. C'est ce qui donne l'impression que la page « répond » plutôt
 * qu'elle ne s'anime.
 *
 * ---------------------------------------------------------------------------
 * Pourquoi une recherche par attribut plutôt que des props
 *
 * Le hero est un Server Component : son titre, sa photo et sa carte sont rendus
 * côté serveur. Les passer en props à un composant client aurait fait basculer
 * tout le contenu — dont le h1, élément LCP — dans le bundle navigateur.
 *
 * Ce composant ne rend qu'un conteneur et retrouve ses cibles par
 * `data-hero-*`. Le balisage reste serveur, seul le pilotage est client.
 * ---------------------------------------------------------------------------
 *
 * LCP : le h1 est rendu à opacité 1 et sans transformation dans le HTML
 * initial. Les styles ne sont posés qu'après hydratation, et uniquement à
 * partir du moment où l'utilisateur défile — la mesure n'est jamais retardée.
 */
export function HeroScrollEffets({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const racine = ref.current
    if (!racine) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const titre = racine.querySelector<HTMLElement>('[data-hero-titre]')
    const photo = racine.querySelector<HTMLElement>('[data-hero-photo]')
    const carte = racine.querySelector<HTMLElement>('[data-hero-carte]')

    let framePrevue = false

    const appliquer = () => {
      framePrevue = false

      const rect = racine.getBoundingClientRect()
      const hauteur = rect.height || window.innerHeight

      // 0 en haut du hero, 1 quand il a entièrement défilé vers le haut.
      const p = Math.min(Math.max(-rect.top / hauteur, 0), 1)

      // Titre : rétrécit et s'efface. Disparaît complètement à p = 1, donc
      // avant que la stats bar ne le recouvre.
      if (titre) {
        titre.style.transform = `scale(${(1 - p * 0.15).toFixed(4)})`
        titre.style.opacity = `${(1 - p).toFixed(3)}`
      }

      // Photo : léger zoom, sensation de profondeur.
      if (photo) {
        photo.style.transform = `scale(${(1 + p * 0.08).toFixed(4)})`
      }

      // Carte de stats : remonte à contre-sens du défilement.
      if (carte) {
        carte.style.transform = `translate3d(0, ${(-p * 30).toFixed(2)}px, 0)`
      }
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
  }, [])

  return <div ref={ref}>{children}</div>
}
