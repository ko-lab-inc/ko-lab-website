import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import {
  GalerieRealisations,
  type RealisationCarte,
} from '@/components/sections/GalerieRealisations'
import { Reveal } from '@/components/ui/Reveal'
import { routing } from '@/i18n/routing'
import { CADRAGES, IMAGES } from '@/lib/images'
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
   * ⚠️ CONTENU PROVISOIRE — trois entrées en attendant Supabase.
   *
   * Les chaînes sont résolues ICI, côté serveur, puis passées à la galerie
   * cliente. Sans ça, il faudrait embarquer le catalogue de traductions dans
   * le bundle navigateur juste pour afficher trois titres.
   *
   * ⚠️ Les séries d'images réutilisent des photos déjà présentes ailleurs sur
   * le site. C'est visible et assumé : ce sont les mêmes images de banque que
   * partout, en attendant les vraies photos de chantier KO-LAB. La visionneuse,
   * elle, est définitive — le jour où les photos arrivent, seule cette liste
   * change.
   */
  const realisations: readonly RealisationCarte[] = [
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
      serie: [
        {
          src: IMAGES.besoinInstaller,
          alt: t('alt.installation_echafaudage'),
          cadrage: CADRAGES.besoinInstaller,
        },
      ],
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
