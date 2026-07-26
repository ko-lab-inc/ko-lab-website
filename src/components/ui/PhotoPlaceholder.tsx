import { cn } from '@/lib/utils/cn'

/**
 * Emplacement réservé en attendant les vraies photos KO-LAB — skill 22.
 *
 * Le document de cadrage est explicite : « Prévoir des espaces réservés tant que
 * la sélection finale n'est pas terminée. » Surtout, ne PAS combler avec du
 * stock (Unsplash, Pexels) — c'est ce qui trahit un site template.
 *
 * Occupe exactement le format final pour que le remplacement par next/image
 * ne provoque aucun décalage de mise en page (CLS, skill 12).
 */
type PhotoPlaceholderProps = {
  /** Décrit la photo attendue. Passer une chaîne traduite depuis l'appelant. */
  label?: string
  className?: string
  /** Classe de ratio Tailwind — doit correspondre au cadrage final. */
  ratio?: string
}

export function PhotoPlaceholder({
  label = 'Photo KO-LAB',
  className,
  ratio = 'aspect-[16/9]',
}: PhotoPlaceholderProps) {
  return (
    <div
      className={cn(ratio, 'flex items-center justify-center bg-ko-cream2', className)}
      // Décoratif tant qu'aucune vraie image n'est là : inutile de l'annoncer
      // aux lecteurs d'écran.
      role="presentation"
    >
      <div className="text-center">
        <div className="mx-auto mb-3 h-8 w-8 border border-ko-line" />
        <p className="label-mono text-ko-muted">{label}</p>
      </div>
    </div>
  )
}
