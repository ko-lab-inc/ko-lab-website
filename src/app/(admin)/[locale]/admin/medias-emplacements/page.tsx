import { hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { EnteteAdmin, PanneauAdmin } from '@/components/layout/CadreAdmin'
import { TableauEmplacements } from '@/components/sections/TableauEmplacements'
import { routing } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'

type Props = { params: Promise<{ locale: string }> }

/**
 * Gestion des neuf emplacements médias fixes — table medias_emplacements
 * (migration 0031, route A de l'architecture média).
 *
 * Pas de création ni de suppression : les neuf clés sont posées une fois par
 * la migration, cet écran ne fait que REMPLACER l'URL et l'alt text d'un
 * emplacement. Si une URL invalide finissait quand même enregistrée, le site
 * public retombe sur src/lib/images.ts via src/lib/medias-repli.ts — jamais
 * de blanc.
 *
 * ⚠️ Accès à la PAGE : pas d'exigerRole() ici — ce garde-fou sert les Server
 * Actions, qui s'invoquent hors du chemin protégé par proxy.ts + le layout
 * admin (voir lib/auth/garde.ts). Cette page, elle, EST rendue sous ce
 * chemin : la garde déjà en place (ROLES_EQUIPE = admin + editor) suffit à
 * la protéger, comme toutes les autres pages de /admin. Seul le bouton
 * Modifier est réservé à l'admin ci-dessous — confort d'affichage, même
 * patron que le bouton Supprimer de /admin/carrieres. La vraie garantie
 * d'écriture est la politique medias_maj_admin (0031) + exigerRole(['admin'])
 * dans actions.ts.
 */
export default async function MediasEmplacementsAdminPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations('Admin')
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: emplacements, error }, { data: moi }] = await Promise.all([
    supabase
      .from('medias_emplacements')
      .select('cle, url_stockage, alt_text_fr, alt_text_en')
      .order('cle'),
    supabase.from('profils').select('role').eq('id', user?.id ?? '').maybeSingle(),
  ])

  const estAdmin = moi?.role === 'admin'

  if (error) {
    return (
      <>
        <EnteteAdmin titre={t('medias_emplacements_titre')} />
        <PanneauAdmin>
          <p className="text-base text-ko-ink">{t('erreur_serveur_emplacement')}</p>
        </PanneauAdmin>
      </>
    )
  }

  return (
    <>
      <EnteteAdmin titre={t('medias_emplacements_titre')} intro={t('medias_emplacements_intro')} />

      <TableauEmplacements
        emplacements={emplacements ?? []}
        estAdmin={estAdmin}
        textes={{
          colonneCle: t('colonne_cle'),
          colonneUrl: t('colonne_url_actuelle'),
          colonneAltFr: t('colonne_alt_fr'),
          colonneAltEn: t('colonne_alt_en'),
          champUrl: t('champ_url_emplacement'),
          altEnVide: t('emplacement_alt_en_vide'),
          modifier: t('action_modifier'),
          enregistrer: t('enregistrer'),
          enCours: t('en_cours'),
          fermer: t('fermer'),
        }}
      />
    </>
  )
}
