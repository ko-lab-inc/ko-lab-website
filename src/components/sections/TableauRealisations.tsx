'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

import {
  basculerPublicationRealisation,
  supprimerRealisation,
} from '@/app/(admin)/[locale]/admin/realisations/actions'
import {
  FormulaireRealisation,
  type LibellesRealisation,
  type RealisationAdmin,
} from '@/components/sections/FormulaireRealisation'
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
 * Tableau des réalisations — même architecture que TableauProduits.
 *
 * ---------------------------------------------------------------------------
 * L'ŒIL OUVRE UN APERÇU ICI, PAS LA GALERIE PUBLIQUE
 *
 * Même choix que pour le catalogue, appliqué dès la construction de cet écran
 * plutôt qu'ajouté après coup : la page publique /realisations affiche une
 * GRILLE de cartes, pas une fiche par réalisation — il n'existe même pas
 * d'URL individuelle vers laquelle naviguer. L'aperçu montre ici l'essentiel :
 * les deux titres, la description, et surtout la série de photos avec leur
 * texte alternatif — c'est ce qu'il y a de plus utile à relire d'un coup
 * d'œil avant de publier.
 * ---------------------------------------------------------------------------
 */

/**
 * Nombre de champs anglais remplis (0 à 2) — sert le badge de complétude
 * bilingue de chaque ligne, voir <BadgeTraductionEn> plus bas. Même mécanique
 * que TableauPostes.tsx, sur deux champs au lieu de trois (pas d'exigences
 * ici).
 */
function compterChampsEnRemplis(r: RealisationAdmin): number {
  return [r.titre_en, r.description_en].filter((v) => v && v.trim() !== '').length
}

/**
 * Pastille discrète (pas une colonne) signalant la complétude de la
 * traduction anglaise d'une réalisation. Trois états rendus par TRAIT et
 * REMPLISSAGE, jamais par une teinte hors palette (skill 02) — pas de
 * vert/orange/rouge sémantique ici. Copié de TableauPostes.tsx plutôt que
 * partagé : même discipline que <Champ>, dupliqué par fichier dans tout ce
 * dossier.
 */
function BadgeTraductionEn({ realisation, aide }: { realisation: RealisationAdmin; aide: string }) {
  const n = compterChampsEnRemplis(realisation)
  return (
    <span
      title={aide.replace('{n}', String(n))}
      className={cn(
        'label-mono shrink-0 rounded-full border px-2 py-0.5 text-[10px]',
        n === 2 && 'border-ko-ink text-ko-ink',
        n === 1 && 'border-ko-muted text-ko-muted',
        n === 0 && 'border-ko-line text-ko-muted opacity-60',
      )}
    >
      EN {n}/2
    </span>
  )
}

/**
 * Une réalisation, augmentée du texte « N photos » déjà mis en forme.
 *
 * ⚠️ PAS UNE FONCTION EN PROP. `textes.imagesCompte` était une fermeture
 * fabriquée côté serveur (`(n) => t('images_compte', { n })`) et passée à ce
 * composant CLIENT — une fonction ne traverse pas la frontière RSC, elle n'a
 * rien de sérialisable. Le rendu plantait dès l'arrivée sur cet écran
 * (« A server error occurred »), corrigé en calculant le texte UNE FOIS, côté
 * serveur, pour chaque réalisation — une chaîne, elle, se sérialise sans
 * problème. Même bug, même famille que celui déjà rencontré en passant un
 * composant plutôt qu'un élément rendu à un Client Component.
 */
type RealisationListe = RealisationAdmin & { imagesCompteTexte: string }

export function TableauRealisations({
  locale,
  realisations,
  estAdmin,
  libelles,
  textes,
}: {
  locale: string
  realisations: RealisationListe[]
  estAdmin: boolean
  libelles: LibellesRealisation
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
    /** Gabarit avec `{n}`, ex. « Traduction anglaise : {n} champ(s) sur 2 rempli(s) ». */
    badgeTraductionAide: string
  }
}) {
  const boite = useRef<HTMLDialogElement>(null)
  // `null` = création, une réalisation = édition, `undefined` = fermé.
  const [edite, setEdite] = useState<RealisationListe | null | undefined>(undefined)

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
  const [voir, setVoir] = useState<RealisationListe | undefined>(undefined)

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
        {realisations.length === 0 ? (
          <p className="p-6 text-base leading-relaxed text-ko-muted">{textes.vide}</p>
        ) : (
          <ul className="divide-y divide-ko-line">
            {realisations.map((r) => {
              const premiere = r.images[0]

              return (
                <li
                  key={r.id}
                  // `ko-cream` sans modificateur : cette couleur n'accepte pas
                  // l'opacité Tailwind (tailwind.config.ts) — `/60` ne
                  // générait aucune règle, la ligne ne réagissait pas au survol.
                  className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 transition-colors duration-200 hover:bg-ko-cream"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden border border-ko-line bg-ko-photo">
                    {premiere ? (
                      <Image src={premiere.url} alt="" fill sizes="48px" className="object-cover" />
                    ) : (
                      <span className="sr-only">{textes.sansImage}</span>
                    )}
                  </div>

                  <span className="w-8 shrink-0 font-mono text-xs text-ko-muted">{r.ordre}</span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-base text-ko-ink">{r.titre_fr}</span>
                      <BadgeTraductionEn realisation={r} aide={textes.badgeTraductionAide} />
                    </span>
                    <span className="block truncate font-mono text-xs text-ko-muted">{r.slug}</span>
                  </span>

                  <span className="label-mono hidden shrink-0 lg:block">
                    {libelles.categories[r.categorie] ?? r.categorie}
                  </span>

                  <span className="w-20 shrink-0 text-right font-mono text-xs text-ko-muted">
                    {r.imagesCompteTexte}
                  </span>

                  <form action={basculerPublicationRealisation} className="w-28 shrink-0 text-right">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="publie" value={String(r.publie)} />
                    <button
                      type="submit"
                      title={r.publie ? textes.retirer : textes.publier}
                      className={cn(
                        'label-mono min-h-[32px] px-2 transition-colors duration-200',
                        r.publie
                          ? 'text-ko-ink'
                          : 'text-ko-muted hover:text-ko-ink',
                      )}
                    >
                      {r.publie ? textes.publie : textes.horsLigne}
                    </button>
                  </form>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setVoir(r)}
                      aria-label={`${textes.voir} — ${r.titre_fr}`}
                      title={textes.voir}
                      className="flex h-9 w-9 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink"
                    >
                      <IconeOeil taille={17} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setEdite(r)}
                      aria-label={`${textes.modifier} — ${r.titre_fr}`}
                      title={textes.modifier}
                      className="flex h-9 w-9 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink"
                    >
                      <IconeCrayon taille={17} />
                    </button>

                    {estAdmin && (
                      <form
                        action={supprimerRealisation}
                        onSubmit={(e) => {
                          if (!confirm(`${textes.confirmer}\n\n${r.titre_fr}`)) e.preventDefault()
                        }}
                      >
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="id" value={r.id} />
                        <button
                          type="submit"
                          aria-label={`${textes.supprimer} — ${r.titre_fr}`}
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
        aria-labelledby="titre-realisation"
        onClick={(e) => {
          if (e.target === boite.current) boite.current?.close()
        }}
        className="w-[calc(100vw-2rem)] max-w-[780px] border border-ko-line bg-ko-white p-0 text-ko-ink shadow-card backdrop:bg-ko-scrim/60"
      >
        <div className="max-h-[85svh] overflow-y-auto p-6 lg:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <h2 id="titre-realisation" className="ko-h3 text-[22px] text-ko-ink">
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
            <FormulaireRealisation
              key={edite?.id ?? 'nouveau'}
              locale={locale}
              realisation={edite ?? undefined}
              libelles={libelles}
            />
          )}
        </div>
      </dialog>

      {/* ------------------------------- Aperçu ------------------------------- */}
      <dialog
        ref={boiteDetail}
        aria-labelledby="titre-detail-realisation"
        onClick={(e) => {
          if (e.target === boiteDetail.current) boiteDetail.current?.close()
        }}
        className="w-[calc(100vw-2rem)] max-w-[640px] border border-ko-line bg-ko-white p-0 text-ko-ink shadow-card backdrop:bg-ko-scrim/60"
      >
        <div className="max-h-[85svh] overflow-y-auto p-6 lg:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <h2 id="titre-detail-realisation" className="ko-h3 text-[22px] text-ko-ink">
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
                <span className="label-mono">
                  {libelles.categories[voir.categorie] ?? voir.categorie}
                </span>
                <span className={cn('label-mono', voir.publie ? 'text-ko-ink' : 'text-ko-muted')}>
                  {voir.publie ? textes.publie : textes.horsLigne}
                </span>
              </div>

              <div>
                <h3 className="ko-h3 text-[20px] text-ko-ink">{voir.titre_fr}</h3>
                {voir.titre_en && (
                  <p className="mt-0.5 text-sm italic text-ko-muted">{voir.titre_en}</p>
                )}
              </div>

              {voir.description_fr && (
                <p className="whitespace-pre-line text-sm leading-relaxed text-ko-ink">
                  {voir.description_fr}
                </p>
              )}
              {voir.description_en && (
                <p className="whitespace-pre-line text-sm italic leading-relaxed text-ko-muted">
                  {voir.description_en}
                </p>
              )}

              {/* La série complète, pas une seule photo mise en avant : c'est
                  précisément ce qu'il y a de plus utile à relire ici — les
                  images et leur texte alternatif, avant de publier. */}
              <div>
                <p className="label-mono mb-2 text-ko-muted">
                  {voir.imagesCompteTexte}
                </p>

                {voir.images.length === 0 ? (
                  <p className="text-sm text-ko-muted">{textes.sansImage}</p>
                ) : (
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {voir.images.map((img) => (
                      <li key={img.url}>
                        <div className="relative aspect-square overflow-hidden border border-ko-line bg-ko-photo">
                          <Image src={img.url} alt="" fill sizes="200px" className="object-cover" />
                        </div>
                        {img.alt_fr && (
                          <p className="mt-1 truncate text-xs text-ko-muted" title={img.alt_fr}>
                            {img.alt_fr}
                          </p>
                        )}
                        {img.alt_en && (
                          <p className="truncate text-xs italic text-ko-muted" title={img.alt_en}>
                            {img.alt_en}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-ko-line pt-5">
                <div className="min-w-0">
                  <dt className="label-mono text-ko-muted">{libelles.slug}</dt>
                  <dd className="mt-1 truncate font-mono text-sm text-ko-ink">{voir.slug}</dd>
                </div>
                <div>
                  <dt className="label-mono text-ko-muted">{libelles.ordre}</dt>
                  <dd className="mt-1 text-sm text-ko-ink">{voir.ordre}</dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </dialog>
    </>
  )
}
