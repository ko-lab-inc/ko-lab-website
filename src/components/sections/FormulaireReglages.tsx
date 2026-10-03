'use client'

import { useActionState } from 'react'

import {
  enregistrerReglages,
  type EtatReglages,
} from '@/app/(admin)/[locale]/admin/reglages/actions'
import { buttonVariants } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'

import type { Reglages } from '@/lib/reglages'

/**
 * Réglages du site.
 *
 * ---------------------------------------------------------------------------
 * DEUX GROUPES, ET LE SECOND EST DANGEREUX
 *
 * Les coordonnées sont des champs ordinaires. Les drapeaux, non : chacun ouvre
 * ou ferme une partie du site pour tous les visiteurs. Ils sont donc séparés
 * visuellement, et chacun porte une phrase qui dit ce que la décocher
 * PROVOQUE — pas ce que la case s'appelle. « Panier actif » ne dit rien à
 * quelqu'un qui n'a pas écrit le code.
 * ---------------------------------------------------------------------------
 */

export type LibellesReglages = {
  groupeContact: string
  groupeContactAide: string
  adresse: string
  adresseAide: string
  groupeFonctions: string
  groupeFonctionsAide: string
  /* Migration 0051. */
  groupeLiens: string
  groupeLiensAide: string
  lienRentman: string
  lienRentmanAide: string
  lienCandidature: string
  lienCandidatureAide: string
  delaiReponse: string
  delaiReponseAide: string
  heuresOuverture: string
  heuresOuvertureAide: string
  groupeReseaux: string
  groupeReseauxAide: string
  facebook: string
  instagram: string
  linkedin: string
  reseauAide: string
  /* Migration 0053. */
  courrielRh: string
  courrielRhAide: string
  groupeNotifications: string
  groupeNotificationsAide: string
  notifDemandes: string
  notifDemandesAide: string
  notifCandidatures: string
  notifCandidaturesAide: string
  groupeBandeau: string
  groupeBandeauAide: string
  bandeauActif: string
  bandeauActifAide: string
  bandeauFr: string
  bandeauEn: string
  bandeauTexteAide: string
  groupeAbsence: string
  groupeAbsenceAide: string
  absenceActif: string
  absenceActifAide: string
  absenceFr: string
  absenceEn: string
  absenceTexteAide: string
  courriel: string
  courrielAide: string
  telephone: string
  telephoneAide: string
  region: string
  regionAide: string
  panier: string
  panierAide: string
  modulaires: string
  modulairesAide: string
  boutiqueActive: string
  boutiqueActiveAide: string
  concoursActif: string
  concoursActifAide: string
  enregistrer: string
  enCours: string
  succes: string
  erreurDonnees: string
  erreurAdresse: string
  erreurRefuse: string
  erreurServeur: string
}

const CHAMP =
  'min-h-[40px] w-full border border-ko-line bg-ko-white px-3 py-2 text-sm text-ko-ink transition-colors duration-200 focus:border-ko-blue focus:outline-none'

/**
 * Zone de texte — bandeau, absence, listes de destinataires.
 *
 * `resize-y` et non `resize` : la largeur est contrainte par la colonne du
 * formulaire, et un redimensionnement horizontal ferait déborder la zone de
 * son conteneur. `leading-relaxed` parce qu'on y relit une liste d'adresses.
 */
const ZONE = `${CHAMP} min-h-[80px] resize-y leading-relaxed`

function Champ({
  id,
  libelle,
  aide,
  children,
}: {
  id: string
  libelle: string
  aide?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="label-mono mb-1.5 block text-ko-muted">
        {libelle}
      </label>
      {children}
      {aide && (
        <p id={`${id}-aide`} className="mt-1.5 text-sm leading-relaxed text-ko-muted">
          {aide}
        </p>
      )}
    </div>
  )
}

/**
 * Interrupteur.
 *
 * Une vraie `<input type="checkbox">`, masquée visuellement mais présente :
 * elle apporte le rôle, l'état coché, la navigation au clavier et l'envoi dans
 * le FormData. Un `<div>` stylé en interrupteur oblige à réécrire tout ça, et
 * en oublie toujours une partie.
 */
function Interrupteur({
  nom,
  libelle,
  aide,
  defaut,
}: {
  nom: string
  libelle: string
  aide: string
  defaut: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <label className="group flex min-h-[44px] cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          name={nom}
          defaultValue="true"
          defaultChecked={defaut}
          className="peer sr-only"
        />
        {/* La case reste la source de vérité ; ce qui suit n'en est que le
            reflet.

            ⚠️ Deux variantes différentes, et ce n'est pas une redondance. La
            piste est le FRÈRE de la case : `peer-checked` s'y applique. Le
            bouton, lui, est son ENFANT — `peer-*` ne remonte pas, il ne
            fonctionne qu'entre frères. D'où `group-has-[:checked]` sur le
            label englobant, qui, lui, contient la case. */}
        <span
          aria-hidden="true"
          className="relative h-6 w-11 shrink-0 rounded-full bg-ko-line transition-colors duration-200 peer-checked:bg-ko-blue peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ko-blue"
        >
          {/* Bouton : bg-ko-frost, PAS bg-ko-white — la couche sombre remappe
              .bg-ko-white vers #111210 : bouton presque noir, invisible sur la
              piste éteinte (19 septembre 2026, même défaut que le burger admin). */}
          <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-ko-frost shadow-sm transition-transform duration-200 group-has-[:checked]:translate-x-5" />
        </span>

        <span className="min-w-0">
          <span className="block text-sm text-ko-ink">{libelle}</span>
          <span className="block text-sm leading-relaxed text-ko-muted">{aide}</span>
        </span>
      </label>
    </div>
  )
}

export function FormulaireReglages({
  locale,
  reglages,
  destinataires,
  libelles,
}: {
  locale: string
  reglages: Reglages
  /**
   * Les deux listes de destinataires — migration 0053.
   *
   * ⚠️ SÉPARÉES DE `reglages`, ET CE N'EST PAS UN CAPRICE DE SIGNATURE.
   *
   * Elles sont marquées `publique = false` en base : `lireReglages()`, qui lit
   * avec la clé `anon`, ne les voit pas. La page les lit avec le client de
   * session, que la politique `reglages_lecture_equipe` autorise à tout voir.
   * Les mettre dans le même objet laisserait croire qu'elles viennent de la
   * même lecture, et la prochaine personne les chercherait dans `Reglages`.
   */
  destinataires: { demandes: string; candidatures: string }
  libelles: LibellesReglages
}) {
  const [etat, action, enCours] = useActionState<EtatReglages, FormData>(
    enregistrerReglages,
    {},
  )

  const messages: Record<string, string> = {
    donnees: libelles.erreurDonnees,
    adresse: libelles.erreurAdresse,
    refuse: libelles.erreurRefuse,
    serveur: libelles.erreurServeur,
  }

  return (
    <form action={action} className="max-w-[640px] space-y-10">
      <input type="hidden" name="locale" value={locale} />

      {/* ---------------------------- Coordonnées ---------------------------- */}
      <fieldset className="space-y-5 border border-ko-line bg-ko-white p-6">
        <legend className="px-2">
          <span className="block text-base text-ko-ink">{libelles.groupeContact}</span>
        </legend>
        <p className="text-sm leading-relaxed text-ko-muted">{libelles.groupeContactAide}</p>

        <Champ id="contact_courriel" libelle={libelles.courriel} aide={libelles.courrielAide}>
          <input
            id="contact_courriel"
            name="contact_courriel"
            type="email"
            required
            maxLength={200}
            defaultValue={reglages.contactCourriel}
            aria-describedby="contact_courriel-aide"
            className={CHAMP}
          />
        </Champ>

        <Champ id="contact_telephone" libelle={libelles.telephone} aide={libelles.telephoneAide}>
          <input
            id="contact_telephone"
            name="contact_telephone"
            type="tel"
            maxLength={40}
            defaultValue={reglages.contactTelephone}
            aria-describedby="contact_telephone-aide"
            className={CHAMP}
          />
        </Champ>

        <Champ id="contact_region" libelle={libelles.region} aide={libelles.regionAide}>
          <input
            id="contact_region"
            name="contact_region"
            type="text"
            maxLength={120}
            defaultValue={reglages.contactRegion}
            aria-describedby="contact_region-aide"
            className={CHAMP}
          />
        </Champ>

        <Champ id="contact_adresse" libelle={libelles.adresse} aide={libelles.adresseAide}>
          <input
            id="contact_adresse"
            name="contact_adresse"
            type="text"
            maxLength={200}
            defaultValue={reglages.contactAdresse}
            aria-describedby="contact_adresse-aide"
            className={CHAMP}
          />
        </Champ>

        <Champ id="courriel_rh" libelle={libelles.courrielRh} aide={libelles.courrielRhAide}>
          <input
            id="courriel_rh"
            name="courriel_rh"
            type="email"
            maxLength={200}
            defaultValue={reglages.courrielRh}
            aria-describedby="courriel_rh-aide"
            className={CHAMP}
          />
        </Champ>

        <Champ id="heures_ouverture" libelle={libelles.heuresOuverture} aide={libelles.heuresOuvertureAide}>
          <input
            id="heures_ouverture"
            name="heures_ouverture"
            type="text"
            maxLength={120}
            defaultValue={reglages.heuresOuverture}
            aria-describedby="heures_ouverture-aide"
            className={CHAMP}
          />
        </Champ>
      </fieldset>

      {/* ------------------------------ Liens ------------------------------- */}
      {/* Migration 0051 — ces trois valeurs étaient FIGÉES DANS LE CODE : les
          changer demandait un déploiement, donc un développeur, pour une
          décision qui n'en relève pas. */}
      <fieldset className="space-y-5 border border-ko-line bg-ko-white p-6">
        <legend className="px-2">
          <span className="block text-base text-ko-ink">{libelles.groupeLiens}</span>
        </legend>
        <p className="text-sm leading-relaxed text-ko-muted">{libelles.groupeLiensAide}</p>

        <Champ id="lien_rentman" libelle={libelles.lienRentman} aide={libelles.lienRentmanAide}>
          <input
            id="lien_rentman"
            name="lien_rentman"
            type="text"
            maxLength={400}
            inputMode="url"
            defaultValue={reglages.lienRentman}
            aria-describedby="lien_rentman-aide"
            className={CHAMP}
          />
        </Champ>

        <Champ id="lien_candidature_externe" libelle={libelles.lienCandidature} aide={libelles.lienCandidatureAide}>
          <input
            id="lien_candidature_externe"
            name="lien_candidature_externe"
            type="text"
            maxLength={400}
            inputMode="url"
            defaultValue={reglages.lienCandidatureExterne}
            aria-describedby="lien_candidature_externe-aide"
            className={CHAMP}
          />
        </Champ>

        <Champ id="delai_reponse_heures" libelle={libelles.delaiReponse} aide={libelles.delaiReponseAide}>
          <input
            id="delai_reponse_heures"
            name="delai_reponse_heures"
            type="text"
            inputMode="numeric"
            maxLength={4}
            defaultValue={String(reglages.delaiReponseHeures)}
            aria-describedby="delai_reponse_heures-aide"
            className={CHAMP}
          />
        </Champ>
      </fieldset>

      {/* --------------------------- Réseaux sociaux -------------------------- */}
      {/* Chaque réseau est indépendant : une icône n'apparaît au pied de page
          que si SON adresse est renseignée. Vider le champ la retire. */}
      <fieldset className="space-y-5 border border-ko-line bg-ko-white p-6">
        <legend className="px-2">
          <span className="block text-base text-ko-ink">{libelles.groupeReseaux}</span>
        </legend>
        <p className="text-sm leading-relaxed text-ko-muted">{libelles.groupeReseauxAide}</p>

        <Champ id="reseau_facebook" libelle={libelles.facebook} aide={libelles.reseauAide}>
          <input
            id="reseau_facebook"
            name="reseau_facebook"
            type="text"
            maxLength={300}
            inputMode="url"
            defaultValue={reglages.reseauFacebook}
            aria-describedby="reseau_facebook-aide"
            className={CHAMP}
          />
        </Champ>

        <Champ id="reseau_instagram" libelle={libelles.instagram} aide={libelles.reseauAide}>
          <input
            id="reseau_instagram"
            name="reseau_instagram"
            type="text"
            maxLength={300}
            inputMode="url"
            defaultValue={reglages.reseauInstagram}
            aria-describedby="reseau_instagram-aide"
            className={CHAMP}
          />
        </Champ>

        <Champ id="reseau_linkedin" libelle={libelles.linkedin} aide={libelles.reseauAide}>
          <input
            id="reseau_linkedin"
            name="reseau_linkedin"
            type="text"
            maxLength={300}
            inputMode="url"
            defaultValue={reglages.reseauLinkedin}
            aria-describedby="reseau_linkedin-aide"
            className={CHAMP}
          />
        </Champ>
      </fieldset>

      {/* --------------------------- Notifications --------------------------- */}
      {/* Migration 0053. Les deux seuls champs de cet écran qui ne sont PAS
          affichés sur le site : ce sont des adresses internes, et la base les
          garde hors de portée de la lecture publique. */}
      <fieldset className="space-y-5 border border-ko-line bg-ko-white p-6">
        <legend className="px-2">
          <span className="block text-base text-ko-ink">{libelles.groupeNotifications}</span>
        </legend>
        <p className="text-sm leading-relaxed text-ko-muted">{libelles.groupeNotificationsAide}</p>

        <Champ
          id="notifications_demandes"
          libelle={libelles.notifDemandes}
          aide={libelles.notifDemandesAide}
        >
          <textarea
            id="notifications_demandes"
            name="notifications_demandes"
            rows={2}
            maxLength={600}
            defaultValue={destinataires.demandes}
            aria-describedby="notifications_demandes-aide"
            className={ZONE}
          />
        </Champ>

        <Champ
          id="notifications_candidatures"
          libelle={libelles.notifCandidatures}
          aide={libelles.notifCandidaturesAide}
        >
          <textarea
            id="notifications_candidatures"
            name="notifications_candidatures"
            rows={2}
            maxLength={600}
            defaultValue={destinataires.candidatures}
            aria-describedby="notifications_candidatures-aide"
            className={ZONE}
          />
        </Champ>
      </fieldset>

      {/* ------------------------- Bandeau d'annonce ------------------------- */}
      {/* L'interrupteur est au-dessus des textes, pas en dessous : c'est la
          décision (afficher ou non), les textes n'en sont que le contenu. */}
      <fieldset className="space-y-5 border border-ko-line bg-ko-white p-6">
        <legend className="px-2">
          <span className="block text-base text-ko-ink">{libelles.groupeBandeau}</span>
        </legend>
        <p className="text-sm leading-relaxed text-ko-muted">{libelles.groupeBandeauAide}</p>

        <Interrupteur
          nom="bandeau_actif"
          libelle={libelles.bandeauActif}
          aide={libelles.bandeauActifAide}
          defaut={reglages.bandeauActif}
        />

        <Champ id="bandeau_texte_fr" libelle={libelles.bandeauFr} aide={libelles.bandeauTexteAide}>
          <textarea
            id="bandeau_texte_fr"
            name="bandeau_texte_fr"
            rows={2}
            maxLength={200}
            defaultValue={reglages.bandeauTexteFr}
            aria-describedby="bandeau_texte_fr-aide"
            className={ZONE}
          />
        </Champ>

        <Champ id="bandeau_texte_en" libelle={libelles.bandeauEn}>
          <textarea
            id="bandeau_texte_en"
            name="bandeau_texte_en"
            rows={2}
            maxLength={200}
            defaultValue={reglages.bandeauTexteEn}
            className={ZONE}
          />
        </Champ>
      </fieldset>

      {/* -------------------------- Message d'absence ------------------------- */}
      <fieldset className="space-y-5 border border-ko-line bg-ko-white p-6">
        <legend className="px-2">
          <span className="block text-base text-ko-ink">{libelles.groupeAbsence}</span>
        </legend>
        <p className="text-sm leading-relaxed text-ko-muted">{libelles.groupeAbsenceAide}</p>

        <Interrupteur
          nom="absence_actif"
          libelle={libelles.absenceActif}
          aide={libelles.absenceActifAide}
          defaut={reglages.absenceActif}
        />

        <Champ
          id="absence_message_fr"
          libelle={libelles.absenceFr}
          aide={libelles.absenceTexteAide}
        >
          <textarea
            id="absence_message_fr"
            name="absence_message_fr"
            rows={3}
            maxLength={300}
            defaultValue={reglages.absenceMessageFr}
            aria-describedby="absence_message_fr-aide"
            className={ZONE}
          />
        </Champ>

        <Champ id="absence_message_en" libelle={libelles.absenceEn}>
          <textarea
            id="absence_message_en"
            name="absence_message_en"
            rows={3}
            maxLength={300}
            defaultValue={reglages.absenceMessageEn}
            className={ZONE}
          />
        </Champ>
      </fieldset>

      {/* --------------------------- Fonctionnalités -------------------------- */}
      <fieldset className="space-y-5 border border-ko-line bg-ko-white p-6">
        <legend className="px-2">
          <span className="block text-base text-ko-ink">{libelles.groupeFonctions}</span>
        </legend>
        <p className="text-sm leading-relaxed text-ko-muted">{libelles.groupeFonctionsAide}</p>

        <Interrupteur
          nom="panier_actif"
          libelle={libelles.panier}
          aide={libelles.panierAide}
          defaut={reglages.panierActif}
        />
        <Interrupteur
          nom="solutions_modulaires"
          libelle={libelles.modulaires}
          aide={libelles.modulairesAide}
          defaut={reglages.solutionsModulaires}
        />
        <Interrupteur
          nom="boutique_active"
          libelle={libelles.boutiqueActive}
          aide={libelles.boutiqueActiveAide}
          defaut={reglages.boutiqueActive}
        />
        <Interrupteur
          nom="concours_actif"
          libelle={libelles.concoursActif}
          aide={libelles.concoursActifAide}
          defaut={reglages.concoursActif}
        />
      </fieldset>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={enCours}
          className={buttonVariants({ variant: 'primary', size: 'sm' })}
        >
          {enCours ? libelles.enCours : libelles.enregistrer}
        </button>

        {/* `role="status"` : le formulaire ne recharge pas la page, rien ne
            signalerait autrement que l'enregistrement a eu lieu. */}
        {etat.succes && (
          <p role="status" className="text-sm font-medium text-ko-ink">
            {libelles.succes}
          </p>
        )}
        {etat.erreur && (
          <p role="alert" className={cn('text-sm text-ko-ink')}>
            {messages[etat.erreur] ?? libelles.erreurServeur}
          </p>
        )}
      </div>
    </form>
  )
}
