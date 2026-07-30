'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

import {
  basculerPublicationVideo,
  deplacerVideo,
  supprimerVideo,
} from '@/app/(admin)/[locale]/admin/videos/actions'
import { FormulaireVideo, type LibellesVideo, type Video } from '@/components/sections/FormulaireVideo'
import { buttonVariants } from '@/components/ui/Button'
import {
  IconeAjouter,
  IconeCrayon,
  IconeFermer,
  IconePoubelle,
} from '@/components/ui/Icones'
import { cn } from '@/lib/utils/cn'

/** Une vidéo, augmentée de sa vignette résolue côté serveur. */
export type VideoListe = Video & {
  /**
   * Déjà calculée par la page (vignetteVideo) — pas recalculée ici.
   * ⚠️ Une fonction ne traverse pas la frontière serveur/client : c'est le
   * plantage déjà documenté dans TableauRealisations.tsx.
   */
  vignetteResolue: string | null
}

/**
 * Tableau des vidéos — table videos (migration 0016).
 *
 * ---------------------------------------------------------------------------
 * L'ORDRE SE RÈGLE ICI, AVEC DEUX FLÈCHES
 *
 * C'est la différence avec les trois autres écrans de gestion. Une bande de
 * vidéos est une playlist : l'ordre est un choix éditorial, pas une
 * conséquence de la date d'ajout. Deux flèches par ligne échangent la
 * position avec la voisine — plutôt qu'un champ « ordre » numérique, retiré
 * du catalogue justement parce que Christian le trouvait obscur.
 * ---------------------------------------------------------------------------
 */
export function TableauVideos({
  locale,
  videos,
  estAdmin,
  libelles,
  textes,
}: {
  locale: string
  videos: VideoListe[]
  estAdmin: boolean
  libelles: LibellesVideo
  textes: {
    vide: string
    enLigne: string
    horsLigne: string
    publier: string
    retirer: string
    modifier: string
    supprimer: string
    confirmer: string
    ajouter: string
    fermer: string
    titreEdition: string
    titreCreation: string
    monter: string
    descendre: string
    apercu: string
  }
}) {
  const boite = useRef<HTMLDialogElement>(null)
  // `null` = création, une vidéo = édition, `undefined` = fermé.
  const [edite, setEdite] = useState<VideoListe | null | undefined>(undefined)

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
        {videos.length === 0 ? (
          <p className="p-6 text-base leading-relaxed text-ko-muted">{textes.vide}</p>
        ) : (
          <ul className="divide-y divide-ko-line">
            {videos.map((v, i) => (
              <li
                key={v.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 transition-colors duration-200 hover:bg-ko-cream"
              >
                {/* Vignette au format vidéo (16/9), pas carré : c'est ce que
                    la page publique affiche, l'aperçu doit correspondre. */}
                <div className="relative h-12 w-[5.25rem] shrink-0 overflow-hidden border border-ko-line bg-ko-photo">
                  {v.vignetteResolue && (
                    <Image
                      src={v.vignetteResolue}
                      alt=""
                      fill
                      sizes="84px"
                      className="object-cover"
                    />
                  )}
                </div>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base text-ko-ink">{v.titre}</span>
                  <span className="block truncate font-mono text-xs text-ko-muted">{v.url}</span>
                </span>

                {/* Ordre — deux flèches, désactivées aux extrémités. */}
                <div className="flex shrink-0 items-center gap-1">
                  {[
                    { sens: 'haut', desactive: i === 0, label: textes.monter, rotation: '-rotate-45 border-l-2 border-t-2 mt-1' },
                    { sens: 'bas', desactive: i === videos.length - 1, label: textes.descendre, rotation: 'rotate-45 border-b-2 border-r-2 mb-1' },
                  ].map(({ sens, desactive, label, rotation }) => (
                    <form key={sens} action={deplacerVideo}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={v.id} />
                      <input type="hidden" name="sens" value={sens} />
                      <button
                        type="submit"
                        disabled={desactive}
                        aria-label={`${label} — ${v.titre}`}
                        title={label}
                        className="group flex h-9 w-9 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-blue disabled:cursor-not-allowed disabled:text-ko-line"
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            'h-2 w-2 border-ko-muted transition-colors duration-200 group-hover:border-ko-blue group-disabled:border-ko-line',
                            rotation,
                          )}
                        />
                      </button>
                    </form>
                  ))}
                </div>

                <form action={basculerPublicationVideo} className="w-28 shrink-0 text-right">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={v.id} />
                  <input type="hidden" name="actif" value={String(v.actif)} />
                  <button
                    type="submit"
                    title={v.actif ? textes.retirer : textes.publier}
                    className={cn(
                      'label-mono min-h-[32px] px-2 transition-colors duration-200',
                      v.actif ? 'text-ko-blue hover:text-ko-ink' : 'text-ko-muted hover:text-ko-blue',
                    )}
                  >
                    {v.actif ? textes.enLigne : textes.horsLigne}
                  </button>
                </form>

                <div className="flex shrink-0 items-center gap-1">
                  {/* Lien sortant vers la vidéo : la seule façon de vérifier
                      qu'un lien collé mène bien où on croit. */}
                  <a
                    href={v.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${textes.apercu} — ${v.titre}`}
                    title={textes.apercu}
                    className="flex h-9 w-9 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-blue"
                  >
                    <span aria-hidden="true" className="text-sm">
                      ↗
                    </span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setEdite(v)}
                    aria-label={`${textes.modifier} — ${v.titre}`}
                    title={textes.modifier}
                    className="flex h-9 w-9 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-blue"
                  >
                    <IconeCrayon taille={17} />
                  </button>

                  {estAdmin && (
                    <form
                      action={supprimerVideo}
                      onSubmit={(e) => {
                        if (!confirm(`${textes.confirmer}\n\n${v.titre}`)) e.preventDefault()
                      }}
                    >
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={v.id} />
                      <button
                        type="submit"
                        aria-label={`${textes.supprimer} — ${v.titre}`}
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

      <dialog
        ref={boite}
        aria-labelledby="titre-video"
        onClick={(e) => {
          if (e.target === boite.current) boite.current?.close()
        }}
        className="w-[calc(100vw-2rem)] max-w-[620px] border border-ko-line bg-ko-white p-0 text-ko-ink shadow-card backdrop:bg-ko-scrim/60"
      >
        <div className="max-h-[85svh] overflow-y-auto p-6 lg:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <h2 id="titre-video" className="ko-h3 text-[22px] text-ko-ink">
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
            <FormulaireVideo
              key={edite?.id ?? 'nouveau'}
              locale={locale}
              video={edite ?? undefined}
              libelles={libelles}
            />
          )}
        </div>
      </dialog>
    </>
  )
}
