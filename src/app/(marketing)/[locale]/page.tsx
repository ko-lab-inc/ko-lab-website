import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { Besoins } from '@/components/sections/Besoins'
import { Capacites } from '@/components/sections/Capacites'
import { CtaFinal } from '@/components/sections/CtaFinal'
import { Ecosysteme } from '@/components/sections/Ecosysteme'
import { Hero } from '@/components/sections/Hero'
import { Lab } from '@/components/sections/Lab'
import { Offres } from '@/components/sections/Offres'
import { PreuveTerrain } from '@/components/sections/PreuveTerrain'
import { Realisations } from '@/components/sections/Realisations'
import { StatsBar } from '@/components/sections/StatsBar'
import { routing } from '@/i18n/routing'

import type { Metadata } from 'next'

type Props = {
  params: Promise<{ locale: string }>
}

/**
 * Page d'accueil.
 *
 * ISR toutes les heures (skill 12). Ne fonctionne que parce qu'aucune section
 * n'appelle cookies() : les futures sections alimentées par Supabase devront
 * utiliser createStaticClient(), jamais createClient() de server.ts.
 */
export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations({ locale, namespace: 'Metadata.home' })

  return {
    // `absolute` court-circuite le gabarit « %s — KO-LAB » défini dans le
    // layout : sans lui, le titre deviendrait « KO-LAB Inc. — De l'idée au
    // terrain — KO-LAB ».
    title: { absolute: t('title') },
    description: t('description'),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        fr: '/fr',
        en: '/en',
        'x-default': '/fr',
      },
    },
    openGraph: {
      type: 'website',
      siteName: 'KO-LAB Inc.',
      locale: locale === 'fr' ? 'fr_CA' : 'en_CA',
      url: `/${locale}`,
      title: t('title'),
      description: t('description'),
    },
  }
}

export default async function AccueilPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  // Indispensable au rendu statique : sans cet appel, la première lecture de
  // traduction bascule la page en dynamique et annule le revalidate ci-dessus.
  setRequestLocale(locale)

  /*
   * Ordre du skill 19, et alternance clair/sombre de CLAUDE.md :
   *   Hero        photo sombre, encartée sur fond de page clair
   *   StatsBar    ko-black
   *   Besoins     ko-white
   *   Capacités   ko-cream
   *   Le LAB      ko-black
   *   Preuve      photo + voile sombre
   *   Réalisations ko-white
   *   Écosystème  ko-black
   *   Offres      ko-cream
   *   CTA final   ko-white
   *   (Footer)    ko-black
   */
  return (
    <>
      <Hero />
      <StatsBar />
      <Besoins />
      <Capacites />
      <Lab />
      <PreuveTerrain />
      <Realisations />
      <Ecosysteme />
      <Offres />
      <CtaFinal />
    </>
  )
}
