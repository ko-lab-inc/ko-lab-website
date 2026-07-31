'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import {
  changerStatutCandidature,
  supprimerCandidature,
  telechargerCv,
} from '@/app/(admin)/[locale]/admin/candidatures/actions'
import { IconeFermer, IconeOeil, IconePoubelle } from '@/components/ui/Icones'
import { cn } from '@/lib/utils/cn'

/**
 * Tableau des candidatures — table candidatures, migration 0017.
 *
 * Même architecture que TableauDemandes : recherche, filtre de statut,
 * pagination, aperçu complet en surimpression. La différence tient au CV —
 * un fichier privé, téléchargeable par URL signée (voir actions.ts).
 */

export type Candidature = {
  id: string
  nom: string
  telephone: string
  email: string
  ville: string
  postes: string[]
  disponibilites: string
  travail_exterieur: boolean
  a_experience: boolean
  experience_texte: string | null
  cv_chemin: string | null
  source: string | null
  statut: string
  /** Déjà formatée côté serveur — jamais une fonction en prop (RSC). */
  dateFormatee: string
}

export function TableauCandidatures({
  locale,
  candidatures,
  estAdmin,
  libelles,
  textes,
}: {
  locale: string
  candidatures: Candidature[]
  estAdmin: boolean
  libelles: { statuts: Record<string, string> }
  textes: {
    vide: string
    videFiltre: string
    rechercheLabel: string
    recherchePlaceholder: string
    tousStatuts: string
    colonneNom: string
    colonneCourriel: string
    colonneTelephone: string
    colonneVille: string
    colonneStatut: string
    colonnePostes: string
    colonneDisponibilites: string
    colonneExperience: string
    colonneSource: string
    travailExterieur: string
    oui: string
    non: string
    cv: string
    cvAucun: string
    telecharger: string
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
  const [statut, setStatut] = useState('all')
  const [recherche, setRecherche] = useState('')

  const filtrees = useMemo(() => {
    const normaliser = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')

    const terme = normaliser(recherche.trim())

    return candidatures.filter((c) => {
      if (statut !== 'all' && c.statut !== statut) return false
      if (terme === '') return true
      return normaliser(`${c.nom} ${c.email} ${c.ville} ${c.postes.join(' ')}`).includes(terme)
    })
  }, [candidatures, statut, recherche])

  const PAR_PAGE = 8
  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(filtrees.length / PAR_PAGE))
  const pageActuelle = Math.min(page, totalPages - 1)
  const pageCourante = filtrees.slice(pageActuelle * PAR_PAGE, pageActuelle * PAR_PAGE + PAR_PAGE)

  const boiteDetail = useRef<HTMLDialogElement>(null)
  const [voir, setVoir] = useState<Candidature | undefined>(undefined)

  useEffect(() => {
    const el = boiteDetail.current
    if (!el) return
    if (voir !== undefined && !el.open) el.showModal()
    if (voir === undefined && el.open) el.close()
  }, [voir])

  useEffect(() => {
    const el = boiteDetail.current
    if (!el) return
    const fermer = () => setVoir(undefined)
    el.addEventListener('close', fermer)
    return () => el.removeEventListener('close', fermer)
  }, [])

  /**
   * Bouton de téléchargement — un <form> : l'action renvoie une URL signée.
   *
   * On envoie l'IDENTIFIANT de la candidature, pas le chemin du fichier :
   * l'action relit `cv_chemin` en base sous le RLS. Un chemin transmis d'ici
   * serait une entrée utilisateur comme une autre.
   *
   * `rel="noopener"` : un `target="_blank"` ouvre un contexte qui garde une
   * référence `window.opener`. Tous les autres liens du projet le posent ;
   * ce formulaire était la seule exception.
   */
  const BoutonCv = ({ id, nom }: { id: string; nom: string }) => (
    <form action={telechargerCv} target="_blank" rel="noopener">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="min-h-[36px] border-b border-ko-line pb-0.5 text-sm text-ko-blue transition-colors duration-200 hover:border-ko-blue"
        title={`${textes.telecharger} — ${nom}`}
      >
        {textes.telecharger}
      </button>
    </form>
  )

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label htmlFor="recherche-candidatures" className="sr-only">
          {textes.rechercheLabel}
        </label>
        <input
          id="recherche-candidatures"
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
        {pageCourante.length === 0 ? (
          <p className="p-6 text-base leading-relaxed text-ko-muted">
            {candidatures.length === 0 ? textes.vide : textes.videFiltre}
          </p>
        ) : (
          <ul className="divide-y divide-ko-line">
            {pageCourante.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 transition-colors duration-200 hover:bg-ko-cream"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base text-ko-ink">{c.nom}</span>
                  <span className="block truncate font-mono text-xs text-ko-muted">{c.email}</span>
                </span>

                {/* Postes visés — l'information la plus utile pour trier. */}
                <span className="label-mono hidden min-w-0 max-w-[16rem] shrink-0 truncate text-ko-blue lg:block">
                  {c.postes.join(' · ')}
                </span>

                <span className="hidden w-32 shrink-0 font-mono text-xs text-ko-muted xl:block">
                  {c.dateFormatee}
                </span>

                <form action={changerStatutCandidature} className="w-36 shrink-0">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={c.id} />
                  <select
                    name="statut"
                    defaultValue={c.statut}
                    onChange={(e) => e.currentTarget.form?.requestSubmit()}
                    aria-label={`${textes.colonneStatut} — ${c.nom}`}
                    className={cn(
                      'min-h-[36px] w-full border px-2 py-1 text-xs transition-colors duration-200 focus:border-ko-blue focus:outline-none',
                      c.statut === 'nouveau'
                        ? 'border-ko-blue text-ko-blue'
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
                    onClick={() => setVoir(c)}
                    aria-label={`${textes.voir} — ${c.nom}`}
                    title={textes.voir}
                    className="flex h-9 w-9 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-blue"
                  >
                    <IconeOeil taille={17} />
                  </button>

                  {estAdmin && (
                    <form
                      action={supprimerCandidature}
                      onSubmit={(e) => {
                        if (!confirm(`${textes.confirmer}\n\n${c.nom}`)) e.preventDefault()
                      }}
                    >
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={c.id} />
                      <button
                        type="submit"
                        aria-label={`${textes.supprimer} — ${c.nom}`}
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
              className="group flex h-9 w-9 items-center justify-center rounded-full border-2 border-ko-ink text-ko-ink transition-colors duration-200 hover:border-ko-blue hover:text-ko-blue disabled:cursor-not-allowed disabled:border-ko-line disabled:text-ko-line"
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
              className="group flex h-9 w-9 items-center justify-center rounded-full border-2 border-ko-ink text-ko-ink transition-colors duration-200 hover:border-ko-blue hover:text-ko-blue disabled:cursor-not-allowed disabled:border-ko-line disabled:text-ko-line"
            >
              <span
                aria-hidden="true"
                className="mr-0.5 h-2.5 w-2.5 rotate-45 border-r-2 border-t-2 border-ko-ink transition-colors duration-200 group-hover:border-ko-blue group-disabled:border-ko-line"
              />
            </button>
          </div>
        </div>
      )}

      {/* Aperçu complet — seule surface qui montre les réponses longues. */}
      <dialog
        ref={boiteDetail}
        aria-labelledby="titre-candidature"
        onClick={(e) => {
          if (e.target === boiteDetail.current) boiteDetail.current?.close()
        }}
        className="w-[calc(100vw-2rem)] max-w-[680px] border border-ko-line bg-ko-white p-0 text-ko-ink shadow-card backdrop:bg-ko-scrim/60"
      >
        {voir && (
          <div className="max-h-[85svh] overflow-y-auto p-6 lg:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <h2 id="titre-candidature" className="ko-h3 text-[22px] text-ko-ink">
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

            <p className="font-mono text-xs text-ko-muted">{voir.dateFormatee}</p>
            <h3 className="mt-2 ko-h3 text-[20px] text-ko-ink">{voir.nom}</h3>

            <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 border-t border-ko-line pt-5 sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="label-mono text-ko-muted">{textes.colonneCourriel}</dt>
                <dd className="mt-1 truncate text-sm text-ko-ink">{voir.email}</dd>
              </div>
              <div>
                <dt className="label-mono text-ko-muted">{textes.colonneTelephone}</dt>
                <dd className="mt-1 text-sm text-ko-ink">{voir.telephone}</dd>
              </div>
              <div>
                <dt className="label-mono text-ko-muted">{textes.colonneVille}</dt>
                <dd className="mt-1 text-sm text-ko-ink">{voir.ville}</dd>
              </div>
              <div>
                <dt className="label-mono text-ko-muted">{textes.colonneSource}</dt>
                <dd className="mt-1 text-sm text-ko-ink">{voir.source || '—'}</dd>
              </div>
            </dl>

            <div className="mt-5 border-t border-ko-line pt-5">
              <p className="label-mono text-ko-muted">{textes.colonnePostes}</p>
              <ul className="mt-2 space-y-1.5">
                {voir.postes.map((p) => (
                  <li key={p} className="flex gap-3 text-sm leading-relaxed text-ko-ink">
                    <span aria-hidden="true" className="mt-2 h-px w-3 shrink-0 bg-ko-blue" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 border-t border-ko-line pt-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="label-mono text-ko-muted">{textes.colonneDisponibilites}</dt>
                <dd className="mt-1 text-sm text-ko-ink">{voir.disponibilites}</dd>
              </div>
              <div>
                <dt className="label-mono text-ko-muted">{textes.travailExterieur}</dt>
                <dd className="mt-1 text-sm text-ko-ink">
                  {voir.travail_exterieur ? textes.oui : textes.non}
                </dd>
              </div>
              <div>
                <dt className="label-mono text-ko-muted">{textes.colonneExperience}</dt>
                <dd className="mt-1 text-sm text-ko-ink">
                  {voir.a_experience ? textes.oui : textes.non}
                </dd>
              </div>
            </dl>

            {voir.experience_texte && (
              <div className="mt-5 border-t border-ko-line pt-5">
                <p className="label-mono text-ko-muted">{textes.colonneExperience}</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ko-ink">
                  {voir.experience_texte}
                </p>
              </div>
            )}

            <div className="mt-5 border-t border-ko-line pt-5">
              <p className="label-mono mb-2 text-ko-muted">{textes.cv}</p>
              {voir.cv_chemin ? (
                <BoutonCv id={voir.id} nom={voir.nom} />
              ) : (
                <p className="text-sm text-ko-muted">{textes.cvAucun}</p>
              )}
            </div>
          </div>
        )}
      </dialog>
    </>
  )
}
