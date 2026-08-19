import { cn } from '@/lib/utils/cn'

import type { ComponentProps } from 'react'

/**
 * Boutons KO-LAB — skill 02.
 *
 * Trois variantes seulement, et c'est volontaire : le skill 08 interdit les
 * boutons à dégradé, à ombre portée marquée ou à flèche animée. L'unique signal
 * d'interaction du système est le bleu KO-LAB.
 */

export type ButtonVariant = 'primary' | 'ghost' | 'text' | 'text-d'
export type ButtonSize = 'sm' | 'md' | 'lg'

/**
 * `min-h-[44px]` sur toutes les variantes cliquables : cible tactile minimale
 * exigée par le skill 11. Sans ça, la variante `sm` tombe sous le seuil.
 */
const base =
  'inline-flex items-center justify-center min-h-[44px] transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed'

const variants: Record<ButtonVariant, string> = {
  // text-ko-black et non text-ko-white (Phase 2, 18 août 2026) : texte blanc
  // sur --ko-blue ne fait que 2,32:1, très sous le seuil AA — un bouton bleu
  // n'est lisible qu'avec du texte noir (9,06:1). Vrai sur fond clair ET
  // fond sombre : la paire blanc/bleu échoue indépendamment de ce qu'il y a
  // autour du bouton.
  primary: 'bg-ko-blue text-ko-black font-medium rounded-sm gap-2.5 hover:bg-ko-blue2',
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
