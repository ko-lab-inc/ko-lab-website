import { cn } from '@/lib/utils/cn'

/**
 * Chevrons de coin — les « repères de visée » de la maquette
 * (docs/maquette-dashboard-nerf.png), aux 4 coins de CHAQUE panneau, pas
 * seulement les 2 coins coupés par `.panel-hud` : la maquette en pose aussi
 * sur les 2 coins restés carrés. Purement décoratif, `aria-hidden`.
 *
 * Repris et généralisé depuis les 4 coins en L du panneau caméra (une seule
 * instance avant la revue du 1er septembre) — même motif, réutilisable
 * partout, tailles `sm` (cartes, pastille) et `md` (en-tête, caméra).
 */
export function EncochesCoins({
  couleur = 'cyan',
  taille = 'md',
}: {
  couleur?: 'cyan' | 'pink'
  taille?: 'sm' | 'md'
}) {
  const longueur = taille === 'sm' ? 'h-3.5 w-3.5' : 'h-6 w-6'
  const epaisseur = taille === 'sm' ? 'border-[1.5px]' : 'border-2'
  const teinte = couleur === 'cyan' ? 'border-cyan-300' : 'border-pink-300'
  const base = cn('pointer-events-none absolute', longueur, epaisseur, teinte)

  return (
    <>
      <span className={cn(base, 'left-0 top-0 border-b-0 border-r-0')} />
      <span className={cn(base, 'right-0 top-0 border-b-0 border-l-0')} />
      <span className={cn(base, 'bottom-0 left-0 border-r-0 border-t-0')} />
      <span className={cn(base, 'bottom-0 right-0 border-l-0 border-t-0')} />
    </>
  )
}
