import { hasLocale } from 'next-intl'
import { getFormatter, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { EnteteAdmin, PanneauAdmin } from '@/components/layout/CadreAdmin'
import { buttonVariants } from '@/components/ui/Button'
import { TableauDemandes } from '@/components/sections/TableauDemandes'
import { routing } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import { STATUTS_DEMANDE, TYPES_DEMANDE } from '@/types'

import type { Viewport } from 'next'

/**
 * THÈME SOMBRE — migration page par page (méthode de 73255f2, accueil).
 * Importé ICI et non dans le layout : App Router ne charge le CSS d'une page
 * que sur sa route, et ses règles sont toutes préfixées par
 * `body:has([data-theme-sombre])`, le marqueur rendu plus bas.
 */
import '@/styles/theme-sombre.css'

type Props = { params: Promise<{ locale: string }> }

/**
 * Gestion des demandes — table demandes_contact.
 *
 * ---------------------------------------------------------------------------
 * TOUT PASSE PAR LE RLS
 *
 * Lecture et écriture utilisent le client de SESSION. Les politiques de 0002
 * décident : admin et editor lisent et changent le statut, seul l'admin
 * supprime. Le bouton de suppression n'est masqué à l'editor que par confort
 * d'affichage — la garantie est dans la politique, pas dans ce fichier.
 *
 * Aucune donnée personnelle ne transite par un client Supabase autre que
 * celui-ci : jamais la service role key, qui contournerait le RLS et
 * afficherait ici des demandes qu'un editor n'a peut-être pas le droit de voir.
 * ---------------------------------------------------------------------------
 */
/** Barre du navigateur mobile assortie au fond sombre — voir theme-sombre.css. */
export const viewport: Viewport = {
  themeColor: '#111210',
}

export default async function DemandesPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations('Admin')
  const format = await getFormatter({ locale })
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: demandes, error }, { data: moi }] = await Promise.all([
    supabase
      .from('demandes_contact')
      // notification_erreur (migration 0049) : sans elle, une notification
      // perdue n'apparaîtrait nulle part. C'est tout l'objet de la colonne.
      .select(
        'id, type, nom, email, telephone, organisation, message, statut, created_at, notification_erreur, note_interne, traite_le, traite_par',
      )
      .order('created_at', { ascending: false }),
    supabase.from('profils').select('role').eq('id', user?.id ?? '').maybeSingle(),
  ])

  const estAdmin = moi?.role === 'admin'

  /**
   * ⚠️ « boutique » et « carriere » retirés du FILTRE — pas de TYPES_DEMANDE
   * lui-même.
   *
   * Demande de Christian : ces deux catégories sont désormais traitées par
   * leurs propres écrans (/admin/commandes pour les commandes réelles,
   * migration 0021 ; /admin/candidatures pour les candidatures, 0017),
   * inutile de les proposer dans le filtre de cette boîte de réception
   * générale.
   *
   * TYPES_DEMANDE lui-même reste INCHANGÉ : le lien « Demander le prix » des
   * fiches produit (prix sur demande, sans passer par le panier) écrit encore
   * `type: 'boutique'` dans demandes_contact — voir boutique/[slug]/page.tsx
   * et CatalogueBoutique.tsx. Le rétrécir ici casserait ce mécanisme, distinct
   * du parcours panier/commande. Une ligne existante de type boutique ou
   * carriere continue de s'afficher (repli sur le mot brut, voir
   * TableauDemandes.tsx), seule l'option de FILTRE disparaît.
   */
  const libellesTypes: Record<string, string> = Object.fromEntries(
    TYPES_DEMANDE.filter((v) => v !== 'boutique' && v !== 'carriere').map((v) => [v, t(`type_${v}`)]),
  )
  const libellesStatuts: Record<string, string> = Object.fromEntries(
    STATUTS_DEMANDE.map((v) => [v, t(`statut_${v}`)]),
  )

  if (error) {
    return (
      <>
        <EnteteAdmin titre={t('demandes_titre')} />
        {/* Le message technique reste dans les journaux : il nomme des tables
            et des politiques. */}
        <PanneauAdmin>
          <p className="text-base text-ko-ink">{t('erreur_lecture')}</p>
        </PanneauAdmin>
      </>
    )
  }

  // Noms de l'équipe, pour afficher « traité par Marie » plutôt qu'un UUID.
  // Une seule requête pour tout le tableau, et seulement sur les comptes
  // réellement cités : une demande sur deux n'a jamais changé de statut.
  const idsTraitants = [...new Set((demandes ?? []).map((d) => d.traite_par).filter(Boolean))]
  const nomsEquipe = new Map<string, string>()
  if (idsTraitants.length > 0) {
    const { data: profils } = await supabase
      .from('profils')
      .select('id, nom, email')
      .in('id', idsTraitants as string[])
    // Le nom peut etre vide en base ; le courriel sert alors de repli, et
    // l'identifiant en dernier recours — l'ecran doit toujours afficher
    // quelque chose de reconnaissable.
    for (const p of profils ?? []) nomsEquipe.set(p.id, p.nom?.trim() || p.email?.trim() || p.id)
  }

  // Date formatée UNE fois ici, jamais une fonction transmise au client — voir
  // le plantage documenté dans TableauRealisations.tsx (imagesCompte).
  const donnees = (demandes ?? []).map((d) => ({
    ...d,
    dateFormatee: format.dateTime(new Date(d.created_at), {
      dateStyle: 'medium',
      timeStyle: 'short',
    }),
    // Renommée en camelCase comme le reste des props du tableau.
    notificationErreur: d.notification_erreur,
    noteInterne: d.note_interne,
    // Nom du membre de l'équipe, pas son identifiant : l'écran doit dire
    // « Marie », pas un UUID. Résolu ici, côté serveur, parce que le tableau
    // est un composant client et n'a pas accès à la table des profils.
    traitePar: d.traite_par ? (nomsEquipe.get(d.traite_par) ?? null) : null,
    traiteLeFormate: d.traite_le
      ? format.dateTime(new Date(d.traite_le), { dateStyle: 'medium', timeStyle: 'short' })
      : null,
  }))

  return (
    <div data-theme-sombre>
      <EnteteAdmin
        titre={t('demandes_titre')}
        action={
          /* Un <a> et non un <Link> : c'est un TÉLÉCHARGEMENT, pas une
             navigation. Le routeur de Next intercepterait le clic et
             tenterait d'afficher le CSV comme une page.

             Pas de bouton sur l'écran d'erreur plus haut : proposer un export
             au moment où la lecture vient d'échouer ne mènerait qu'à un
             second échec. */
          <a
            href="/api/admin/demandes/export"
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            {t('demandes_export')}
          </a>
        }
      />

      <TableauDemandes
        locale={locale}
        demandes={donnees}
        estAdmin={estAdmin}
        libelles={{
          types: libellesTypes,
          statuts: libellesStatuts,
        }}
        textes={{
          nomUn: t('demandes_nom_un'),
          nomPlusieurs: t('demandes_nom_plusieurs'),
          vide: t('aucune_demande'),
          videFiltre: t('demandes_vide_filtre'),
          rechercheLabel: t('demandes_recherche_label'),
          recherchePlaceholder: t('demandes_recherche_placeholder'),
          tousTypes: t('demandes_tous_types'),
          tousStatuts: t('demandes_tous_statuts'),
          colonneNom: t('colonne_nom'),
          colonneCourriel: t('colonne_courriel'),
          colonneType: t('colonne_type'),
          colonneStatut: t('colonne_statut'),
          colonneCree: t('colonne_cree'),
          colonneTelephone: t('colonne_telephone'),
          colonneOrganisation: t('colonne_organisation'),
          colonneMessage: t('colonne_message'),
          notificationEchouee: t('notification_echouee'),
          noteInterne: t('note_interne'),
          noteInterneAide: t('note_interne_aide'),
          noteEnregistrer: t('note_enregistrer'),
          traitePar: t('traite_par'),
          voir: t('action_voir'),
          supprimer: t('supprimer'),
          confirmer: t('confirmer_suppression_demande'),
          fermer: t('fermer'),
          titreDetail: t('demandes_titre_detail'),
          pageGabarit: t('page_gabarit'),
          pagePrecedente: t('page_precedente'),
          pageSuivante: t('page_suivante'),
        }}
      />
    </div>
  )
}
