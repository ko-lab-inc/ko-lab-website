'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { SlideImages, type ImageSlide } from '@/components/ui/SlideImages'
import { FILTRE_TERRAIN, FILTRE_TERRAIN_CHAUD } from '@/lib/images'
import { cn } from '@/lib/utils/cn'
import { CATEGORIES_REALISATION, type CategorieRealisation } from '@/types'

/**
 * Galerie filtrable — skill 21.
 *
 * ---------------------------------------------------------------------------
 * REFONTE À DEUX NIVEAUX — CATÉGORIE PUIS RÉALISATION (27 août 2026)
 *
 * Remplace le carrousel de cartes par catégorie (24 août 2026) : une
 * catégorie de deux réalisations y laissait un tiers de largeur vide, et la
 * carte (couverture + titre) ne disait plus combien de photos contenait
 * chaque événement — deux défauts relevés par Christian.
 *
 * Structure actuelle : catégorie → une rangée PAR RÉALISATION → le
 * carrousel des photos de CETTE réalisation, couverture comprise. Le titre
 * et le compteur de photos vivent dans l'en-tête de rangée
 * (`RangeePhotos`) ; la carte intermédiaire « couverture + titre » a
 * disparu, chaque photo est directement cliquable et ouvre la visionneuse
 * SUR ELLE-MÊME, pas sur la première de la série — voir `onOuvrir` plus bas
 * et `RealisationCarte.photos`.
 *
 * Le filtrage reste purement client : aucun rechargement, aucune requête. Les
 * réalisations arrivent DÉJÀ TRADUITES depuis le composant serveur — voir
 * `lireRealisationsPubliees()` dans lib/realisations.ts, appelée par
 * page.tsx.
 * ---------------------------------------------------------------------------
 */

export type RealisationCarte = {
  cle: string
  categorie: CategorieRealisation
  titre: string
  description: string
  src: string
  desature: boolean
  /**
   * Toutes les photos de la réalisation, couverture comprise, dans l'ordre
   * d'affichage — c'est la série complète montrée par la visionneuse au clic
   * sur la carte.
   *
   * Toujours au moins une entrée : `lireRealisationsPubliees()` écarte déjà
   * toute réalisation sans la moindre image.
   */
  photos: readonly ImageSlide[]
}

type Filtre = {
  valeur: CategorieRealisation | 'all'
  label: string
}

type LibellesCarrousel = {
  precedent: string
  suivant: string
  /** Nom accessible du groupe de vignettes d'une rangée — préfixé au titre
   *  de la réalisation, ex. « Photos de la réalisation — Canada Day 2026 ». */
  groupe: string
}

type GalerieProps = {
  realisations: readonly RealisationCarte[]
  filtres: readonly Filtre[]
  labelFiltres: string
  aucunResultat: string
  libellesCategories: Record<string, string>
  libellesCarrousel: LibellesCarrousel
}

export function GalerieRealisations({
  realisations,
  filtres,
  labelFiltres,
  aucunResultat,
  libellesCategories,
  libellesCarrousel,
}: GalerieProps) {
  // Seule chaîne résolue côté client : le compteur est un pluriel ICU dont la
  // valeur change à chaque filtre, il ne peut pas être pré-calculé au serveur.
  // Le coût est nul — NextIntlClientProvider expose déjà le catalogue.
  const t = useTranslations('Realisations')

  const [categorie, setCategorie] = useState<CategorieRealisation | 'all'>('all')

  /** Réalisation dont la série est ouverte ET l'index de la photo cliquée,
   *  ou `null`. Une seule visionneuse pour toute la page, montée à la fin —
   *  une par rangée en mettrait autant dans le document, chacune avec sa
   *  propre série, pour n'en montrer qu'une à la fois. */
  const [ouverte, setOuverte] = useState<{ realisation: RealisationCarte; index: number } | null>(
    null,
  )

  const libellesSlide = useMemo(
    () => ({
      fermer: t('slide_fermer'),
      precedent: t('slide_precedent'),
      suivant: t('slide_suivant'),
      position: (n: number, total: number) => t('slide_position', { n, total }),
    }),
    [t],
  )

  const visibles = useMemo(
    () => realisations.filter((r) => categorie === 'all' || r.categorie === categorie),
    [realisations, categorie],
  )

  /**
   * Une rangée par catégorie, dans l'ordre imposé par CATEGORIES_REALISATION
   * (Opérations, Installations, Le LAB, Équipements) — jamais l'ordre
   * d'arrivée en base. Une catégorie sans réalisation VISIBLE (filtrée ou
   * simplement vide) n'a pas de rangée du tout : `.filter()` l'écarte avant
   * le rendu, pas un rendu vide caché en CSS.
   */
  const groupes = useMemo(
    () =>
      CATEGORIES_REALISATION.map((cat) => ({
        categorie: cat,
        items: visibles.filter((r) => r.categorie === cat),
      })).filter((g) => g.items.length > 0),
    [visibles],
  )

  return (
    <>
      {/* ------------------------------ Filtres ------------------------------ */}
      {/* `role="group"` plutôt qu'une liste de liens : le filtrage ne change pas
          l'URL, ces boutons ne sont donc pas des destinations navigables. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div role="group" aria-label={labelFiltres} className="flex flex-wrap gap-2">
        {filtres.map(({ valeur, label }) => {
          const actif = valeur === categorie

          return (
            <button
              key={valeur}
              type="button"
              onClick={() => setCategorie(valeur)}
              aria-pressed={actif}
              className={cn(
                'min-h-[44px] rounded-sm border px-5 text-sm transition-colors duration-250',
                actif
                  ? 'border-ko-blue bg-ko-blue text-ko-black'
                  : 'border-ko-line text-ko-ink hover:border-ko-ink',
              )}
            >
              {label}
            </button>
          )
        })}
      </div>

        {/* Étiquette visible — fixe depuis la révision éditoriale du 29 août
            2026 (LOT A), ne reflète plus le nombre filtré. Pas d'aria-live
            ici : un texte qui ne change jamais n'a rien à annoncer. */}
        <p className="label-mono text-ko-muted">{t('compte')}</p>

        {/* Annonce accessible, distincte de l'étiquette ci-dessus — le filtre
            ne change pas l'URL et ne déplace pas le focus : sans elle, un
            utilisateur de lecteur d'écran n'aurait aucun retour sur l'effet
            de son clic, y compris quand le résultat est vide. `sr-only` :
            jamais vue, seulement entendue. */}
        <p aria-live="polite" className="sr-only">
          {t('compte_annonce', { n: visibles.length })}
        </p>
      </div>

      {/* --------------------------- Rangées ---------------------------- */}
      {/* Espacements resserrés en mobile (27 août 2026, retour visuel sur
          téléphone réel) : mt-14/space-y-14/space-y-10/mb-6 empilaient trop
          de vide entre les filtres, les catégories et les réalisations sur
          petit écran — desktop (`lg:`) inchangé, il n'était pas en cause. */}
      {visibles.length === 0 ? (
        <p className="mt-8 text-base text-ko-muted lg:mt-14">{aucunResultat}</p>
      ) : (
        <div className="mt-8 space-y-8 lg:mt-14 lg:space-y-20">
          {groupes.map((g) => (
            <div key={g.categorie}>
              {/* Titre de catégorie UNIQUEMENT en « Tout voir » — une
                  catégorie choisie au filtre l'a déjà annoncée, le répéter
                  ici dirait deux fois la même chose (demande explicite). */}
              {categorie === 'all' && (
                <h2 className="ko-h3 mb-4 text-[20px] text-ko-ink lg:mb-8 lg:text-[24px]">
                  {libellesCategories[g.categorie] ?? g.categorie}
                </h2>
              )}
              <div className="space-y-6 lg:space-y-14">
                {g.items.map((r) => (
                  <RangeePhotos
                    key={r.cle}
                    titre={r.titre}
                    compte={t('serie_compte', { n: r.photos.length })}
                    photos={r.photos}
                    desature={r.desature}
                    onOuvrir={(index) => setOuverte({ realisation: r, index })}
                    libelles={libellesCarrousel}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Visionneuse — `key` : force le remontage d'une réalisation, ou
          d'une photo, à l'autre, sinon l'index affiché resterait celui du
          clic précédent. */}
      {ouverte && (
        <SlideImages
          key={`${ouverte.realisation.cle}:${ouverte.index}`}
          ouvert
          indexInitial={ouverte.index}
          onFermer={() => setOuverte(null)}
          images={photosStylees(ouverte.realisation)}
          titre={ouverte.realisation.titre}
          description={ouverte.realisation.description}
          libelles={libellesSlide}
        />
      )}
    </>
  )
}

/**
 * Applique le même filtre que la carte à la SEULE photo de couverture —
 * jamais au reste de la série. Comportement hérité tel quel de l'ancienne
 * grille (`serieDe()`, avant la refonte du 24 août 2026) : seule la
 * couverture y portait `FILTRE_TERRAIN`/`FILTRE_TERRAIN_CHAUD`, les photos
 * suivantes de la série n'ont jamais eu de filtre. Reconduit sans y toucher —
 * changer ce détail ne fait pas partie de cette refonte, et `desature` reste
 * de toute façon toujours à `false` pour du contenu réel (voir page.tsx).
 */
function photosStylees(r: RealisationCarte): readonly ImageSlide[] {
  const [couverture, ...suite] = r.photos
  if (!couverture) return r.photos
  return [{ ...couverture, style: r.desature ? FILTRE_TERRAIN_CHAUD : FILTRE_TERRAIN }, ...suite]
}

/**
 * Rangée horizontale des photos d'UNE réalisation — défilement natif, pas de
 * librairie. Remplace l'ancienne RangeeCarrousel (qui faisait défiler des
 * cartes de réalisation, une rangée par catégorie) depuis la refonte à deux
 * niveaux du 27 août 2026 : catégorie → réalisation → ses photos.
 *
 * ---------------------------------------------------------------------------
 * `overflow-x-auto` SEUL, JAMAIS DE GESTIONNAIRE DE MOLETTE
 *
 * Le défaut le plus courant de ce patron : convertir un `deltaY` de molette
 * en défilement horizontal (`el.scrollLeft += e.deltaY`) pour que le
 * trackpad fasse défiler la rangée sans glisser latéralement. Ce composant ne
 * le fait PAS — la molette verticale continue de faire défiler la PAGE quand
 * elle survole une rangée, exactement le comportement natif du navigateur
 * sur un conteneur qui ne déborde que sur X. Le tactile (glissement) et les
 * flèches restent les deux seules façons de faire avancer la rangée.
 *
 * ---------------------------------------------------------------------------
 * LARGEUR EN `max()` DE DEUX FORMULES, PAS UNE SEULE
 *
 * La classe `.carrousel-photo` (globals.css) choisit la plus GRANDE de deux
 * largeurs : une largeur FIXE (3 photos pleines + un aperçu de la 4ᵉ en
 * mobile, 4 + un aperçu de la 5ᵉ à partir de lg), et une largeur en PARTAGE
 * ÉGAL du conteneur entre `--n` photos. Une réalisation avec peu de photos
 * (2, 3) obtient le partage égal — plus large, il remplit toute la rangée
 * sans vide à droite ni défilement. Une réalisation qui déborde du nombre
 * visible obtient la largeur fixe, qui la fait déborder et active le
 * défilement. Voir le commentaire de `.carrousel-photo` pour le détail.
 * ---------------------------------------------------------------------------
 */
function RangeePhotos({
  titre,
  compte,
  photos,
  desature,
  onOuvrir,
  libelles,
}: {
  titre: string
  compte: string
  photos: readonly ImageSlide[]
  desature: boolean
  onOuvrir: (index: number) => void
  libelles: LibellesCarrousel
}) {
  const piste = useRef<HTMLDivElement>(null)
  const [peutReculer, setPeutReculer] = useState(false)
  const [peutAvancer, setPeutAvancer] = useState(photos.length > 1)

  const actualiserFleches = useCallback(() => {
    const el = piste.current
    if (!el) return
    // Marge de 2px : `scrollLeft`/`scrollWidth` peuvent porter un résidu
    // sous-pixel selon le zoom du navigateur, qui laisserait sinon une
    // flèche active alors qu'il n'y a plus rien à atteindre dans ce sens.
    setPeutReculer(el.scrollLeft > 2)
    setPeutAvancer(el.scrollLeft < el.scrollWidth - el.clientWidth - 2)
  }, [])

  useEffect(() => {
    actualiserFleches()
    const el = piste.current
    if (!el) return
    el.addEventListener('scroll', actualiserFleches, { passive: true })
    window.addEventListener('resize', actualiserFleches)
    return () => {
      el.removeEventListener('scroll', actualiserFleches)
      window.removeEventListener('resize', actualiserFleches)
    }
  }, [actualiserFleches, photos.length])

  /** `prefers-reduced-motion` : défilement instantané. Même vérification que
   *  BoutonRetourHaut.tsx — passer `behavior` explicitement dans l'appel JS
   *  l'emporte sur la règle CSS globale (globals.css), qui ne s'applique
   *  qu'aux défilements SANS `behavior` explicite ; il faut donc vérifier
   *  ici, pas compter sur cette règle pour le faire à notre place. */
  function mouvementReduit() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  function defiler(sens: 1 | -1) {
    const el = piste.current
    if (!el) return
    el.scrollBy({ left: sens * el.clientWidth * 0.9, behavior: mouvementReduit() ? 'auto' : 'smooth' })
  }

  function surFocus(e: React.FocusEvent<HTMLButtonElement>) {
    e.currentTarget.scrollIntoView({
      behavior: mouvementReduit() ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'nearest',
    })
  }

  return (
    <div>
      {/* En-tête de rangée — même ligne à partir de lg (titre à gauche,
          compteur à droite) ; empilés en mobile, titre tronqué sur une
          seule ligne, compteur en dessous (demande explicite). */}
      <div className="mb-3 flex flex-col gap-0.5 lg:mb-4 lg:flex-row lg:items-baseline lg:justify-between lg:gap-4">
        <h3 className="min-w-0 truncate font-serif text-[16px] font-normal text-ko-ink lg:text-[19px]">
          {titre}
        </h3>
        <p className="label-mono shrink-0 text-ko-muted">{compte}</p>
      </div>

      <div className="relative">
        <div
          ref={piste}
          role="group"
          aria-label={`${libelles.groupe} — ${titre}`}
          // `--n` : nombre de photos de CETTE rangée, lu par `.carrousel-photo`
          // (globals.css). Posé ici plutôt que sur chaque vignette : la
          // variable CSS hérite jusqu'aux boutons enfants.
          style={{ '--n': String(photos.length) } as React.CSSProperties}
          // `gap-2` en mobile, pas `gap-3` (27 août 2026, retour visuel sur
          // téléphone réel) : resserre l'écart entre vignettes ET les
          // agrandit un peu, `.carrousel-photo` (globals.css) partageant la
          // largeur restante entre les photos — `--gap` y est ajusté en
          // miroir, sinon la formule de largeur reste calée sur l'ancien
          // écart. Desktop (`lg:gap-4`) inchangé.
          className="scrollbar-none flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth lg:gap-4"
        >
          {photos.map((photo, i) => (
            <button
              key={photo.src}
              type="button"
              onClick={() => onOuvrir(i)}
              onFocus={surFocus}
              title={photo.alt || titre}
              // Nom accessible propre à CHAQUE photo — jamais un libellé
              // générique répété identique sur les huit boutons de la
              // rangée, qui empêcherait de les distinguer au clavier.
              aria-label={photo.alt || `${titre} — ${i + 1}/${photos.length}`}
              // `rounded-lg`, pas `rounded-xl` (27 août 2026) : sur une
              // vignette de cette taille (~1/3 de la largeur d'un
              // téléphone), le même rayon que sur les grandes photos du
              // reste du site (Besoins, Boutique, Location…) se voit
              // proportionnellement bien plus arrondi — resserré pour CETTE
              // rangée dense de petites vignettes uniquement, les autres
              // composants du site gardent `rounded-xl` sans changement.
              className="carrousel-photo group relative aspect-[4/3] shrink-0 snap-start overflow-hidden rounded-lg bg-ko-cream2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ko-blue"
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(max-width: 1024px) 30vw, 300px"
                quality={80}
                style={desature ? FILTRE_TERRAIN_CHAUD : FILTRE_TERRAIN}
                className="object-cover object-center transition-transform duration-[400ms] group-hover:scale-[1.02]"
              />
            </button>
          ))}
        </div>

        {/* Flèches — desktop seulement (`lg:flex`) : sur mobile, le glissement
            tactile est le geste attendu. Une rangée d'une seule photo n'a
            rien à défiler : pas de flèches non plus dans ce cas — et une
            rangée qui tient déjà en entier dans le conteneur (voir
            `.carrousel-photo`) les désactive d'elle-même, `peutAvancer`
            restant à `false` faute de tout débordement à atteindre. */}
        {photos.length > 1 && (
          <>
            <BoutonCarrousel
              direction="precedent"
              libelle={`${libelles.precedent} — ${titre}`}
              onClick={() => defiler(-1)}
              desactive={!peutReculer}
            />
            <BoutonCarrousel
              direction="suivant"
              libelle={`${libelles.suivant} — ${titre}`}
              onClick={() => defiler(1)}
              desactive={!peutAvancer}
            />
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Flèche de la rangée — chevron dessiné en CSS, même technique que
 * BandeauImages.tsx et SlideImages.tsx : trois gestes ne justifient pas une
 * icône de plus dans le fichier partagé. Noir (#111210 = `ko-black`),
 * jamais bleu — la règle de contraste de CLAUDE.md réserve le bleu, sur fond
 * clair, aux gros éléments graphiques ; un petit chevron n'en est pas un.
 */
function BoutonCarrousel({
  direction,
  libelle,
  onClick,
  desactive,
}: {
  direction: 'precedent' | 'suivant'
  libelle: string
  onClick: () => void
  desactive: boolean
}) {
  const precedent = direction === 'precedent'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desactive}
      aria-label={libelle}
      title={libelle}
      className={cn(
        'absolute top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-ko-white shadow-card transition-opacity duration-200 lg:flex',
        precedent ? 'left-2' : 'right-2',
        desactive ? 'pointer-events-none opacity-0' : 'opacity-100 hover:bg-ko-cream',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'h-2.5 w-2.5 rotate-45 border-ko-black',
          precedent ? 'ml-0.5 border-b-2 border-l-2' : '-ml-0.5 border-r-2 border-t-2',
        )}
      />
    </button>
  )
}
