'use client'

import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { usePanier } from '@/lib/panier/PanierContext'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils/cn'

/**
 * Accès à la demande de prix en cours, depuis la nav.
 *
 * Ne s'affiche que si le panier contient au moins un article. Une icône
 * permanente et vide sur toutes les pages du site serait un élément décoratif
 * sans information — ce que le skill 08 demande de supprimer. Dès qu'un
 * produit est retenu, le lien apparaît et suit le visiteur partout.
 *
 * Attend `pret` : le serveur ne connaît pas le panier, afficher un compteur
 * avant la lecture de localStorage provoquerait un écart d'hydratation.
 */
export function LienPanier({ className }: { className?: string }) {
  const t = useTranslations('Panier')
  const { nombre, pret } = usePanier()

  if (!pret || nombre === 0) return null

  return (
    <Link
      href={ROUTES.boutiqueDemande}
      className={cn(
        'inline-flex min-h-[44px] items-center gap-2.5 text-sm text-ko-ink transition-colors duration-200 hover:text-ko-blue',
        className,
      )}
    >
      {/* Icône dessinée à la main, trait 1.5px, sans librairie (skill 08). */}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <path d="M4 6h15l-1.4 8.4a2 2 0 0 1-2 1.6H8a2 2 0 0 1-2-1.7L4.5 4.6A1 1 0 0 0 3.5 4H2" />
        <circle cx="9" cy="20" r="1.2" />
        <circle cx="17" cy="20" r="1.2" />
      </svg>

      <span>{t('ouvrir')}</span>

      {/* Compteur : chiffre nu sur pastille bleue — le bleu est le seul accent
          du système, et c'est ici une information, pas une décoration. */}
      <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-ko-blue px-1.5 font-mono text-[10px] text-ko-white">
        {nombre}
      </span>
    </Link>
  )
}
