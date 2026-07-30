import { hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { EnteteAdmin, PanneauAdmin } from '@/components/layout/CadreAdmin'
import type { LibellesProduit } from '@/components/sections/FormulaireProduit'
import { TableauProduits } from '@/components/sections/TableauProduits'
import { routing } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'

type Props = { params: Promise<{ locale: string }> }

/**
 * Gestion du catalogue — lecture, création, édition, publication, suppression.
 *
 * ---------------------------------------------------------------------------
 * TOUT PASSE PAR LE RLS
 *
 * Lecture et écritures utilisent le client de SESSION. Les politiques de 0002
 * décident : admin et editor lisent et écrivent, seul l'admin supprime. Le
 * bouton de suppression n'est affiché qu'à l'admin — mais c'est du confort
 * d'affichage, la garantie est dans la politique, pas dans ce fichier.
 *
 * Publication et suppression sont des Server Actions EN LIGNE, sans état
 * client : un <form> suffit et fonctionne sans JavaScript. L'édition, elle, a
 * besoin de renvoyer une erreur de validation, donc d'un composant client.
 * ---------------------------------------------------------------------------
 */
export default async function CataloguePage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations('Admin')
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: produits, error }, { data: moi }] = await Promise.all([
    supabase
      .from('produits_boutique')
      .select(
        'id, slug, marque, categorie, nom_fr, nom_en, description_fr, description_en, prix, cadrage, ordre, publie, images',
      )
      .order('ordre'),
    supabase.from('profils').select('role').eq('id', user?.id ?? '').maybeSingle(),
  ])

  const estAdmin = moi?.role === 'admin'

  const libelles: LibellesProduit = {
    slug: t('champ_slug'),
    marque: t('champ_marque'),
    categorie: t('colonne_categorie'),
    langue: t('champ_langue'),
    langueFr: t('champ_langue_fr'),
    langueEn: t('champ_langue_en'),
    nom: t('champ_nom'),
    description: t('champ_description'),
    prix: t('colonne_prix'),
    quantite: t('champ_quantite'),
    statutStock: t('champ_statut_stock'),
    statutEnStock: t('statut_stock_en_stock'),
    statutRupture: t('statut_stock_rupture'),
    statutEnCommande: t('statut_stock_en_commande'),
    statutEnLivraison: t('statut_stock_en_livraison'),
    photo: t('champ_photo'),
    photoAide: t('champ_photo_aide'),
    ordre: t('champ_ordre'),
    enregistrer: t('enregistrer'),
    creer: t('creer_produit'),
    enCours: t('en_cours'),
    succes: t('produit_enregistre'),
    categories: {
      impression: t('cat_impression'),
      laser: t('cat_laser'),
      conteneurs: t('cat_conteneurs'),
      equipements: t('cat_equipements'),
    },
    erreurDonnees: t('erreur_donnees_produit'),
    erreurPhoto: t('erreur_photo'),
    // ⚠️ Deux clés dédiées plutôt que la réutilisation historique de
    // `reserve_admin_texte` / `erreur_lecture` : leur texte parlait de rôles
    // et de « lecture des demandes », un copier-coller resté depuis un autre
    // écran. Trouvé en construisant /admin/realisations, corrigé ici aussi
    // puisque ce fichier est déjà rouvert pour d'autres raisons.
    erreurRefuse: t('erreur_refuse_produit'),
    erreurServeur: t('erreur_serveur_produit'),
  }

  if (error) {
    return (
      <>
        <EnteteAdmin titre={t('catalogue_titre')} />
        {/* Le message technique reste dans les journaux : il nomme des tables
            et des politiques. */}
        <PanneauAdmin>
          <p className="text-base text-ko-ink">{t('erreur_lecture')}</p>
        </PanneauAdmin>
      </>
    )
  }

  return (
    <>
      <EnteteAdmin titre={t('catalogue_titre')} intro={t('catalogue_intro')} />

      <TableauProduits
        locale={locale}
        produits={(produits ?? []) as never}
        estAdmin={estAdmin}
        libelles={libelles}
        textes={{
          vide: t('catalogue_vide'),
          publie: t('statut_publie'),
          horsLigne: t('statut_hors_ligne'),
          publier: t('publier'),
          retirer: t('retirer_vitrine'),
          voir: t('action_voir'),
          modifier: t('action_modifier'),
          supprimer: t('supprimer'),
          confirmer: t('confirmer_suppression'),
          ajouter: t('nouveau_produit'),
          fermer: t('fermer'),
          titreEdition: t('titre_edition'),
          titreCreation: t('nouveau_produit'),
          titreDetail: t('titre_detail'),
          sansImage: t('sans_image'),
          pageGabarit: t('page_gabarit'),
          pagePrecedente: t('page_precedente'),
          pageSuivante: t('page_suivante'),
        }}
      />
    </>
  )
}
