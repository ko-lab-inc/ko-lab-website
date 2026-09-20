import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { GalerieLab } from '@/components/sections/GalerieLab'
import { PageCapacite } from '@/components/sections/PageCapacite'
import { ProcessusLab } from '@/components/sections/ProcessusLab'
import { routing } from '@/i18n/routing'
import { lireGaleriePage } from '@/lib/galeries'
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

  const t = await getTranslations({ locale, namespace: 'Metadata.lab' })

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}${ROUTES.lab}`,
      languages: alternatesLangues(ROUTES.lab),
    },
  }
}

/** Barre du navigateur mobile assortie au fond sombre — voir theme-sombre.css. */
export const viewport: Viewport = {
  themeColor: '#111210',
}

export default async function LeLabPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations('Capacites.lab')
  const photosLab = await lireGaleriePage('le-lab', locale)

  // Le hero reprend la PREMIÈRE photo de la galerie plutôt qu'un emplacement
  // fixe séparé — duplication assumée (hero + première vignette), même
  // principe que lab_1 avant l'étape 3/3 (voir migration 0043 : la même
  // photo `lab-machine-2026.webp` vit désormais uniquement dans
  // `galeries_photos`, plus dans `medias_emplacements`).
  const photoHero = photosLab[0] ?? null

  return (
    <div data-theme-sombre>
      <PageCapacite
        // Sans numéro depuis le 20 septembre 2026 : Le LAB a quitté la série
        // numérotée du hub (§4) pour devenir une entrée de nav à part.
        label={t('label')}
        titre={t('title')}
        phrase={t('phrase')}
        intro={t('intro')}
        // item_9 et item_10 ajoutés au lot 5 (Joe, §9) : électronique et
        // éclairage ; assemblage, contrôle qualité et préparation à la
        // livraison. Ordre de lecture, pas ordre des clés : les capacités
        // d'atelier d'abord, la livraison par KO-LAB en dernier.
        items={[
          t('item_1'),
          t('item_2'),
          t('item_3'),
          t('item_4'),
          t('item_5'),
          t('item_9'),
          t('item_6'),
          t('item_7'),
          t('item_10'),
          t('item_8'),
        ]}
        // Imprimante 3D en cours d'impression — item « Impression 3D ».
        // La découpe laser sert la section LAB de l'accueil : deux visuels
        // distincts plutôt que la même image deux fois dans le parcours.
        src={photoHero?.src ?? null}
        cadrage="object-center"
        // `videos` retirée (LOT E1, §11, 30 août 2026) : masquage, pas
        // suppression — BandeauVideos.tsx, la table `videos` et /admin/videos
        // restent tous intacts, ce composant ne reçoit simplement plus la
        // prop. PageCapacite ne rend la bande QUE si `videos` est passée
        // (voir sa propre docstring) : l'omettre suffit, pas besoin d'un
        // tableau vide.
        contenuSupplementaire={
          <>
            <GalerieLab photos={photosLab.map((p) => ({ url: p.src, alt: p.alt }))} />
            <ProcessusLab />
          </>
        }
      />
    </div>
  )
}
