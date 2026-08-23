import { hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { EnteteAdmin, PanneauAdmin } from '@/components/layout/CadreAdmin'
import { TableauEmplacements } from '@/components/sections/TableauEmplacements'
import { routing } from '@/i18n/routing'
import { listerFichiersDisponibles } from '@/lib/medias-disponibles'
import { createClient } from '@/lib/supabase/server'

type Props = { params: Promise<{ locale: string }> }

/**
 * Gestion des emplacements médias fixes — table medias_emplacements
 * (migration 0031, route A de l'architecture média).
 *
 * Pas de création ni de suppression : les clés sont posées par migration,
 * cet écran ne fait que REMPLACER la photo (choisie dans une grille, plus de
 * saisie d'URL — refonte du 22 août 2026) et l'alt text d'un emplacement. Si
 * une photo invalide finissait quand même enregistrée, le site public
 * retombe sur src/lib/images.ts via src/lib/medias-repli.ts — jamais de
 * blanc.
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

  const [{ data: emplacements, error }, { data: moi }, fichiersDisponibles] = await Promise.all([
    supabase
      .from('medias_emplacements')
      .select('cle, url_stockage, alt_text_fr, alt_text_en')
      .order('cle'),
    supabase.from('profils').select('role').eq('id', user?.id ?? '').maybeSingle(),
    listerFichiersDisponibles(supabase),
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
      <EnteteAdmin
        titre={t('medias_emplacements_titre')}
        // Compté depuis la ligne réelle, pas un nombre écrit en dur — c'est
        // exactement ce qui a rendu « Neuf emplacements fixes » faux dès la
        // dixième ligne ajoutée (migration 0033).
        intro={t('medias_emplacements_intro', { n: emplacements?.length ?? 0 })}
      />

      <TableauEmplacements
        emplacements={emplacements ?? []}
        estAdmin={estAdmin}
        fichiersDisponibles={fichiersDisponibles}
        textes={{
          colonneCle: t('colonne_cle'),
          colonneApercu: t('colonne_apercu'),
          voirApercu: t('voir_apercu'),
          colonneAltFr: t('colonne_alt_fr'),
          colonneAltEn: t('colonne_alt_en'),
          altEnVide: t('emplacement_alt_en_vide'),
          modifier: t('action_modifier'),
          titreModal: t('titre_modifier_emplacement'),
          champChoix: t('champ_choix_photo_emplacement'),
          enregistrer: t('enregistrer'),
          enCours: t('en_cours'),
          fermer: t('fermer'),
          erreurServeur: t('erreur_serveur_emplacement'),
        }}
      />
    </>
  )
}
