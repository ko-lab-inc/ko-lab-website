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
  /**
   * Capacités mobilisées, en plus de `categorie` (point 16 du prompt de
   * corrections finales, 3 septembre 2026) — `categorie` reste le SEUL
   * champ qui pilote le filtre et le regroupement par section (un seul
   * panier possible) ; `tags` n'affiche qu'un complément visuel pour les
   * réalisations dont le mandat a mobilisé plusieurs capacités (ex. DEVFEST :
   * structures + mobilier + opérations, pas seulement « Équipements »).
   * Vide pour la plupart des réalisations — rien ne s'affiche alors, pas de
   * chip vide.
   */
  tags: readonly string[]
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
                    tags={r.tags}
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

/** Foyer : échelle perdue par une vignette à une largeur (ou plus) du
 *  centre — 0,3 → 0,7 (maquette verticale du 19 septembre : voisines
 *  nettement plus petites que la photo centrale). Estompage : 0,25 → 0,75 d'opacité. Sur le cadre
 *  BLANC, l'opacité éclaircit : gardée légère pour que les voisines restent
 *  des photos, pas des fantômes. */
const ECART_ECHELLE = 0.3
const ECART_OPACITE = 0.25

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
 * CARROUSEL À FOYER (19 septembre 2026, d'après une maquette de Christian :
 * « un plus grand au milieu toujours, et le suivant devient grand quand il
 * est au milieu »)
 *
 * - Toutes les vignettes ont la même largeur de BASE (`.carrousel-photo`,
 *   globals.css). Celle dont le centre coïncide avec le centre de la rangée
 *   est à l'échelle 1 ; ses voisines rétrécissent (jusqu'à 0,7) et
 *   s'estompent (jusqu'à 0,75) avec la distance — `appliquerFoyer`, à chaque
 *   image de défilement. TRANSFORM et OPACITÉ seulement : la mise en page ne
 *   bouge jamais, le calage (`snap-center`) reste stable.
 * - Les voisines rétrécissent VERS le centre (origine sur leur bord intérieur)
 *   pour rester serrées contre la photo principale, comme sur la maquette.
 * - Deux cales invisibles (`.carrousel-piste::before/::after`) permettent à
 *   la première et à la dernière photo d'atteindre le centre.
 * - `prefers-reduced-motion` : pas d'échelle, l'estompage seul.
 * - Photos VERTICALES 2:3, angles droits, cadre sans arrondi (seconde
 *   maquette de Christian, même jour : « plus verticales, sans bordure
 *   arrondie, plus de hauteur de cadre »). Les originaux sont surtout des
 *   paysages : `object-cover` en garde le centre.
 * - Au chargement, la DEUXIÈME photo est au centre, la première visible à
 *   sa gauche (même demande) — `scrollTo` instantané au montage.
 * ---------------------------------------------------------------------------
 */
function RangeePhotos({
  titre,
  compte,
  tags,
  photos,
  desature,
  onOuvrir,
  libelles,
}: {
  titre: string
  compte: string
  tags: readonly string[]
  photos: readonly ImageSlide[]
  desature: boolean
  onOuvrir: (index: number) => void
  libelles: LibellesCarrousel
}) {
  const piste = useRef<HTMLDivElement>(null)
  const vignettes = useRef<(HTMLButtonElement | null)[]>([])
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

  /** Foyer — voir la note d'en-tête. `offsetLeft` (position de mise en page,
   *  la piste étant `relative`) et non `getBoundingClientRect`, qui inclurait
   *  l'échelle déjà appliquée. Toutes les lectures d'abord, les écritures
   *  ensuite : aucune mise en page forcée entre deux vignettes. */
  const appliquerFoyer = useCallback(() => {
    const el = piste.current
    if (!el) return
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0
    const centre = el.scrollLeft + el.clientWidth / 2
    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const mesures = vignettes.current.map((v) =>
      v ? { v, d: (v.offsetLeft + v.offsetWidth / 2 - centre) / (v.offsetWidth + gap) } : null,
    )
    for (const m of mesures) {
      // Le CALQUE intérieur, jamais le bouton : le calage (`snap-center`) se
      // fait sur la boîte TRANSFORMÉE de la cible — réduire le bouton
      // déplaçait sa cible et la photo suivante se calait à ~39 px du centre
      // (échelle 0,98 au lieu de 1, mesuré). Le bouton garde sa boîte.
      const calque = m?.v.firstElementChild as HTMLElement | null | undefined
      if (!m || !calque) continue
      const t = Math.min(Math.abs(m.d), 1)
      calque.style.transform = reduit ? '' : `scale(${(1 - ECART_ECHELLE * t).toFixed(3)})`
      calque.style.transformOrigin = m.d < -0.01 ? 'right center' : m.d > 0.01 ? 'left center' : 'center'
      calque.style.opacity = (1 - ECART_OPACITE * t).toFixed(3)
    }
  }, [])

  useEffect(() => {
    const el = piste.current
    if (!el) return
    // Une mise à jour par image, pas par événement de défilement.
    let image = 0
    const actualiser = () => {
      if (image) return
      image = requestAnimationFrame(() => {
        image = 0
        actualiserFleches()
        appliquerFoyer()
      })
    }
    // Départ sur la 2e photo : une voisine de chaque côté dès l'arrivée.
    // `instant` l'emporte sur `scroll-smooth` — pas d'animation au chargement.
    const deuxieme = vignettes.current[1]
    if (deuxieme) {
      el.scrollTo({
        left: deuxieme.offsetLeft + deuxieme.offsetWidth / 2 - el.clientWidth / 2,
        behavior: 'instant',
      })
    }
    actualiserFleches()
    appliquerFoyer()
    el.addEventListener('scroll', actualiser, { passive: true })
    window.addEventListener('resize', actualiser)
    return () => {
      el.removeEventListener('scroll', actualiser)
      window.removeEventListener('resize', actualiser)
      if (image) cancelAnimationFrame(image)
    }
  }, [actualiserFleches, appliquerFoyer, photos.length])

  /** `prefers-reduced-motion` : défilement instantané. Même vérification que
   *  BoutonRetourHaut.tsx — passer `behavior` explicitement dans l'appel JS
   *  l'emporte sur la règle CSS globale (globals.css), qui ne s'applique
   *  qu'aux défilements SANS `behavior` explicite ; il faut donc vérifier
   *  ici, pas compter sur cette règle pour le faire à notre place. */
  function mouvementReduit() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  /** Une photo à la fois : la suivante vient se caler au centre. */
  function defiler(sens: 1 | -1) {
    const el = piste.current
    const v = vignettes.current.find(Boolean)
    if (!el || !v) return
    const pas = v.offsetWidth + (parseFloat(getComputedStyle(el).columnGap) || 0)
    el.scrollBy({ left: sens * pas, behavior: mouvementReduit() ? 'auto' : 'smooth' })
  }

  function surFocus(e: React.FocusEvent<HTMLButtonElement>) {
    e.currentTarget.scrollIntoView({
      behavior: mouvementReduit() ? 'auto' : 'smooth',
      block: 'nearest',
      // Au clavier aussi, la photo qui reçoit le focus vient au foyer.
      inline: 'center',
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

      {/* Capacités mobilisées — seulement si le mandat en couvre plusieurs
          (point 16, voir RealisationCarte.tags). La plupart des réalisations
          n'ont rien ici : `tags` vide, aucun filet ajouté. */}
      {tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2 lg:mb-4">
          {tags.map((tag) => (
            <span
              key={tag}
              className="border border-ko-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-ko-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Cadre NOIR (19 septembre 2026, Christian : « enlève le cadre blanc,
          mets-le en noir ») — le cadre blanc essayé le même jour est retiré.
          bg-ko-black sur un <div> : la couche sombre ne le remappe pas (seuls
          a/button/section/footer le sont), il reste #111210 dans les deux
          thèmes. Marges latérales à partir de lg : elles portent les
          flèches. Angles droits. */}
      <div className="relative bg-ko-black px-3 py-4 sm:px-8 sm:py-6 lg:px-14 lg:py-8">
        <div
          ref={piste}
          role="group"
          aria-label={`${libelles.groupe} — ${titre}`}
          // `relative` : la piste devient l'offsetParent des vignettes, dont
          // `appliquerFoyer` lit `offsetLeft`. `gap-2` / `lg:gap-4` doivent
          // rester égaux à `--gap` de `.carrousel-piste` (globals.css), qui
          // dimensionne les cales de début et de fin.
          className="carrousel-piste scrollbar-none relative flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth py-2 lg:gap-4"
        >
          {photos.map((photo, i) => (
            <button
              key={photo.src}
              ref={(n) => {
                vignettes.current[i] = n
              }}
              type="button"
              onClick={() => onOuvrir(i)}
              onFocus={surFocus}
              title={photo.alt || titre}
              // Nom accessible propre à CHAQUE photo — jamais un libellé
              // générique répété identique sur les huit boutons de la
              // rangée, qui empêcherait de les distinguer au clavier.
              aria-label={photo.alt || `${titre} — ${i + 1}/${photos.length}`}
              // Verticale 2:3 et angles droits (seconde maquette de
              // Christian, 19 septembre 2026) — propre à CETTE rangée, les
              // autres composants du site gardent leurs arrondis.
              className="carrousel-photo group relative aspect-[2/3] shrink-0 snap-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ko-blue"
            >
              {/* Calque du foyer — c'est lui qui rétrécit et s'estompe
                  (appliquerFoyer), pas le bouton : voir la note sur le
                  calage dans appliquerFoyer. */}
              <span className="absolute inset-0 overflow-hidden bg-ko-cream2 will-change-transform">
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes="(max-width: 1023px) 100vw, 700px"
                  quality={80}
                  style={desature ? FILTRE_TERRAIN_CHAUD : FILTRE_TERRAIN}
                  className="object-cover object-center transition-transform duration-[400ms] group-hover:scale-[1.02]"
                />
              </span>
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
        // Chevron BLANC sans pastille, posé dans la marge du cadre noir
        // (19 septembre 2026). border-ko-frost n'est pas remappé par la
        // couche sombre : le chevron reste blanc sur le #111210 du cadre.
        // (Jamais bg-ko-white ici : la couche le remappe vers #111210.)
        'absolute top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full transition-opacity duration-200 lg:flex',
        precedent ? 'left-2' : 'right-2',
        desactive ? 'pointer-events-none opacity-0' : 'opacity-100 hover:opacity-60',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'h-2.5 w-2.5 rotate-45 border-ko-frost',
          precedent ? 'ml-0.5 border-b-2 border-l-2' : '-ml-0.5 border-r-2 border-t-2',
        )}
      />
    </button>
  )
}
