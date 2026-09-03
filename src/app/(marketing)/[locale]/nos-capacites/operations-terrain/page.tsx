import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { PageCapacite } from '@/components/sections/PageCapacite'
import { routing } from '@/i18n/routing'
import { lireGaleriePage } from '@/lib/galeries'
import { IMAGES } from '@/lib/images'
import { alternatesLangues, ROUTES } from '@/lib/routes'

import type { Metadata } from 'next'

type Props = { params: Promise<{ locale: string }> }

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations({ locale, namespace: 'Metadata.operations' })

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}${ROUTES.operations}`,
      languages: alternatesLangues(ROUTES.operations),
    },
  }
}

export default async function OperationsTerrainPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  // Traducteur cadré sur cet espace de noms : chaque clé est vérifiée à la
  // compilation, ce qu'un `t(`${cle}.item_1`)` générique ne permet pas.
  const t = await getTranslations('Capacites.operations')
  const images = await lireGaleriePage('operations-terrain', locale)

  return (
    <PageCapacite
      numero="01"
      label={t('label')}
      titre={t('title')}
      phrase={t('phrase')}
      intro={t('intro')}
      items={[
        t('item_1'),
        t('item_2'),
        t('item_3'),
        t('item_4'),
        t('item_5'),
        t('item_6'),
        t('item_7'),
        t('item_8'),
      ]}
      // chantierBalisage2026 depuis le 3 septembre 2026 (point 7 des
      // corrections finales) — remplace terrasseStructure2021, qui montrait
      // une construction de pergola (charpente) plutôt qu'une opération
      // terrain ; voir la note dans lib/images.ts pour l'historique complet
      // de cet emplacement hero. Reprise de la galerie (nacelle en
      // opération sur un chantier, vue aérienne) — retirée de la galerie
      // pour ne pas apparaître deux fois sur la même page.
      src={IMAGES.chantierBalisage2026}
      cadrage="object-center"
      // Galerie branchée sur galeries_photos depuis l'étape 3/3 (migration
      // 0043) — le hero (Canada Day) reste en dur, IMAGES.terrasseStructure2021
      // ci-dessus, inchangé.
      images={images}
    />
  )
}
