import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Compose des classes CSS conditionnelles puis résout les conflits Tailwind.
 *
 * clsx aplatit les conditions et les tableaux ; tailwind-merge garde ensuite
 * la dernière classe de chaque groupe en conflit, ce qui permet à une prop
 * `className` de surcharger le style par défaut d'un composant :
 *
 *   cn('bg-ko-blue px-7', 'bg-ko-black')  →  'px-7 bg-ko-black'
 *
 * Les classes du design system (h-display, label-mono, reveal…) ne sont pas des
 * utilitaires Tailwind : tailwind-merge les laisse intactes.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
