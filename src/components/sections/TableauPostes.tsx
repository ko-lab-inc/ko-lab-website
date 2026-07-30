'use client'

import { useEffect, useRef, useState } from 'react'

import { basculerPublicationPoste, supprimerPoste } from '@/app/(admin)/[locale]/admin/carrieres/actions'
import {
  FormulairePoste,
  type LibellesPoste,
  type Poste,
} from '@/components/sections/FormulairePoste'
import { buttonVariants } from '@/components/ui/Button'
import {
  IconeAjouter,
  IconeCrayon,
  IconeFermer,
  IconeOeil,
  IconePoubelle,
} from '@/components/ui/Icones'
import { cn } from '@/lib/utils/cn'

/**
 * Tableau des postes — même architecture que TableauProduits/TableauRealisations.
 *
 * Le plus simple des trois : pas de photo, pas de slug, pas de série
 * d'images. La liste, un aperçu en lecture seule, un formulaire de
 * création/édition — trois surfaces au lieu de deux, comme le catalogue,
 * parce qu'il y a bien un texte à corriger (contrairement aux réalisations,
 * où l'aperçu suffit souvent).
 */
export function TableauPostes({
  locale,
  postes,
  estAdmin,
  libelles,
  textes,
}: {
  locale: string
  postes: Poste[]
  estAdmin: boolean
  libelles: LibellesPoste
  textes: {
    vide: string
    actif: string
    inactif: string
    publier: string
    retirer: string
    voir: string
    modifier: string
    supprimer: string
    confirmer: string
    ajouter: string
    fermer: string
    titreEdition: string
    titreCreation: string
    titreDetail: string
  }
}) {
  const boite = useRef<HTMLDialogElement>(null)
  // `null` = création, un poste = édition, `undefined` = fermé.
  const [edite, setEdite] = useState<Poste | null | undefined>(undefined)

  useEffect(() => {
    const el = boite.current
    if (!el) return
    if (edite !== undefined && !el.open) el.showModal()
    if (edite === undefined && el.open) el.close()
  }, [edite])

  useEffect(() => {
    const el = boite.current
    if (!el) return
    const fermer = () => setEdite(undefined)
    el.addEventListener('close', fermer)
    return () => el.removeEventListener('close', fermer)
  }, [])

  const boiteDetail = useRef<HTMLDialogElement>(null)
  const [voir, setVoir] = useState<Poste | undefined>(undefined)

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

  return (
    <>
      <div className="mb-5 flex justify-end">
        <button
          type="button"
          onClick={() => setEdite(null)}
          className={buttonVariants({ variant: 'primary', size: 'sm' })}
        >
          <IconeAjouter taille={16} />
          {textes.ajouter}
        </button>
      </div>

      <div className="border border-ko-line bg-ko-white">
        {postes.length === 0 ? (
          <p className="p-6 text-base leading-relaxed text-ko-muted">{textes.vide}</p>
        ) : (
          <ul className="divide-y divide-ko-line">
            {postes.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 transition-colors duration-200 hover:bg-ko-cream"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base text-ko-ink">{p.titre_fr}</span>
                  <span className="block truncate font-mono text-xs text-ko-muted">
                    {p.departement}
                  </span>
                </span>

                <span className="label-mono hidden shrink-0 text-ko-blue sm:block">
                  {libelles.types[p.type] ?? p.type}
                </span>

                <form action={basculerPublicationPoste} className="w-28 shrink-0 text-right">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="actif" value={String(p.actif)} />
                  <button
                    type="submit"
                    title={p.actif ? textes.retirer : textes.publier}
                    className={cn(
                      'label-mono min-h-[32px] px-2 transition-colors duration-200',
                      p.actif ? 'text-ko-blue hover:text-ko-ink' : 'text-ko-muted hover:text-ko-blue',
                    )}
                  >
                    {p.actif ? textes.actif : textes.inactif}
                  </button>
                </form>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setVoir(p)}
                    aria-label={`${textes.voir} — ${p.titre_fr}`}
                    title={textes.voir}
                    className="flex h-9 w-9 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-blue"
                  >
                    <IconeOeil taille={17} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setEdite(p)}
                    aria-label={`${textes.modifier} — ${p.titre_fr}`}
                    title={textes.modifier}
                    className="flex h-9 w-9 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-blue"
                  >
                    <IconeCrayon taille={17} />
                  </button>

                  {estAdmin && (
                    <form
                      action={supprimerPoste}
                      onSubmit={(e) => {
                        if (!confirm(`${textes.confirmer}\n\n${p.titre_fr}`)) e.preventDefault()
                      }}
                    >
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={p.id} />
                      <button
                        type="submit"
                        aria-label={`${textes.supprimer} — ${p.titre_fr}`}
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

      {/* --------------------------- Création / édition --------------------------- */}
      <dialog
        ref={boite}
        aria-labelledby="titre-poste"
        onClick={(e) => {
          if (e.target === boite.current) boite.current?.close()
        }}
        className="w-[calc(100vw-2rem)] max-w-[640px] border border-ko-line bg-ko-white p-0 text-ko-ink shadow-card backdrop:bg-ko-scrim/60"
      >
        <div className="max-h-[85svh] overflow-y-auto p-6 lg:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <h2 id="titre-poste" className="ko-h3 text-[22px] text-ko-ink">
              {edite ? textes.titreEdition : textes.titreCreation}
            </h2>
            <button
              type="button"
              onClick={() => boite.current?.close()}
              aria-label={textes.fermer}
              className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink"
            >
              <IconeFermer taille={18} />
            </button>
          </div>

          {edite !== undefined && (
            <FormulairePoste
              key={edite?.id ?? 'nouveau'}
              locale={locale}
              poste={edite ?? undefined}
              libelles={libelles}
            />
          )}
        </div>
      </dialog>

      {/* ------------------------------- Aperçu ------------------------------- */}
      <dialog
        ref={boiteDetail}
        aria-labelledby="titre-detail-poste"
        onClick={(e) => {
          if (e.target === boiteDetail.current) boiteDetail.current?.close()
        }}
        className="w-[calc(100vw-2rem)] max-w-[560px] border border-ko-line bg-ko-white p-0 text-ko-ink shadow-card backdrop:bg-ko-scrim/60"
      >
        <div className="max-h-[85svh] overflow-y-auto p-6 lg:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <h2 id="titre-detail-poste" className="ko-h3 text-[22px] text-ko-ink">
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

          {voir && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <span className="label-mono text-ko-blue">{libelles.types[voir.type] ?? voir.type}</span>
                <span className={cn('label-mono', voir.actif ? 'text-ko-blue' : 'text-ko-muted')}>
                  {voir.actif ? textes.actif : textes.inactif}
                </span>
              </div>

              <div>
                <h3 className="ko-h3 text-[20px] text-ko-ink">{voir.titre_fr}</h3>
                <p className="mt-1 text-sm text-ko-muted">{voir.departement}</p>
              </div>

              {voir.description_fr && (
                <p className="whitespace-pre-line text-sm leading-relaxed text-ko-ink">
                  {voir.description_fr}
                </p>
              )}

              {voir.exigences_fr && (
                <div className="border-t border-ko-line pt-5">
                  <p className="label-mono mb-2 text-ko-muted">{libelles.exigences}</p>
                  <ul className="space-y-2">
                    {voir.exigences_fr
                      .split('\n')
                      .map((l) => l.trim())
                      .filter((l) => l !== '')
                      .map((ligne) => (
                        <li key={ligne} className="flex gap-3 text-sm leading-relaxed text-ko-ink">
                          <span aria-hidden="true" className="mt-2 h-px w-3 shrink-0 bg-ko-blue" />
                          <span>{ligne}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </dialog>
    </>
  )
}
