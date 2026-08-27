'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useState } from 'react'

import {
  creerRealisation,
  modifierRealisation,
  type EtatRealisation,
} from '@/app/(admin)/[locale]/admin/realisations/actions'
import { buttonVariants } from '@/components/ui/Button'
import { IconePoubelle } from '@/components/ui/Icones'
import { cn } from '@/lib/utils/cn'

import type { ImageRealisationBrute } from '@/lib/realisations'

/**
 * Création et édition d'une réalisation — un seul formulaire pour les deux.
 *
 * Même architecture que FormulaireProduit : les champs sont identiques entre
 * les deux modes, seule l'action diffère.
 *
 * ---------------------------------------------------------------------------
 * TITRE ET DESCRIPTION ANGLAIS — décision renversée le 24 août 2026
 *
 * `titre_en`/`description_en` avaient été retirés de ce formulaire (migration
 * 0014, « on garde en français pour facilité ») : le site est bilingue, cette
 * table ne pouvait pas rester la seule exception. Les deux champs sont de
 * retour, optionnels — présentation FR/EN groupée, même disposition que
 * FormulaireConcours.tsx.
 *
 * ---------------------------------------------------------------------------
 * LA SÉRIE D'IMAGES EST GÉRÉE CÔTÉ CLIENT, PUIS ENVOYÉE À PLAT
 *
 * `images` est un state React, pas des champs non contrôlés : retirer une
 * photo doit renuméroter les lignes suivantes sans perdre ce qui a été tapé
 * dans les autres. À l'envoi, chaque image conservée redevient une poignée de
 * champs `image_..._i`, et chaque photo retirée laisse une trace dans
 * `image_supprimee` — sans quoi le fichier resterait dans le bucket, orphelin.
 *
 * Migration 0042 (24 août 2026) : chaque image porte désormais `alt_fr` ET
 * `alt_en`, plus un simple `alt` — même raison que le titre et la
 * description, même modèle que `concours_photos`.
 * ---------------------------------------------------------------------------
 */

export type RealisationAdmin = {
  id: string
  slug: string
  titre_fr: string
  titre_en: string | null
  description_fr: string | null
  description_en: string | null
  categorie: string
  images: ImageRealisationBrute[]
  ordre: number
  publie: boolean
}

export type LibellesRealisation = {
  slug: string
  titreFr: string
  titreEn: string
  descriptionFr: string
  descriptionEn: string
  sectionFr: string
  sectionEn: string
  categorie: string
  categories: Record<string, string>
  ordre: string
  photos: string
  photosAide: string
  imagesTitre: string
  imagesVide: string
  imageAltFr: string
  imageAltEn: string
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

/**
 * Plafond CUMULÉ des nouvelles photos d'un même envoi — bug 2 corrigé le
 * 27 août 2026.
 *
 * `experimental.serverActions.bodySizeLimit` (next.config.ts) plafonne le
 * corps ENTIER de la requête à 7 Mo, pas chaque fichier séparément — trois
 * photos de 3 Mo (chacune sous les 5 Mo annoncés par `TAILLE_MAX`,
 * realisations/actions.ts) totalisent 9 Mo et dépassent quand même ce
 * plafond global. Next rejette alors la requête AVANT que la Server Action
 * ne s'exécute (« Body exceeded 7mb limit », reproduit et confirmé dans le
 * journal serveur) — aucun code applicatif n'a la main à ce stade, donc rien
 * à intercepter côté serveur pour CE cas précis : la seule protection fiable
 * est d'empêcher l'envoi de partir. `error.tsx` (même dossier que page.tsx)
 * reste le filet pour tout ce qui contournerait cette validation.
 *
 * 6 Mo, pas 7 : marge d'1 Mo pour l'encodage multipart et le reste du
 * formulaire (titre, descriptions, alt de chaque photo déjà en base) — même
 * logique que le Mo de marge déjà laissé entre `TAILLE_MAX` (5 Mo, un seul
 * fichier) et `bodySizeLimit` (7 Mo), voir la note de next.config.ts.
 */
const TAILLE_MAX_CUMULEE_PHOTOS = 6 * 1024 * 1024

function formaterMo(octets: number): string {
  return (octets / (1024 * 1024)).toFixed(1)
}

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
  const router = useRouter()

  /**
   * ⚠️ router.refresh() EXPLICITE — bug 1 corrigé le 27 août 2026.
   *
   * `modifierRealisation`/`creerRealisation` appellent déjà `revalidatePath`
   * (voir realisations/actions.ts) : le rafraîchissement automatique après
   * Server Action AURAIT dû suffire. Mais rien ici ne garantissait qu'il
   * survienne AVANT que `TableauRealisations` ne recalcule `edite` (voir sa
   * note) — un appel explicite, au même endroit que GestionGaleriesPhotos.tsx
   * (l'écran des galeries, qui n'a jamais eu ce bug), retire tout doute sur
   * le minutage plutôt que de compter sur un mécanisme implicite.
   */
  const [etat, action, enCours] = useActionState<EtatRealisation, FormData>(
    async (precedent, donnees) => {
      const resultat = await (realisation ? modifierRealisation : creerRealisation)(precedent, donnees)
      if (resultat.succes) router.refresh()
      return resultat
    },
    {},
  )
  const [prefixe] = useState(() => (realisation ? `r-${realisation.id}-` : 'nouveau-'))

  // Photos déjà en base (ou déjà téléversées dans cette session d'édition) —
  // voir la docstring du fichier pour pourquoi c'est un state et non des
  // champs non contrôlés.
  const [images, setImages] = useState<ImageRealisationBrute[]>(realisation?.images ?? [])
  const [supprimees, setSupprimees] = useState<string[]>([])

  /**
   * ⚠️ RESYNCHRONISATION SUR LA PROP — bug 1 corrigé le 27 août 2026.
   *
   * `useState(realisation?.images ?? [])` ne lit sa valeur initiale qu'AU
   * MONTAGE — un `realisation` qui change de contenu (photo ajoutée,
   * enregistrée, puis la page rafraîchie avec des données fraîches) ne
   * redéclenche jamais cette lecture tant que le composant reste monté avec
   * la MÊME clé. Résultat observé : la nouvelle photo n'apparaissait
   * qu'après avoir fermé la modale (démontage) et rouvert la fiche (nouveau
   * montage, nouvelle lecture de `useState`). Ce `useEffect` referme la
   * boucle sans dépendre d'un démontage : dès que `realisation` (donc son
   * `.images`) change de référence — ce qui arrive une fois `edite` recalculé
   * dans TableauRealisations.tsx après le rafraîchissement — l'état local se
   * resynchronise sur la vérité serveur. `supprimees` est vidé en même temps :
   * les retraits qu'il portait viennent d'être appliqués côté serveur, les y
   * garder les aurait fait renvoyer (donc retenter une suppression déjà
   * faite) au prochain enregistrement.
   */
  useEffect(() => {
    setImages(realisation?.images ?? [])
    setSupprimees([])
  }, [realisation])

  // Bug 2 — voir la note de TAILLE_MAX_CUMULEE_PHOTOS. `null` = sélection
  // dans les limites (ou aucune sélection), une chaîne = message à afficher
  // ET signal qui désactive l'envoi.
  const [erreurTaillePhotos, setErreurTaillePhotos] = useState<string | null>(null)

  function verifierTaillePhotos(fichiers: FileList | null): boolean {
    if (!fichiers || fichiers.length === 0) {
      setErreurTaillePhotos(null)
      return true
    }
    const total = Array.from(fichiers).reduce((somme, f) => somme + f.size, 0)
    if (total > TAILLE_MAX_CUMULEE_PHOTOS) {
      setErreurTaillePhotos(
        `${fichiers.length} fichiers sélectionnés totalisent ${formaterMo(total)} Mo — la limite est de ${formaterMo(TAILLE_MAX_CUMULEE_PHOTOS)} Mo par envoi. Retirez-en quelques-uns, ou téléversez-les en plusieurs fois.`,
      )
      return false
    }
    setErreurTaillePhotos(null)
    return true
  }

  function actualiserImage(index: number, champ: keyof ImageRealisationBrute, valeur: string | number) {
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
    <form
      action={action}
      // Filet, en plus de l'`onChange` du champ fichier plus bas : si la
      // sélection a changé sans déclencher cet événement (rare, mais un
      // champ fichier réinitialisé par script ne le garantit pas toujours),
      // le formulaire ne part quand même pas avec un envoi trop lourd.
      onSubmit={(e) => {
        const champFichier = e.currentTarget.querySelector<HTMLInputElement>('input[type="file"]')
        if (!verifierTaillePhotos(champFichier?.files ?? null)) e.preventDefault()
      }}
      className="space-y-6"
    >
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

      {/* Deux colonnes FR/EN, champ par champ sur la même ligne — même
          disposition que FormulaireConcours.tsx : un champ EN vide se repère
          d'un coup d'œil, en face de son équivalent FR rempli. */}
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 border-t border-ko-line pt-4 lg:grid-cols-2">
        <p className="label-mono -mb-1 text-ko-muted lg:col-span-1">{libelles.sectionFr}</p>
        <p className="label-mono -mb-1 hidden text-ko-muted lg:col-span-1 lg:block">
          {libelles.sectionEn}
        </p>

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
        <Champ id={`${prefixe}titre_en`} libelle={libelles.titreEn}>
          <input
            id={`${prefixe}titre_en`}
            name="titre_en"
            minLength={2}
            maxLength={120}
            defaultValue={realisation?.titre_en ?? ''}
            className={CHAMP}
          />
        </Champ>

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
        <Champ id={`${prefixe}description_en`} libelle={libelles.descriptionEn}>
          <textarea
            id={`${prefixe}description_en`}
            name="description_en"
            rows={3}
            defaultValue={realisation?.description_en ?? ''}
            maxLength={600}
            className={cn(CHAMP, 'resize-y')}
          />
        </Champ>
      </div>

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
                  {/* 64px partagé admin-wide, pas 56px — voir TableauRealisations.tsx. */}
                  <Image src={img.url} alt="" fill sizes="64px" className="object-cover" />
                </div>

                {/* Deux champs empilés, pas côte à côte — la ligne porte déjà
                    la vignette et les boutons d'ordre/retrait, une troisième
                    colonne de texte y serait trop à l'étroit. Même paire de
                    langues que le titre et la description plus haut, juste
                    un champ EN optionnel de plus. */}
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <label className="block">
                    <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-ko-muted">
                      {libelles.imageAltFr}
                    </span>
                    <input
                      name={`image_alt_fr_${i}`}
                      value={img.alt_fr}
                      onChange={(e) => actualiserImage(i, 'alt_fr', e.target.value)}
                      maxLength={200}
                      className={CHAMP_PETIT}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-ko-muted">
                      {libelles.imageAltEn}
                    </span>
                    <input
                      name={`image_alt_en_${i}`}
                      value={img.alt_en ?? ''}
                      onChange={(e) => actualiserImage(i, 'alt_en', e.target.value)}
                      maxLength={200}
                      className={CHAMP_PETIT}
                    />
                  </label>
                </div>

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
                      aria-label={`${label} — ${img.alt_fr || img.url}`}
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
                  aria-label={`${libelles.imageRetirer} — ${img.alt_fr || img.url}`}
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
          normalement avec plusieurs prises, pas une seule à la fois.
          `onChange` valide la taille CUMULÉE dès la sélection — bug 2, voir
          TAILLE_MAX_CUMULEE_PHOTOS : message immédiat plutôt qu'un envoi qui
          échoue en silence contre le plafond de next.config.ts. */}
      <Champ id={`${prefixe}photos`} libelle={libelles.photos} aide={libelles.photosAide}>
        <input
          id={`${prefixe}photos`}
          name="photos"
          type="file"
          multiple
          accept="image/webp,image/jpeg,image/png,image/avif"
          onChange={(e) => verifierTaillePhotos(e.target.files)}
          className="w-full text-sm text-ko-ink file:mr-4 file:min-h-[36px] file:cursor-pointer file:border file:border-ko-line file:bg-ko-cream file:px-4 file:text-sm file:text-ko-ink hover:file:border-ko-ink"
        />
      </Champ>

      {erreurTaillePhotos && (
        <p role="alert" className="text-sm text-ko-ink">
          {erreurTaillePhotos}
        </p>
      )}

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
        disabled={enCours || erreurTaillePhotos !== null}
        className={buttonVariants({ variant: 'primary', size: 'sm' })}
      >
        {enCours ? libelles.enCours : realisation ? libelles.enregistrer : libelles.creer}
      </button>
    </form>
  )
}
