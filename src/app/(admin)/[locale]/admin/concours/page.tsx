import { hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { EnteteAdmin, PanneauAdmin } from '@/components/layout/CadreAdmin'
import type { LibellesConcours } from '@/components/sections/FormulaireConcours'
import { TableauConcours } from '@/components/sections/TableauConcours'
import { routing } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'

type Props = { params: Promise<{ locale: string }> }

/**
 * Gestion des concours — tables concours / concours_photos / concours_liens
 * (migration 0040).
 *
 * Même architecture que /admin/realisations : RLS fait foi (0040), Server
 * Actions inline pour la publication et la suppression, composant client
 * pour l'édition (formulaire + gestion des photos et des liens).
 */
export default async function ConcoursAdminPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations('Admin')
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: concours, error }, { data: photos }, { data: liens }, { data: moi }] = await Promise.all([
    supabase
      .from('concours')
      .select(
        'id, slug, titre_fr, titre_en, accroche_fr, accroche_en, description_fr, description_en, reglement_fr, reglement_en, date_debut, date_fin, publie, ordre',
      )
      .order('ordre'),
    supabase
      .from('concours_photos')
      .select('id, concours_id, url_stockage, alt_fr, alt_en, ordre')
      .order('ordre'),
    supabase
      .from('concours_liens')
      .select('id, concours_id, libelle_fr, libelle_en, url, ordre')
      .order('ordre'),
    supabase.from('profils').select('role').eq('id', user?.id ?? '').maybeSingle(),
  ])

  const estAdmin = moi?.role === 'admin'

  const libelles: LibellesConcours = {
    slug: t('champ_slug'),
    titreFr: t('champ_titre_fr'),
    titreEn: t('champ_titre_en'),
    accrocheFr: t('champ_accroche_fr'),
    accrocheEn: t('champ_accroche_en'),
    descriptionFr: t('champ_description_fr'),
    descriptionEn: t('champ_description_en'),
    reglementFr: t('champ_reglement_fr'),
    reglementEn: t('champ_reglement_en'),
    dateDebut: t('champ_date_debut'),
    dateFin: t('champ_date_fin'),
    publie: t('champ_publie'),
    sectionFr: t('section_langue_fr'),
    sectionEn: t('section_langue_en'),
    enregistrer: t('enregistrer'),
    creer: t('nouveau_concours'),
    enCours: t('en_cours'),
    succes: t('concours_enregistre'),
    erreurDonnees: t('erreur_donnees_concours'),
    erreurSlug: t('erreur_slug_concours'),
    erreurRefuse: t('erreur_refuse_concours'),
    erreurServeur: t('erreur_serveur_concours'),
    photos: {
      titre: t('champ_photos_concours_titre'),
      vide: t('champ_photos_concours_vide'),
      nouvelle: t('champ_photo_nouvelle'),
      nouvelleAide: t('champ_photo_nouvelle_aide'),
      televerser: t('champ_photo_televerser'),
      altFr: t('champ_image_alt'),
      altEn: t('champ_image_alt'),
      monter: t('action_monter_image'),
      descendre: t('action_descendre_image'),
      retirer: t('action_retirer_image'),
      erreurFichier: t('erreur_photo_concours'),
      enCours: t('en_cours'),
      manqueFichier: t('ajout_photo_manque_fichier'),
      manqueAltFr: t('ajout_photo_manque_alt_fr'),
      manqueFichierEtAlt: t('ajout_photo_manque_fichier_et_alt'),
    },
    liens: {
      titre: t('champ_liens_concours_titre'),
      vide: t('champ_liens_concours_vide'),
      libelleFr: t('champ_lien_libelle'),
      libelleEn: t('champ_lien_libelle_en'),
      url: t('champ_lien_url'),
      urlAide: t('champ_lien_url_aide'),
      ajouter: t('action_ajouter_lien'),
      monter: t('action_monter_lien'),
      descendre: t('action_descendre_lien'),
      retirer: t('action_retirer_lien'),
      erreurUrl: t('erreur_lien_concours'),
      enCours: t('en_cours'),
    },
  }

  if (error) {
    return (
      <>
        <EnteteAdmin titre={t('concours_titre')} />
        <PanneauAdmin>
          <p className="text-base text-ko-ink">{t('erreur_lecture_concours')}</p>
        </PanneauAdmin>
      </>
    )
  }

  // Première photo par concours (déjà triées par `ordre` par la requête
  // ci-dessus) — calculé ici, pas dans le composant client : un simple
  // regroupement, mais qui n'a pas sa place à traverser la frontière RSC pour
  // chaque ligne du tableau.
  const premierePhotoParConcours = new Map<string, string>()
  for (const photo of photos ?? []) {
    if (!premierePhotoParConcours.has(photo.concours_id)) {
      premierePhotoParConcours.set(photo.concours_id, photo.url_stockage)
    }
  }

  const donnees = (concours ?? []).map((c) => ({
    ...c,
    apercu: premierePhotoParConcours.get(c.id) ?? null,
    photos: (photos ?? []).filter((p) => p.concours_id === c.id),
    liens: (liens ?? []).filter((l) => l.concours_id === c.id),
  }))

  return (
    <>
      <EnteteAdmin titre={t('concours_titre')} intro={t('concours_admin_intro')} />

      <TableauConcours
        locale={locale}
        concours={donnees}
        estAdmin={estAdmin}
        libelles={libelles}
        textes={{
          vide: t('concours_vide'),
          publie: t('statut_publie'),
          horsLigne: t('statut_hors_ligne'),
          publier: t('publier'),
          retirer: t('retirer_vitrine'),
          voir: t('action_voir'),
          modifier: t('action_modifier'),
          supprimer: t('supprimer'),
          confirmer: t('confirmer_suppression_concours'),
          ajouter: t('nouveau_concours'),
          fermer: t('fermer'),
          titreEdition: t('titre_edition_concours'),
          titreCreation: t('titre_creation_concours'),
          titreDetail: t('titre_detail_concours'),
          sansImage: t('sans_image'),
          badgeTraductionAide: t.raw('badge_traduction_concours_aide'),
        }}
      />
    </>
  )
}
