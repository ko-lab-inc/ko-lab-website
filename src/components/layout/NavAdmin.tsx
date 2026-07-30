'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils/cn'

import type { ReactNode } from 'react'

/**
 * Menu latéral de l'espace équipe.
 *
 * Composant client pour une seule raison : marquer l'entrée courante, ce qui
 * demande de lire le chemin. Les libellés arrivent en props, résolus côté
 * serveur — modèle du projet, et ça évite d'envoyer l'espace de noms Admin au
 * navigateur.
 *
 * ---------------------------------------------------------------------------
 * ⚠️ `next/link` ET `next/navigation`, PAS leurs équivalents next-intl.
 *
 * Le layout admin ne monte pas de NextIntlClientProvider — il n'en a pas
 * besoin, tous ses textes sont résolus côté serveur. Or le `usePathname` de
 * next-intl lit la locale dans ce contexte : sans provider, il lève, et le
 * rendu serveur de tout l'espace admin échouait avec une erreur nue.
 *
 * Les href arrivent donc DÉJÀ préfixés par le layout (/fr/admin/…), et la
 * comparaison se fait sur le chemin complet. Rien à reconstruire, rien à
 * deviner.
 * ---------------------------------------------------------------------------
 */

export type EntreeAdmin = {
  href: string
  label: string
  /**
   * Icône DÉJÀ RENDUE, pas le composant.
   *
   * ⚠️ Passer `Icone: IconeTableauBord` depuis le layout faisait échouer tout
   * l'espace admin : « Functions cannot be passed directly to Client
   * Components ». Une fonction ne traverse pas la frontière serveur/client,
   * un élément React si. TuileStat, lui, accepte le composant — parce que
   * CadreAdmin est un composant SERVEUR, pas client.
   */
  icone: ReactNode
}
export type GroupeAdmin = { titre: string; entrees: EntreeAdmin[] }

export function NavAdmin({
  groupes,
  racine,
  labelMenu,
  labelFermer,
}: {
  groupes: GroupeAdmin[]
  racine: string
  /** Libellés du bouton hamburger — lu et affiché sous `lg` seulement. */
  labelMenu: string
  labelFermer: string
}) {
  const pathname = usePathname()

  /**
   * Repliée par défaut sous `lg`.
   *
   * ⚠️ Avant, cette nav n'avait AUCUN comportement mobile : `<aside>` (dans
   * layout.tsx) n'est en colonne fixe qu'à partir de `lg`, donc en dessous
   * les neuf liens s'affichaient en ligne, en plein document, avant même le
   * contenu de la page — il fallait les faire défiler pour atteindre
   * l'écran demandé. Relevé par Christian : « il n'y a pas de menu burger ».
   * Repliée par défaut et dépliée au clic, exactement comme Nav.tsx côté
   * vitrine — mais SANS l'overlay plein écran de celle-ci : ici la nav vit
   * dans le fil du document (elle pousse le contenu, elle ne le recouvre
   * pas), ce qui suffit pour une aside qui n'a jamais à rivaliser avec un
   * hero en dessous.
   */
  const [ouvert, setOuvert] = useState(false)

  // Repliée à chaque navigation : sinon elle reste ouverte par-dessus le
  // nouvel écran, même défaut que la nav publique sans cette synchronisation.
  useEffect(() => {
    setOuvert(false)
  }, [pathname])

  return (
    <nav className="lg:sticky lg:top-8">
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-expanded={ouvert}
        aria-controls="nav-admin-groupes"
        className="mb-4 flex min-h-[44px] w-full items-center justify-between text-sm text-ko-ink lg:hidden"
      >
        {ouvert ? labelFermer : labelMenu}
        <span aria-hidden="true" className="flex h-6 w-6 shrink-0 flex-col items-center justify-center gap-1.5">
          <span
            className={cn(
              'block h-px w-5 bg-ko-ink transition-transform duration-250',
              ouvert && 'translate-y-[5px] rotate-45',
            )}
          />
          <span
            className={cn(
              'block h-px w-5 bg-ko-ink transition-opacity duration-250',
              ouvert && 'opacity-0',
            )}
          />
          <span
            className={cn(
              'block h-px w-5 bg-ko-ink transition-transform duration-250',
              ouvert && '-translate-y-[5px] -rotate-45',
            )}
          />
        </span>
      </button>

      <div id="nav-admin-groupes" className={cn(!ouvert && 'hidden', 'lg:block')}>
        {groupes.map((groupe) => (
          <div key={groupe.titre} className="mb-8 last:mb-0">
            <p className="label-mono mb-3 text-ko-muted">{groupe.titre}</p>

            <ul className="flex flex-col items-stretch gap-0.5">
              {groupe.entrees.map(({ href, label, icone }) => {
                // Égalité stricte pour la racine (/fr/admin), qui est le préfixe
                // de toutes les autres entrées : un simple startsWith la
                // laisserait active en permanence.
                const actif = href === racine ? pathname === href : pathname.startsWith(href)

                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={actif ? 'page' : undefined}
                      // Entrée active sur un aplat bleu très léger (ko-blue-bg,
                      // #e8f2fb, déjà dans la palette) plutôt qu'un simple filet
                      // à gauche : dans une barre pleine hauteur, un trait de
                      // 2px se perdait. L'aplat se voit d'un coup d'œil sans
                      // ajouter de couleur au système.
                      className={cn(
                        'flex min-h-[40px] items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors duration-200',
                        actif
                          ? 'bg-ko-blue-bg font-medium text-ko-blue'
                          : 'text-ko-ink hover:bg-ko-cream hover:text-ko-blue',
                      )}
                    >
                      {/* L'icône hérite de la couleur du lien via currentColor :
                          elle passe au bleu avec le libellé, sans règle en plus. */}
                      {icone}
                      {label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  )
}
