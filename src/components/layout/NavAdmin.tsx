'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

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

export function NavAdmin({ groupes, racine }: { groupes: GroupeAdmin[]; racine: string }) {
  const pathname = usePathname()

  return (
    <nav className="lg:sticky lg:top-8">
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
    </nav>
  )
}
