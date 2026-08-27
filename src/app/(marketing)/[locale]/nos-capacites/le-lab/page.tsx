import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { GalerieLab } from '@/components/sections/GalerieLab'
import { PageCapacite } from '@/components/sections/PageCapacite'
import { routing } from '@/i18n/routing'
import { resoudreEmplacement } from '@/lib/medias-emplacements'
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
  const videos = await lireVideosPubliees()

  // lab_1 reste le hero (inchangé) — resoudreEmplacement('lab_1') est
  // rappelé séparément ci-dessous pour la galerie, sans coût réel : la
  // fonction est mise en cache par unstable_cache (medias-emplacements.ts),
  // même clé d'appel = même entrée. La galerie affiche maintenant les SEPT
  // emplacements lab_1..lab_7 (migrations 0031 + 0033) — lab_1 y apparaît
  // donc deux fois (hero + première vignette), duplication assumée, même
  // principe que plusieurs clés d'images.ts (ex. locationStructures/
  // besoinLouer). Remplace l'ancienne bande à une seule photo (lab_2 seule,
  // via GaleriePhotos) : la nouvelle grille suit un patron différent, voir
  // GalerieLab.tsx.
  const clesLab = ['lab_1', 'lab_2', 'lab_3', 'lab_4', 'lab_5', 'lab_6', 'lab_7'] as const
  const [photoHero, photosLab] = await Promise.all([
    resoudreEmplacement('lab_1', locale),
    Promise.all(clesLab.map((cle) => resoudreEmplacement(cle, locale))),
  ])

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
      src={photoHero?.url ?? null}
      cadrage="object-center"
      // Bande de vidéos façon bambulab.com, alimentée depuis /admin/videos
      // (migration 0016). Tableau vide = quatre emplacements « Vidéo à
      // venir », jamais une section masquée — voir BandeauVideos.tsx.
      videos={videos}
      contenuSupplementaire={<GalerieLab photos={photosLab} />}
    />
  )
}
