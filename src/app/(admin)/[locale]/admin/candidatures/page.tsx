import { hasLocale } from 'next-intl'
import { getFormatter, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { EnteteAdmin, PanneauAdmin } from '@/components/layout/CadreAdmin'
import { TableauCandidatures } from '@/components/sections/TableauCandidatures'
import { routing } from '@/i18n/routing'
import { POSTE_LIVREUR } from '@/lib/constantes'
import { createClient } from '@/lib/supabase/server'
import { STATUTS_CANDIDATURE } from '@/types'

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

  const [{ data: candidatures, error }, { data: moi }, { data: posteLivreur }] = await Promise.all([
    supabase
      .from('candidatures')
      .select(
        'id, nom, telephone, email, ville, postes, disponibilites, travail_exterieur, a_experience, experience_texte, cv_chemin, source, statut, created_at, poste_id, compte_id, invitation_envoyee_le',
      )
      .order('created_at', { ascending: false }),
    supabase.from('profils').select('role').eq('id', user?.id ?? '').maybeSingle(),
    // Sert à l'invitation depuis une candidature retenue (voir TableauCandidatures) :
    // poste_id, jamais le titre, décide de l'éligibilité — ce titre ne sert
    // qu'à retrouver l'id UNE fois ici, voir POSTE_LIVREUR (lib/constantes.ts).
    supabase.from('postes_carrieres').select('id').eq('titre_fr', POSTE_LIVREUR).maybeSingle(),
  ])

  const estAdmin = moi?.role === 'admin'

  const libellesStatuts: Record<string, string> = Object.fromEntries(
    STATUTS_CANDIDATURE.map((v) => [v, t(`statut_${v}`)]),
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
    // Résolu ici, pas dans le composant client : `t()` avec interpolation
    // n'est disponible que côté serveur sur cet écran (pas de
    // NextIntlClientProvider dans l'admin — voir NavAdmin.tsx).
    invitationEnvoyeeLeFormatee: c.invitation_envoyee_le
      ? t('candidature_invitee_le', {
          date: format.dateTime(new Date(c.invitation_envoyee_le), { dateStyle: 'medium', timeStyle: 'short' }),
        })
      : null,
  }))

  return (
    <>
      <EnteteAdmin titre={t('candidatures_titre')} intro={t('candidatures_intro')} />

      <TableauCandidatures
        locale={locale}
        candidatures={donnees}
        estAdmin={estAdmin}
        posteLivreurId={posteLivreur?.id ?? null}
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
          invitationTitre: t('candidature_invitation_titre'),
          voirCompte: t('candidature_voir_compte'),
          invitation: {
            inviter: t('candidature_inviter_livreur'),
            confirmer: t('candidature_confirmer_invitation_livreur'),
            incertain: t('candidature_rattachement_incertain'),
            enCours: t('en_cours'),
            fermer: t('fermer'),
            succesTitre: t('invitation_envoyee_titre'),
            succesTexte: t('invitation_envoyee_texte'),
            courrielEchecTitre: t('invitation_courriel_echec_titre'),
            courrielEchecTexte: t('invitation_courriel_echec_texte'),
            lienLabel: t('invitation_lien_label'),
            lienAide: t('invitation_lien_aide'),
            lienCopier: t('invitation_lien_copier'),
            lienCopie: t('invitation_lien_copie'),
            erreurRefuse: t('reserve_admin_texte'),
            erreurExisteDeja: t('erreur_invitation_existe_deja'),
            erreurIntrouvable: t('erreur_invitation_introuvable'),
            erreurPasEligible: t('erreur_invitation_pas_eligible'),
            erreurTropDeTentatives: t('erreur_invitation_tentatives'),
            erreurServeur: t('erreur_invitation_serveur'),
          },
        }}
      />
    </>
  )
}
