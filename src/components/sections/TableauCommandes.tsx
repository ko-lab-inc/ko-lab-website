'use client'

import { changerStatutCommande } from '@/app/(admin)/[locale]/admin/commandes/actions'
import { PanneauAdmin } from '@/components/layout/CadreAdmin'
import { STATUTS_COMMANDE, STATUTS_PAR_MODE, type ModeLivraison, type StatutCommande } from '@/types'

/**
 * Statuts proposés pour CETTE commande : ceux pertinents pour son mode de
 * livraison, plus son statut actuel s'il en sort (donnée historique déjà mal
 * assignée avant ce correctif) — sinon le <select> n'aurait aucune option
 * correspondant à sa valeur réelle, et masquerait l'incohérence au lieu de
 * la montrer.
 */
function optionsStatut(mode: string, statutActuel: string): StatutCommande[] {
  const base = STATUTS_PAR_MODE[mode as ModeLivraison] ?? STATUTS_COMMANDE
  if (base.includes(statutActuel as StatutCommande)) return [...base]
  return [...base, statutActuel as StatutCommande].sort(
    (a, b) => STATUTS_COMMANDE.indexOf(a) - STATUTS_COMMANDE.indexOf(b),
  )
}

export type LigneTableauCommande = {
  id: string
  numero: string
  nom: string
  email: string
  statut: string
  mode_livraison: string
  /**
   * ⚠️ Déjà formaté côté serveur, comme `dateFormatee` — PAS un `useFormatter()`
   * ici. La section admin ne pose aucun `NextIntlClientProvider` (contrairement
   * au site public) : tout composant client y appelant un hook next-intl
   * échoue avec « context from NextIntlClientProvider was not found » — ce qui
   * a produit un 500 sur /admin/commandes, constaté en reproduisant le bug.
   */
  totalFormate: string | null
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
  return (
    <PanneauAdmin sansPadding>
      {commandes.length === 0 ? (
        <p className="p-6 text-base leading-relaxed text-ko-muted">{textes.vide}</p>
      ) : (
        <>
          {/*
            ⚠️ EN-TÊTE SUR MESURE, PAS EnteteTableau.

            EnteteTableau donne toujours le `flex-1` à sa PREMIÈRE colonne —
            convient à une liste à deux colonnes (voir ListeProfils.tsx), mais
            ici c'est la DEUXIÈME (client) qui doit s'étirer, le numéro restant
            de largeur fixe. Avec EnteteTableau, les libellés d'en-tête
            (Client, Livraison, Total, Créé le, Statut) se retrouvaient tous
            tassés à droite, décalés par rapport aux valeurs qu'ils décrivent
            — constaté par Christian. Chaque colonne ci-dessous reprend
            EXACTEMENT la largeur et les points de rupture (lg:/xl:) de sa
            cellule dans <li> plus bas, pour que l'alignement tienne à tous
            les gabarits d'écran.
          */}
          <div className="hidden border-b border-ko-line px-6 py-3 sm:flex sm:items-center sm:gap-x-4">
            <span className="label-mono w-32 shrink-0 text-ko-muted">{textes.colonneNumero}</span>
            <span className="label-mono min-w-0 flex-1 text-ko-muted">{textes.colonneClient}</span>
            <span className="label-mono hidden w-32 shrink-0 text-ko-muted lg:block">
              {textes.colonneLivraison}
            </span>
            <span className="label-mono hidden w-32 shrink-0 text-ko-muted xl:block">
              {textes.colonneTotal}
            </span>
            <span className="label-mono hidden w-40 shrink-0 text-ko-muted xl:block">
              {textes.colonneCree}
            </span>
            <span className="label-mono w-40 shrink-0 text-ko-muted">{textes.colonneStatut}</span>
          </div>
          <ul className="divide-y divide-ko-line">
            {commandes.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-3 px-6 py-4 transition-colors duration-200 hover:bg-ko-cream"
              >
                <span className="w-32 shrink-0 truncate font-mono text-sm text-ko-ink">{c.numero}</span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base text-ko-ink">{c.nom}</span>
                  <span className="block truncate font-mono text-xs text-ko-muted">{c.email}</span>
                  {/* Répété ici, visible en dessous de lg : la colonne dédiée
                      (plus bas) disparaît sous ce seuil, et c'est justement
                      l'information qui manquait sur mobile pour savoir
                      comment traiter la commande. Signalé par Christian. */}
                  <span className="mt-1 block text-xs text-ko-muted lg:hidden">
                    {c.mode_livraison === 'expedition' ? '↗' : '↓'} {c.mode_livraison}
                  </span>
                </span>

                <span className="hidden w-32 shrink-0 text-sm text-ko-muted lg:block">
                  {c.mode_livraison === 'expedition' ? '↗' : '↓'} {c.mode_livraison}
                </span>

                <span className="hidden w-32 shrink-0 font-mono text-sm text-ko-ink xl:block">
                  {c.totalFormate ?? textes.totalSurDemande}
                </span>

                <span className="hidden w-40 shrink-0 font-mono text-xs text-ko-muted xl:block">
                  {c.dateFormatee}
                </span>

                <form action={changerStatutCommande} className="w-40 shrink-0">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={c.id} />
                  {/* `key={c.statut}` — voir TableauDemandes.tsx pour le
                      détail : sans lui, le menu revient visuellement sur
                      l'ancien statut après un changement, même si l'écriture
                      a réussi (comportement de reset des formulaires non
                      contrôlés de React). */}
                  <select
                    key={c.statut}
                    name="statut"
                    defaultValue={c.statut}
                    onChange={(e) => e.currentTarget.form?.requestSubmit()}
                    aria-label={`${textes.colonneStatut} — ${c.numero}`}
                    className="min-h-[40px] w-full border border-ko-line bg-ko-white px-2 text-sm text-ko-ink transition-colors duration-200 focus:border-ko-blue focus:outline-none"
                  >
                    {optionsStatut(c.mode_livraison, c.statut).map((s) => (
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
