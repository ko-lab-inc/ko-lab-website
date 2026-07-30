'use client'

import { useActionState } from 'react'

import { connecter, type EtatConnexion } from '@/app/(marketing)/[locale]/connexion/actions'
import { buttonVariants } from '@/components/ui/Button'
import { ChampMotDePasse } from '@/components/ui/ChampMotDePasse'
import { cn } from '@/lib/utils/cn'

/**
 * Formulaire de connexion de l'espace équipe.
 *
 * Libellés reçus en props et résolus côté serveur, plutôt que par
 * useTranslations : c'est le modèle privilégié du projet (voir layout.tsx), et
 * ça évite d'élargir la liste blanche de messages envoyée au navigateur pour
 * une page que presque personne n'ouvre.
 *
 * ⚠️ Se connecter n'ouvre AUCUN droit de gestion. Un compte créé depuis le
 * site arrive en 'client' (défaut posé par 0004) : il sert au panier et au
 * suivi de ses demandes, rien d'autre. Les rôles admin, editor, vendeur et
 * livreur ne s'attribuent qu'en base, jamais par l'inscription.
 */

type Libelles = {
  courriel: string
  motDePasse: string
  afficherMotDePasse: string
  masquerMotDePasse: string
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
}: {
  locale: string
  suivant?: string
  libelles: Libelles
}) {
  const [etat, action, enCours] = useActionState<EtatConnexion, FormData>(connecter, {})
  const idEmail = 'email'
  const idMotDePasse = 'motDePasse'

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

      <ChampMotDePasse
        id={idMotDePasse}
        name="motDePasse"
        required
        // `current-password` : indique aux gestionnaires de mots de passe
        // qu'il s'agit d'une connexion, pas d'une création de compte.
        autoComplete="current-password"
        maxLength={200}
        libelle={libelles.motDePasse}
        libelleAfficher={libelles.afficherMotDePasse}
        libelleMasquer={libelles.masquerMotDePasse}
      />

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
