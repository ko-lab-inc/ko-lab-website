import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { PageCapacite } from '@/components/sections/PageCapacite'
import { routing } from '@/i18n/routing'
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
      // Galerie ajoutée le 20 août 2026 — c'est la page qui souffrait le plus
      // du manque de photos réelles (Christian). Enseigne posée, enseigne
      // commerciale, signalisation et décor : quatre facettes du même
      // travail d'installation que le hero, pas des répétitions.
      images={[
        { src: IMAGES.enseignePosee2026, alt: "Enseigne d'un client installée sur son poteau" },
        { src: IMAGES.enseigneCommerciale2026, alt: 'Enseigne commerciale installée en façade' },
        { src: IMAGES.signalisation2026, alt: 'Signalisation numérotée installée sur un bâtiment' },
        { src: IMAGES.decorStructure2025, alt: 'Décor et structure installés sur un site événementiel' },
      ]}
    />
  )
}
