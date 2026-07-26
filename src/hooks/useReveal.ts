'use client'

import { useEffect, useRef } from 'react'

/** Classe posée sur l'élément une fois révélé — voir .reveal.in dans globals.css. */
const REVEALED_CLASS = 'in'

/**
 * Révèle un élément à son entrée dans le viewport — skills 02 et 20.
 *
 * L'élément doit porter la classe `reveal` :
 *
 *     const ref = useReveal<HTMLElement>()
 *     <section ref={ref} className="reveal">…</section>
 *
 * ---------------------------------------------------------------------------
 * GARDE-FOU — pourquoi ce hook ne se contente pas d'observer
 *
 * `.reveal` démarre à `opacity: 0`. Tant que `.in` n'arrive pas, le contenu est
 * INVISIBLE. Une animation ratée doit dégrader vers « visible », jamais vers
 * « absent ». Deux cas sont donc court-circuités avant même de créer l'observer :
 *
 *   1. IntersectionObserver indisponible → on révèle immédiatement.
 *   2. prefers-reduced-motion → on révèle immédiatement. globals.css force déjà
 *      l'affichage, mais poser `.in` garde le DOM cohérent et évite de faire
 *      tourner un observer pour une transition désactivée (skill 20).
 *
 * Reste un troisième cas, hors de portée d'un hook : si le JavaScript ne
 * s'exécute pas du tout, aucun code client ne peut réagir. Il se traite au
 * niveau du document — voir la note en bas de fichier.
 * ---------------------------------------------------------------------------
 *
 * @param threshold Fraction visible déclenchant la révélation (0.12 — skill 02).
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(threshold = 0.12) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      element.classList.add(REVEALED_CLASS)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        // Boucle plutôt que déstructuration `([entry])` : avec
        // noUncheckedIndexedAccess, entries[0] est typé `… | undefined`.
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add(REVEALED_CLASS)
          // Révélation unique : on n'anime pas à chaque passage de scroll.
          observer.unobserve(entry.target)
        }
      },
      { threshold },
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [threshold])

  return ref
}

/* -----------------------------------------------------------------------------
 * À FAIRE au fichier 19 (src/app/layout.tsx) — cas « JS absent ou en échec »
 *
 * Si le JS ne tourne pas, .reveal reste à opacity 0 et la page paraît vide :
 * pénalisant pour l'accessibilité et pour l'indexation.
 *
 * Correctif au niveau du document, à décider avec Christian :
 *
 *   <noscript>
 *     <style>{`.reveal { opacity: 1; transform: none; }`}</style>
 *   </noscript>
 *
 * Couvre le JS désactivé. Pour couvrir aussi une erreur d'exécution, conditionner
 * l'état masqué à une classe posée par script — `.js .reveal { opacity: 0 }` —
 * de sorte que l'absence de la classe laisse le contenu visible par défaut.
 * -------------------------------------------------------------------------- */
