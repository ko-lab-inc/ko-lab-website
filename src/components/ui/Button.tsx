import { cn } from '@/lib/utils/cn'

import type { ComponentProps } from 'react'

/**
 * Boutons KO-LAB — skill 02.
 *
 * Trois variantes seulement, et c'est volontaire : le skill 08 interdit les
 * boutons à dégradé, à ombre portée marquée ou à flèche animée. L'unique signal
 * d'interaction du système est le bleu KO-LAB.
 */

export type ButtonVariant = 'primary' | 'bleu' | 'ghost' | 'text' | 'text-d'
export type ButtonSize = 'sm' | 'md' | 'lg'

/**
 * `min-h-[44px]` sur toutes les variantes cliquables : cible tactile minimale
 * exigée par le skill 11. Sans ça, la variante `sm` tombe sous le seuil.
 */
const base =
  'inline-flex items-center justify-center min-h-[44px] transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed'

const variants: Record<ButtonVariant, string> = {
  // ⚠️ RENVERSÉ le 27 août 2026 (audit contraste boutons) — `primary` était
  // bleu depuis Phase 2 (18 août), avec du texte NOIR pour rattraper le
  // contraste (9,06:1) : ça corrigeait la lisibilité, mais pas la vraie
  // règle du projet (CLAUDE.md, « Boutons sur fond clair : fond noir, texte
  // blanc — le bleu est réservé aux gros éléments graphiques »), que
  // `skills/02-design-system.md` documentait pourtant à l'envers (son propre
  // exemple montrait bleu + texte noir — corrigé dans le même chantier).
  // `primary` devient donc la variante RÉELLEMENT par défaut : noir sur fond
  // clair, comme partout ailleurs dans l'admin et le site — voir `bleu`
  // ci-dessous pour les deux exceptions qui restent bleues.
  primary: 'bg-ko-black text-ko-white font-medium rounded-sm gap-2.5 hover:bg-ko-black2',
  // Ancien `primary` — gardé sous ce nom pour DEUX raisons distinctes, pas
  // une seule, d'où un nom qui ne présuppose ni fond clair ni fond sombre :
  //   1. Hero.tsx (`cta_primary`) — à l'intérieur de la carte noire du hero,
  //      où le bleu reste libre par la règle elle-même (fond sombre).
  //   2. Nav.tsx (« Démarrer un projet ») — CTA principal du site, sur la
  //      nav crème ; passer cette variante précise en noir changerait
  //      l'identité visuelle de l'en-tête. Laissé bleu jusqu'à décision de
  //      Christian/Moussa, PAS parce que le fond y est sombre — d'où
  //      l'absence du suffixe `-d` (réservé aux variantes dont la raison
  //      d'être EST le fond sombre, voir `text-d`).
  // Texte NOIR ici aussi, jamais blanc : la paire blanc/bleu échoue (2,32:1)
  // indépendamment de ce qu'il y a autour du bouton.
  bleu: 'bg-ko-blue text-ko-black font-medium rounded-sm gap-2.5 hover:bg-ko-blue2',
  ghost: 'border border-ko-line text-ko-ink rounded-sm gap-2.5 hover:border-ko-ink',
  // Souligné fin plutôt qu'encadré. La transition sur `gap` fait avancer la
  // flèche au survol — interaction validée par le skill 20.
  text: 'text-ko-muted border-b border-ko-line pb-0.5 gap-2 hover:text-ko-ink hover:border-ko-ink transition-[color,border-color,gap] hover:gap-3.5',
  // Variante fond sombre. Suffixe `-d` conforme a la convention du design
  // system (ko-line-d, ko-muted-d, label-mono-d). La variante claire serait
  // illisible sur --ko-black : ko-muted y plafonne a 4.40:1.
  'text-d':
    'text-ko-muted-d border-b border-ko-line-d pb-0.5 gap-2 hover:text-ko-white hover:border-ko-white transition-[color,border-color,gap] hover:gap-3.5',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'text-sm px-5 py-3',
  md: 'text-sm px-7 py-4',
  lg: 'text-base px-8 py-5',
}

/**
 * Classes seules — pour appliquer l'apparence d'un bouton à un <Link>.
 *
 *     <Link href="/contact" className={buttonVariants({ variant: 'primary' })}>
 *
 * Un <button> enveloppant un <Link> serait un bouton dans un lien : HTML
 * invalide et navigation clavier cassée.
 */
export function buttonVariants({
  variant = 'primary',
  size = 'md',
}: {
  variant?: ButtonVariant
  size?: ButtonSize
} = {}): string {
  // Les variantes `text` n'ont ni fond ni bordure encadrante : les paddings
  // de l'échelle de taille les déformeraient.
  if (variant === 'text' || variant === 'text-d') return cn(base, variants[variant])
  return cn(base, variants[variant], sizes[size])
}

type ButtonProps = ComponentProps<'button'> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
