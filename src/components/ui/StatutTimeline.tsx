import { cn } from '@/lib/utils/cn'

import type { StatutCommande } from '@/types'

/**
 * Parcours horizontal d'une commande — ligne fine et points, pas de cercles
 * colorés (skill 08) : ce sont de petits carrés, même vocabulaire que les
 * flèches de tri de TableauVideos/FormulaireRealisation. Justifié ici parce
 * que c'est une VRAIE séquence (le cycle de vie d'une commande), pas un
 * numérotage décoratif — voir skill artifact-design, « la structure doit
 * porter une information vraie ».
 *
 * `annulee` n'apparaît jamais dans `etapes` : ce n'est pas une étape du
 * parcours normal, c'est une sortie de route. L'appelant affiche un message
 * distinct dans ce cas plutôt que ce composant (voir compte/commandes/[id]).
 */
export function StatutTimeline({
  etapes,
  statutActuel,
  libelles,
}: {
  /** Séquence ordonnée pour CE mode de livraison — voir STATUTS_PAR_MODE. */
  etapes: readonly StatutCommande[]
  statutActuel: StatutCommande
  libelles: Record<string, string>
}) {
  const indexActuel = etapes.indexOf(statutActuel)

  return (
    <ol className="flex items-start">
      {etapes.map((etape, i) => {
        // Statut réel absent de la séquence (donnée historique incohérente,
        // voir TableauCommandes.tsx) : mieux vaut ne rien marquer « atteint »
        // que de deviner une progression fausse.
        const atteinte = indexActuel >= 0 && i <= indexActuel

        return (
          <li key={etape} className="flex flex-1 flex-col items-center last:max-w-fit last:flex-none">
            <div className="flex w-full items-center">
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className={cn('h-px flex-1', i <= indexActuel ? 'bg-ko-blue' : 'bg-ko-line')}
                />
              )}
              <span
                aria-hidden="true"
                className={cn(
                  'h-2.5 w-2.5 shrink-0 border',
                  atteinte ? 'border-ko-blue bg-ko-blue' : 'border-ko-line bg-ko-white',
                )}
              />
              {i < etapes.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn('h-px flex-1', i < indexActuel ? 'bg-ko-blue' : 'bg-ko-line')}
                />
              )}
            </div>
            <span
              className={cn(
                'mt-2.5 max-w-[9ch] text-center font-mono text-[10px] uppercase leading-tight tracking-wide',
                atteinte ? 'text-ko-ink' : 'text-ko-muted',
              )}
            >
              {libelles[etape] ?? etape}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
