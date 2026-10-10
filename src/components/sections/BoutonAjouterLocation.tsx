'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { buttonVariants } from '@/components/ui/Button'
import { IconeMoins, IconePlus } from '@/components/ui/Icones'
import { usePanierLocation } from '@/lib/panier/PanierLocationContext'
import { cn } from '@/lib/utils/cn'

/**
 * « Ajouter à ma demande » — pilote le panier de location (usePanierLocation).
 * Partagé entre la carte du catalogue et la fiche produit, pour que les deux
 * surfaces n'aient pas deux logiques d'ajout différentes.
 *
 * Par défaut, PAS de sélecteur de quantité : la carte de la grille est étroite,
 * et le sélecteur y mangerait la largeur du bouton. `avecQuantite` l'active sur
 * la fiche produit, où la place existe — même parti pris que BoutonAjouter de
 * la boutique, et que la référence (Black Tie).
 *
 * Une fois l'article retenu, le bouton passe en « Ajouté » et se désactive :
 * ré-appuyer incrémenterait la quantité sans retour visible, ce qui se lit
 * comme un bug. La quantité se règle ensuite sur /location/demande.
 */
export function BoutonAjouterLocation({
  slug,
  nom,
  categorie,
  className,
  avecQuantite = false,
  libelleCourt = false,
}: {
  slug: string
  nom: string
  categorie: string
  className?: string
  /** Affiche le contrôle − n + à gauche du bouton (fiche produit). */
  avecQuantite?: boolean
  /**
   * Libellé court « Ajouter » au lieu de « Ajouter à ma demande ». Pour la vue
   * liste du catalogue, où la colonne est étroite : le libellé long y passait
   * sur deux lignes et doublait la hauteur de la ligne (10 octobre 2026). Le
   * nom de l'article est juste à côté, « à ma demande » y est redondant.
   * L'aria-label, lui, reste complet et nommé pour un lecteur d'écran.
   */
  libelleCourt?: boolean
}) {
  const t = useTranslations('DemandeLocation')
  const { ajouter, changerQuantite, contient, pret } = usePanierLocation()

  const dedans = pret && contient(slug)

  // Quantité choisie AVANT l'ajout. Une fois l'article dans la demande, le
  // bouton est désactivé et le réglage se poursuit sur le récapitulatif.
  const [quantite, setQuantite] = useState(1)

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Non rendu plutôt que masqué en CSS : `hidden` laisserait deux boutons
          vivants dans le DOM, invisibles mais bien présents pour un lecteur
          d'écran qui parcourt le document. Absent une fois l'article retenu :
          il n'y a plus rien à régler ici. */}
      {avecQuantite && !dedans && (
        <div className="flex items-center border border-ko-line">
          <button
            type="button"
            onClick={() => setQuantite((q) => Math.max(1, q - 1))}
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
            onClick={() => setQuantite((q) => Math.min(99, q + 1))}
            disabled={quantite >= 99}
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
          if (dedans) return
          ajouter({ slug, nom, categorie })
          // La quantité choisie avant l'ajout est reportée dans la demande.
          if (quantite > 1) changerQuantite(slug, quantite)
        }}
        // `disabled` et non `pointer-events-none` : ce dernier laisse le bouton
        // focusable et activable au clavier, donc annonçable comme cliquable
        // par un lecteur d'écran alors qu'il ne fait rien.
        disabled={dedans}
        aria-label={t(dedans ? 'ajoute_aria' : 'ajouter_aria', { produit: nom })}
        className={cn(
          buttonVariants({ variant: 'primary', size: 'sm' }),
          'flex-1',
          // Une seule ligne quand le libellé est court : c'est le but de la vue
          // liste, éviter le retour à la ligne qui doublait la hauteur.
          libelleCourt && 'whitespace-nowrap',
        )}
      >
        {dedans ? t('ajoute') : t(libelleCourt ? 'ajouter_court' : 'ajouter')}
      </button>
    </div>
  )
}
