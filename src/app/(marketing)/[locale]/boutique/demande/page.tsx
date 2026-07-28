import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { PagePanier } from '@/components/sections/PagePanier'
import { routing } from '@/i18n/routing'
import { ROUTES } from '@/lib/routes'

import type { Metadata } from 'next'

type Props = { params: Promise<{ locale: string }> }

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations({ locale, namespace: 'Panier' })

  return {
    title: t('titre'),
    description: t('intro'),
    // Page purement personnelle : son contenu vient du localStorage du
    // visiteur. Rien à indexer, et suivre les liens n'apporterait rien.
    robots: { index: false, follow: false },
    alternates: {
      canonical: `/${locale}${ROUTES.boutiqueDemande}`,
      languages: {
        fr: `/fr${ROUTES.boutiqueDemande}`,
        en: `/en${ROUTES.boutiqueDemande}`,
        'x-default': `/fr${ROUTES.boutiqueDemande}`,
      },
    },
  }
}

export default async function DemandePrixPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations('Panier')

  return (
    <>
      <section className="border-b border-ko-line bg-ko-cream pb-14 pt-28 lg:pb-20 lg:pt-40">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          <span aria-hidden="true" className="block h-px w-8 bg-ko-blue" />
          <h1 className="ko-display mt-6 max-w-[16ch] text-ko-ink">{t('titre')}</h1>
          <p className="mt-7 max-w-[54ch] text-base leading-relaxed text-ko-muted lg:text-lg">
            {t('intro')}
          </p>
        </div>
      </section>

      <section className="bg-ko-white py-16 lg:py-24">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          <PagePanier />
        </div>
      </section>
    </>
  )
}
