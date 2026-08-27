'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

import { basculerPublicationConcours, supprimerConcours } from '@/app/(admin)/[locale]/admin/concours/actions'
import {
  FormulaireConcours,
  type Concours,
  type LibellesConcours,
} from '@/components/sections/FormulaireConcours'
import { buttonVariants } from '@/components/ui/Button'
import { IconeAjouter, IconeCrayon, IconeFermer, IconeOeil, IconePoubelle } from '@/components/ui/Icones'
import { cn } from '@/lib/utils/cn'

/**
 * Tableau des concours — même architecture que TableauRealisations.tsx :
 * liste, aperçu en lecture seule, formulaire de création/édition dans une
 * boîte de dialogue, aperçu détaillé dans une seconde.
 */

/**
 * Nombre de champs anglais remplis (0 à 4) — même patron que
 * TableauPostes.tsx (BadgeTraductionEn), un cran de plus : concours a un
 * champ de plus (`reglement_en`) que postes_carrieres.
 */
function compterChampsEnRemplis(c: Concours): number {
  return [c.titre_en, c.accroche_en, c.description_en, c.reglement_en].filter((v) => v && v.trim() !== '')
    .length
}

function BadgeTraductionEn({ concours, aide }: { concours: Concours; aide: string }) {
  const n = compterChampsEnRemplis(concours)
  return (
    <span
      title={aide.replace('{n}', String(n))}
      className={cn(
        'label-mono shrink-0 rounded-full border px-2 py-0.5 text-[10px]',
        n === 4 && 'border-ko-ink text-ko-ink',
        n > 0 && n < 4 && 'border-ko-muted text-ko-muted',
        n === 0 && 'border-ko-line text-ko-muted opacity-60',
      )}
    >
      EN {n}/4
    </span>
  )
}

function formaterDate(iso: string | null, locale: string): string | null {
  if (!iso) return null
  try {
    return new Intl.DateTimeFormat(locale === 'en' ? 'en-CA' : 'fr-CA', { dateStyle: 'medium' }).format(
      new Date(`${iso}T00:00:00`),
    )
  } catch {
    return iso
  }
}

function plageDates(c: Concours, locale: string): string | null {
  const debut = formaterDate(c.date_debut, locale)
  const fin = formaterDate(c.date_fin, locale)
  if (debut && fin) return `${debut} – ${fin}`
  return debut ?? fin
}

export function TableauConcours({
  locale,
  concours,
  estAdmin,
  libelles,
  textes,
}: {
  locale: string
  concours: (Concours & { apercu: string | null })[]
  estAdmin: boolean
  libelles: LibellesConcours
  textes: {
    vide: string
    publie: string
    horsLigne: string
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
    sansImage: string
    /** Gabarit avec `{n}`, ex. « Traduction anglaise : {n} champ(s) sur 4 rempli(s) ». */
    badgeTraductionAide: string
  }
}) {
  const boite = useRef<HTMLDialogElement>(null)
  // `null` = création, un concours = édition, `undefined` = fermé.
  const [edite, setEdite] = useState<(Concours & { apercu: string | null }) | null | undefined>(undefined)

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
  const [voir, setVoir] = useState<(Concours & { apercu: string | null }) | undefined>(undefined)

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
        {concours.length === 0 ? (
          <p className="p-6 text-base leading-relaxed text-ko-muted">{textes.vide}</p>
        ) : (
          <ul className="divide-y divide-ko-line">
            {concours.map((c) => {
              const dates = plageDates(c, locale)

              return (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 transition-colors duration-200 hover:bg-ko-cream"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden border border-ko-line bg-ko-photo">
                    {c.apercu ? (
                      // 64px partagé admin-wide, pas 48px — voir TableauRealisations.tsx.
                      <Image src={c.apercu} alt="" fill sizes="64px" className="object-cover" />
                    ) : (
                      <span className="sr-only">{textes.sansImage}</span>
                    )}
                  </div>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-base text-ko-ink">{c.titre_fr}</span>
                      <BadgeTraductionEn concours={c} aide={textes.badgeTraductionAide} />
                    </span>
                    <span className="block truncate font-mono text-xs text-ko-muted">{c.slug}</span>
                  </span>

                  <span className="hidden w-40 shrink-0 text-xs text-ko-muted sm:block">{dates ?? '—'}</span>

                  <form action={basculerPublicationConcours} className="w-28 shrink-0 text-right">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="publie" value={String(c.publie)} />
                    <button
                      type="submit"
                      title={c.publie ? textes.retirer : textes.publier}
                      className={cn(
                        'label-mono min-h-[32px] px-2 transition-colors duration-200',
                        c.publie ? 'text-ko-ink' : 'text-ko-muted hover:text-ko-ink',
                      )}
                    >
                      {c.publie ? textes.publie : textes.horsLigne}
                    </button>
                  </form>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setVoir(c)}
                      aria-label={`${textes.voir} — ${c.titre_fr}`}
                      title={textes.voir}
                      className="flex h-9 w-9 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink"
                    >
                      <IconeOeil taille={17} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setEdite(c)}
                      aria-label={`${textes.modifier} — ${c.titre_fr}`}
                      title={textes.modifier}
                      className="flex h-9 w-9 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink"
                    >
                      <IconeCrayon taille={17} />
                    </button>

                    {/* estAdmin uniquement — concours_suppression_admin (0040)
                        réserve la suppression à l'admin. Un editor qui verrait
                        ce bouton le verrait échouer en silence (RLS renvoie un
                        tableau vide, pas une erreur) : voir la note d'en-tête
                        de supprimerConcours. */}
                    {estAdmin && (
                      <form
                        action={supprimerConcours}
                        onSubmit={(e) => {
                          if (!confirm(`${textes.confirmer}\n\n${c.titre_fr}`)) e.preventDefault()
                        }}
                      >
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="id" value={c.id} />
                        <button
                          type="submit"
                          aria-label={`${textes.supprimer} — ${c.titre_fr}`}
                          title={textes.supprimer}
                          className="flex h-9 w-9 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink"
                        >
                          <IconePoubelle taille={17} />
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* --------------------------- Création / édition --------------------------- */}
      <dialog
        ref={boite}
        aria-labelledby="titre-concours"
        onClick={(e) => {
          if (e.target === boite.current) boite.current?.close()
        }}
        className="w-[calc(100vw-2rem)] max-w-[860px] border border-ko-line bg-ko-white p-0 text-ko-ink shadow-card backdrop:bg-ko-scrim/60"
      >
        <div className="max-h-[85svh] overflow-y-auto p-6 lg:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <h2 id="titre-concours" className="ko-h3 text-[22px] text-ko-ink">
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
            <FormulaireConcours
              key={edite?.id ?? 'nouveau'}
              locale={locale}
              concours={edite ?? undefined}
              libelles={libelles}
            />
          )}
        </div>
      </dialog>

      {/* ------------------------------- Aperçu ------------------------------- */}
      <dialog
        ref={boiteDetail}
        aria-labelledby="titre-detail-concours"
        onClick={(e) => {
          if (e.target === boiteDetail.current) boiteDetail.current?.close()
        }}
        className="w-[calc(100vw-2rem)] max-w-[640px] border border-ko-line bg-ko-white p-0 text-ko-ink shadow-card backdrop:bg-ko-scrim/60"
      >
        <div className="max-h-[85svh] overflow-y-auto p-6 lg:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <h2 id="titre-detail-concours" className="ko-h3 text-[22px] text-ko-ink">
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
              <span className={cn('label-mono', voir.publie ? 'text-ko-ink' : 'text-ko-muted')}>
                {voir.publie ? textes.publie : textes.horsLigne}
              </span>

              <h3 className="ko-h3 text-[20px] text-ko-ink">{voir.titre_fr}</h3>
              {voir.accroche_fr && <p className="text-sm text-ko-muted">{voir.accroche_fr}</p>}

              <p className="whitespace-pre-line text-sm leading-relaxed text-ko-ink">{voir.description_fr}</p>

              {voir.photos.length > 0 && (
                <ul className="grid grid-cols-3 gap-3">
                  {voir.photos.map((p) => (
                    <li key={p.id} className="relative aspect-square overflow-hidden border border-ko-line bg-ko-photo">
                      {/* 256px partagé admin-wide, pas 200px — voir TableauRealisations.tsx. */}
                      <Image src={p.url_stockage} alt="" fill sizes="256px" className="object-cover" />
                    </li>
                  ))}
                </ul>
              )}

              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-ko-line pt-5">
                <div className="min-w-0">
                  <dt className="label-mono text-ko-muted">{libelles.slug}</dt>
                  <dd className="mt-1 truncate font-mono text-sm text-ko-ink">{voir.slug}</dd>
                </div>
                <div>
                  <dt className="label-mono text-ko-muted">{libelles.liens.titre}</dt>
                  <dd className="mt-1 text-sm text-ko-ink">{voir.liens.length}</dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </dialog>
    </>
  )
}
