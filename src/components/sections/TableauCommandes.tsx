'use client'

import { changerStatutCommande } from '@/app/(admin)/[locale]/admin/commandes/actions'
import { PanneauAdmin } from '@/components/layout/CadreAdmin'
import { STATUTS_COMMANDE, STATUTS_PAR_MODE, type ModeLivraison, type StatutCommande } from '@/types'

/**
 * Statuts proposés pour CETTE commande : STRICTEMENT ceux pertinents pour
 * son mode de livraison — jamais les sept, jamais le statut actuel en plus
 * s'il en sort. Une première version gardait le statut réel comme option de
 * secours quand il ne correspondait pas au mode (donnée historique mal
 * assignée) ; Christian l'a corrigée après coup : une commande à ramasser ne
 * doit jamais reproposer « Expédiée », même pour corriger une ancienne
 * erreur — la liste doit rester celle du mode, point final. Le vrai statut
 * incohérent reste visible ailleurs (voir `incoherent` plus bas), jamais
 * dans les choix eux-mêmes.
 */
function optionsStatut(mode: string): readonly StatutCommande[] {
  return STATUTS_PAR_MODE[mode as ModeLivraison] ?? STATUTS_COMMANDE
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
    statutReel: string
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

                {(() => {
                  const options = optionsStatut(c.mode_livraison)
                  const incoherent = !options.includes(c.statut as StatutCommande)

                  return (
                    <div className="w-40 shrink-0">
                      <form action={changerStatutCommande}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="id" value={c.id} />
                        {/* `key={c.statut}` — voir TableauDemandes.tsx pour le
                            détail : sans lui, le menu revient visuellement sur
                            l'ancien statut après un changement, même si
                            l'écriture a réussi (comportement de reset des
                            formulaires non contrôlés de React).

                            Pas de `defaultValue={c.statut}` quand il est
                            incohérent avec le mode : aucune option ne
                            correspondrait, le navigateur retomberait sur la
                            première sans le dire. Le vrai statut reste lisible
                            juste en dessous (voir `incoherent`) — jamais
                            proposé comme choix, mais jamais caché non plus. */}
                        <select
                          key={c.statut}
                          name="statut"
                          defaultValue={incoherent ? undefined : c.statut}
                          onChange={(e) => e.currentTarget.form?.requestSubmit()}
                          aria-label={`${textes.colonneStatut} — ${c.numero}`}
                          className="min-h-[40px] w-full border border-ko-line bg-ko-white px-2 text-sm text-ko-ink transition-colors duration-200 focus:border-ko-blue focus:outline-none"
                        >
                          {options.map((s) => (
                            <option key={s} value={s}>
                              {libelles.statuts[s]}
                            </option>
                          ))}
                        </select>
                      </form>
                      {incoherent && (
                        <p className="mt-1 text-[11px] text-ko-muted">
                          {textes.statutReel} : {libelles.statuts[c.statut] ?? c.statut}
                        </p>
                      )}
                    </div>
                  )
                })()}
              </li>
            ))}
          </ul>
        </>
      )}
    </PanneauAdmin>
  )
}
