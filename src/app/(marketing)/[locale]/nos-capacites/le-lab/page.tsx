import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { GalerieLab } from '@/components/sections/GalerieLab'
import { PageCapacite } from '@/components/sections/PageCapacite'
import { routing } from '@/i18n/routing'
import { lireGaleriePage } from '@/lib/galeries'
import { alternatesLangues, ROUTES } from '@/lib/routes'
import { lireVideosPubliees } from '@/lib/videos'

import type { Metadata } from 'next'

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

export default async function LeLabPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations('Capacites.lab')
  const [videos, photosLab] = await Promise.all([lireVideosPubliees(), lireGaleriePage('le-lab', locale)])

  // Le hero reprend la PREMIÈRE photo de la galerie plutôt qu'un emplacement
  // fixe séparé — duplication assumée (hero + première vignette), même
  // principe que lab_1 avant l'étape 3/3 (voir migration 0043 : la même
  // photo `lab-machine-2026.webp` vit désormais uniquement dans
  // `galeries_photos`, plus dans `medias_emplacements`).
  const photoHero = photosLab[0] ?? null

  return (
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
      // Imprimante 3D en cours d'impression — item « Impression 3D ».
      // La découpe laser sert la section LAB de l'accueil : deux visuels
      // distincts plutôt que la même image deux fois dans le parcours.
      src={photoHero?.src ?? null}
      cadrage="object-center"
      // Bande de vidéos façon bambulab.com, alimentée depuis /admin/videos
      // (migration 0016). Tableau vide = quatre emplacements « Vidéo à
      // venir », jamais une section masquée — voir BandeauVideos.tsx.
      videos={videos}
      contenuSupplementaire={
        <GalerieLab photos={photosLab.map((p) => ({ url: p.src, alt: p.alt }))} />
      }
    />
  )
}
