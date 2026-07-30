import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import {
  GalerieRealisations,
  type RealisationCarte,
} from '@/components/sections/GalerieRealisations'
import { Reveal } from '@/components/ui/Reveal'
import { routing, type AppLocale } from '@/i18n/routing'
import { CADRAGES, IMAGES } from '@/lib/images'
import { lireRealisationsPubliees, type RealisationPubliee } from '@/lib/realisations'
import { ROUTES } from '@/lib/routes'

import type { Metadata } from 'next'

type Props = { params: Promise<{ locale: string }> }

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations({ locale, namespace: 'Metadata.realisations' })

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}${ROUTES.realisations}`,
      languages: {
        fr: `/fr${ROUTES.realisations}`,
        en: `/en${ROUTES.realisations}`,
        'x-default': `/fr${ROUTES.realisations}`,
      },
    },
  }
}

export default async function RealisationsPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations('Realisations')

  /**
   * Base d'abord, contenu provisoire en repli.
   *
   * ---------------------------------------------------------------------------
   * ⚠️ POURQUOI UN REPLI, ET NON UN SIMPLE TABLEAU VIDE
   *
   * `lireRealisationsPubliees()` renvoie `null` tant qu'AUCUNE réalisation
   * n'a été publiée avec au moins une photo depuis /admin/realisations — c'est
   * le cas aujourd'hui : les trois lignes de démonstration ont été dépubliées
   * (elles étaient inventées), et rien de réel n'a encore été saisi. Sans
   * repli, la galerie publique se viderait le jour du déploiement de cette
   * fonctionnalité, avant même que Christian ait eu le temps d'y ajouter un
   * seul chantier.
   *
   * Le contenu provisoire ci-dessous restera donc affiché jusqu'à ce qu'une
   * première réalisation soit publiée — à cet instant, `lireRealisationsPubliees()`
   * cesse de renvoyer `null` et ce tableau de repli n'est plus jamais atteint.
   * Rien à changer ici ce jour-là.
   * ---------------------------------------------------------------------------
   */
  const publiees = await lireRealisationsPubliees()

  const libellesCategories = {
    terrain: t('filtre_terrain'),
    installation: t('filtre_installation'),
    lab: t('filtre_lab'),
    equipement: t('filtre_equipement'),
  }

  // ⚠️ CONTENU PROVISOIRE — voir la note ci-dessus. Les séries d'images
  // réutilisent des photos déjà présentes ailleurs sur le site : ce sont les
  // mêmes images de banque que partout, en attendant les vraies photos de
  // chantier KO-LAB.
  const repli: readonly RealisationCarte[] = [
    {
      cle: 'terrain',
      categorie: 'terrain',
      titre: t('items.terrain.titre'),
      description: t('items.terrain.description'),
      tag: t('filtre_terrain'),
      src: IMAGES.realisationTerrain,
      cadrage: CADRAGES.besoinDeployer,
      desature: true,
      serie: [
        { src: IMAGES.hero, alt: t('alt.terrain_nuit') },
        { src: IMAGES.besoinLouer, alt: t('alt.terrain_logistique') },
      ],
    },
    {
      cle: 'installation',
      categorie: 'installation',
      titre: t('items.installation.titre'),
      description: t('items.installation.description'),
      tag: t('filtre_installation'),
      src: IMAGES.installationNacelle,
      cadrage: CADRAGES.installationNacelle,
      desature: false,
      serie: [{ src: IMAGES.besoinInstaller, alt: t('alt.installation_echafaudage') }],
    },
    {
      cle: 'lab',
      categorie: 'lab',
      titre: t('items.lab.titre'),
      description: t('items.lab.description'),
      tag: t('filtre_lab'),
      src: IMAGES.labImpression3d,
      cadrage: 'object-center',
      desature: false,
      /**
       * ⚠️ IMAGES.lab (découpe laser CNC) est volontairement ABSENTE.
       *
       * Elle porte une signature de photographe incrustée en bas à droite —
       * discrète sur une carte, criante en plein écran. La visionneuse affiche
       * l'image entière : ce qui passait inaperçu devient le sujet.
       */
      serie: [
        { src: IMAGES.soudeur, alt: t('alt.lab_soudure') },
        { src: IMAGES.besoinFabriquer, alt: t('alt.lab_meuleuse') },
      ],
    },
  ]

  const realisations: readonly RealisationCarte[] = publiees
    ? publiees.map((r) => versCarte(r, locale as AppLocale, libellesCategories))
    : repli

  // Les catégories du skill 21. `equipement` est proposée dès maintenant même
  // sans réalisation associée : le message « aucun résultat » informe mieux
  // qu'un filtre absent, qui laisserait croire que la catégorie n'existe pas.
  const filtres = [
    { valeur: 'all', label: t('filtre_tout') },
    { valeur: 'terrain', label: t('filtre_terrain') },
    { valeur: 'installation', label: t('filtre_installation') },
    { valeur: 'lab', label: t('filtre_lab') },
    { valeur: 'equipement', label: t('filtre_equipement') },
  ] as const

  return (
    <>
      {/* ------------------------------ En-tête ------------------------------ */}
      {/* Pas de photo ici, volontairement : la page EST une galerie. Un hero
          photographique entrerait en concurrence avec les visuels du contenu. */}
      <section className="border-b border-ko-line bg-ko-cream pb-14 pt-28 lg:pb-20 lg:pt-40">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          {/* Pas de label mono ici : il aurait répété mot pour mot le h1.
              Le compteur vit dans la galerie, où il suit le filtre actif. */}
          <span aria-hidden="true" className="block h-px w-8 bg-ko-blue" />

          <h1 className="ko-display mt-6 max-w-[20ch] text-ko-ink">{t('title')}</h1>

          <p className="mt-7 max-w-[56ch] text-base leading-relaxed text-ko-muted lg:text-lg">
            {t('intro')}
          </p>
        </div>
      </section>

      {/* ------------------------------ Galerie ------------------------------ */}
      <section className="bg-ko-white py-16 lg:py-24">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          <Reveal>
            <GalerieRealisations
              realisations={realisations}
              filtres={filtres}
              labelFiltres={t('filtres_label')}
              aucunResultat={t('aucun_resultat')}
            />
          </Reveal>
        </div>
      </section>
    </>
  )
}

/**
 * Ligne de base → carte affichable.
 *
 * ---------------------------------------------------------------------------
 * PAS DE CADRAGE NI DE DÉSATURATION POUR LE CONTENU RÉEL
 *
 * `cadrage` (recentrage `object-position`) et `desature` (le filtre chaud
 * appliqué aux photos de nuit sous-exposées) sont des correctifs pensés pour
 * DES PHOTOS DE BANQUE dépareillées — elles n'appartiennent pas au même
 * reportage et n'ont donc jamais le même ton ni le même cadrage naturel. Une
 * vraie série de photos KO-LAB, prise par la même personne le même jour, n'a
 * pas ce problème : `object-center` et aucun filtre suffisent.
 *
 * ⚠️ Si un jour une photo réelle a besoin d'un recadrage précis, ce sera un
 * réglage PAR IMAGE dans /admin/realisations, pas une constante de ce fichier
 * — la table n'a volontairement pas cette colonne tant que le besoin ne
 * s'est pas présenté.
 */
function versCarte(
  r: RealisationPubliee,
  locale: AppLocale,
  libellesCategories: Record<string, string>,
): RealisationCarte {
  const anglais = locale === 'en'

  // `titre_fr` et `titre_en` sont tous deux NOT NULL (contrainte réelle de la
  // table) : pas de repli à calculer, contrairement au catalogue.
  const titre = anglais ? r.titre_en : r.titre_fr
  const description = anglais
    ? (r.description_en ?? r.description_fr ?? '')
    : (r.description_fr ?? r.description_en ?? '')

  const [premiere, ...suite] = r.images

  return {
    cle: r.slug,
    categorie: r.categorie,
    titre,
    description,
    tag: libellesCategories[r.categorie] ?? r.categorie,
    // `premiere` est garantie par `lireRealisationsPubliees()`, qui écarte
    // déjà toute réalisation sans la moindre image.
    src: premiere?.url ?? '',
    cadrage: 'object-center',
    desature: false,
    serie: suite.map((im) => ({
      src: im.url,
      alt: anglais ? im.alt_en || im.alt_fr : im.alt_fr || im.alt_en,
    })),
  }
}
