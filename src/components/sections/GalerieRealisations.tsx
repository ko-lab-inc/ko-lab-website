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
 * REFONTE EN CARROUSELS PAR CATÉGORIE (24 août 2026)
 *
 * Remplace la grille asymétrique (une grande carte + des petites, hauteurs
 * inégales) — Christian : « ça laisse de grands vides ». Une rangée
 * horizontale par catégorie, cartes toutes de la même taille : plus de vide
 * possible, une rangée d'une seule carte ne casse rien puisque rien ne
 * dépend du nombre de cartes pour se dimensionner.
 *
 * La carte elle-même est simplifiée : couverture + titre, plus de bandeau de
 * photos ni de description en surimpression. Cliquer OUVRE LA VISIONNEUSE
 * AVEC TOUTE LA SÉRIE, couverture comprise — voir `RealisationCarte.photos`.
 * C'est ce qui rend caduque l'ancienne règle « une seule photo n'ouvre
 * rien » : avant, la couverture était exclue de la visionneuse, donc une
 * réalisation à une photo n'avait rien de plus à montrer ; maintenant la
 * couverture EST dans la visionneuse, donc l'agrandir a toujours un sens,
 * même pour une seule photo.
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
  /** Nom accessible du bouton d'ouverture d'une carte — le même texte que
   *  l'ancien bouton « Voir les images », repris tel quel : chaque carte
   *  ouvre maintenant sa propre série, exactement ce que ce libellé dit déjà. */
  ouvrir: string
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

  /** Réalisation dont la série est ouverte, ou `null`. Une seule visionneuse
   *  pour toute la page, montée à la fin — une par carte en mettrait autant
   *  dans le document, chacune avec sa propre série, pour n'en montrer
   *  qu'une à la fois. */
  const [ouverte, setOuverte] = useState<RealisationCarte | null>(null)

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
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
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

        {/* Compteur en direct. `aria-live="polite"` : le filtre ne change pas
            l'URL et ne déplace pas le focus — sans annonce, un utilisateur de
            lecteur d'écran n'aurait aucun retour sur l'effet de son clic. */}
        <p aria-live="polite" className="label-mono text-ko-muted">
          {t('compte', { n: visibles.length })}
        </p>
      </div>

      {/* --------------------------- Rangées ---------------------------- */}
      {visibles.length === 0 ? (
        <p className="mt-14 text-base text-ko-muted">{aucunResultat}</p>
      ) : (
        <div className="mt-14 space-y-12 lg:space-y-16">
          {groupes.map((g) => (
            <div key={g.categorie}>
              {/* Titre de rangée UNIQUEMENT en « Tout voir » — une catégorie
                  choisie au filtre l'a déjà annoncée, le répéter ici dirait
                  deux fois la même chose (demande explicite). */}
              {categorie === 'all' && (
                <h2 className="ko-h3 mb-5 text-[20px] text-ko-ink lg:text-[24px]">
                  {libellesCategories[g.categorie] ?? g.categorie}
                </h2>
              )}
              <RangeeCarrousel
                items={g.items}
                onOuvrir={setOuverte}
                libelles={libellesCarrousel}
              />
            </div>
          ))}
        </div>
      )}

      {/* Visionneuse — `key` : force le remontage d'une réalisation à
          l'autre, sinon l'index de l'image resterait celui de la série
          précédente. */}
      {ouverte && (
        <SlideImages
          key={ouverte.cle}
          ouvert
          onFermer={() => setOuverte(null)}
          images={photosStylees(ouverte)}
          titre={ouverte.titre}
          description={ouverte.description}
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
 * Rangée horizontale d'une catégorie — défilement natif, pas de librairie.
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
 * LARGEUR DES CARTES EN `calc()`, PAS EN CLASSES RESPONSIVES
 *
 * `w-[calc((100%-1.5rem)/3.3)]` donne exactement le même nombre de cartes
 * visibles (3 pleines + un aperçu de la 4ᵉ) que le conteneur fasse 390px ou
 * 1400px — une largeur en pourcentage du conteneur, pas des points de rupture
 * `sm:`/`lg:` qui auraient demandé une valeur différente à chaque taille pour
 * le même résultat visuel.
 * ---------------------------------------------------------------------------
 */
function RangeeCarrousel({
  items,
  onOuvrir,
  libelles,
}: {
  items: readonly RealisationCarte[]
  onOuvrir: (r: RealisationCarte) => void
  libelles: LibellesCarrousel
}) {
  const piste = useRef<HTMLDivElement>(null)
  const [peutReculer, setPeutReculer] = useState(false)
  const [peutAvancer, setPeutAvancer] = useState(items.length > 1)

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
  }, [actualiserFleches, items.length])

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
    <div className="relative">
      <div
        ref={piste}
        className="scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth lg:gap-4"
      >
        {items.map((r) => (
          <button
            key={r.cle}
            type="button"
            onClick={() => onOuvrir(r)}
            onFocus={surFocus}
            title={r.titre}
            aria-label={`${libelles.ouvrir} — ${r.titre}`}
            className="group relative aspect-[3/4] w-[calc((100%-1.5rem)/3.3)] shrink-0 snap-start overflow-hidden rounded-xl bg-ko-cream2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ko-blue"
          >
            <Image
              src={r.src}
              alt={r.titre}
              fill
              sizes="(max-width: 1024px) 33vw, 420px"
              quality={80}
              style={r.desature ? FILTRE_TERRAIN_CHAUD : FILTRE_TERRAIN}
              className="object-cover object-center transition-transform duration-[400ms] group-hover:scale-[1.02]"
            />

            {/* Voile de lisibilité — assez fort en permanence pour que le
                titre reste lisible SANS survol : sur tactile, il n'y a pas
                de survol. */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-ko-scrim/80 via-ko-scrim/10 to-transparent"
            />

            {/* Titre en surimpression, sur deux lignes maximum. Une carte de
                ~110px de large (mobile, trois par écran) ne loge pas un long
                titre d'événement en entier — `line-clamp-2` coupe proprement
                avec des points de suspension plutôt que de déborder ou
                d'écraser la carte suivante. Le titre COMPLET reste
                disponible : attribut `title` ci-dessus (infobulle), et
                surtout l'en-tête de la visionneuse qui s'ouvre au clic. */}
            <span className="absolute inset-x-2 bottom-2 line-clamp-2 text-left font-serif text-[11px] leading-tight text-ko-white sm:text-[13px] lg:inset-x-4 lg:bottom-4 lg:text-[18px]">
              {r.titre}
            </span>
          </button>
        ))}
      </div>

      {/* Flèches — desktop seulement (`lg:flex`) : sur mobile, le glissement
          tactile est le geste attendu, une paire de flèches y ajouterait du
          bruit sans rien permettre de plus. Une rangée d'une seule carte n'a
          rien à défiler : pas de flèches non plus dans ce cas. */}
      {items.length > 1 && (
        <>
          <BoutonCarrousel
            direction="precedent"
            libelle={libelles.precedent}
            onClick={() => defiler(-1)}
            desactive={!peutReculer}
          />
          <BoutonCarrousel
            direction="suivant"
            libelle={libelles.suivant}
            onClick={() => defiler(1)}
            desactive={!peutAvancer}
          />
        </>
      )}
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
