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
  groupeFonctions: string
  groupeFonctionsAide: string
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
  enregistrer: string
  enCours: string
  succes: string
  erreurDonnees: string
  erreurRefuse: string
  erreurServeur: string
}

const CHAMP =
  'min-h-[40px] w-full border border-ko-line bg-ko-white px-3 py-2 text-sm text-ko-ink transition-colors duration-200 focus:border-ko-blue focus:outline-none'

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
          <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-ko-white shadow-sm transition-transform duration-200 group-has-[:checked]:translate-x-5" />
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
  libelles,
}: {
  locale: string
  reglages: Reglages
  libelles: LibellesReglages
}) {
  const [etat, action, enCours] = useActionState<EtatReglages, FormData>(
    enregistrerReglages,
    {},
  )

  const messages: Record<string, string> = {
    donnees: libelles.erreurDonnees,
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
          <p role="status" className="text-sm text-ko-blue">
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
