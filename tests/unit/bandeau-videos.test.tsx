import { fireEvent, render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'

import { BandeauVideos } from '@/components/ui/BandeauVideos'

/**
 * Bande de vidéos — lecture en surimpression.
 *
 * ---------------------------------------------------------------------------
 * CE QUE CE TEST GARDE
 *
 * Le motif « facade » ne se voit pas à l'œil : la page a l'air identique
 * qu'on charge l'iframe au montage ou au clic. Or c'est toute la raison
 * d'être du montage — pas de script YouTube, pas de cookie tiers et pas de
 * requête vers Google tant que personne ne demande à regarder.
 *
 * Le second point gardé est aussi silencieux : à la fermeture, l'iframe doit
 * être DÉTRUITE, pas masquée. Une iframe cachée continue de jouer, donc le
 * son continuerait derrière une fenêtre fermée.
 * ---------------------------------------------------------------------------
 */

const LIBELLES = {
  groupe: 'Vidéos',
  lire: 'Regarder',
  precedent: 'Précédentes',
  suivant: 'Suivantes',
  aVenir: 'Vidéo à venir',
  fermer: 'Fermer la vidéo',
}

const VIDEOS = [
  {
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    titre: 'Impression 3D chez KO-LAB',
    vignette: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  },
  {
    // Hébergeur non reconnu : doit rester un lien sortant, pas une
    // surimpression qu'on ne saurait pas remplir.
    url: 'https://vimeo.com/123456789',
    titre: 'Découpe laser',
    vignette: '/images/videos/laser.webp',
  },
]

beforeAll(() => {
  // jsdom n'implémente ni showModal ni close sur <dialog>.
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function () {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
})

describe('BandeauVideos — emplacements réservés', () => {
  it('affiche quatre emplacements quand aucune vidéo n’est fournie', () => {
    render(<BandeauVideos videos={[]} libelles={LIBELLES} />)

    // Réservés, PAS masqués : Christian doit voir la place que prendra la
    // bande avant d'avoir fourni la moindre vidéo.
    expect(screen.getAllByText('Vidéo à venir')).toHaveLength(4)
  })
})

describe('BandeauVideos — lecture en surimpression', () => {
  it('ne charge AUCUNE iframe avant le clic', () => {
    const { container } = render(<BandeauVideos videos={VIDEOS} libelles={LIBELLES} />)

    // Le cœur du motif « facade ». Si cette assertion tombe, la page charge
    // YouTube pour tous les visiteurs, y compris ceux qui ne regardent rien.
    expect(container.querySelector('iframe')).toBeNull()
  })

  it('ouvre la vidéo YouTube en surimpression au clic, sans quitter la page', () => {
    const { container } = render(<BandeauVideos videos={VIDEOS} libelles={LIBELLES} />)

    fireEvent.click(screen.getByRole('button', { name: /Impression 3D chez KO-LAB/ }))

    const iframe = container.querySelector('iframe')
    expect(iframe).not.toBeNull()
    // Domaine sans cookie, et l'identifiant extrait de l'URL de la barre
    // d'adresse — pas l'URL collée telle quelle.
    expect(iframe?.getAttribute('src')).toContain(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    )
  })

  it('détruit l’iframe à la fermeture — sinon le son continue', () => {
    const { container } = render(<BandeauVideos videos={VIDEOS} libelles={LIBELLES} />)

    fireEvent.click(screen.getByRole('button', { name: /Impression 3D chez KO-LAB/ }))
    expect(container.querySelector('iframe')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: LIBELLES.fermer }))
    expect(container.querySelector('iframe')).toBeNull()
  })

  it('avance d’une PAGE ENTIÈRE de cartes, pas de 85 % de la largeur', () => {
    const { container } = render(<BandeauVideos videos={VIDEOS} libelles={LIBELLES} />)
    const piste = container.querySelector('[role="group"]') as HTMLElement

    // jsdom ne calcule aucune mise en page : on impose des dimensions
    // réalistes (4 cartes de 280px + 3 écarts de 20px = 1180px visibles).
    Object.defineProperty(piste, 'clientWidth', { value: 1180, configurable: true })
    const premiere = piste.firstElementChild as HTMLElement
    premiere.getBoundingClientRect = () => ({ width: 280 }) as DOMRect
    piste.style.columnGap = '20px'

    const appels: number[] = []
    piste.scrollBy = (opts) => appels.push((opts as ScrollToOptions).left ?? 0)

    fireEvent.click(screen.getByRole('button', { name: LIBELLES.suivant }))

    // 4 cartes × (280 + 20) = 1200. L'ancien réglage (0.85 × 1180 = 1003)
    // s'arrêtait au milieu de la 4e carte : une déjà vue revenait, une autre
    // était sautée — le « 3 au lieu de 4 » signalé par Christian.
    expect(appels).toEqual([1200])
  })

  it('laisse un lien sortant pour un hébergeur non reconnu', () => {
    render(<BandeauVideos videos={VIDEOS} libelles={LIBELLES} />)

    // Vimeo : on ne sait pas construire l'URL d'intégration, donc pas de
    // surimpression vide — un lien qui marche vaut mieux.
    const lien = screen.getByRole('link', { name: /Découpe laser/ })
    expect(lien).toHaveAttribute('href', 'https://vimeo.com/123456789')
    expect(lien).toHaveAttribute('target', '_blank')
  })
})
