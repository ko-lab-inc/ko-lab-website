import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { Besoins } from '@/components/sections/Besoins'
import { Boutique } from '@/components/sections/Boutique'
import { CredibiliteTerrain } from '@/components/sections/CredibiliteTerrain'
import { CtaFinal } from '@/components/sections/CtaFinal'
import { Ecosysteme } from '@/components/sections/Ecosysteme'
import { EquipementsDeploiement } from '@/components/sections/EquipementsDeploiement'
import { GmLocations } from '@/components/sections/GmLocations'
import { Hero } from '@/components/sections/Hero'
import { Installations } from '@/components/sections/Installations'
import { Lab } from '@/components/sections/Lab'
import { Location } from '@/components/sections/Location'
import { OperationsTerrain } from '@/components/sections/OperationsTerrain'
import { Realisations } from '@/components/sections/Realisations'
import { IntroAnimee } from '@/components/ui/IntroAnimee'
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
    },
    openGraph: {
      type: 'website',
      siteName: 'KO-LAB Inc.',
      locale: 'fr_CA',
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
   * Ordre du document de cadrage Phase 5 (13 sections), remplace l'ancien
   * ordre du skill 19 — StatsBar et PreuveTerrain fusionnées en
   * CredibiliteTerrain, Capacites dissoute dans Operations/Installations/
   * Equipements (+ un lien de sortie vers le hub, posé en fin de la section
   * 7), Offres séparée en Location/Boutique :
   *   1  Hero                    photo sombre, encartée sur fond clair
   *   2  Besoins                 ko-white
   *   3  CredibiliteTerrain      photo + voile sombre
   *   4  OperationsTerrain       photo + voile sombre
   *   5  Installations           ko-white (pas de photo — voir le fichier)
   *   6  Lab                     ko-black
   *   7  EquipementsDeploiement  ko-black
   *   8  GmLocations             ko-cream
   *   9  Réalisations            ko-white
   *   10 Écosystème              ko-black
   *   11 Location                ko-cream
   *   12 Boutique                ko-cream
   *   13 CTA final               ko-white
   *   (Footer)                   ko-black
   */
  return (
    <>
      {/* Overlay client, position: fixed — ne retarde ni ne remplace rien
          en dessous (voir IntroAnimee.tsx). Uniquement l'accueil : c'est le
          titre du hero, spécifique à cette page, qui clôt la séquence. */}
      <IntroAnimee />
      <Hero />
      <Besoins />
      <CredibiliteTerrain />
      <OperationsTerrain />
      <Installations />
      <Lab />
      <EquipementsDeploiement />
      <GmLocations />
      <Realisations />
      <Ecosysteme />
      <Location />
      <Boutique />
      <CtaFinal />
    </>
  )
}
