import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { DocumentLegal } from '@/components/sections/DocumentLegal'
import { routing } from '@/i18n/routing'
import { lireReglages } from '@/lib/reglages'
import { ROUTES } from '@/lib/routes'

import type { Metadata } from 'next'

type Props = { params: Promise<{ locale: string }> }

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations({ locale, namespace: 'Metadata.politiqueConfidentialite' })

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}${ROUTES.politiqueConfidentialite}`,
    },
  }
}

export default async function PolitiqueConfidentialitePage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations('PolitiqueConfidentialite')
  // Le courriel de contact vit dans les réglages (admin), pas dans les
  // traductions — même règle que le pied de page : le changer ne doit pas
  // demander un déploiement.
  const reglages = await lireReglages()
  const valeurs = { courriel: reglages.contactCourriel }

  const sections = Array.from({ length: 9 }, (_, i) => i + 1).map((n) => ({
    titre: t(`section${n}_titre`),
    texte: t(`section${n}_texte`, valeurs),
  }))

  return (
    <DocumentLegal
      eyebrow={t('eyebrow')}
      titre={t('title')}
      intro={t('intro')}
      miseAJour={t('mise_a_jour')}
      sections={sections}
    />
  )
}
