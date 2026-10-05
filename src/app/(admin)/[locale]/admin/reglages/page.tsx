import { hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { EnteteAdmin } from '@/components/layout/CadreAdmin'
import { FormulaireReglages } from '@/components/sections/FormulaireReglages'
import { routing } from '@/i18n/routing'
import { EMAILS } from '@/lib/constantes'
import type { Reglages } from '@/lib/reglages'
import { createClient } from '@/lib/supabase/server'

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
 * Réglages du site.
 *
 * ---------------------------------------------------------------------------
 * CE QUI EST MODIFIABLE ICI, ET CE QUI NE L'EST PAS
 *
 * Ce qui l'est : les coordonnées, et les trois drapeaux qui ouvrent ou
 * ferment une partie du site. Ce sont précisément les réglages qui doivent
 * pouvoir bouger sans développeur — avant, changer une adresse de courriel
 * demandait un commit et un déploiement, et fermer la boutique passait par
 * une variable d'environnement Vercel que seul Moussa pouvait toucher.
 *
 * Ce qui ne l'est pas : les textes du site. La page le dit explicitement
 * plutôt que de laisser chercher.
 *
 * ⚠️ Sans la migration 0011, l'écran s'affiche avec les valeurs de repli et
 * l'enregistrement échoue proprement en annonçant pourquoi. C'est préférable
 * à une page qui refuse de se charger : le reste de l'administration reste
 * utilisable.
 *
 * ⚠️ 0029 AUSSI, PAS SEULEMENT POUR boutique_active. L'action d'enregistrement
 * met à jour les trois drapeaux en une seule fois (`Promise.all`) et échoue
 * en bloc si UNE SEULE clé ne trouve aucune ligne à modifier (voir
 * actions.ts) — sans 0029, ENREGISTRER NE FAIT PLUS RIEN DU TOUT, y compris
 * pour les coordonnées de contact, tant que 0029 n'a pas tourné.
 * ---------------------------------------------------------------------------
 */
/** Barre du navigateur mobile assortie au fond sombre — voir theme-sombre.css. */
export const viewport: Viewport = {
  themeColor: '#111210',
}

export default async function Page({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations('Admin')

  /**
   * =========================================================================
   * ⚠️ CET ÉCRAN NE LIT **JAMAIS** LES RÉGLAGES PAR `lireReglages()`.
   * =========================================================================
   *
   * INCIDENT DU 3 OCTOBRE 2026 — un bandeau d'annonce est resté affiché sur
   * le site public alors que la base, elle, était vide depuis une heure.
   *
   * Ce qui s'est passé, dans l'ordre :
   *   1. `lireReglages()` est un `unstable_cache`, voulu : il est appelé par
   *      le layout du site vitrine, donc à chaque rendu de chaque page.
   *   2. Cet écran l'appelait aussi, pour préremplir le formulaire.
   *   3. Le cache d'une instance de production ne se vide QUE par un
   *      `updateTag` exécuté SUR cette instance. Une modification faite
   *      ailleurs — autre environnement, écriture directe en base, autre
   *      région serverless — ne l'atteint pas.
   *   4. Le formulaire s'est donc affiché prérempli avec des valeurs
   *      PÉRIMÉES, et comme il envoie TOUS les réglages d'un seul bouton,
   *      l'enregistrement les a RÉÉCRITES en base.
   *
   * Autrement dit : changer un seul champ pouvait faire revenir
   * silencieusement d'anciennes valeurs sur tous les autres, et les
   * republier sur le site. Une mise à jour perdue, sans message, sans trace.
   *
   * La lecture ci-dessous passe par le client de SESSION, qui ne met rien en
   * cache : ce formulaire montre l'état réel de la base au moment où il
   * s'ouvre. C'est la seule lecture correcte pour un écran dont le bouton
   * réécrit tout.
   *
   * `lireReglages()` garde tout son sens pour le SITE PUBLIC, où le cache est
   * exactement ce qu'on veut. Il n'a simplement rien à faire ici.
   *
   * ⚠️ Le client de SESSION, et pas la service role key : la politique
   * `reglages_lecture_equipe` (0011) autorise déjà l'équipe à tout voir — y
   * compris les lignes `publique = false`, que la clé `anon` ne voit pas.
   * Rien n'est contourné. `lib/supabase/admin.ts` réserve la service role key
   * aux API routes, et un composant n'en est pas une.
   */
  const supabase = await createClient()
  const { data: lignes } = await supabase.from('reglages').select('cle, valeur')

  const valeur = (cle: string) =>
    (lignes ?? []).find((ligne) => ligne.cle === cle)?.valeur ?? ''
  /**
   * ⚠️ `=== 'true'`, et surtout pas `Boolean(valeur(...))` : toute chaîne non
   * vide est vraie en JavaScript, donc `'false'` allumerait l'interrupteur.
   */
  const drapeau = (cle: string) => valeur(cle) === 'true'

  /**
   * Valeurs BRUTES, telles qu'elles sont en base — aucun repli appliqué.
   *
   * C'est volontaire et c'est le pendant de la note ci-dessus : un champ
   * prérempli avec un repli (`courriel_rh` vide qui s'afficherait
   * `rh@ko-lab.ca`) écrirait ce repli en base au premier enregistrement. Le
   * réglage cesserait alors de dire « vide = la valeur du code » pour
   * devenir une copie, qui divergerait. Les replis sont affichés en
   * `placeholder`, jamais en `defaultValue`.
   */
  const reglages: Reglages = {
    contactCourriel: valeur('contact_courriel'),
    contactTelephone: valeur('contact_telephone'),
    contactRegion: valeur('contact_region'),
    contactAdresse: valeur('contact_adresse'),
    panierActif: drapeau('panier_actif'),
    solutionsModulaires: drapeau('solutions_modulaires'),
    boutiqueActive: drapeau('boutique_active'),
    concoursActif: drapeau('concours_actif'),
    lienRentman: valeur('lien_rentman'),
    lienCandidatureExterne: valeur('lien_candidature_externe'),
    // Seul réglage numérique. Un champ vide ou illisible retombe sur 48 pour
    // ne pas afficher « NaN » dans le formulaire.
    delaiReponseHeures: Number.parseInt(valeur('delai_reponse_heures'), 10) || 48,
    heuresOuverture: valeur('heures_ouverture'),
    reseauFacebook: valeur('reseau_facebook'),
    reseauInstagram: valeur('reseau_instagram'),
    reseauLinkedin: valeur('reseau_linkedin'),
    courrielRh: valeur('courriel_rh'),
    bandeauActif: drapeau('bandeau_actif'),
    bandeauTexteFr: valeur('bandeau_texte_fr'),
    bandeauTexteEn: valeur('bandeau_texte_en'),
    absenceActif: drapeau('absence_actif'),
    absenceMessageFr: valeur('absence_message_fr'),
    absenceMessageEn: valeur('absence_message_en'),
  }
  /**
   * Les deux listes de destinataires — migration 0053.
   *
   * Séparées de `reglages` parce qu'elles ne sont PAS dans le type
   * `Reglages` : marquées `publique = false`, `lireReglages()` ne peut pas
   * les voir, et les y mettre laisserait croire le contraire.
   */
  const brutes = {
    demandes: valeur('notifications_demandes'),
    candidatures: valeur('notifications_candidatures'),
  }

  return (
    // Colonne CENTRÉE et de largeur de lecture confortable (5 octobre 2026).
    // Les cartes ne flottent plus à gauche avec un grand vide à droite : tout
    // l'écran des réglages est une colonne centrée, en-tête et note comprises.
    <div data-theme-sombre className="mx-auto w-full max-w-[880px]">
      <EnteteAdmin titre={t('reglages_titre')} />

      <p className="mb-8 max-w-[70ch] text-base leading-relaxed text-ko-muted">
        {t('reglages_intro')}
      </p>

      <FormulaireReglages
        locale={locale}
        reglages={reglages}
        brutes={brutes}
        courrielRhDefaut={EMAILS.rh}
        libelles={{
          groupeContact: t('reglages_groupe_contact'),
          adresse: t('reglages_adresse'),
          adresseAide: t('reglages_adresse_aide'),
          groupeLiens: t('reglages_groupe_liens'),
          groupeLiensAide: t('reglages_groupe_liens_aide'),
          lienRentman: t('reglages_lien_rentman'),
          lienRentmanAide: t('reglages_lien_rentman_aide'),
          lienCandidature: t('reglages_lien_candidature'),
          lienCandidatureAide: t('reglages_lien_candidature_aide'),
          delaiReponse: t('reglages_delai_reponse'),
          delaiReponseAide: t('reglages_delai_reponse_aide'),
          heuresOuverture: t('reglages_heures_ouverture'),
          heuresOuvertureAide: t('reglages_heures_ouverture_aide'),
          groupeReseaux: t('reglages_groupe_reseaux'),
          groupeReseauxAide: t('reglages_groupe_reseaux_aide'),
          facebook: t('reglages_facebook'),
          instagram: t('reglages_instagram'),
          linkedin: t('reglages_linkedin'),
          reseauAide: t('reglages_reseau_aide'),
          groupeContactAide: t('reglages_groupe_contact_aide'),
          groupeFonctions: t('reglages_groupe_fonctions'),
          groupeFonctionsAide: t('reglages_groupe_fonctions_aide'),
          courriel: t('reglages_courriel'),
          courrielAide: t('reglages_courriel_aide'),
          courrielRh: t('reglages_courriel_rh'),
          courrielRhAide: t('reglages_courriel_rh_aide'),
          groupeNotifications: t('reglages_groupe_notifications'),
          groupeNotificationsAide: t('reglages_groupe_notifications_aide'),
          notifDemandes: t('reglages_notif_demandes'),
          notifDemandesAide: t('reglages_notif_demandes_aide'),
          notifCandidatures: t('reglages_notif_candidatures'),
          notifCandidaturesAide: t('reglages_notif_candidatures_aide'),
          champsCourriels: {
            adresseLabel: t('courriels_adresse'),
            ajouter: t('courriels_ajouter'),
            retirer: t('courriels_retirer'),
            placeholder: t('courriels_placeholder'),
            aucune: t('courriels_aucune'),
          },
          groupeBandeau: t('reglages_groupe_bandeau'),
          groupeBandeauAide: t('reglages_groupe_bandeau_aide'),
          bandeauActif: t('reglages_bandeau_actif'),
          bandeauActifAide: t('reglages_bandeau_actif_aide'),
          bandeauFr: t('reglages_bandeau_fr'),
          bandeauEn: t('reglages_bandeau_en'),
          bandeauTexteAide: t('reglages_bandeau_texte_aide'),
          groupeAbsence: t('reglages_groupe_absence'),
          groupeAbsenceAide: t('reglages_groupe_absence_aide'),
          absenceActif: t('reglages_absence_actif'),
          absenceActifAide: t('reglages_absence_actif_aide'),
          absenceFr: t('reglages_absence_fr'),
          absenceEn: t('reglages_absence_en'),
          absenceTexteAide: t('reglages_absence_texte_aide'),
          telephone: t('reglages_telephone'),
          telephoneAide: t('reglages_telephone_aide'),
          region: t('reglages_region'),
          regionAide: t('reglages_region_aide'),
          panier: t('reglages_panier'),
          panierAide: t('reglages_panier_aide'),
          modulaires: t('reglages_modulaires'),
          modulairesAide: t('reglages_modulaires_aide'),
          boutiqueActive: t('reglages_boutique_active'),
          boutiqueActiveAide: t('reglages_boutique_active_aide'),
          concoursActif: t('reglages_concours_actif'),
          concoursActifAide: t('reglages_concours_actif_aide'),
          etatActif: t('reglages_etat_actif'),
          etatInactif: t('reglages_etat_inactif'),
          enregistrer: t('reglages_enregistrer'),
          enCours: t('reglages_en_cours'),
          succes: t('reglages_succes'),
          erreurDonnees: t('reglages_erreur_donnees'),
          erreurAdresse: t('reglages_erreur_adresse'),
          erreurRefuse: t('reglages_erreur_refuse'),
          erreurServeur: t('reglages_erreur_serveur'),
        }}
      />

      {/* Dire ce que l'écran NE fait pas évite la recherche inutile. Sans
          cette note, on ouvre les réglages en cherchant où changer le titre
          d'une page, et on repart sans réponse. */}
      <section className="mt-10 max-w-[640px] border-l-2 border-ko-line pl-5">
        <h2 className="label-mono text-ko-muted">{t('reglages_textes_titre')}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ko-muted">{t('reglages_textes')}</p>
      </section>
    </div>
  )
}
