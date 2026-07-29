import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound, redirect } from 'next/navigation'

import { PagePanier } from '@/components/sections/PagePanier'
import { routing } from '@/i18n/routing'
import { PANIER_ACTIF } from '@/lib/config/features'
import { construireFichesPanier } from '@/lib/produits'
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

/**
 * ⚠️ Panier désactivé — voir src/lib/config/features.ts.
 *
 * PagePanier, son Context et ses traductions restent intacts ; seule cette
 * route redirige. Un visiteur ayant gardé /boutique/demande en favori doit
 * atterrir sur le catalogue, pas sur une 404 qui donnerait l'impression d'un
 * site cassé.
 */
export default async function DemandePrixPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  if (!PANIER_ACTIF) {
    redirect(`/${locale}${ROUTES.boutique}`)
  }

  const t = await getTranslations('Panier')

  // Prix ET visuel, relus depuis la même source que la boutique (jamais
  // stockés dans le panier lui-même) : le récapitulatif reflète ainsi toujours
  // ce qui est affiché aujourd'hui, pas ce qui l'était le jour de l'ajout.
  const tBoutique = await getTranslations('Boutique')
  const fiches = construireFichesPanier(tBoutique)

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
          <PagePanier fiches={fiches} />
        </div>
      </section>
    </>
  )
}
