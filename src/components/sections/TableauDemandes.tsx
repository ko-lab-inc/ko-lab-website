'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { changerStatutDemande, supprimerDemande } from '@/app/(admin)/[locale]/admin/demandes/actions'
import { IconeFermer, IconeOeil, IconePoubelle } from '@/components/ui/Icones'
import { cn } from '@/lib/utils/cn'

/**
 * Tableau des demandes — table demandes_contact.
 *
 * ---------------------------------------------------------------------------
 * PREMIER ÉCRAN À TOUCHER `statut`
 *
 * Jusqu'ici, rien dans le code n'écrivait `statut` : le tableau de bord se
 * contente d'un compte « non traitées » en lecture seule. Cet écran est donc
 * le premier à fermer la boucle — changer le statut, voir le message complet
 * (le tableau de bord ne le lit même pas), supprimer un envoi de test ou de
 * pourriel.
 *
 * ---------------------------------------------------------------------------
 * PAS DE FORMULAIRE D'ÉDITION
 *
 * Contrairement au catalogue et aux réalisations, il n'y a rien à corriger
 * dans une demande : c'est un message reçu, pas un contenu géré. Deux
 * surfaces suffisent — la ligne (lecture rapide + statut) et l'aperçu
 * complet (l'œil) — là où catalogue/réalisations en ont trois.
 * ---------------------------------------------------------------------------
 */

export type Demande = {
  id: string
  type: string
  nom: string
  email: string
  telephone: string | null
  organisation: string | null
  message: string
  statut: string
  /** Déjà formatée côté serveur (Intl.DateTimeFormat) — jamais une fonction
   *  en prop, voir le plantage documenté dans TableauRealisations.tsx. */
  dateFormatee: string
}

export function TableauDemandes({
  locale,
  demandes,
  estAdmin,
  libelles,
  textes,
}: {
  locale: string
  demandes: Demande[]
  estAdmin: boolean
  libelles: {
    types: Record<string, string>
    statuts: Record<string, string>
  }
  textes: {
    vide: string
    videFiltre: string
    rechercheLabel: string
    recherchePlaceholder: string
    tousTypes: string
    tousStatuts: string
    colonneNom: string
    colonneCourriel: string
    colonneType: string
    colonneStatut: string
    colonneCree: string
    colonneTelephone: string
    colonneOrganisation: string
    colonneMessage: string
    voir: string
    supprimer: string
    confirmer: string
    fermer: string
    titreDetail: string
    pageGabarit: string
    pagePrecedente: string
    pageSuivante: string
  }
}) {
  const [type, setType] = useState('all')
  const [statut, setStatut] = useState('all')
  const [recherche, setRecherche] = useState('')

  const boiteDetail = useRef<HTMLDialogElement>(null)
  const [voir, setVoir] = useState<Demande | undefined>(undefined)

  useEffect(() => {
    const el = boiteDetail.current
    if (!el) return
    if (voir !== undefined && !el.open) el.showModal()
    if (voir === undefined && el.open) el.close()
  }, [voir])

  // Échap et la fermeture native passent par `close` : sans cette
  // synchronisation, l'état resterait rempli et rouvrir deviendrait impossible.
  useEffect(() => {
    const el = boiteDetail.current
    if (!el) return
    const fermer = () => setVoir(undefined)
    el.addEventListener('close', fermer)
    return () => el.removeEventListener('close', fermer)
  }, [])

  const demandesFiltrees = useMemo(() => {
    const normaliser = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')

    const terme = normaliser(recherche.trim())

    return demandes.filter((d) => {
      if (type !== 'all' && d.type !== type) return false
      if (statut !== 'all' && d.statut !== statut) return false
      if (terme === '') return true
      return normaliser(`${d.nom} ${d.email} ${d.message}`).includes(terme)
    })
  }, [demandes, type, statut, recherche])

  const PAR_PAGE = 8
  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(demandesFiltrees.length / PAR_PAGE))
  const pageActuelle = Math.min(page, totalPages - 1)
  const demandesPage = demandesFiltrees.slice(
    pageActuelle * PAR_PAGE,
    pageActuelle * PAR_PAGE + PAR_PAGE,
  )

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label htmlFor="recherche-demandes" className="sr-only">
          {textes.rechercheLabel}
        </label>
        <input
          id="recherche-demandes"
          type="search"
          value={recherche}
          onChange={(e) => {
            setPage(0)
            setRecherche(e.target.value)
          }}
          placeholder={textes.recherchePlaceholder}
          className="min-h-[40px] w-full border border-ko-line bg-ko-white px-3 py-2 text-sm text-ko-ink transition-colors duration-200 placeholder:text-ko-muted focus:border-ko-blue focus:outline-none sm:w-72"
        />

        <select
          aria-label={textes.colonneType}
          value={type}
          onChange={(e) => {
            setPage(0)
            setType(e.target.value)
          }}
          className="min-h-[40px] border border-ko-line bg-ko-white px-3 py-2 text-sm text-ko-ink transition-colors duration-200 focus:border-ko-blue focus:outline-none"
        >
          <option value="all">{textes.tousTypes}</option>
          {Object.entries(libelles.types).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>

        <select
          aria-label={textes.colonneStatut}
          value={statut}
          onChange={(e) => {
            setPage(0)
            setStatut(e.target.value)
          }}
          className="min-h-[40px] border border-ko-line bg-ko-white px-3 py-2 text-sm text-ko-ink transition-colors duration-200 focus:border-ko-blue focus:outline-none"
        >
          <option value="all">{textes.tousStatuts}</option>
          {Object.entries(libelles.statuts).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>

      <div className="border border-ko-line bg-ko-white">
        {demandesPage.length === 0 ? (
          <p className="p-6 text-base leading-relaxed text-ko-muted">
            {demandes.length === 0 ? textes.vide : textes.videFiltre}
          </p>
        ) : (
          <ul className="divide-y divide-ko-line">
            {demandesPage.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 transition-colors duration-200 hover:bg-ko-cream"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base text-ko-ink">{d.nom}</span>
                  <span className="block truncate font-mono text-xs text-ko-muted">{d.email}</span>
                </span>

                <span className="label-mono hidden w-28 shrink-0 sm:block">
                  {libelles.types[d.type] ?? d.type}
                </span>

                <span className="hidden w-32 shrink-0 font-mono text-xs text-ko-muted lg:block">
                  {d.dateFormatee}
                </span>

                {/* Auto-soumission au changement : même geste qu'un statut de
                    stock, pas de bouton « Enregistrer » à chercher. */}
                <form action={changerStatutDemande} className="w-36 shrink-0">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={d.id} />
                  {/*
                    ⚠️ `key={d.statut}` — constaté par Christian : après avoir
                    choisi « Traité », le menu revenait tout seul sur « Lu »
                    (l'écriture en base avait pourtant réussi, visible en
                    changeant d'écran puis en revenant). Cause : React
                    RÉINITIALISE un formulaire non contrôlé après qu'une
                    Server Action a résolu — mais ce reset applique le
                    `defaultValue` du rendu PRÉCÉDENT la révalidation, pas
                    encore la valeur fraîche. Un `<select>` non contrôlé
                    ignore aussi tout changement de `defaultValue` une fois
                    monté (comportement React documenté), donc rien ne le
                    corrigeait ensuite — jusqu'à un remontage complet (changer
                    d'écran). En liant `key` à la valeur, React démonte et
                    remonte le `<select>` dès que `d.statut` change réellement
                    (données fraîches après révalidation), qui applique alors
                    le bon `defaultValue` sans attendre une navigation.
                  */}
                  <select
                    key={d.statut}
                    name="statut"
                    defaultValue={d.statut}
                    onChange={(e) => e.currentTarget.form?.requestSubmit()}
                    aria-label={`${textes.colonneStatut} — ${d.nom}`}
                    className={cn(
                      'min-h-[36px] w-full border px-2 py-1 text-xs transition-colors duration-200 focus:border-ko-blue focus:outline-none',
                      d.statut === 'nouveau'
                        ? 'border-ko-blue text-ko-ink'
                        : 'border-ko-line text-ko-muted',
                    )}
                  >
                    {Object.entries(libelles.statuts).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </form>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setVoir(d)}
                    aria-label={`${textes.voir} — ${d.nom}`}
                    title={textes.voir}
                    className="flex h-9 w-9 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink"
                  >
                    <IconeOeil taille={17} />
                  </button>

                  {estAdmin && (
                    <form
                      action={supprimerDemande}
                      onSubmit={(e) => {
                        if (!confirm(`${textes.confirmer}\n\n${d.nom}`)) e.preventDefault()
                      }}
                    >
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={d.id} />
                      <button
                        type="submit"
                        aria-label={`${textes.supprimer} — ${d.nom}`}
                        title={textes.supprimer}
                        className="flex h-9 w-9 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink"
                      >
                        <IconePoubelle taille={17} />
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-4">
          <p className="label-mono text-ko-muted">
            {textes.pageGabarit
              .replace('{page}', String(pageActuelle + 1))
              .replace('{total}', String(totalPages))}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={pageActuelle === 0}
              aria-label={textes.pagePrecedente}
              title={textes.pagePrecedente}
              className="group flex h-9 w-9 items-center justify-center rounded-full border-2 border-ko-ink text-ko-ink transition-colors duration-200 hover:border-ko-blue disabled:cursor-not-allowed disabled:border-ko-line disabled:text-ko-line"
            >
              <span
                aria-hidden="true"
                className="ml-0.5 h-2.5 w-2.5 rotate-45 border-b-2 border-l-2 border-ko-ink transition-colors duration-200 group-hover:border-ko-blue group-disabled:border-ko-line"
              />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={pageActuelle >= totalPages - 1}
              aria-label={textes.pageSuivante}
              title={textes.pageSuivante}
              className="group flex h-9 w-9 items-center justify-center rounded-full border-2 border-ko-ink text-ko-ink transition-colors duration-200 hover:border-ko-blue disabled:cursor-not-allowed disabled:border-ko-line disabled:text-ko-line"
            >
              <span
                aria-hidden="true"
                className="mr-0.5 h-2.5 w-2.5 rotate-45 border-r-2 border-t-2 border-ko-ink transition-colors duration-200 group-hover:border-ko-blue group-disabled:border-ko-line"
              />
            </button>
          </div>
        </div>
      )}

      {/* Aperçu complet — seule surface qui montre le message, le téléphone
          et l'organisation. Le tableau de bord et la liste ci-dessus ne les
          lisent même pas. `showModal()` (piloté par la ref, voir plus haut)
          et non l'attribut `open` : sans lui, pas de piège de focus, pas de
          fond inerte, et `backdrop:` n'a aucun effet. */}
      <dialog
        ref={boiteDetail}
        aria-labelledby="titre-demande"
        onClick={(e) => {
          if (e.target === boiteDetail.current) boiteDetail.current?.close()
        }}
        className="w-[calc(100vw-2rem)] max-w-[640px] border border-ko-line bg-ko-white p-0 text-ko-ink shadow-card backdrop:bg-ko-scrim/60"
      >
        {voir && (
          <div className="max-h-[85svh] overflow-y-auto p-6 lg:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <h2 id="titre-demande" className="ko-h3 text-[22px] text-ko-ink">
                {textes.titreDetail}
              </h2>
              <button
                type="button"
                onClick={() => boiteDetail.current?.close()}
                aria-label={textes.fermer}
                className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink"
              >
                <IconeFermer taille={18} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className="label-mono">{libelles.types[voir.type] ?? voir.type}</span>
              <span className="font-mono text-xs text-ko-muted">{voir.dateFormatee}</span>
            </div>

            <h3 className="mt-4 ko-h3 text-[20px] text-ko-ink">{voir.nom}</h3>

            <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 border-t border-ko-line pt-5 sm:grid-cols-2">
              <div>
                <dt className="label-mono text-ko-muted">{textes.colonneCourriel}</dt>
                <dd className="mt-1 truncate text-sm text-ko-ink">{voir.email}</dd>
              </div>
              <div>
                <dt className="label-mono text-ko-muted">{textes.colonneTelephone}</dt>
                <dd className="mt-1 text-sm text-ko-ink">{voir.telephone || '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="label-mono text-ko-muted">{textes.colonneOrganisation}</dt>
                <dd className="mt-1 text-sm text-ko-ink">{voir.organisation || '—'}</dd>
              </div>
            </dl>

            <div className="mt-5 border-t border-ko-line pt-5">
              <p className="label-mono text-ko-muted">{textes.colonneMessage}</p>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ko-ink">
                {voir.message}
              </p>
            </div>
          </div>
        )}
      </dialog>
    </>
  )
}
