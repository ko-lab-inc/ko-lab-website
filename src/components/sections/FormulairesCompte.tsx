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
import { ChampMotDePasse } from '@/components/ui/ChampMotDePasse'
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
  suivant,
  libelles,
}: {
  locale: string
  /**
   * Où revenir une fois le courriel de confirmation cliqué — porté jusqu'à
   * `inscrire()` par un champ caché, exactement comme dans FormulaireConnexion.
   * Brut, non validé ici : la Server Action revalide avant de s'en servir.
   */
  suivant?: string
  libelles: {
    nom: string
    courriel: string
    motDePasse: string
    aideMotDePasse: string
    confirmation: string
    afficher: string
    masquer: string
    creer: string
    enCours: string
    succesTitre: string
    succesTexte: string
    erreurDonnees: string
    erreurConfirmation: string
    erreurFaible: string
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

  // Table plutôt qu'une cascade de ternaires : sept cas imbriqués devenaient
  // impossibles à relire, et l'indentation ne suivait plus la logique.
  const messages: Record<string, string> = {
    confirmation: libelles.erreurConfirmation,
    faible: libelles.erreurFaible,
    trop_de_tentatives: libelles.erreurTentatives,
    refuse: libelles.erreurRefuse,
    courriel: libelles.erreurCourriel,
    serveur: libelles.erreurServeur,
  }
  const message = etat.erreur ? (messages[etat.erreur] ?? libelles.erreurDonnees) : null

  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="locale" value={locale} />
      {suivant && <input type="hidden" name="suivant" value={suivant} />}
      <ChampAuth
        id="nom"
        name="nom"
        type="text"
        required
        minLength={2}
        maxLength={120}
        autoComplete="name"
        libelle={libelles.nom}
      />
      <ChampAuth
        id="email"
        name="email"
        type="email"
        required
        autoComplete="email"
        maxLength={200}
        libelle={libelles.courriel}
      />
      <ChampMotDePasse
        id="motDePasse"
        name="motDePasse"
        required
        minLength={8}
        maxLength={200}
        // `new-password` : indique au gestionnaire de mots de passe qu'il faut
        // en proposer un nouveau, pas remplir l'existant.
        autoComplete="new-password"
        libelle={libelles.motDePasse}
        aide={libelles.aideMotDePasse}
        libelleAfficher={libelles.afficher}
        libelleMasquer={libelles.masquer}
      />
      <ChampMotDePasse
        id="confirmation"
        name="confirmation"
        required
        maxLength={200}
        autoComplete="new-password"
        libelle={libelles.confirmation}
        libelleAfficher={libelles.afficher}
        libelleMasquer={libelles.masquer}
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
    afficher: string
    masquer: string
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
      <ChampMotDePasse
        id="motDePasse"
        name="motDePasse"
        required
        minLength={8}
        maxLength={200}
        autoComplete="new-password"
        libelle={libelles.motDePasse}
        aide={libelles.aideMotDePasse}
        libelleAfficher={libelles.afficher}
        libelleMasquer={libelles.masquer}
      />
      <ChampMotDePasse
        id="confirmation"
        name="confirmation"
        required
        maxLength={200}
        autoComplete="new-password"
        libelle={libelles.confirmation}
        libelleAfficher={libelles.afficher}
        libelleMasquer={libelles.masquer}
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
