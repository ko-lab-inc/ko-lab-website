'use client'

import Image from 'next/image'
import { useActionState, useState } from 'react'

import {
  creerRealisation,
  modifierRealisation,
  type EtatRealisation,
} from '@/app/(admin)/[locale]/admin/realisations/actions'
import { buttonVariants } from '@/components/ui/Button'
import { IconePoubelle } from '@/components/ui/Icones'
import { cn } from '@/lib/utils/cn'

import type { ImageRealisation } from '@/lib/realisations'

/**
 * Création et édition d'une réalisation — un seul formulaire pour les deux.
 *
 * Même architecture que FormulaireProduit : les champs sont identiques entre
 * les deux modes, seule l'action diffère.
 *
 * ---------------------------------------------------------------------------
 * UN SEUL TITRE, UNE SEULE DESCRIPTION — décision de Christian
 *
 * `titre_en`/`description_en` existaient parce que `titre_en` était NOT NULL
 * sur cette table (contrainte assouplie par la migration 0014). Le site est
 * désormais francophone uniquement : « on retire tout ce qui est traduit
 * [...] on garde en français pour facilité ». Les colonnes `_en` restent en
 * base, nullables, mais ce formulaire ne les écrit plus jamais.
 *
 * ---------------------------------------------------------------------------
 * LA SÉRIE D'IMAGES EST GÉRÉE CÔTÉ CLIENT, PUIS ENVOYÉE À PLAT
 *
 * `images` est un state React, pas des champs non contrôlés : retirer une
 * photo doit renuméroter les lignes suivantes sans perdre ce qui a été tapé
 * dans les autres. À l'envoi, chaque image conservée redevient une poignée de
 * champs `image_..._i`, et chaque photo retirée laisse une trace dans
 * `image_supprimee` — sans quoi le fichier resterait dans le bucket, orphelin.
 * ---------------------------------------------------------------------------
 */

export type RealisationAdmin = {
  id: string
  slug: string
  titre_fr: string
  description_fr: string | null
  categorie: string
  images: ImageRealisation[]
  ordre: number
  publie: boolean
}

export type LibellesRealisation = {
  slug: string
  titreFr: string
  descriptionFr: string
  categorie: string
  categories: Record<string, string>
  ordre: string
  photos: string
  photosAide: string
  imagesTitre: string
  imagesVide: string
  imageAlt: string
  imageMonter: string
  imageDescendre: string
  imageRetirer: string
  enregistrer: string
  creer: string
  enCours: string
  succes: string
  erreurDonnees: string
  erreurPhoto: string
  erreurRefuse: string
  erreurServeur: string
}

const CHAMP =
  'min-h-[40px] w-full border border-ko-line bg-ko-white px-3 py-2 text-sm text-ko-ink transition-colors duration-200 focus:border-ko-blue focus:outline-none'
const CHAMP_PETIT =
  'min-h-[36px] w-full border border-ko-line bg-ko-white px-2.5 py-1.5 text-xs text-ko-ink transition-colors duration-200 focus:border-ko-blue focus:outline-none'

function Champ({
  id,
  libelle,
  aide,
  children,
}: {
  id: string
  libelle: string
  aide?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="label-mono mb-1.5 block text-ko-muted">
        {libelle}
      </label>
      {children}
      {aide && <p className="mt-1 text-xs text-ko-muted">{aide}</p>}
    </div>
  )
}

export function FormulaireRealisation({
  locale,
  realisation,
  libelles,
}: {
  locale: string
  /** Absent = création. */
  realisation?: RealisationAdmin
  libelles: LibellesRealisation
}) {
  const [etat, action, enCours] = useActionState<EtatRealisation, FormData>(
    realisation ? modifierRealisation : creerRealisation,
    {},
  )
  const [prefixe] = useState(() => (realisation ? `r-${realisation.id}-` : 'nouveau-'))

  // Photos déjà en base (ou déjà téléversées dans cette session d'édition) —
  // voir la docstring du fichier pour pourquoi c'est un state et non des
  // champs non contrôlés.
  const [images, setImages] = useState<ImageRealisation[]>(realisation?.images ?? [])
  const [supprimees, setSupprimees] = useState<string[]>([])

  function actualiserImage(index: number, champ: keyof ImageRealisation, valeur: string | number) {
    setImages((imgs) => imgs.map((img, i) => (i === index ? { ...img, [champ]: valeur } : img)))
  }

  function retirerImage(index: number) {
    const image = images[index]
    if (!image) return
    setSupprimees((urls) => [...urls, image.url])
    setImages((imgs) => imgs.filter((_, i) => i !== index))
  }

  /**
   * Réordonne par échange avec la voisine — même geste que TableauVideos
   * (deux flèches), pas un champ numérique : Christian l'avait déjà trouvé
   * obscur sur le catalogue et il avait été retiré à cet endroit-là pour
   * cette raison. `ordre` est renumérité par pas de 10 sur toute la série
   * pour rester l'exact reflet de l'ordre d'affichage, jamais un nombre
   * saisi à la main qui pourrait diverger de la position réelle.
   */
  function deplacerImage(index: number, sens: 'haut' | 'bas') {
    setImages((imgs) => {
      const cible = sens === 'haut' ? index - 1 : index + 1
      if (cible < 0 || cible >= imgs.length) return imgs
      const copie = [...imgs]
      const tmp = copie[index]!
      copie[index] = copie[cible]!
      copie[cible] = tmp
      return copie.map((img, i) => ({ ...img, ordre: i * 10 }))
    })
  }

  const messages: Record<string, string> = {
    donnees: libelles.erreurDonnees,
    photo: libelles.erreurPhoto,
    refuse: libelles.erreurRefuse,
    serveur: libelles.erreurServeur,
  }
  const erreur = etat.erreur ? (messages[etat.erreur] ?? libelles.erreurServeur) : null

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />
      {realisation && <input type="hidden" name="id" value={realisation.id} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Champ id={`${prefixe}categorie`} libelle={libelles.categorie}>
          <select
            id={`${prefixe}categorie`}
            name="categorie"
            defaultValue={realisation?.categorie ?? 'terrain'}
            className={CHAMP}
          >
            {Object.entries(libelles.categories).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Champ>

        <Champ id={`${prefixe}titre_fr`} libelle={libelles.titreFr}>
          <input
            id={`${prefixe}titre_fr`}
            name="titre_fr"
            required
            minLength={2}
            maxLength={120}
            defaultValue={realisation?.titre_fr}
            className={CHAMP}
          />
        </Champ>

        <Champ id={`${prefixe}ordre`} libelle={libelles.ordre}>
          <input
            id={`${prefixe}ordre`}
            name="ordre"
            type="number"
            min={0}
            step={10}
            defaultValue={realisation?.ordre ?? 0}
            className={CHAMP}
          />
        </Champ>
      </div>

      <Champ id={`${prefixe}description_fr`} libelle={libelles.descriptionFr}>
        <textarea
          id={`${prefixe}description_fr`}
          name="description_fr"
          rows={3}
          defaultValue={realisation?.description_fr ?? ''}
          maxLength={600}
          className={cn(CHAMP, 'resize-y')}
        />
      </Champ>

      {/* ------------------------------ Images ------------------------------ */}
      <div>
        <p className="label-mono mb-2 text-ko-muted">{libelles.imagesTitre}</p>

        {images.length === 0 ? (
          <p className="text-xs text-ko-muted">{libelles.imagesVide}</p>
        ) : (
          <ul className="space-y-2">
            {images.map((img, i) => (
              <li
                key={img.url}
                className="flex flex-wrap items-start gap-3 border border-ko-line p-3 sm:flex-nowrap"
              >
                <input type="hidden" name={`image_url_${i}`} value={img.url} />
                <input type="hidden" name={`image_ordre_${i}`} value={img.ordre} />

                <div className="relative h-14 w-14 shrink-0 overflow-hidden border border-ko-line bg-ko-photo">
                  <Image src={img.url} alt="" fill sizes="56px" className="object-cover" />
                </div>

                <label className="block min-w-0 flex-1">
                  <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-ko-muted">
                    {libelles.imageAlt}
                  </span>
                  <input
                    name={`image_alt_${i}`}
                    value={img.alt}
                    onChange={(e) => actualiserImage(i, 'alt', e.target.value)}
                    maxLength={200}
                    className={CHAMP_PETIT}
                  />
                </label>

                {/* Ordre — deux flèches, comme TableauVideos : un champ
                    numérique s'était déjà révélé obscur pour Christian sur le
                    catalogue. Échange avec la voisine, jamais une valeur à
                    deviner. */}
                <div className="flex shrink-0 items-center gap-1">
                  {[
                    { sens: 'haut' as const, desactive: i === 0, label: libelles.imageMonter, rotation: '-rotate-45 border-l-2 border-t-2 mt-1' },
                    { sens: 'bas' as const, desactive: i === images.length - 1, label: libelles.imageDescendre, rotation: 'rotate-45 border-b-2 border-r-2 mb-1' },
                  ].map(({ sens, desactive, label, rotation }) => (
                    <button
                      key={sens}
                      type="button"
                      onClick={() => deplacerImage(i, sens)}
                      disabled={desactive}
                      aria-label={`${label} — ${img.alt || img.url}`}
                      title={label}
                      className="group flex h-9 w-9 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink disabled:cursor-not-allowed disabled:text-ko-line"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          'h-2 w-2 border-ko-muted transition-colors duration-200 group-hover:border-ko-blue group-disabled:border-ko-line',
                          rotation,
                        )}
                      />
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => retirerImage(i)}
                  aria-label={`${libelles.imageRetirer} — ${img.alt || img.url}`}
                  title={libelles.imageRetirer}
                  className="flex h-9 w-9 shrink-0 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink"
                >
                  <IconePoubelle taille={16} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <input type="hidden" name="image_count" value={images.length} />
        {supprimees.map((url) => (
          <input key={url} type="hidden" name="image_supprimee" value={url} />
        ))}
      </div>

      {/* Nouvelles photos. `multiple` : une réalisation se documente
          normalement avec plusieurs prises, pas une seule à la fois. */}
      <Champ id={`${prefixe}photos`} libelle={libelles.photos} aide={libelles.photosAide}>
        <input
          id={`${prefixe}photos`}
          name="photos"
          type="file"
          multiple
          accept="image/webp,image/jpeg,image/png,image/avif"
          className="w-full text-sm text-ko-ink file:mr-4 file:min-h-[36px] file:cursor-pointer file:border file:border-ko-line file:bg-ko-cream file:px-4 file:text-sm file:text-ko-ink hover:file:border-ko-ink"
        />
      </Champ>

      {erreur && (
        <p role="alert" className="text-sm text-ko-ink">
          {erreur}
        </p>
      )}
      {etat.succes && (
        <p role="status" className="text-sm font-medium text-ko-ink">
          {libelles.succes}
        </p>
      )}

      <button
        type="submit"
        disabled={enCours}
        className={buttonVariants({ variant: 'primary', size: 'sm' })}
      >
        {enCours ? libelles.enCours : realisation ? libelles.enregistrer : libelles.creer}
      </button>
    </form>
  )
}
