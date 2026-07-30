'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { Link, usePathname } from '@/i18n/navigation'
import { useScrolled } from '@/hooks/useScrolled'
import { buttonVariants } from '@/components/ui/Button'
import { IconeProfil } from '@/components/ui/Icones'
import { LienPanier } from '@/components/ui/LienPanier'
import { PANIER_ACTIF } from '@/lib/config/features'
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
export function Nav() {
  const t = useTranslations('Nav')
  const locale = useLocale()
  const pathname = usePathname()
  const scrolled = useScrolled()

  const [menuOuvert, setMenuOuvert] = useState(false)
  const [capacitesOuvert, setCapacitesOuvert] = useState(false)

  const autreLocale = locale === 'fr' ? 'en' : 'fr'

  // Referme les panneaux à chaque navigation : sans ça, le menu mobile reste
  // ouvert par-dessus la nouvelle page.
  useEffect(() => {
    setMenuOuvert(false)
    setCapacitesOuvert(false)
  }, [pathname])

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

  const liensSecondaires = [
    { key: 'realisations', href: ROUTES.realisations },
    { key: 'location', href: ROUTES.location },
    { key: 'boutique', href: ROUTES.boutique },
    { key: 'apropos', href: ROUTES.apropos },
    { key: 'carrieres', href: ROUTES.carrieres },
  ] as const

  return (
    <header
      className={cn(
        'sticky top-0 z-40 bg-ko-cream transition-colors duration-250',
        // Filet qui apparaît au défilement — skill 20. Bordure toujours
        // présente mais transparente : pas de saut de hauteur à la bascule.
        'border-b',
        scrolled ? 'border-ko-line' : 'border-transparent',
      )}
    >
      <div className="mx-auto flex max-w-container items-center justify-between px-6 py-4 lg:px-12">
        {/* Wordmark — pas d'animation au survol (skill 08). */}
        <Link
          href={ROUTES.accueil}
          className="font-mono text-sm font-medium uppercase tracking-[0.18em] text-ko-ink transition-colors duration-200 hover:text-ko-blue"
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
              className="flex min-h-[44px] items-center gap-1.5 text-sm text-ko-ink transition-colors duration-200 hover:text-ko-blue"
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
                    className="block px-5 py-3 text-sm text-ko-ink transition-[padding,background-color,color] duration-250 hover:bg-ko-cream hover:pl-7 hover:text-ko-blue"
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
              className="flex min-h-[44px] items-center text-sm text-ko-ink transition-colors duration-200 hover:text-ko-blue"
            >
              {t(key)}
            </Link>
          ))}

          {/* Bascule de langue : un vrai lien, pas un bouton — le moteur de
              recherche doit pouvoir suivre vers l'autre version. `locale`
              conserve le chemin courant et change seulement le préfixe. */}
          <Link
            href={pathname}
            locale={autreLocale}
            hrefLang={autreLocale}
            className="flex min-h-[44px] items-center font-mono text-xs uppercase tracking-widest text-ko-muted transition-colors duration-200 hover:text-ko-ink"
          >
            {t('changerLangue')}
          </Link>

          {/* Panier désactivé (PANIER_ACTIF) : le système de gestion et la
              tarification réelle viendront dans un chantier séparé — voir
              src/lib/config/features.ts. */}
          {PANIER_ACTIF && <LienPanier />}

          {/*
            Compte — icône seule, comme le panier.

            Pointe vers /compte et non vers /connexion : la page redirige
            elle-même vers la connexion si personne n'est identifié. C'est le
            comportement attendu d'une icône de profil — on clique pour voir
            SON compte.

            Simple lien, plus de fenêtre en surimpression : Christian a
            tranché pour la page pleine. Le formulaire y respire, et une seule
            façon d'arriver à la connexion vaut mieux que deux à tenir
            d'accord.
          */}
          <Link
            href={ROUTES.compte}
            // Pas de préchargement : la destination dépend de la session. Next
            // précharge par défaut tout lien visible, or /compte redirige vers
            // la connexion pour un visiteur — la requête RSC est annulée en
            // vol (ERR_ABORTED dans la console) et le résultat serait de toute
            // façon inutilisable, puisqu'il périme dès qu'on se connecte.
            prefetch={false}
            aria-label={t('compte')}
            className="flex h-11 w-11 items-center justify-center text-ko-ink transition-colors duration-200 hover:text-ko-blue"
          >
            <IconeProfil taille={20} />
          </Link>

          <Link href={ROUTES.contact} className={buttonVariants({ variant: 'primary', size: 'sm' })}>
            {t('cta')}
          </Link>
        </nav>

        {/* ---------------------- Panier + hamburger (mobile) ---------------------- */}
        {/* Le panier est DANS la barre, pas dans le menu déroulant : enfermé
            derrière le hamburger, il serait invisible tant qu'on n'ouvre pas le
            menu — or c'est un état en cours, il doit rester sous les yeux.
            (Désactivé pour l'instant — voir PANIER_ACTIF plus haut.) */}
        <div className="flex items-center gap-2 lg:hidden">
          {PANIER_ACTIF && <LienPanier />}

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
          <p className="label-mono mb-3">{t('capacites')}</p>
          <ul className="mb-8 border-l border-ko-line">
            {ROUTES_CAPACITES.map(({ key, href }) => (
              <li key={key}>
                <Link
                  href={href}
                  className="flex min-h-[44px] items-center pl-5 text-base text-ko-ink"
                >
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>

          <ul className="mb-8 divide-y divide-ko-line border-y border-ko-line">
            {liensSecondaires.map(({ key, href }) => (
              <li key={key}>
                <Link href={href} className="flex min-h-[52px] items-center text-base text-ko-ink">
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between gap-4">
            <Link
              href={pathname}
              locale={autreLocale}
              hrefLang={autreLocale}
              className="flex min-h-[44px] items-center font-mono text-xs uppercase tracking-widest text-ko-muted"
            >
              {t('changerLangue')}
            </Link>

            {/* Sur mobile l'icône seule serait illisible hors du contexte de
                la barre : le libellé est écrit. */}
            <Link
              href={ROUTES.compte}
              prefetch={false}
              className="flex min-h-[44px] items-center gap-2 text-sm text-ko-muted"
            >
              <IconeProfil taille={18} />
              {t('compte')}
            </Link>

            <Link
              href={ROUTES.contact}
              className={buttonVariants({ variant: 'primary', size: 'sm' })}
            >
              {t('cta')}
            </Link>
          </div>
        </nav>
      )}

    </header>
  )
}
