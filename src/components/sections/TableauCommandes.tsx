'use client'

import { useFormatter } from 'next-intl'

import { changerStatutCommande } from '@/app/(admin)/[locale]/admin/commandes/actions'
import { EnteteTableau, PanneauAdmin } from '@/components/layout/CadreAdmin'
import type { StatutCommande } from '@/types'

export type LigneTableauCommande = {
  id: string
  numero: string
  nom: string
  email: string
  statut: string
  mode_livraison: string
  totalIndicatif: number | null
  /** Déjà formatée côté serveur — jamais une fonction en prop (RSC). */
  dateFormatee: string
}

/**
 * Tableau des commandes — même moteur que TableauDemandes : un `<select>`
 * par ligne qui se soumet lui-même au changement (voir onChange plus bas).
 */
export function TableauCommandes({
  locale,
  commandes,
  libelles,
  textes,
}: {
  locale: string
  commandes: LigneTableauCommande[]
  libelles: { statuts: Record<string, string> }
  textes: {
    vide: string
    colonneNumero: string
    colonneClient: string
    colonneStatut: string
    colonneLivraison: string
    colonneTotal: string
    colonneCree: string
    totalSurDemande: string
  }
}) {
  const format = useFormatter()

  return (
    <PanneauAdmin sansPadding>
      {commandes.length === 0 ? (
        <p className="p-6 text-base leading-relaxed text-ko-muted">{textes.vide}</p>
      ) : (
        <>
          <EnteteTableau
            colonnes={[
              textes.colonneNumero,
              textes.colonneClient,
              textes.colonneLivraison,
              textes.colonneTotal,
              textes.colonneCree,
              textes.colonneStatut,
            ]}
          />
          <ul className="divide-y divide-ko-line">
            {commandes.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-3 px-6 py-4 transition-colors duration-200 hover:bg-ko-cream"
              >
                <span className="min-w-0 shrink-0 font-mono text-sm text-ko-ink">{c.numero}</span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base text-ko-ink">{c.nom}</span>
                  <span className="block truncate font-mono text-xs text-ko-muted">{c.email}</span>
                </span>

                <span className="hidden shrink-0 text-sm text-ko-muted lg:block">
                  {c.mode_livraison === 'expedition' ? '↗' : '↓'} {c.mode_livraison}
                </span>

                <span className="hidden shrink-0 font-mono text-sm text-ko-ink xl:block">
                  {c.totalIndicatif != null
                    ? format.number(c.totalIndicatif, { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })
                    : textes.totalSurDemande}
                </span>

                <span className="hidden w-40 shrink-0 font-mono text-xs text-ko-muted xl:block">
                  {c.dateFormatee}
                </span>

                <form action={changerStatutCommande} className="w-40 shrink-0">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={c.id} />
                  <select
                    name="statut"
                    defaultValue={c.statut}
                    onChange={(e) => e.currentTarget.form?.requestSubmit()}
                    aria-label={`${textes.colonneStatut} — ${c.numero}`}
                    className="min-h-[40px] w-full border border-ko-line bg-ko-white px-2 text-sm text-ko-ink transition-colors duration-200 focus:border-ko-blue focus:outline-none"
                  >
                    {(Object.keys(libelles.statuts) as StatutCommande[]).map((s) => (
                      <option key={s} value={s}>
                        {libelles.statuts[s]}
                      </option>
                    ))}
                  </select>
                </form>
              </li>
            ))}
          </ul>
        </>
      )}
    </PanneauAdmin>
  )
}
