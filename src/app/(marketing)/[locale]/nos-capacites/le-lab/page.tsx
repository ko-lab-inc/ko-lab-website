import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { PageCapacite } from '@/components/sections/PageCapacite'
import { routing } from '@/i18n/routing'
import { IMAGES } from '@/lib/images'
import { ROUTES } from '@/lib/routes'

import type { Metadata } from 'next'

type Props = { params: Promise<{ locale: string }> }

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations({ locale, namespace: 'Metadata.lab' })

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}${ROUTES.lab}`,
      languages: {
        fr: `/fr${ROUTES.lab}`,
        en: `/en${ROUTES.lab}`,
        'x-default': `/fr${ROUTES.lab}`,
      },
    },
  }
}

export default async function LeLabPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations('Capacites.lab')

  return (
    <PageCapacite
      numero="03"
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
      src={IMAGES.lab}
      cadrage="object-center"
    />
  )
}
