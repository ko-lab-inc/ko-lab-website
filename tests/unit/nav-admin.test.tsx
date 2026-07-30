import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { NavAdmin } from '@/components/layout/NavAdmin'

/**
 * Menu latéral de l'espace équipe — repli mobile.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI EN TEST UNITAIRE ET NON EN E2E
 *
 * Même raison que reglages.test.tsx : l'espace admin vit derrière
 * l'authentification, un test E2E devrait stocker de vrais identifiants
 * administrateur dans le dépôt. Ce qui est vérifiable sans session, c'est le
 * composant lui-même.
 *
 * ---------------------------------------------------------------------------
 * CE QUE CE TEST GARDE
 *
 * Christian a signalé qu'en mobile la nav admin n'avait AUCUN bouton
 * hamburger : les neuf liens s'affichaient en pleine page, avant le contenu,
 * qu'il fallait faire défiler à chaque écran. Le repli est donc une
 * régression à empêcher, pas un détail — d'où ce test.
 * ---------------------------------------------------------------------------
 */

// `usePathname` de next/navigation n'existe pas sous jsdom : NavAdmin s'en sert
// uniquement pour marquer l'entrée courante.
vi.mock('next/navigation', () => ({
  usePathname: () => '/fr/admin',
}))

const GROUPES = [
  {
    titre: 'Gestion',
    entrees: [
      { href: '/fr/admin', label: 'Tableau de bord', icone: null },
      { href: '/fr/admin/catalogue', label: 'Catalogue', icone: null },
    ],
  },
]

function poser() {
  return render(
    <NavAdmin groupes={GROUPES} racine="/fr/admin" labelMenu="Menu" labelFermer="Fermer" />,
  )
}

describe('NavAdmin — repli mobile', () => {
  it('rend un bouton de menu, replié par défaut', () => {
    poser()

    const bouton = screen.getByRole('button', { name: 'Menu' })
    // `aria-expanded="false"` et non l'absence d'attribut : un lecteur d'écran
    // doit savoir que le panneau existe et qu'il est fermé.
    expect(bouton).toHaveAttribute('aria-expanded', 'false')

    // Les liens restent DANS le document (ils ne sont que masqués en CSS sous
    // `lg`) : c'est `hidden` sur leur conteneur qui les replie, et la même
    // classe est neutralisée par `lg:block` sur grand écran.
    const groupes = document.getElementById('nav-admin-groupes')
    expect(groupes).not.toBeNull()
    expect(groupes?.className).toContain('hidden')
    expect(groupes?.className).toContain('lg:block')
  })

  it('déplie au clic, et le bouton change de libellé', () => {
    poser()

    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))

    const bouton = screen.getByRole('button', { name: 'Fermer' })
    expect(bouton).toHaveAttribute('aria-expanded', 'true')
    expect(document.getElementById('nav-admin-groupes')?.className).not.toContain('hidden')
  })

  it('marque l’entrée courante — et elle seule', () => {
    poser()

    // `/fr/admin` est le préfixe de toutes les autres entrées : sans égalité
    // stricte sur la racine, « Tableau de bord » resterait actif partout.
    expect(screen.getByRole('link', { name: 'Tableau de bord' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'Catalogue' })).not.toHaveAttribute('aria-current')
  })
})
