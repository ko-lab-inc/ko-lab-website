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
  identite,
  groupes,
  racine,
  labelMenu,
  labelFermer,
}: {
  /**
   * Bloc « KO-LAB / Espace équipe », rendu côté SERVEUR par le layout.
   *
   * Reçu en élément déjà rendu, pas en composant à invoquer ici — même règle
   * que `icone` sur `EntreeAdmin` juste au-dessus : un composant ne traverse
   * pas la frontière serveur/client, un élément si.
   */
  identite: ReactNode
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
   * vitrine — ET, depuis la demande de Christian du 2 août, avec le même
   * overlay `fixed` plein écran que celle-ci (voir le panneau
   * `#nav-admin-groupes` plus bas) : une aside qui pousse le contenu ne
   * suffisait plus une fois la barre d'identité elle-même passée en `fixed`.
   */
  const [ouvert, setOuvert] = useState(false)

  // Repliée à chaque navigation : sinon elle reste ouverte par-dessus le
  // nouvel écran, même défaut que la nav publique sans cette synchronisation.
  //
  // ⚠️ PENDANT LE RENDU, PAS DANS UN EFFET — voir Nav.tsx pour le détail du
  // motif (React, « reset state on prop change ») : évite un rendu superflu.
  const [cheminPrecedent, setCheminPrecedent] = useState(pathname)
  if (pathname !== cheminPrecedent) {
    setCheminPrecedent(pathname)
    setOuvert(false)
  }

  /**
   * Bloque le défilement de l'arrière-plan pendant que le menu déplié occupe
   * l'écran — même motif que Nav.tsx (nav publique). Demande de Christian :
   * ouvrir le menu affichait la liste au milieu d'un défilement de PAGE déjà
   * en cours (ex. Tableau de bord scrollé), donc une moitié de sous-menu
   * mélangée à du contenu de page — plutôt qu'une liste complète, depuis le
   * haut. `max-h-[calc(100svh-60px)] overflow-y-auto` sur le panneau
   * ci-dessous (60px = hauteur de la barre fixe) fait que c'est LUI qui
   * défile en interne si la liste dépasse, jamais la page derrière.
   */
  useEffect(() => {
    if (!ouvert) return
    const precedent = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = precedent
    }
  }, [ouvert])

  return (
    <nav className="lg:sticky lg:top-8">
      {/*
        ⚠️ `fixed`, PAS `sticky` — demande de Christian : la ligne « KO-LAB /
        Espace équipe » et le bouton menu doivent rester visibles en
        permanence pendant le défilement, en mobile. `sticky` a été essayé
        d'abord et ne tenait PAS : un élément sticky ne reste collé que tant
        que son PARENT est encore à l'écran, or `<aside>` replié (menu fermé)
        ne fait que la hauteur de cette seule ligne — dès qu'on défilait de
        60px, l'aside entier sortait du viewport et emportait la barre avec
        lui. Constaté en testant un vrai défilement, pas en relisant le CSS.

        `fixed` sort la barre du flux : `pt-[60px]` sur le <body>
        (layout.tsx) compense exactement sa hauteur pour que rien ne
        commence caché dessous — aussi bien le sous-menu déplié que
        « Voir le site » / « Se déconnecter » juste en dessous.

        `lg:static lg:block` : à partir de `lg`, la colonne entière est déjà
        fixe (voir layout.tsx), cette ligne redevient un bloc normal et le
        bouton disparaît (`lg:hidden` sur le bouton lui-même).
      */}
      {/* ⚠️ Ce conteneur ne porte QUE le chrome mobile (fond noir, filet,
          hauteur fixe, padding horizontal) — à partir de `lg`, il redevient
          neutre (`lg:bg-transparent lg:border-b-0 lg:px-0`) et c'est
          `identite` (voir layout.tsx) qui porte SON PROPRE filet et padding
          desktop. Les deux superposeraient sinon leurs paddings. */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-[60px] items-center justify-between gap-3 border-b border-ko-line-d bg-ko-black px-5 lg:static lg:block lg:h-auto lg:border-b-0 lg:bg-transparent lg:px-0 lg:py-0">
        {identite}

        <button
          type="button"
          onClick={() => setOuvert((v) => !v)}
          aria-expanded={ouvert}
          aria-controls="nav-admin-groupes"
          aria-label={ouvert ? labelFermer : labelMenu}
          className="flex h-11 w-11 shrink-0 items-center justify-center lg:hidden"
        >
          <span aria-hidden="true" className="flex h-6 w-6 shrink-0 flex-col items-center justify-center gap-1.5">
            <span
              className={cn(
                'block h-px w-5 bg-ko-white transition-transform duration-250',
                ouvert && 'translate-y-[5px] rotate-45',
              )}
            />
            <span
              className={cn(
                'block h-px w-5 bg-ko-white transition-opacity duration-250',
                ouvert && 'opacity-0',
              )}
            />
            <span
              className={cn(
                'block h-px w-5 bg-ko-white transition-transform duration-250',
                ouvert && '-translate-y-[5px] -rotate-45',
              )}
            />
          </span>
        </button>
      </div>

      {/*
        ⚠️ `fixed`, PAS un panneau en fil du document — deuxième correction
        du même problème. Un premier essai (hauteur plafonnée + défilement de
        la PAGE bloqué) ne suffisait pas : si la page était déjà défilée
        avant l'ouverture (ex. au milieu du tableau de bord), le panneau
        s'ouvrait bien, mais à SA position naturelle dans le document — plus
        haut que ce que l'écran montrait à ce moment-là. Constaté en testant
        un vrai scroll AVANT d'ouvrir le menu, pas juste menu fermé → ouvert
        depuis le haut de page. `fixed inset-x-0 top-[60px] bottom-0` ancre
        le panneau au VIEWPORT, jamais à la position de défilement du
        document — il apparaît systématiquement en entier, quel que soit
        l'endroit de la page où on se trouvait.
      */}
      <div
        id="nav-admin-groupes"
        className={cn(
          !ouvert && 'hidden',
          'fixed inset-x-0 top-[60px] bottom-0 z-20 overflow-y-auto border-b border-ko-line-d bg-ko-black px-4 py-6',
          'lg:static lg:inset-auto lg:z-auto lg:block lg:h-auto lg:overflow-visible lg:border-b-0 lg:bg-transparent lg:p-0 lg:pt-6',
        )}
      >
        {groupes.map((groupe) => (
          <div key={groupe.titre} className="mb-8 last:mb-0">
            <p className="label-mono mb-3 text-ko-muted-d">{groupe.titre}</p>

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
                      // Entrée active sur un aplat plutôt qu'un simple filet à
                      // gauche : dans une barre pleine hauteur, un trait de
                      // 2px se perdait.
                      //
                      // ⚠️ Sur fond sombre, l'aplat est un voile blanc
                      // translucide (ko-frost) et non l'ancien ko-blue-bg
                      // (#e8f2fb) : ce bleu très pâle était conçu pour un
                      // fond clair et deviendrait un pavé lumineux sur le
                      // noir. Le texte passe à ko-blue2, seul bleu de la
                      // palette qui atteint le seuil AA sur ko-black (6.97:1
                      // contre 4.47:1 — voir label-mono-d dans globals.css).
                      className={cn(
                        'flex min-h-[40px] items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors duration-200',
                        actif
                          ? 'bg-ko-frost/10 font-medium text-ko-blue2'
                          : 'text-ko-muted-d hover:bg-ko-frost/5 hover:text-ko-white',
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
