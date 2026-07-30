import { IconeAlerte } from '@/components/ui/Icones'
import { stockEnAttention } from '@/lib/stock'
import { cn } from '@/lib/utils/cn'

/**
 * Badge de stock — icône + texte, jamais une couleur inventée par statut.
 *
 * Le skill 02 limite la palette à trois couleurs plus UN accent. Un badge
 * vert/orange/rouge par statut serait exactement le pattern de tableau de
 * bord générique que le skill 08 interdit. L'attention se marque avec
 * l'accent existant (ko-blue) et IconeAlerte — déjà le vocabulaire du
 * panneau « Points d'attention » du tableau de bord — pas une nouvelle
 * couleur par état.
 *
 * Pas de composant sans `'use client'` en tête : il n'a ni state ni effet,
 * donc utilisable tel quel depuis un Server Component (tableau de bord) ou
 * un Client Component (formulaire, tableau du catalogue).
 */
export function EtiquetteStock({
  statut,
  quantite,
  texte,
  className,
}: {
  statut: string
  quantite: number
  /** Déjà formaté par l'appelant — cette étiquette ne connaît aucune traduction. */
  texte: string
  className?: string
}) {
  const attention = stockEnAttention(statut, quantite)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5',
        attention ? 'text-ko-blue' : 'text-ko-muted',
        className,
      )}
    >
      {attention && <IconeAlerte taille={14} className="shrink-0" />}
      {texte}
    </span>
  )
}
