'use client'

import { useActionState, useId } from 'react'

import {
  enregistrerReglages,
  type EtatReglages,
} from '@/app/(admin)/[locale]/admin/reglages/actions'
import {
  ChampsCourriels,
  type TextesChampsCourriels,
} from '@/components/sections/ChampsCourriels'
import { buttonVariants } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'

import type { Reglages } from '@/lib/reglages'

/**
 * Réglages du site.
 *
 * ---------------------------------------------------------------------------
 * DISPOSITION — CARTES ET LIGNES (demande du 5 octobre 2026)
 *
 * Christian voulait la disposition d'un écran de réglages Wix : des CARTES
 * avec un en-tête, et dans chaque carte des LIGNES séparées par un filet, où
 * un interrupteur porte son état (« Actif » / « Inactif ») à côté de son titre
 * et de sa description. La STRUCTURE est reprise, pas les couleurs : tout reste
 * dans la palette KO-LAB et sous le thème admin sombre.
 *
 * ---------------------------------------------------------------------------
 * CE QUI N'A PAS CHANGÉ, ET POURQUOI C'EST IMPORTANT
 *
 * Les drapeaux ouvrent ou ferment une partie du site pour tous les visiteurs.
 * Chacun porte donc toujours une phrase qui dit ce que le DÉCOCHER provoque,
 * pas ce que la case s'appelle — « Panier actif » ne dit rien à qui n'a pas
 * écrit le code. Et chaque interrupteur reste une vraie `<input checkbox>`
 * masquée : le rôle, l'état coché, le clavier et l'envoi dans le FormData
 * viennent d'elle, pas d'un `<div>` stylé qui en oublierait la moitié.
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
  /** Textes du composant a champs multiples. */
  champsCourriels: TextesChampsCourriels
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
  /** État affiché à côté de chaque interrupteur (façon « Active » de Wix). */
  etatActif: string
  etatInactif: string
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
 * Zone de texte — bandeau, absence.
 *
 * `resize-y` et non `resize` : la largeur est contrainte par la colonne du
 * formulaire, et un redimensionnement horizontal ferait déborder la zone.
 */
const ZONE = `${CHAMP} min-h-[80px] resize-y leading-relaxed`

/**
 * Carte de réglages — en-tête (titre + description) puis un corps dont les
 * lignes sont séparées par un filet. C'est le conteneur façon Wix.
 *
 * `<section aria-labelledby>` plutôt que `<fieldset><legend>` : la légende d'un
 * fieldset bordé se positionne mal dès qu'on veut un vrai bandeau d'en-tête, et
 * chaque champ de ces cartes porte déjà son propre libellé — le groupe n'a
 * besoin que d'un nom de région, ce que l'en-tête fournit.
 */
function Carte({
  titre,
  aide,
  children,
}: {
  titre: string
  aide?: string
  children: React.ReactNode
}) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="border border-ko-line bg-ko-white">
      <div className="border-b border-ko-line px-5 py-4 sm:px-6">
        <h2 id={id} className="text-base text-ko-ink">
          {titre}
        </h2>
        {aide && (
          <p className="mt-1 max-w-[62ch] text-sm leading-relaxed text-ko-muted">{aide}</p>
        )}
      </div>
      <div className="divide-y divide-ko-line">{children}</div>
    </section>
  )
}

/** Un champ texte, en ligne dans une carte. */
function LigneChamp({
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
    <div className="px-5 py-4 sm:px-6">
      <label htmlFor={id} className="label-mono mb-1.5 block text-ko-muted">
        {libelle}
      </label>
      {children}
      {aide && (
        <p id={`${id}-aide`} className="mt-1.5 max-w-[62ch] text-sm leading-relaxed text-ko-muted">
          {aide}
        </p>
      )}
    </div>
  )
}

/**
 * Une liste d'adresses, en ligne dans une carte.
 *
 * `<fieldset>` ici, à la différence des autres lignes : il y a PLUSIEURS champs
 * (une adresse par ligne) et un `<label for>` ne peut en désigner qu'un. La
 * légende nomme l'ensemble, chaque champ porte son propre nom (voir
 * ChampsCourriels).
 */
function LigneGroupeCourriels({
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
    <fieldset className="px-5 py-4 sm:px-6">
      <legend className="label-mono mb-1.5 block text-ko-muted">{libelle}</legend>
      {children}
      {aide && (
        <p id={`${id}-aide`} className="mt-1.5 max-w-[62ch] text-sm leading-relaxed text-ko-muted">
          {aide}
        </p>
      )}
    </fieldset>
  )
}

/**
 * Ligne d'interrupteur — la pièce maîtresse de la disposition Wix :
 * `interrupteur · état · titre + description`, en ligne, séparée de la suivante
 * par le filet de la carte.
 *
 * L'état « Actif / Inactif » suit la case EN CSS (`group-has-[:checked]`), sans
 * état React : la case reste non contrôlée, donc toujours envoyée telle quelle
 * dans le FormData. Les deux libellés sont `aria-hidden` — l'état est déjà
 * porté par le rôle « checkbox » de la case, les répéter alourdirait la lecture.
 */
function LigneInterrupteur({
  nom,
  libelle,
  aide,
  defaut,
  actif,
  inactif,
}: {
  nom: string
  libelle: string
  aide: string
  defaut: boolean
  actif: string
  inactif: string
}) {
  return (
    <label className="group flex cursor-pointer items-start gap-4 px-5 py-4 sm:px-6">
      <input
        type="checkbox"
        name={nom}
        defaultValue="true"
        defaultChecked={defaut}
        className="peer sr-only"
      />

      {/* Interrupteur. `peer-checked` colore la piste (frère de la case) ;
          `group-has-[:checked]` déplace le bouton (enfant, hors de portée de
          `peer-*`). Bouton en `bg-ko-frost` et pas `bg-ko-white` : la couche
          sombre remappe `.bg-ko-white` vers #111210 — bouton noir invisible. */}
      <span
        aria-hidden="true"
        className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-ko-line transition-colors duration-200 peer-checked:bg-ko-blue peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ko-blue"
      >
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-ko-frost shadow-sm transition-transform duration-200 group-has-[:checked]:translate-x-5" />
      </span>

      {/* État, façon « Active » de Wix. Bleu quand actif (8,10:1 sur fond
          sombre), muet quand inactif. Largeur fixe pour aligner les titres. */}
      <span aria-hidden="true" className="label-mono mt-1 w-12 shrink-0">
        <span className="hidden text-ko-blue group-has-[:checked]:inline">{actif}</span>
        <span className="text-ko-muted group-has-[:checked]:hidden">{inactif}</span>
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm text-ko-ink">{libelle}</span>
        <span className="mt-0.5 block text-sm leading-relaxed text-ko-muted">{aide}</span>
      </span>
    </label>
  )
}

export function FormulaireReglages({
  locale,
  reglages,
  brutes,
  courrielRhDefaut,
  libelles,
}: {
  locale: string
  reglages: Reglages
  /**
   * Valeurs BRUTES, telles qu'elles sont en base — migration 0053.
   *
   * ⚠️ SÉPARÉES DE `reglages`, ET CE N'EST PAS UN CAPRICE DE SIGNATURE.
   *
   * Deux raisons distinctes, à ne pas confondre :
   *
   *   `demandes` / `candidatures` : marquées `publique = false` en base.
   *   `lireReglages()` lit avec la clé `anon` et NE LES VOIT PAS. La page les
   *   lit avec le client de session, que `reglages_lecture_equipe` autorise.
   *
   *   `courrielRh` : visible, mais `lireReglages()` en rend la valeur APRÈS
   *   repli. Un champ prérempli avec le repli le fige en base au premier
   *   enregistrement — le réglage cesse alors de dire « vide = la valeur du
   *   code » et devient une copie qui divergera.
   */
  brutes: { demandes: string; candidatures: string }
  /** Affiché en `placeholder` du champ RH : ce qui s'applique s'il reste vide. */
  courrielRhDefaut: string
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

  /** Raccourci : tous les interrupteurs partagent les mêmes libellés d'état. */
  const etat2 = { actif: libelles.etatActif, inactif: libelles.etatInactif }

  return (
    <form action={action} className="max-w-[680px] space-y-8">
      <input type="hidden" name="locale" value={locale} />

      {/* ---------------------------- Coordonnées ---------------------------- */}
      <Carte titre={libelles.groupeContact} aide={libelles.groupeContactAide}>
        <LigneChamp id="contact_courriel" libelle={libelles.courriel} aide={libelles.courrielAide}>
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
        </LigneChamp>

        <LigneChamp id="contact_telephone" libelle={libelles.telephone} aide={libelles.telephoneAide}>
          <input
            id="contact_telephone"
            name="contact_telephone"
            type="tel"
            maxLength={40}
            defaultValue={reglages.contactTelephone}
            aria-describedby="contact_telephone-aide"
            className={CHAMP}
          />
        </LigneChamp>

        <LigneChamp id="contact_region" libelle={libelles.region} aide={libelles.regionAide}>
          <input
            id="contact_region"
            name="contact_region"
            type="text"
            maxLength={120}
            defaultValue={reglages.contactRegion}
            aria-describedby="contact_region-aide"
            className={CHAMP}
          />
        </LigneChamp>

        <LigneChamp id="contact_adresse" libelle={libelles.adresse} aide={libelles.adresseAide}>
          <input
            id="contact_adresse"
            name="contact_adresse"
            type="text"
            maxLength={200}
            defaultValue={reglages.contactAdresse}
            aria-describedby="contact_adresse-aide"
            className={CHAMP}
          />
        </LigneChamp>

        <LigneChamp id="courriel_rh" libelle={libelles.courrielRh} aide={libelles.courrielRhAide}>
          <input
            id="courriel_rh"
            name="courriel_rh"
            type="email"
            maxLength={200}
            // Valeur BRUTE, repli seulement en placeholder (voir la note sur `brutes`).
            defaultValue={reglages.courrielRh}
            placeholder={courrielRhDefaut}
            aria-describedby="courriel_rh-aide"
            className={CHAMP}
          />
        </LigneChamp>

        <LigneChamp id="heures_ouverture" libelle={libelles.heuresOuverture} aide={libelles.heuresOuvertureAide}>
          <input
            id="heures_ouverture"
            name="heures_ouverture"
            type="text"
            maxLength={120}
            defaultValue={reglages.heuresOuverture}
            aria-describedby="heures_ouverture-aide"
            className={CHAMP}
          />
        </LigneChamp>
      </Carte>

      {/* ------------------------------ Liens ------------------------------- */}
      <Carte titre={libelles.groupeLiens} aide={libelles.groupeLiensAide}>
        <LigneChamp id="lien_rentman" libelle={libelles.lienRentman} aide={libelles.lienRentmanAide}>
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
        </LigneChamp>

        <LigneChamp id="lien_candidature_externe" libelle={libelles.lienCandidature} aide={libelles.lienCandidatureAide}>
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
        </LigneChamp>

        <LigneChamp id="delai_reponse_heures" libelle={libelles.delaiReponse} aide={libelles.delaiReponseAide}>
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
        </LigneChamp>
      </Carte>

      {/* --------------------------- Réseaux sociaux -------------------------- */}
      <Carte titre={libelles.groupeReseaux} aide={libelles.groupeReseauxAide}>
        <LigneChamp id="reseau_facebook" libelle={libelles.facebook} aide={libelles.reseauAide}>
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
        </LigneChamp>

        <LigneChamp id="reseau_instagram" libelle={libelles.instagram} aide={libelles.reseauAide}>
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
        </LigneChamp>

        <LigneChamp id="reseau_linkedin" libelle={libelles.linkedin} aide={libelles.reseauAide}>
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
        </LigneChamp>
      </Carte>

      {/* --------------------------- Notifications --------------------------- */}
      <Carte titre={libelles.groupeNotifications} aide={libelles.groupeNotificationsAide}>
        <LigneGroupeCourriels
          id="notifications_demandes"
          libelle={libelles.notifDemandes}
          aide={libelles.notifDemandesAide}
        >
          <ChampsCourriels
            nom="notifications_demandes"
            groupe={libelles.notifDemandes}
            valeurInitiale={brutes.demandes}
            textes={libelles.champsCourriels}
            aideId="notifications_demandes-aide"
          />
        </LigneGroupeCourriels>

        <LigneGroupeCourriels
          id="notifications_candidatures"
          libelle={libelles.notifCandidatures}
          aide={libelles.notifCandidaturesAide}
        >
          <ChampsCourriels
            nom="notifications_candidatures"
            groupe={libelles.notifCandidatures}
            valeurInitiale={brutes.candidatures}
            textes={libelles.champsCourriels}
            aideId="notifications_candidatures-aide"
          />
        </LigneGroupeCourriels>
      </Carte>

      {/* ------------------------- Bandeau d'annonce ------------------------- */}
      {/* L'interrupteur en PREMIÈRE ligne : c'est la décision (afficher ou non),
          les textes n'en sont que le contenu. */}
      <Carte titre={libelles.groupeBandeau} aide={libelles.groupeBandeauAide}>
        <LigneInterrupteur
          nom="bandeau_actif"
          libelle={libelles.bandeauActif}
          aide={libelles.bandeauActifAide}
          defaut={reglages.bandeauActif}
          {...etat2}
        />

        <LigneChamp id="bandeau_texte_fr" libelle={libelles.bandeauFr} aide={libelles.bandeauTexteAide}>
          <textarea
            id="bandeau_texte_fr"
            name="bandeau_texte_fr"
            rows={2}
            maxLength={200}
            defaultValue={reglages.bandeauTexteFr}
            aria-describedby="bandeau_texte_fr-aide"
            className={ZONE}
          />
        </LigneChamp>

        <LigneChamp id="bandeau_texte_en" libelle={libelles.bandeauEn}>
          <textarea
            id="bandeau_texte_en"
            name="bandeau_texte_en"
            rows={2}
            maxLength={200}
            defaultValue={reglages.bandeauTexteEn}
            className={ZONE}
          />
        </LigneChamp>
      </Carte>

      {/* -------------------------- Message d'absence ------------------------- */}
      <Carte titre={libelles.groupeAbsence} aide={libelles.groupeAbsenceAide}>
        <LigneInterrupteur
          nom="absence_actif"
          libelle={libelles.absenceActif}
          aide={libelles.absenceActifAide}
          defaut={reglages.absenceActif}
          {...etat2}
        />

        <LigneChamp id="absence_message_fr" libelle={libelles.absenceFr} aide={libelles.absenceTexteAide}>
          <textarea
            id="absence_message_fr"
            name="absence_message_fr"
            rows={3}
            maxLength={300}
            defaultValue={reglages.absenceMessageFr}
            aria-describedby="absence_message_fr-aide"
            className={ZONE}
          />
        </LigneChamp>

        <LigneChamp id="absence_message_en" libelle={libelles.absenceEn}>
          <textarea
            id="absence_message_en"
            name="absence_message_en"
            rows={3}
            maxLength={300}
            defaultValue={reglages.absenceMessageEn}
            className={ZONE}
          />
        </LigneChamp>
      </Carte>

      {/* --------------------------- Parties du site -------------------------- */}
      {/* La carte la plus proche de la capture Wix : quatre interrupteurs,
          chacun avec son état et ce que le couper provoque. */}
      <Carte titre={libelles.groupeFonctions} aide={libelles.groupeFonctionsAide}>
        <LigneInterrupteur
          nom="panier_actif"
          libelle={libelles.panier}
          aide={libelles.panierAide}
          defaut={reglages.panierActif}
          {...etat2}
        />
        <LigneInterrupteur
          nom="solutions_modulaires"
          libelle={libelles.modulaires}
          aide={libelles.modulairesAide}
          defaut={reglages.solutionsModulaires}
          {...etat2}
        />
        <LigneInterrupteur
          nom="boutique_active"
          libelle={libelles.boutiqueActive}
          aide={libelles.boutiqueActiveAide}
          defaut={reglages.boutiqueActive}
          {...etat2}
        />
        <LigneInterrupteur
          nom="concours_actif"
          libelle={libelles.concoursActif}
          aide={libelles.concoursActifAide}
          defaut={reglages.concoursActif}
          {...etat2}
        />
      </Carte>

      {/* Barre d'action — reste en bas, hors des cartes. */}
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
