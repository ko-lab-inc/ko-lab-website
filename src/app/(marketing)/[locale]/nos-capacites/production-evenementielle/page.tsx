import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { PageCapacite } from '@/components/sections/PageCapacite'
import { routing } from '@/i18n/routing'
import { obtenirEmplacement } from '@/lib/medias-emplacements'
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

  const t = await getTranslations({ locale, namespace: 'Metadata.production' })

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}${ROUTES.production}`,
      languages: alternatesLangues(ROUTES.production),
    },
  }
}

/** Barre du navigateur mobile assortie au fond sombre — voir theme-sombre.css. */
export const viewport: Viewport = {
  themeColor: '#111210',
}

/**
 * Production événementielle — capacité AJOUTÉE par la révision du
 * 20 septembre 2026 (§11).
 *
 * Ce que cette page doit dire, et surtout ne pas dire : « l'objectif n'est
 * pas de repositionner KO-LAB comme agence événementielle, mais de montrer
 * que l'équipe peut concevoir et produire des événements corporatifs et
 * spéciaux lorsque le mandat le demande ». Le titre pose donc la condition,
 * et les huit points restent des moyens — aucun client, aucun chiffre,
 * aucun rôle inventé.
 *
 * Photo : emplacement `production_evenementielle`, vide tant qu'une photo
 * n'a pas été choisie dans /admin/medias-emplacements. `src={null}` fait
 * rendre PhotoPlaceholder à PageCapacite, dans la même boîte. Le §11 prévoit
 * d'utiliser plus tard des expériences passées comme preuves visuelles —
 * mais le §15 interdit de les présenter comme des réalisations KO-LAB : ce
 * tri se fera au lot 6, avec les albums.
 */
export default async function ProductionEvenementiellePage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations('Capacites.production')
  // Voir la note de ProductionEvenementielle.tsx : resoudreEmplacement
  // renverrait une image de repli inexistante tant qu'aucune ligne n'existe.
  const ligne = await obtenirEmplacement('production_evenementielle')

  return (
    <div data-theme-sombre>
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
        src={ligne?.url ?? null}
        // Le texte alternatif vit sur la ligne d'emplacement, comme l'URL :
        // sans lui, le hero servait `alt=""` (constaté en production le
        // 21 septembre 2026, première photo posée dans l'admin).
        altPhoto={ligne ? ((locale === 'en' ? ligne.alt_en : null) ?? ligne.alt_fr) : undefined}
        cadrage="object-center"
      />
    </div>
  )
}
