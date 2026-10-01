import Image from 'next/image'
import { getLocale, getTranslations } from 'next-intl/server'

import { buttonVariants } from '@/components/ui/Button'
import { Reveal } from '@/components/ui/Reveal'
import { Link } from '@/i18n/navigation'
import { FILTRE_TERRAIN } from '@/lib/images'
import {
  lireRealisationsPubliees,
  type ImageRealisation,
  type RealisationPubliee,
} from '@/lib/realisations'
import { cn } from '@/lib/utils/cn'
import { ROUTES } from '@/lib/routes'
import type { AppLocale } from '@/i18n/routing'

/**
 * Réalisations — grille éditoriale asymétrique.
 *
 * Une grande carte à gauche (2/3) et deux petites empilées à droite (1/3) :
 * la hiérarchie visuelle évite la grille de trois vignettes identiques, qui
 * est la signature d'un template.
 *
 * VRAIS PROJETS depuis le 1er octobre 2026 (passe de finition, §1). Jusque-là
 * cette section affichait trois CATÉGORIES génériques (« Déploiement
 * événementiel », « Signalisation architecturale », « Création et
 * fabrication ») sur des photos statiques de `images.ts`, pendant que
 * /realisations montrait, elle, de vrais mandats documentés en base. Elle lit
 * maintenant la même source que cette page — titre, description et première
 * photo viennent de `realisations`, plus rien n'est écrit en dur ici.
 *
 * La description affichée sous le titre est celle de la base, qui énonce le
 * MANDAT RÉEL (« Déploiement d'équipe terrain, montage et démontage… »), pas
 * l'événement entier : exigence explicite du §1, une carte ne doit jamais
 * laisser croire que KO-LAB a produit un projet dont il n'a livré qu'une
 * portion.
 */

/** Les trois projets retenus par Joe (§1), dans l'ordre : le premier occupe
 *  la grande carte. Trois facettes distinctes — opérations terrain,
 *  installation, fabrication — et non trois fois le même type de mandat.
 *  Un slug absent ou dépublié est simplement sauté (voir plus bas). */
const SLUGS_VEDETTE = [
  'canada-day-2026-operations-terrain',
  'decor-des-fetes-concession-automobile-2025',
  'le-lab-fabrication-numerique-et-petites-series',
] as const

export async function Realisations() {
  const locale = (await getLocale()) as AppLocale
  const t = await getTranslations('Home.realisations')
  const tFiltres = await getTranslations('Realisations')

  const publiees = await lireRealisationsPubliees(locale)

  const libellesCategories = {
    terrain: tFiltres('filtre_terrain'),
    installation: tFiltres('filtre_installation'),
    lab: tFiltres('filtre_lab'),
    equipement: tFiltres('filtre_equipement'),
  }

  // `flatMap` plutôt qu'un `map` + `filter` : un slug introuvable (dépublié
  // dans l'admin, renommé) disparaît de la liste au lieu de rendre une carte
  // vide. L'ordre reste celui de SLUGS_VEDETTE, pas celui de la base.
  // La photo est extraite ICI, pas dans la carte : `noUncheckedIndexedAccess`
  // rend `images[0]` optionnel, et le filtre qui garantit sa présence est
  // justement cette ligne.
  const projets = SLUGS_VEDETTE.flatMap((slug) => {
    const projet = publiees?.find((p) => p.slug === slug)
    const photo = projet?.images[0]
    return projet && photo ? [{ projet, photo }] : []
  })

  // Base injoignable ou les trois projets dépubliés : la section disparaît
  // plutôt que d'afficher un en-tête suivi d'un trou. Le reste de l'accueil
  // tient debout — même parti pris que les autres sections branchées sur
  // Supabase.
  const grande = projets[0]
  if (!grande) return null

  const petites = projets.slice(1)

  return (
    <section className="bg-ko-white py-16 lg:py-28">
      <div className="mx-auto max-w-container px-6 lg:px-16">
        <Reveal>
          <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="label-mono">{t('label')}</p>
              <h2 className="ko-h2 mt-5 max-w-[18ch] text-ko-ink">{t('title')}</h2>
            </div>

            <Link
              href={ROUTES.realisations}
              className={cn('shrink-0', buttonVariants({ variant: 'text' }))}
            >
              {t('lien')}
              <span aria-hidden="true">→</span>
            </Link>
          </header>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Grande carte — 2 colonnes sur 3 */}
          <Reveal className="lg:col-span-2">
            <Carte
              projet={grande.projet}
              photo={grande.photo}
              libelle={libellesCategories[grande.projet.categorie]}
              ratio="aspect-[3/2]"
            />
          </Reveal>

          {/* Deux petites empilées */}
          <div className="grid grid-cols-1 gap-5">
            {petites.map(({ projet, photo }) => (
              <Reveal key={projet.slug}>
                <Carte
                  projet={projet}
                  photo={photo}
                  libelle={libellesCategories[projet.categorie]}
                  ratio="aspect-[4/3]"
                />
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/**
 * Carte de réalisation.
 *
 * Destination : la page du projet quand il en a une (`fiche`, migration
 * 0047), la galerie /realisations sinon — un album de galerie n'a pas d'URL
 * propre, y envoyer le visiteur donnerait une 404.
 */
function Carte({
  projet,
  photo,
  libelle,
  ratio,
}: {
  projet: RealisationPubliee
  /** Première photo du projet, déjà extraite par l'appelant. */
  photo: ImageRealisation
  /** Catégorie filtrable (skill 21) — affichée en pastille haut-gauche. */
  libelle: string
  ratio: string
}) {
  const href = projet.fiche ? `${ROUTES.realisations}/${projet.slug}` : ROUTES.realisations

  return (
    <article className={cn('group relative overflow-hidden rounded-xl bg-ko-cream2', ratio)}>
      <Image
        src={photo.url}
        alt={photo.alt}
        fill
        quality={80}
        sizes="(max-width: 1024px) 100vw, 66vw"
        style={FILTRE_TERRAIN}
        className="object-cover object-center transition-transform duration-[400ms] group-hover:scale-[1.01]"
      />

      {/* Voile général — profondeur de la carte, pas lisibilité du texte :
          celle-ci est assurée par le dégradé porté par le bloc de texte
          lui-même, juste en dessous. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-ko-scrim/60 via-ko-scrim/15 to-transparent transition-colors duration-300 group-hover:from-ko-scrim/70"
      />

      <span className="absolute left-4 top-4 rounded bg-ko-scrim/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ko-frost/90 backdrop-blur-sm">
        {libelle}
      </span>

      {/* Le dégradé est porté par le BLOC DE TEXTE, pas par la carte : il suit
          donc la hauteur réelle du texte quelle que soit celle de la carte.
          Un dégradé calé sur la carte entière laissait le titre sur 20 % de
          voile dès que la carte était courte — mesuré le 1er octobre 2026 à
          390 px : 1,97:1 sur le sapin de Noël et 2,06:1 sur la pièce dorée,
          sous le seuil AA grand texte (3:1). Voir outils/contraste-cartes.cjs,
          qui mesure le PIRE pixel sous le texte, photo comprise. */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ko-scrim via-ko-scrim/75 to-transparent px-4 pb-4 pt-20">
        <h3 className="font-serif text-[20px] leading-tight text-ko-white">
          {/* Le lien couvre toute la carte (`after:absolute inset-0`) sans
              imbriquer la photo dans l'ancre : le survol reste celui de
              l'article, et le lecteur d'écran n'annonce que le titre. */}
          <Link href={href} className="after:absolute after:inset-0 after:content-['']">
            {projet.titre}
          </Link>
        </h3>

        {/* Le mandat réel, en deux lignes au plus — au-delà, la carte
            devient un bloc de texte posé sur une photo. Absent si la
            réalisation n'a pas de description : un `<p>` vide creuserait un
            blanc sous le titre. */}
        {projet.description && (
          <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-ko-frost/85">
            {projet.description}
          </p>
        )}
      </div>
    </article>
  )
}
