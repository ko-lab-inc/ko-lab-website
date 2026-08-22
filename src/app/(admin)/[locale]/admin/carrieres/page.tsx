import { hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { EnteteAdmin, PanneauAdmin } from '@/components/layout/CadreAdmin'
import type { LibellesPoste } from '@/components/sections/FormulairePoste'
import { TableauPostes } from '@/components/sections/TableauPostes'
import { routing } from '@/i18n/routing'
import { listerFichiersDisponibles } from '@/lib/medias-disponibles'
import { createClient } from '@/lib/supabase/server'

type Props = { params: Promise<{ locale: string }> }

/**
 * Gestion des offres d'emploi — table postes_carrieres.
 *
 * Même architecture que /admin/catalogue et /admin/realisations — RLS fait
 * foi (0002), Server Actions inline pour la publication et la suppression.
 * La page publique (/carrieres) lit `lib/carrieres.ts` (lireOffresPubliees),
 * invalidée par les actions de ce dossier — voir actions.ts.
 */
export default async function CarrieresAdminPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations('Admin')
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: postes, error }, { data: moi }, fichiersDisponibles] = await Promise.all([
    supabase
      .from('postes_carrieres')
      .select('id, titre_fr, departement, type, description_fr, exigences_fr, actif, photo_url')
      .order('ordre'),
    supabase.from('profils').select('role').eq('id', user?.id ?? '').maybeSingle(),
    listerFichiersDisponibles(supabase),
  ])

  const estAdmin = moi?.role === 'admin'

  // Table explicite plutôt que t(`poste_type_${cle}`) : les clés de messages
  // sont typées, et une clé construite à partir d'un `string` échappe au
  // contrôle (même règle que libellesCategorie ailleurs dans l'admin).
  const libellesTypes: Record<string, string> = {
    'temps-plein': t('poste_type_temps_plein'),
    'temps-partiel': t('poste_type_temps_partiel'),
    contrat: t('poste_type_contrat'),
    saisonnier: t('poste_type_saisonnier'),
    etudiant: t('poste_type_etudiant'),
  }

  const libelles: LibellesPoste = {
    titre: t('champ_titre_poste'),
    departement: t('champ_departement'),
    type: t('champ_type_poste'),
    description: t('champ_description'),
    exigences: t('champ_exigences'),
    exigencesAide: t('champ_exigences_aide'),
    types: libellesTypes,
    enregistrer: t('enregistrer'),
    creer: t('nouveau_poste'),
    enCours: t('en_cours'),
    succes: t('poste_enregistre'),
    erreurDonnees: t('erreur_donnees_poste'),
    erreurRefuse: t('erreur_refuse_poste'),
    erreurServeur: t('erreur_serveur_poste'),
  }

  if (error) {
    return (
      <>
        <EnteteAdmin titre={t('carrieres_titre')} />
        <PanneauAdmin>
          <p className="text-base text-ko-ink">{t('erreur_lecture_postes')}</p>
        </PanneauAdmin>
      </>
    )
  }

  return (
    <>
      <EnteteAdmin titre={t('carrieres_titre')} intro={t('carrieres_admin_intro')} />

      <TableauPostes
        locale={locale}
        postes={postes ?? []}
        estAdmin={estAdmin}
        libelles={libelles}
        fichiersDisponibles={fichiersDisponibles}
        textes={{
          vide: t('carrieres_vide'),
          actif: t('statut_publie'),
          inactif: t('statut_hors_ligne'),
          publier: t('publier'),
          retirer: t('retirer_vitrine'),
          voir: t('action_voir'),
          modifier: t('action_modifier'),
          supprimer: t('supprimer'),
          confirmer: t('confirmer_suppression_poste'),
          ajouter: t('nouveau_poste'),
          fermer: t('fermer'),
          titreEdition: t('titre_edition_poste'),
          titreCreation: t('nouveau_poste'),
          titreDetail: t('titre_detail_poste'),
        }}
        textesPhoto={{
          colonnePhoto: t('colonne_photo_poste'),
          modifierPhoto: t('modifier_photo_poste'),
          titreModal: t('titre_photo_poste'),
          aucunePhoto: t('aucune_photo_poste'),
          champChoix: t('champ_choix_photo_poste'),
          optionAucune: t('option_aucune_photo_poste'),
          enregistrer: t('enregistrer'),
          enCours: t('en_cours'),
          supprimerPhoto: t('supprimer_photo_poste'),
          fermer: t('fermer'),
          erreurServeur: t('erreur_serveur_photo_poste'),
        }}
      />
    </>
  )
}
