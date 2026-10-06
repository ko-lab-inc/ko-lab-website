'use client'

import { useTranslations } from 'next-intl'

import { buttonVariants } from '@/components/ui/Button'
import { usePanierLocation } from '@/lib/panier/PanierLocationContext'
import { cn } from '@/lib/utils/cn'

/**
 * « Ajouter à ma demande » — action principale d'une carte du catalogue de
 * location. Pilote le panier de location (usePanierLocation).
 *
 * Pas de sélecteur de quantité ici : la carte de la grille est étroite, et la
 * quantité se règle sur la page de demande (/location/demande), où elle est
 * visible — même parti pris que BoutonAjouter de la boutique, et que la
 * référence (Black Tie).
 *
 * Une fois l'article retenu, le bouton passe en « Ajouté » et se désactive :
 * ré-appuyer incrémenterait la quantité sans retour visible, ce qui se lit
 * comme un bug.
 */
export function BoutonAjouterLocation({
  slug,
  nom,
  categorie,
  className,
}: {
  slug: string
  nom: string
  categorie: string
  className?: string
}) {
  const t = useTranslations('DemandeLocation')
  const { ajouter, contient, pret } = usePanierLocation()

  const dedans = pret && contient(slug)

  return (
    <button
      type="button"
      onClick={() => {
        if (dedans) return
        ajouter({ slug, nom, categorie })
      }}
      // `disabled` et non `pointer-events-none` : ce dernier laisse le bouton
      // focusable et activable au clavier, donc annonçable comme cliquable par
      // un lecteur d'écran alors qu'il ne fait rien.
      disabled={dedans}
      aria-label={t(dedans ? 'ajoute_aria' : 'ajouter_aria', { produit: nom })}
      className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'w-full', className)}
    >
      {dedans ? t('ajoute') : t('ajouter')}
    </button>
  )
}
