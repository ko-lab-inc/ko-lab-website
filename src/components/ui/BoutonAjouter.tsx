'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { buttonVariants } from '@/components/ui/Button'
import { IconeMoins, IconePlus } from '@/components/ui/Icones'
import { usePanier } from '@/lib/panier/PanierContext'
import { cn } from '@/lib/utils/cn'

/**
 * Ajout à la demande groupée — partagé entre le catalogue et la fiche
 * produit, pour que les deux surfaces pilotent le même panier sans dupliquer
 * la logique de quantité.
 *
 * Une fois le produit retenu, le bouton passe en état « Ajouté » et se
 * désactive : ré-appuyer incrémenterait la quantité sans retour visible, ce qui
 * se lit comme un bug. La quantité se règle sur la page de demande, où elle est
 * visible.
 */
export function BoutonAjouter({
  slug,
  nom,
  categorie,
  quantiteDisponible,
  className,
  compact = false,
}: {
  slug: string
  nom: string
  categorie: string
  /**
   * Quantité qu'on peut réellement ajouter — 0 désactive le bouton entier
   * (rupture de stock, voir lib/produits.ts), sinon plafonne le sélecteur.
   *
   * ⚠️ Avant, aucun maximum n'était imposé (« ce sont des demandes de prix,
   * pas des stocks ») — dépassé par la demande explicite de Christian une
   * fois le vrai suivi de stock en place (migration 0013) : un visiteur a pu
   * ajouter un produit affiché « rupture de stock » sans que rien ne
   * l'empêche.
   */
  quantiteDisponible: number
  className?: string
  /**
   * Bouton seul, sans sélecteur de quantité — pour la grille du catalogue,
   * où la carte fait ~210 px de large à quatre colonnes : le sélecteur y
   * mangeait 130 px et « Ajouter au panier » se cassait sur trois lignes.
   * C'est aussi le modèle de la référence Bambu Store, et ça rejoint ce que
   * documente déjà ce composant — la quantité se règle là où elle est
   * visible, sur la fiche produit et le récapitulatif.
   */
  compact?: boolean
}) {
  const t = useTranslations('Panier')
  const { ajouter, changerQuantite, articles, pret } = usePanier()

  const dansPanier = pret ? articles.find((a) => a.slug === slug) : undefined
  const enRupture = quantiteDisponible <= 0

  // Quantité locale tant que le produit n'est pas retenu ; une fois dedans,
  // le contrôle reflète et pilote la quantité du panier.
  const [quantiteLocale, setQuantiteLocale] = useState(1)
  const quantite = dansPanier?.quantite ?? quantiteLocale

  const regler = (valeur: number) => {
    const bornee = Math.min(quantiteDisponible, Math.max(1, valeur))
    if (dansPanier) changerQuantite(slug, bornee)
    else setQuantiteLocale(bornee)
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Contrôle − [n] + — filets 1px, aucun fond coloré (skill 08).
          Non rendu en mode compact plutôt que masqué en CSS : `hidden`
          laisserait deux boutons vivants dans le DOM de chacune des douze
          cartes, invisibles mais bien présents pour un lecteur d'écran qui
          parcourt le document autrement que par la navigation au clavier.
          Absent aussi en rupture : rien à régler si on ne peut rien ajouter. */}
      {!compact && !enRupture && (
        <div className="flex items-center border border-ko-line">
          <button
            type="button"
            onClick={() => regler(quantite - 1)}
            disabled={quantite <= 1}
            aria-label={`${t('quantite')} −`}
            className="flex h-11 w-10 items-center justify-center text-ko-ink transition-colors duration-200 hover:text-ko-black disabled:opacity-40"
          >
            <IconeMoins taille={14} />
          </button>

          <span
            aria-live="polite"
            className="min-w-[2.5rem] text-center font-mono text-sm text-ko-ink"
          >
            {quantite}
          </span>

          <button
            type="button"
            onClick={() => regler(quantite + 1)}
            disabled={quantite >= quantiteDisponible}
            aria-label={`${t('quantite')} +`}
            className="flex h-11 w-10 items-center justify-center text-ko-ink transition-colors duration-200 hover:text-ko-black disabled:opacity-40"
          >
            <IconePlus taille={14} />
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          if (dansPanier || enRupture) return
          ajouter({ slug, nom, categorie })
          // La quantité choisie avant l'ajout est reportée dans le panier.
          if (quantiteLocale > 1) changerQuantite(slug, quantiteLocale)
        }}
        // `disabled` et non `pointer-events-none` : ce dernier laisse le
        // bouton focusable et activable au clavier, donc annonçable comme
        // cliquable par un lecteur d'écran alors qu'il ne fait rien.
        disabled={!!dansPanier || enRupture}
        className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'flex-1')}
      >
        {enRupture ? t('rupture_stock') : dansPanier ? t('ajoute') : t('ajouter')}
      </button>
    </div>
  )
}
