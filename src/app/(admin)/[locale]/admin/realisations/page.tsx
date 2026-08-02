import { hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { EnteteAdmin, PanneauAdmin } from '@/components/layout/CadreAdmin'
import type { LibellesRealisation } from '@/components/sections/FormulaireRealisation'
import { TableauRealisations } from '@/components/sections/TableauRealisations'
import { routing } from '@/i18n/routing'
import { validerImages } from '@/lib/realisations'
import { createClient } from '@/lib/supabase/server'

type Props = { params: Promise<{ locale: string }> }

/**
 * Gestion des réalisations — lecture, création, édition, publication,
 * suppression, et la série de photos qui alimente la visionneuse publique.
 *
 * Même architecture que /admin/catalogue — voir ce fichier pour le détail des
 * choix (RLS fait foi, publication et suppression en Server Actions inline,
 * édition en composant client pour renvoyer les erreurs de validation).
 */
export default async function RealisationsAdminPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations('Admin')
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: realisations, error }, { data: moi }] = await Promise.all([
    supabase
      .from('realisations')
      .select('id, slug, titre_fr, description_fr, categorie, images, ordre, publie')
      .order('ordre'),
    supabase.from('profils').select('role').eq('id', user?.id ?? '').maybeSingle(),
  ])

  const estAdmin = moi?.role === 'admin'

  const libelles: LibellesRealisation = {
    slug: t('champ_slug'),
    titreFr: t('champ_titre_fr'),
    descriptionFr: t('champ_description_fr'),
    categorie: t('colonne_categorie'),
    categories: {
      terrain: t('rcat_terrain'),
      installation: t('rcat_installation'),
      lab: t('rcat_lab'),
      equipement: t('rcat_equipement'),
    },
    ordre: t('champ_ordre'),
    photos: t('champ_photos_realisation'),
    photosAide: t('champ_photos_realisation_aide'),
    imagesTitre: t('champ_images_titre'),
    imagesVide: t('champ_images_vide'),
    imageAlt: t('champ_image_alt'),
    imageMonter: t('action_monter_image'),
    imageDescendre: t('action_descendre_image'),
    imageRetirer: t('action_retirer_image'),
    enregistrer: t('enregistrer'),
    creer: t('nouvelle_realisation'),
    enCours: t('en_cours'),
    succes: t('realisation_enregistree'),
    erreurDonnees: t('erreur_donnees_realisation'),
    erreurPhoto: t('erreur_photo'),
    erreurRefuse: t('erreur_refuse_realisation'),
    erreurServeur: t('erreur_serveur_realisation'),
  }

  if (error) {
    return (
      <>
        <EnteteAdmin titre={t('realisations_titre')} />
        <PanneauAdmin>
          <p className="text-base text-ko-ink">{t('erreur_lecture_realisations')}</p>
        </PanneauAdmin>
      </>
    )
  }

  // `images` arrive en jsonb non typé : validé ici pour la même raison que
  // dans lib/realisations.ts — un UPDATE fait à la main dans l'éditeur SQL
  // pourrait y avoir laissé n'importe quoi.
  //
  // `imagesCompteTexte` est calculé ICI, pas dans le composant client : une
  // fonction (le pluriel ICU a besoin de `t`, qui ne vit que côté serveur) ne
  // traverse pas la frontière RSC. Voir TableauRealisations.tsx pour le détail
  // du plantage que ça causait.
  const donnees = (realisations ?? []).map((r) => {
    const images = validerImages(r.images)
    return { ...r, images, imagesCompteTexte: t('images_compte', { n: images.length }) }
  })

  return (
    <>
      <EnteteAdmin titre={t('realisations_titre')} intro={t('realisations_admin_intro')} />

      <TableauRealisations
        locale={locale}
        realisations={donnees}
        estAdmin={estAdmin}
        libelles={libelles}
        textes={{
          vide: t('realisations_vide'),
          publie: t('statut_publie'),
          horsLigne: t('statut_hors_ligne'),
          publier: t('publier'),
          retirer: t('retirer_vitrine'),
          voir: t('action_voir'),
          modifier: t('action_modifier'),
          supprimer: t('supprimer'),
          confirmer: t('confirmer_suppression_realisation'),
          ajouter: t('nouvelle_realisation'),
          fermer: t('fermer'),
          titreEdition: t('titre_edition_realisation'),
          titreCreation: t('nouvelle_realisation'),
          titreDetail: t('titre_detail_realisation'),
          sansImage: t('sans_image'),
        }}
      />
    </>
  )
}
