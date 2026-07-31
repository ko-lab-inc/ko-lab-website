import { hasLocale } from 'next-intl'
import { getFormatter, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { EnteteAdmin, PanneauAdmin } from '@/components/layout/CadreAdmin'
import { TableauCandidatures } from '@/components/sections/TableauCandidatures'
import { routing } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import { STATUTS_DEMANDE } from '@/types'

type Props = { params: Promise<{ locale: string }> }

/**
 * Candidatures reçues — table candidatures, migration 0017.
 *
 * Tout passe par le client de SESSION, donc par le RLS. C'est l'écran le plus
 * sensible de l'espace équipe après les demandes : chaque ligne porte le nom,
 * le téléphone, l'adresse courriel et le CV d'une personne réelle. Aucune
 * lecture par service role key, jamais.
 */
export default async function CandidaturesPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations('Admin')
  const format = await getFormatter({ locale })
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: candidatures, error }, { data: moi }] = await Promise.all([
    supabase
      .from('candidatures')
      .select(
        'id, nom, telephone, email, ville, postes, disponibilites, travail_exterieur, a_experience, experience_texte, cv_chemin, source, statut, created_at',
      )
      .order('created_at', { ascending: false }),
    supabase.from('profils').select('role').eq('id', user?.id ?? '').maybeSingle(),
  ])

  const estAdmin = moi?.role === 'admin'

  const libellesStatuts: Record<string, string> = Object.fromEntries(
    STATUTS_DEMANDE.map((v) => [v, t(`statut_${v}`)]),
  )

  if (error) {
    // Même distinction que /admin/videos : une migration en attente n'est pas
    // une panne, et le message doit dire quoi faire.
    const migrationManquante = error.code === 'PGRST205'

    return (
      <>
        <EnteteAdmin titre={t('candidatures_titre')} />
        <PanneauAdmin>
          <p className="text-base leading-relaxed text-ko-ink">
            {migrationManquante ? t('erreur_migration_candidatures') : t('erreur_lecture_candidatures')}
          </p>
        </PanneauAdmin>
      </>
    )
  }

  // Date formatée ICI : une fonction ne traverse pas la frontière RSC.
  const donnees = (candidatures ?? []).map((c) => ({
    ...c,
    dateFormatee: format.dateTime(new Date(c.created_at), {
      dateStyle: 'medium',
      timeStyle: 'short',
    }),
  }))

  return (
    <>
      <EnteteAdmin titre={t('candidatures_titre')} intro={t('candidatures_intro')} />

      <TableauCandidatures
        locale={locale}
        candidatures={donnees}
        estAdmin={estAdmin}
        libelles={{ statuts: libellesStatuts }}
        textes={{
          vide: t('candidatures_vide'),
          videFiltre: t('candidatures_vide_filtre'),
          rechercheLabel: t('candidatures_recherche_label'),
          recherchePlaceholder: t('candidatures_recherche_placeholder'),
          tousStatuts: t('demandes_tous_statuts'),
          colonneNom: t('colonne_nom'),
          colonneCourriel: t('colonne_courriel'),
          colonneTelephone: t('colonne_telephone'),
          colonneVille: t('colonne_ville'),
          colonneStatut: t('colonne_statut'),
          colonnePostes: t('colonne_postes'),
          colonneDisponibilites: t('colonne_disponibilites'),
          colonneExperience: t('colonne_experience'),
          colonneSource: t('colonne_source'),
          travailExterieur: t('colonne_travail_exterieur'),
          oui: t('oui'),
          non: t('non'),
          cv: t('colonne_cv'),
          cvAucun: t('cv_aucun'),
          telecharger: t('cv_telecharger'),
          voir: t('action_voir'),
          supprimer: t('supprimer'),
          confirmer: t('confirmer_suppression_candidature'),
          fermer: t('fermer'),
          titreDetail: t('candidatures_titre_detail'),
          pageGabarit: t('page_gabarit'),
          pagePrecedente: t('page_precedente'),
          pageSuivante: t('page_suivante'),
        }}
      />
    </>
  )
}
