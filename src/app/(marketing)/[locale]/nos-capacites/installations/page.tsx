import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { PageCapacite } from '@/components/sections/PageCapacite'
import { routing } from '@/i18n/routing'
import { lireGaleriePage } from '@/lib/galeries'
import { CADRAGES, IMAGES } from '@/lib/images'
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

/** Barre du navigateur mobile assortie au fond sombre — voir theme-sombre.css. */
export const viewport: Viewport = {
  themeColor: '#111210',
}

export default async function InstallationsPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations('Capacites.installations')
  const tAlt = await getTranslations('Alt')
  const images = await lireGaleriePage('installations', locale)

  return (
    <div data-theme-sombre>
      <PageCapacite
        numero="01"
        label={t('label')}
        titre={t('title')}
        phrase={t('phrase')}
        intro={t('intro')}
        // Sept éléments ici, contre huit pour les trois autres capacités —
        // conforme au document de cadrage.
        // Les onze points du §9 (révision du 20 septembre 2026), dans
        // l'ordre du brief : la catégorie ne se limite plus au décor
        // saisonnier — parcs et espaces publics, signalisation, murales,
        // présentoirs, aménagements commerciaux, location depuis l'inventaire
        // et création sur mesure au LAB en font partie. Le travail de nuit,
        // le transport et le retrait sont passés dans l'intro : ce sont des
        // manières de faire, pas des types de mandats.
        items={[
          t('item_1'),
          t('item_2'),
          t('item_3'),
          t('item_4'),
          t('item_5'),
          t('item_6'),
          t('item_7'),
          t('item_8'),
          t('item_9'),
          t('item_10'),
          t('item_11'),
        ]}
        // Nacelle élévatrice sur façade — « Centres commerciaux et tours à
        // bureaux ». L'échafaudage précédent ne montrait aucune installation.
        src={IMAGES.installationNacelle}
        altPhoto={tAlt('installation_nacelle')}
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
    </div>
  )
}
