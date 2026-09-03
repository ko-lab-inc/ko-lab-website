'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { Link, usePathname } from '@/i18n/navigation'
import { useScrolled } from '@/hooks/useScrolled'
import { buttonVariants } from '@/components/ui/Button'
import { IconeProfil } from '@/components/ui/Icones'
import { LienPanier } from '@/components/ui/LienPanier'
import { usePanier } from '@/lib/panier/PanierContext'
import { cn } from '@/lib/utils/cn'
import { ROUTES, ROUTES_CAPACITES } from '@/lib/routes'

/**
 * Navigation principale — fond crème, sticky (CLAUDE.md).
 *
 * Le document de cadrage impose une nav COURTE : les quatre pages
 * opérationnelles sont regroupées sous « Nos capacités ».
 *
 * Contraintes du skill 08 respectées : pas de mega menu à dégradé, pas de logo
 * animé au survol, pas de barre de progression de scroll. Le seul effet est
 * l'apparition d'un filet de 1px au défilement (skill 20).
 */
export function Nav({
  /**
   * Panier ouvert ou non — vient des réglages, donc de la base.
   *
   * ⚠️ Reçu en PROP et non lu ici. Ce composant est client : un
   * `process.env.NEXT_PUBLIC_*` y serait figé à la compilation, et changer le
   * réglage depuis l'espace équipe n'aurait aucun effet avant un
   * redéploiement. C'est exactement ce qu'on voulait supprimer.
   */
  panierActif,
  /** Même raison que panierActif — reçu en prop, pas lu ici (composant client). */
  boutiqueActive,
  /**
   * Idem — concoursActif (migration 0040). Non lue ici depuis le retrait de
   * Concours de la nav permanente (LOT B, §32, 29 août 2026) — prop gardée
   * dans la signature (l'appelant, layout.tsx, continue de la passer sans
   * changement), seule cette entrée de menu a disparu. Renommée `_` :
   * `noUnusedParameters` (tsconfig) refuse sinon le build sur une
   * destructuration jamais lue.
   */
  concoursActif: _concoursActif,
}: {
  panierActif: boolean
  boutiqueActive: boolean
  concoursActif: boolean
}) {
  const t = useTranslations('Nav')
  const pathname = usePathname()
  const scrolled = useScrolled()
  /**
   * Icône compte — visible seulement pour une session authentifiée (LOT B,
   * §31, 29 août 2026). Réutilise `connecte` du panier plutôt que d'ajouter
   * un second appel à /api/session : le panier le lit déjà au montage du
   * layout marketing (PanierContext.tsx), un appel de plus n'aurait rien
   * appris de plus, juste dupliqué le réseau.
   *
   * `connecte` est `null` tant que /api/session n'a pas répondu, `true`/
   * `false` ensuite — un échec (réseau coupé, 429) y retombe déjà sur
   * `false` dans PanierContext, jamais un état bloqué ni une boucle de
   * requêtes : rien à refaire ici.
   *
   * `connecte && <Link>` couvre les trois états sans scintillement :
   * `null` et `false` rendent tous les deux « rien », seul `true` affiche
   * l'icône — elle ne peut donc jamais apparaître puis disparaître, elle ne
   * fait qu'apparaître, une fois, si la session existe.
   *
   * Pas d'espace réservé pendant l'attente : même choix que `LienPanier`
   * juste au-dessus, qui se rend déjà `null` sans réserver de place tant que
   * `pret` est faux. Le décalage ne touche que les sessions déjà
   * authentifiées (équipe, clients avec compte) — jamais un visiteur
   * anonyme, qui ne voit l'icône ni avant ni après.
   */
  const { connecte } = usePanier()
  const locale = useLocale()

  // Phase 9 : sélecteur de langue. `pathname` (next-intl) est déjà sans
  // préfixe — `<Link locale={…}>` pose lui-même le bon préfixe cible, exact
  // même chemin dans l'autre langue plutôt qu'un renvoi à l'accueil.
  const autreLocale = locale === 'fr' ? 'en' : 'fr'

  const [menuOuvert, setMenuOuvert] = useState(false)
  const [capacitesOuvert, setCapacitesOuvert] = useState(false)

  // Filet de sécurité pour une navigation SANS clic sur un lien du menu —
  // retour arrière du navigateur, navigation clavier/programmatique : sans
  // ça, le menu mobile reste ouvert par-dessus la nouvelle page. Chaque lien
  // du panneau mobile ferme déjà le menu à son propre onClick (corrigé le
  // 3 septembre 2026 — cliquer sur la page où on est déjà ne change jamais
  // `pathname`, donc ce seul effet ne suffisait pas : le menu restait ouvert
  // après un clic sur son propre lien actif).
  //
  // ⚠️ PENDANT LE RENDU, PAS DANS UN EFFET — motif recommandé par React pour
  // « réinitialiser un état quand une prop change » (ici, le chemin) : un
  // `setState` synchrone dans un effet déclenche un rendu superflu (rendu →
  // effet → re-rendu), alors qu'un `setState` conditionnel pendant le rendu
  // fait l'aller-retour en un seul passage.
  const [cheminPrecedent, setCheminPrecedent] = useState(pathname)
  if (pathname !== cheminPrecedent) {
    setCheminPrecedent(pathname)
    setMenuOuvert(false)
    setCapacitesOuvert(false)
  }

  // Bloque le défilement de l'arrière-plan pendant que le panneau mobile occupe
  // l'écran — sinon le contenu glisse derrière le menu au toucher.
  useEffect(() => {
    if (!menuOuvert) return
    const precedent = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = precedent
    }
  }, [menuOuvert])

  // Échap ferme le panneau ouvert — attendu de tout menu au clavier.
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setMenuOuvert(false)
      setCapacitesOuvert(false)
    }
    window.addEventListener('keydown', surTouche)
    return () => window.removeEventListener('keydown', surTouche)
  }, [])

  // boutiqueActive/concoursActif filtrent l'entrée ici, en amont des deux
  // .map() (desktop et mobile) qui consomment ce tableau plus bas — un seul
  // endroit à tenir d'accord plutôt que deux rendus filtrés séparément.
  // Concours retiré de la nav permanente (LOT B, §32, 29 août 2026) — la
  // page et sa route restent en ligne pour un lien direct de campagne,
  // seule l'entrée de menu disparaît. Le filtre sur `concoursActif`
  // disparaît avec elle (comparer `key` à 'concours' n'a plus de sens de
  // type une fois l'entrée retirée du tableau, TS2367) — voir la prop
  // plus haut pour pourquoi `concoursActif` reste quand même déclarée.
  const liensSecondaires = (
    [
      { key: 'realisations', href: ROUTES.realisations },
      { key: 'location', href: ROUTES.location },
      { key: 'boutique', href: ROUTES.boutique },
      { key: 'apropos', href: ROUTES.apropos },
      { key: 'carrieres', href: ROUTES.carrieres },
    ] as const
  ).filter(({ key }) => key !== 'boutique' || boutiqueActive)

  /**
   * Page courante — gras, demande initiale de Christian « gras + bleu ».
   *
   * ⚠️ CHANGÉ EN PHASE 2 (18 août 2026) — le bleu sur fond crème (nav
   * sticky) ne fait que 2,15:1, sous tout seuil AA même pour du texte de
   * cette taille. Le gras seul indique l'état actif ; `aria-current="page"`
   * porte l'information pour un lecteur d'écran. Le survol perd son
   * changement de couleur, remplacé par un soulignement (permis sur fond
   * clair, contrairement au texte bleu). À valider avec Christian — c'est
   * une correction de contraste, pas un choix esthétique arbitraire.
   *
   * `pathname` (next-intl) est déjà sans préfixe de langue, donc comparable
   * tel quel aux `href` de ROUTES. `startsWith(href + '/')` couvre les
   * sous-pages (une fiche produit /boutique/xtool-p2 marque « Boutique »
   * actif) sans faire matcher un chemin qui commence pareil par hasard.
   */
  const estActif = (href: string) => pathname === href || pathname.startsWith(`${href}/`)
  const capacitesActif = estActif(ROUTES.capacites)

  return (
    <header
      className={cn(
        // z-50, pas z-40 : WidgetAide/ChatCrisp (bulle d'aide) et
        // BoutonRetourHaut (flèche « remonter ») sont tous les deux fixed
        // z-40 en bas à droite — même valeur que la nav, donc l'ordre du DOM
        // tranchait, et les deux widgets (rendus après <Nav> dans le layout)
        // passaient PAR-DESSUS le panneau mobile ouvert, chevauchant
        // « English » et le bouton « Démarrer un projet » (constaté le
        // 3 septembre 2026). Le panneau mobile est opaque (bg-ko-cream) et
        // couvre déjà cette zone : au-dessus d'eux, il les masque proprement
        // tant qu'il est ouvert, sans toucher à leur propre z-index.
        'sticky top-0 z-50 bg-ko-cream transition-colors duration-250',
        // Filet qui apparaît au défilement — skill 20. Bordure toujours
        // présente mais transparente : pas de saut de hauteur à la bascule.
        'border-b',
        scrolled ? 'border-ko-line' : 'border-transparent',
      )}
    >
      <div className="mx-auto flex max-w-container items-center justify-between px-6 py-4 lg:px-12">
        {/* Wordmark — pas d'animation au survol (skill 08). Le hover bleu
            contredisait ce commentaire depuis le début ; retiré en même
            temps que la règle Phase 2 (jamais de bleu sur texte courant
            clair) plutôt que de le recolorer pour rien. */}
        <Link
          href={ROUTES.accueil}
          className="font-mono text-sm font-medium uppercase tracking-[0.18em] text-ko-ink"
        >
          KO-LAB
        </Link>

        {/* ------------------------------ Desktop ------------------------------ */}
        <nav aria-label={t('menuPrincipal')} className="hidden items-center gap-8 lg:flex">
          <div
            className="relative"
            onMouseEnter={() => setCapacitesOuvert(true)}
            onMouseLeave={() => setCapacitesOuvert(false)}
          >
            <button
              type="button"
              aria-expanded={capacitesOuvert}
              onClick={() => setCapacitesOuvert((v) => !v)}
              className={cn(
                'flex min-h-[44px] items-center gap-1.5 text-sm text-ko-ink transition-[text-decoration-color] duration-200 hover:underline hover:decoration-ko-blue hover:underline-offset-4',
                capacitesActif && 'font-medium',
              )}
            >
              {t('capacites')}
              <span aria-hidden="true" className="text-[10px] text-ko-muted">
                ▾
              </span>
            </button>

            {capacitesOuvert && (
              // Panneau uni bordé de 1px — surtout pas de dégradé (skill 08).
              <div className="absolute left-0 top-full min-w-[280px] border border-ko-line bg-ko-white py-2 shadow-card">
                {ROUTES_CAPACITES.map(({ key, href }) => (
                  <Link
                    key={key}
                    href={href}
                    aria-current={estActif(href) ? 'page' : undefined}
                    className={cn(
                      'block px-5 py-3 text-sm text-ko-ink transition-[padding,background-color] duration-250 hover:bg-ko-cream hover:pl-7',
                      estActif(href) && 'font-medium',
                    )}
                  >
                    {t(key)}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {liensSecondaires.map(({ key, href }) => (
            <Link
              key={key}
              href={href}
              aria-current={estActif(href) ? 'page' : undefined}
              className={cn(
                'flex min-h-[44px] items-center text-sm text-ko-ink transition-[text-decoration-color] duration-200 hover:underline hover:decoration-ko-blue hover:underline-offset-4',
                estActif(href) && 'font-medium',
              )}
            >
              {t(key)}
            </Link>
          ))}

          {/* Piloté depuis Réglages › Parties du site. Décoché, le panier
              disparaît d'ici comme de la boutique. boutiqueActive aussi : la
              boutique désactivée n'a plus de panier à afficher, même si
              panierActif reste coché. */}
          {panierActif && boutiqueActive && <LienPanier />}

          {/*
            Compte — icône seule, comme le panier. Masquée au public depuis
            le LOT B (§31, 29 août 2026) : voir `connecte` plus haut. Pointe
            vers /compte et non vers /connexion : la page redirige elle-même
            vers la connexion si personne n'est identifié — mais désormais,
            si l'icône est visible, c'est déjà qu'une session existe.

            Simple lien, plus de fenêtre en surimpression : Christian a
            tranché pour la page pleine. Le formulaire y respire, et une seule
            façon d'arriver à la connexion vaut mieux que deux à tenir
            d'accord.
          */}
          {connecte && (
            <Link
              href={ROUTES.compte}
              // Pas de préchargement : la destination dépend de la session. Next
              // précharge par défaut tout lien visible, or /compte redirige vers
              // la connexion pour un visiteur — la requête RSC est annulée en
              // vol (ERR_ABORTED dans la console) et le résultat serait de toute
              // façon inutilisable, puisqu'il périme dès qu'on se connecte.
              prefetch={false}
              aria-label={t('compte')}
              className="flex h-11 w-11 items-center justify-center text-ko-ink transition-colors duration-200 hover:text-ko-black"
            >
              <IconeProfil taille={20} />
            </Link>
          )}

          {/* Sélecteur de langue — endonyme de la langue CIBLE, jamais traduit :
              un visiteur anglophone doit reconnaître « Français » écrit en
              français, pas une version anglicisée. Exception délibérée à la
              règle « aucune chaîne en dur ». */}
          <Link
            href={pathname}
            locale={autreLocale}
            className="flex min-h-[44px] items-center text-sm text-ko-muted transition-colors duration-200 hover:text-ko-ink"
          >
            {autreLocale === 'en' ? 'English' : 'Français'}
          </Link>

          {/* `bleu`, pas `primary` — audit contraste du 27 août 2026 :
              CTA principal du site, laissé bleu jusqu'à décision de
              Christian/Moussa (le repasser en noir changerait l'identité
              visuelle de l'en-tête) — voir Button.tsx. */}
          <Link href={ROUTES.contact} className={buttonVariants({ variant: 'bleu', size: 'sm' })}>
            {t('cta')}
          </Link>
        </nav>

        {/* ---------------------- Panier + hamburger (mobile) ---------------------- */}
        {/* Le panier est DANS la barre, pas dans le menu déroulant : enfermé
            derrière le hamburger, il serait invisible tant qu'on n'ouvre pas le
            menu — or c'est un état en cours, il doit rester sous les yeux.
            Même réglage que la barre du haut. */}
        <div className="flex items-center gap-2 lg:hidden">
          {panierActif && boutiqueActive && <LienPanier />}

          <button
          type="button"
          onClick={() => setMenuOuvert((v) => !v)}
          aria-expanded={menuOuvert}
          aria-controls="menu-mobile"
          aria-label={menuOuvert ? t('fermerMenu') : t('ouvrirMenu')}
          className="-mr-2 flex h-11 w-11 flex-col items-center justify-center gap-1.5"
        >
          {/* Trois filets de 1px, largeurs inégales — cohérent avec le
              vocabulaire de lignes fines du design system. */}
          <span
            className={cn(
              'block h-px w-6 bg-ko-ink transition-transform duration-250',
              menuOuvert && 'translate-y-[7px] rotate-45',
            )}
          />
          <span
            className={cn(
              'block h-px w-6 bg-ko-ink transition-opacity duration-250',
              menuOuvert && 'opacity-0',
            )}
          />
          <span
            className={cn(
              'block h-px w-4 bg-ko-ink transition-all duration-250',
              menuOuvert && 'w-6 -translate-y-[7px] -rotate-45',
            )}
          />
          </button>
        </div>
      </div>

      {/* ------------------------------- Mobile ------------------------------- */}
      {menuOuvert && (
        <nav
          id="menu-mobile"
          aria-label={t('menuPrincipal')}
          className="max-h-[calc(100svh-73px)] overflow-y-auto border-t border-ko-line bg-ko-cream px-6 pb-10 pt-6 lg:hidden"
        >
          <p className={cn('label-mono mb-3', capacitesActif && 'text-ko-ink')}>
            {t('capacites')}
          </p>
          <ul className="mb-8 border-l border-ko-line">
            {ROUTES_CAPACITES.map(({ key, href }) => (
              <li key={key}>
                <Link
                  href={href}
                  onClick={() => setMenuOuvert(false)}
                  aria-current={estActif(href) ? 'page' : undefined}
                  className={cn(
                    'flex min-h-[44px] items-center pl-5 text-base',
                    estActif(href) ? 'font-medium text-ko-ink' : 'text-ko-ink',
                  )}
                >
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>

          <ul className="mb-8 divide-y divide-ko-line border-y border-ko-line">
            {liensSecondaires.map(({ key, href }) => (
              <li key={key}>
                <Link
                  href={href}
                  onClick={() => setMenuOuvert(false)}
                  aria-current={estActif(href) ? 'page' : undefined}
                  className={cn(
                    'flex min-h-[52px] items-center text-base',
                    estActif(href) ? 'font-medium text-ko-ink' : 'text-ko-ink',
                  )}
                >
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>

          {/* Deux rangées plutôt qu'une seule à trois éléments : à 375px,
              « Mon compte » + langue + bouton ne tenaient pas côte à côte —
              le libellé du compte cassait au milieu d'un mot et le bouton
              passait sur deux lignes. Compte et langue partagent une rangée
              (deux éléments courts, ça tient), le bouton prend la sienne en
              pleine largeur. */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              {/* Sur mobile l'icône seule serait illisible hors du contexte de
                  la barre : le libellé est écrit. Masqué au public depuis le
                  LOT B (§31, 29 août 2026) — voir `connecte` plus haut. */}
              {connecte && (
                <Link
                  href={ROUTES.compte}
                  prefetch={false}
                  onClick={() => setMenuOuvert(false)}
                  className="flex min-h-[44px] items-center gap-2 text-sm text-ko-muted"
                >
                  <IconeProfil taille={18} />
                  {t('compte')}
                </Link>
              )}

              {/* `ml-auto`, pas seulement `justify-between` du parent : sans
                  ça, langue se retrouve collée à gauche quand `compte`
                  disparaît (seul enfant restant d'un `justify-between`) —
                  visiteur anonyme, donc le cas de tous les jours. `ml-auto`
                  la garde à droite que `compte` soit là ou non. */}
              <Link
                href={pathname}
                locale={autreLocale}
                onClick={() => setMenuOuvert(false)}
                className="ml-auto flex min-h-[44px] items-center text-sm text-ko-muted"
              >
                {autreLocale === 'en' ? 'English' : 'Français'}
              </Link>
            </div>

            {/* `bleu`, pas `primary` — même CTA que la nav desktop, même
                raison (voir plus haut dans ce fichier). */}
            <Link
              href={ROUTES.contact}
              onClick={() => setMenuOuvert(false)}
              className={cn('w-full', buttonVariants({ variant: 'bleu', size: 'sm' }))}
            >
              {t('cta')}
            </Link>
          </div>
        </nav>
      )}

    </header>
  )
}
