import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { PageCapacite } from '@/components/sections/PageCapacite'
import { routing } from '@/i18n/routing'
import { lireGaleriePage } from '@/lib/galeries'
import { IMAGES } from '@/lib/images'
import { alternatesLangues, ROUTES } from '@/lib/routes'

import type { Metadata, Viewport } from 'next'

/**
 * THÈME SOMBRE — migration page par page (méthode de 73255f2, accueil).
 * Importé ICI et non dans le layout : App Router ne charge le CSS d'une page
 * que sur sa route, et ses règles sont toutes préfixées par
 * `body:has([data-theme-sombre])`, le marqueur rendu plus bas.
 */
import '@/styles/theme-sombre.css'

type Props = { params: Promise<{ locale: string }> }

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations({ locale, namespace: 'Metadata.equipements' })

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}${ROUTES.equipements}`,
      languages: alternatesLangues(ROUTES.equipements),
    },
  }
}

/** Barre du navigateur mobile assortie au fond sombre — voir theme-sombre.css. */
export const viewport: Viewport = {
  themeColor: '#111210',
}

export default async function EquipementsPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations('Capacites.equipements')
  const images = await lireGaleriePage('equipements', locale)

  return (
    <div data-theme-sombre>
      <PageCapacite
        // « 03 » depuis le lot 5 (17 septembre 2026) : ordre du hub depuis le
        // lot 4 (Le LAB, Installations, Équipements, Opérations).
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
          // item_9 ajouté au lot 5 (Joe, §12) : équipements terrain et de
          // sécurité. GM Locations (item_8) reste en dernier — partenaire
          // externe, hors de l'inventaire propre.
          t('item_9'),
          t('item_8'),
        ]}
        src={IMAGES.besoinLouer}
        cadrage="object-center"
        // Galerie branchée sur galeries_photos depuis l'étape 3/3 (migration 0043).
        images={images}
      />
    </div>
  )
}
