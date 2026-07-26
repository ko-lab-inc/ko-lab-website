/// <reference types="vitest/globals" />

import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

/**
 * Configuration globale des tests unitaires — skill 26.
 *
 * La directive `/// <reference types="vitest/globals" />` en tête déclare
 * describe / it / expect pour TOUT le programme TypeScript. C'est pour ça que
 * tsconfig.json n'a pas de champ `types` : l'ajouter aurait désactivé la
 * résolution automatique de @types/node et @types/react.
 */

// jsdom ne démonte rien entre deux tests : sans cleanup, les composants
// s'empilent dans le document et getByRole trouve plusieurs correspondances.
afterEach(() => {
  cleanup()
})

/**
 * matchMedia n'existe pas dans jsdom. useReveal et useScrolled l'interrogent
 * pour prefers-reduced-motion — sans ce stub, tout test montant un composant
 * animé échoue sur « window.matchMedia is not a function ».
 *
 * `matches: false` = mouvement autorisé, donc le comportement animé par défaut.
 * Un test qui veut vérifier le mode réduit surcharge ce mock localement.
 */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
})

/**
 * IntersectionObserver est également absent de jsdom.
 *
 * ⚠️ Ce stub n'observe rien et ne déclenche jamais de callback : un composant
 * `.reveal` restera donc sans la classe `in` pendant les tests. C'est le
 * comportement attendu — pour tester la révélation, capturer le callback passé
 * au constructeur et l'invoquer manuellement.
 */
class IntersectionObserverStub implements IntersectionObserver {
  readonly root: Element | Document | null = null
  readonly rootMargin: string = '0px'
  readonly thresholds: ReadonlyArray<number> = []

  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  takeRecords = vi.fn(() => [])
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: IntersectionObserverStub,
})
