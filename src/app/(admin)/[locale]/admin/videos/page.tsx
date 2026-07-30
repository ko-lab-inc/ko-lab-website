import { hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { EnteteAdmin, PanneauAdmin } from '@/components/layout/CadreAdmin'
import type { LibellesVideo } from '@/components/sections/FormulaireVideo'
import { TableauVideos } from '@/components/sections/TableauVideos'
import { routing } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import { vignetteVideo } from '@/lib/utils/youtube'

type Props = { params: Promise<{ locale: string }> }

/**
 * Gestion des vidéos — table videos (migration 0016).
 *
 * Alimente la bande de la page Le LAB. Même architecture que les trois
 * autres écrans de gestion : RLS fait foi, Server Actions inline pour la
 * publication, le déplacement et la suppression.
 */
export default async function VideosAdminPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations('Admin')
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: videos, error }, { data: moi }] = await Promise.all([
    supabase.from('videos').select('id, titre, url, vignette, actif').order('ordre'),
    supabase.from('profils').select('role').eq('id', user?.id ?? '').maybeSingle(),
  ])

  const estAdmin = moi?.role === 'admin'

  const libelles: LibellesVideo = {
    titre: t('champ_titre_video'),
    url: t('champ_url_video'),
    urlAide: t('champ_url_video_aide'),
    vignette: t('champ_vignette_video'),
    vignetteAide: t('champ_vignette_video_aide'),
    enregistrer: t('enregistrer'),
    creer: t('nouvelle_video'),
    enCours: t('en_cours'),
    succes: t('video_enregistree'),
    erreurDonnees: t('erreur_donnees_video'),
    erreurLien: t('erreur_lien_video'),
    erreurRefuse: t('erreur_refuse_video'),
    erreurServeur: t('erreur_serveur_video'),
  }

  if (error) {
    return (
      <>
        <EnteteAdmin titre={t('videos_titre')} />
        <PanneauAdmin>
          <p className="text-base text-ko-ink">{t('erreur_lecture_videos')}</p>
        </PanneauAdmin>
      </>
    )
  }

  // Vignette résolue ICI, côté serveur : `vignetteVideo` est une fonction, et
  // une fonction ne traverse pas la frontière RSC (voir TableauRealisations).
  const donnees = (videos ?? []).map((v) => ({
    ...v,
    vignetteResolue: vignetteVideo(v.url, v.vignette),
  }))

  return (
    <>
      <EnteteAdmin titre={t('videos_titre')} intro={t('videos_admin_intro')} />

      <TableauVideos
        locale={locale}
        videos={donnees}
        estAdmin={estAdmin}
        libelles={libelles}
        textes={{
          vide: t('videos_vide'),
          enLigne: t('statut_publie'),
          horsLigne: t('statut_hors_ligne'),
          publier: t('publier'),
          retirer: t('retirer_vitrine'),
          modifier: t('action_modifier'),
          supprimer: t('supprimer'),
          confirmer: t('confirmer_suppression_video'),
          ajouter: t('nouvelle_video'),
          fermer: t('fermer'),
          titreEdition: t('titre_edition_video'),
          titreCreation: t('nouvelle_video'),
          monter: t('action_monter'),
          descendre: t('action_descendre'),
          apercu: t('action_ouvrir_video'),
        }}
      />
    </>
  )
}
