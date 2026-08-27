import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { PageCapacite } from '@/components/sections/PageCapacite'
import { routing } from '@/i18n/routing'
import { lireGaleriePage } from '@/lib/galeries'
import { CADRAGES, IMAGES } from '@/lib/images'
import { alternatesLangues, ROUTES } from '@/lib/routes'

import type { Metadata } from 'next'

type Props = { params: Promise<{ locale: string }> }

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations({ locale, namespace: 'Metadata.installations' })

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}${ROUTES.installations}`,
      languages: alternatesLangues(ROUTES.installations),
    },
  }
}

export default async function InstallationsPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations('Capacites.installations')
  const images = await lireGaleriePage('installations', locale)

  return (
    <PageCapacite
      numero="02"
      label={t('label')}
      titre={t('title')}
      phrase={t('phrase')}
      intro={t('intro')}
      // Sept éléments ici, contre huit pour les trois autres capacités —
      // conforme au document de cadrage.
      items={[
        t('item_1'),
        t('item_2'),
        t('item_3'),
        t('item_4'),
        t('item_5'),
        t('item_6'),
        t('item_7'),
      ]}
      // Nacelle élévatrice sur façade — « Centres commerciaux et tours à
      // bureaux ». L'échafaudage précédent ne montrait aucune installation.
      src={IMAGES.installationNacelle}
      cadrage={CADRAGES.installationNacelle}
      // Galerie branchée sur galeries_photos depuis l'étape 3/3 (migration
      // 0043) — reprend les 4 photos d'origine, dont l'ancienne insertion
      // conditionnelle de capacite_installations (position 2, retirée : la
      // même photo vit maintenant dans galeries_photos comme les trois
      // autres, la galerie est homogène). `capacite_installations` reste
      // dans medias_emplacements (Vérifié : plus aucun appel à
      // resoudreEmplacement('capacite_installations', ...) dans le
      // dépôt) — non supprimée, hors du périmètre de cette étape.
      images={images}
    />
  )
}
