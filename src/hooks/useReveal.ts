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
 *   3. Élément trop haut pour que le seuil soit atteignable → seuil borné.
 *      Détaillé dans le corps du hook : c'est le cas le moins évident des
 *      trois, et le seul qui ne se voit qu'à certaines tailles d'écran.
 *
 * Reste un quatrième cas, hors de portée d'un hook : si le JavaScript ne
 * s'exécute pas du tout, aucun code client ne peut réagir. Il se traite au
 * niveau du document — voir la note en bas de fichier.
 * ---------------------------------------------------------------------------
 *
 * @param threshold Fraction visible déclenchant la révélation (0.12 — skill 02).
 *                  Plafonné à l'exécution si l'élément est plus haut que
 *                  l'écran ne permet de l'atteindre.
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

    /**
     * 3ᵉ garde-fou — un seuil en fraction peut être GÉOMÉTRIQUEMENT inatteignable.
     *
     * IntersectionObserver compare la surface visible à celle de l'élément
     * ENTIER. Un bloc plus haut que `viewport ÷ seuil` ne peut donc jamais
     * intersecter à 12 %, quelle que soit la position de défilement : la
     * callback ne part pas, `.in` n'est jamais posée, et le contenu reste à
     * opacity 0 — définitivement.
     *
     * Ce n'est pas théorique. La grille boutique en une colonne sur téléphone
     * (375 × 812) mesure 6 874 px : ratio maximal 0.118, sous le seuil de 0.12.
     * Toute la boutique était invisible, et seulement sur mobile — la même page
     * s'affichait normalement dès 768 px, où la grille repasse à deux colonnes.
     * Elle est passée sous la barre en gagnant 300 px de gouttières.
     *
     * Le seuil est donc borné à ce que la géométrie autorise. `offsetHeight` et
     * non `getBoundingClientRect()` : le second renvoie la hauteur APRÈS la
     * transformation de `.reveal` (scale 0.94), donc une hauteur minorée de 6 %
     * et un seuil trop optimiste. Le facteur 0.8 garde une marge pour les
     * arrondis de sous-pixel du navigateur.
     */
    const hauteur = element.offsetHeight
    const seuil =
      hauteur > 0 ? Math.min(threshold, (window.innerHeight / hauteur) * 0.8) : threshold

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
      { threshold: seuil },
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
