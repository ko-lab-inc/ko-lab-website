'use client'

import { useActionState } from 'react'

import { connecter, type EtatConnexion } from '@/app/(marketing)/[locale]/connexion/actions'
import { buttonVariants } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'

/**
 * Formulaire de connexion de l'espace équipe.
 *
 * Libellés reçus en props et résolus côté serveur, plutôt que par
 * useTranslations : c'est le modèle privilégié du projet (voir layout.tsx), et
 * ça évite d'élargir la liste blanche de messages envoyée au navigateur pour
 * une page que presque personne n'ouvre.
 *
 * ⚠️ Pas de bouton « Créer un compte », et c'est délibéré : l'inscription
 * publique est fermée sur le projet Supabase, et un compte créé librement
 * arriverait de toute façon en 'invite', sans aucun droit (migration 0004).
 * Les comptes se créent par invitation depuis l'espace admin.
 */

type Libelles = {
  courriel: string
  motDePasse: string
  seConnecter: string
  enCours: string
  erreurIdentifiants: string
  erreurTentatives: string
  erreurServeur: string
}

export function FormulaireConnexion({
  locale,
  suivant,
  libelles,
  prefixe = '',
}: {
  locale: string
  suivant?: string
  libelles: Libelles
  /**
   * Préfixe des `id` de champs.
   *
   * ⚠️ Obligatoire dès qu'un second exemplaire de ce formulaire peut coexister
   * dans le même document — c'est le cas du modal ouvert par-dessus une page.
   * Deux `id="email"` dans une même page, et `<label for="email">` s'associe
   * au PREMIER dans l'ordre du document : cliquer le libellé du modal donnait
   * le focus au champ de la page, derrière le fond assombri.
   */
  prefixe?: string
}) {
  const [etat, action, enCours] = useActionState<EtatConnexion, FormData>(connecter, {})
  const idEmail = `${prefixe}email`
  const idMotDePasse = `${prefixe}motDePasse`

  const message =
    etat.erreur === 'identifiants'
      ? libelles.erreurIdentifiants
      : etat.erreur === 'trop_de_tentatives'
        ? libelles.erreurTentatives
        : etat.erreur === 'serveur'
          ? libelles.erreurServeur
          : null

  return (
    <form action={action} className="mt-8 space-y-4">
      {/* La langue et la destination voyagent dans le formulaire : une Server
          Action ne reçoit ni l'URL courante ni les paramètres de requête. */}
      <input type="hidden" name="locale" value={locale} />
      {suivant && <input type="hidden" name="suivant" value={suivant} />}

      <div>
        <label htmlFor={idEmail} className="label-mono mb-2 block text-ko-muted">
          {libelles.courriel}
        </label>
        <input
          id={idEmail}
          name="email"
          type="email"
          required
          autoComplete="email"
          maxLength={200}
          className="min-h-[44px] w-full border border-ko-line bg-ko-white px-4 py-3 text-base text-ko-ink transition-colors duration-200 focus:border-ko-blue focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor={idMotDePasse} className="label-mono mb-2 block text-ko-muted">
          {libelles.motDePasse}
        </label>
        <input
          id={idMotDePasse}
          name="motDePasse"
          type="password"
          required
          // `current-password` : indique aux gestionnaires de mots de passe
          // qu'il s'agit d'une connexion, pas d'une création de compte.
          autoComplete="current-password"
          maxLength={200}
          className="min-h-[44px] w-full border border-ko-line bg-ko-white px-4 py-3 text-base text-ko-ink transition-colors duration-200 focus:border-ko-blue focus:outline-none"
        />
      </div>

      {message && (
        // role=alert : l'erreur apparaît après coup, un lecteur d'écran ne la
        // verrait pas sans être averti.
        <p role="alert" className="text-sm leading-relaxed text-ko-ink">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={enCours}
        className={cn('w-full', buttonVariants({ variant: 'primary' }))}
      >
        {enCours ? libelles.enCours : libelles.seConnecter}
      </button>
    </form>
  )
}
