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

  // Tuple `as const`, pas Array.from : next-intl type ses clés à partir des
  // littéraux exacts présents dans messages/fr.json. Array.from produit un
  // `number[]` — `n` y est du type `number`, pas `1 | 2 | ... | 9` — et
  // `section${number}_titre` ne correspond à aucune clé connue. Une erreur
  // TypeScript qu'aucun outil local n'attrape : `next dev` ne type-checke
  // pas, seul `next build` le fait (constaté sur l'échec Vercel).
  const NUMEROS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const
  const sections = NUMEROS.map((n) => ({
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
