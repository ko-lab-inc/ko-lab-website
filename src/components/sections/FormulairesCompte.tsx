'use client'

import { useActionState } from 'react'

import {
  changerMotDePasse,
  demanderReinitialisation,
  inscrire,
  type EtatInscription,
  type EtatMotDePasse,
} from '@/app/(marketing)/[locale]/connexion/actions-compte'
import { buttonVariants } from '@/components/ui/Button'
import { ChampAuth } from '@/components/ui/ChampAuth'
import { cn } from '@/lib/utils/cn'

/**
 * Les trois formulaires du parcours de compte, hors connexion.
 *
 * Regroupés dans un fichier : ils partagent la même mécanique
 * (useActionState, un bloc d'erreur, un bouton pleine largeur) et font une
 * quinzaine de lignes chacun. Trois fichiers imposeraient de vérifier trois
 * endroits à chaque retouche du parcours.
 *
 * Libellés reçus en props, résolus côté serveur — modèle du projet, et ça
 * évite d'élargir la liste blanche des messages envoyés au navigateur.
 */

function Erreur({ message }: { message: string | null }) {
  if (!message) return null
  // role=alert : le message apparaît après coup, un lecteur d'écran ne le
  // remarquerait pas sans être averti.
  return (
    <p role="alert" className="text-sm leading-relaxed text-ko-ink">
      {message}
    </p>
  )
}

/* ========================================================================== */

export function FormulaireInscription({
  locale,
  libelles,
}: {
  locale: string
  libelles: {
    courriel: string
    motDePasse: string
    aideMotDePasse: string
    confirmation: string
    creer: string
    enCours: string
    succesTitre: string
    succesTexte: string
    erreurDonnees: string
    erreurConfirmation: string
    erreurTentatives: string
    erreurRefuse: string
    erreurCourriel: string
    erreurServeur: string
  }
}) {
  const [etat, action, enCours] = useActionState<EtatInscription, FormData>(inscrire, {})

  if (etat.succes) {
    return (
      <div className="mt-8 border border-ko-line bg-ko-white p-6">
        <p className="ko-h3 text-[20px] text-ko-ink">{libelles.succesTitre}</p>
        <p className="mt-3 text-base leading-relaxed text-ko-muted">{libelles.succesTexte}</p>
      </div>
    )
  }

  const message =
    etat.erreur === 'confirmation'
      ? libelles.erreurConfirmation
      : etat.erreur === 'trop_de_tentatives'
        ? libelles.erreurTentatives
        : etat.erreur === 'refuse'
          ? libelles.erreurRefuse
          : etat.erreur === 'courriel'
            ? libelles.erreurCourriel
            : etat.erreur === 'serveur'
              ? libelles.erreurServeur
              : etat.erreur
                ? libelles.erreurDonnees
                : null

  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <ChampAuth
        id="email"
        name="email"
        type="email"
        required
        autoComplete="email"
        maxLength={200}
        libelle={libelles.courriel}
      />
      <ChampAuth
        id="motDePasse"
        name="motDePasse"
        type="password"
        required
        minLength={10}
        maxLength={200}
        // `new-password` : indique au gestionnaire de mots de passe qu'il faut
        // en proposer un nouveau, pas remplir l'existant.
        autoComplete="new-password"
        libelle={libelles.motDePasse}
        aide={libelles.aideMotDePasse}
      />
      <ChampAuth
        id="confirmation"
        name="confirmation"
        type="password"
        required
        maxLength={200}
        autoComplete="new-password"
        libelle={libelles.confirmation}
      />
      <Erreur message={message} />
      <button
        type="submit"
        disabled={enCours}
        className={cn('w-full', buttonVariants({ variant: 'primary' }))}
      >
        {enCours ? libelles.enCours : libelles.creer}
      </button>
    </form>
  )
}

/* ========================================================================== */

export function FormulaireOubli({
  locale,
  libelles,
}: {
  locale: string
  libelles: {
    courriel: string
    envoyer: string
    enCours: string
    succesTitre: string
    succesTexte: string
    erreurTentatives: string
    erreurServeur: string
  }
}) {
  const [etat, action, enCours] = useActionState<EtatMotDePasse, FormData>(
    demanderReinitialisation,
    {},
  )

  if (etat.succes) {
    return (
      <div className="mt-8 border border-ko-line bg-ko-white p-6">
        <p className="ko-h3 text-[20px] text-ko-ink">{libelles.succesTitre}</p>
        <p className="mt-3 text-base leading-relaxed text-ko-muted">{libelles.succesTexte}</p>
      </div>
    )
  }

  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <ChampAuth
        id="email"
        name="email"
        type="email"
        required
        autoComplete="email"
        maxLength={200}
        libelle={libelles.courriel}
      />
      <Erreur
        message={
          etat.erreur === 'trop_de_tentatives'
            ? libelles.erreurTentatives
            : etat.erreur
              ? libelles.erreurServeur
              : null
        }
      />
      <button
        type="submit"
        disabled={enCours}
        className={cn('w-full', buttonVariants({ variant: 'primary' }))}
      >
        {enCours ? libelles.enCours : libelles.envoyer}
      </button>
    </form>
  )
}

/* ========================================================================== */

export function FormulaireNouveauMotDePasse({
  locale,
  libelles,
}: {
  locale: string
  libelles: {
    motDePasse: string
    aideMotDePasse: string
    confirmation: string
    enregistrer: string
    enCours: string
    erreurDonnees: string
    erreurServeur: string
  }
}) {
  const [etat, action, enCours] = useActionState<EtatMotDePasse, FormData>(changerMotDePasse, {})

  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <ChampAuth
        id="motDePasse"
        name="motDePasse"
        type="password"
        required
        minLength={10}
        maxLength={200}
        autoComplete="new-password"
        libelle={libelles.motDePasse}
        aide={libelles.aideMotDePasse}
      />
      <ChampAuth
        id="confirmation"
        name="confirmation"
        type="password"
        required
        maxLength={200}
        autoComplete="new-password"
        libelle={libelles.confirmation}
      />
      <Erreur
        message={
          etat.erreur === 'donnees'
            ? libelles.erreurDonnees
            : etat.erreur
              ? libelles.erreurServeur
              : null
        }
      />
      <button
        type="submit"
        disabled={enCours}
        className={cn('w-full', buttonVariants({ variant: 'primary' }))}
      >
        {enCours ? libelles.enCours : libelles.enregistrer}
      </button>
    </form>
  )
}
