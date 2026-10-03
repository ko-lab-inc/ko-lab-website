'use client'

import { useActionState } from 'react'

import {
  repondreCandidatRefus,
  type EtatReponseCandidat,
} from '@/app/(admin)/[locale]/admin/candidatures/actions'
import { buttonVariants } from '@/components/ui/Button'

/**
 * Prévenir un candidat que sa candidature n'est pas retenue — migration 0054.
 *
 * ---------------------------------------------------------------------------
 * ⚠️ CE BOUTON EST LE SEUL DE L'ADMINISTRATION QUI MET FIN À UNE RELATION
 *
 * Il n'est pas branché sur le changement de statut, et c'est le point entier
 * de sa conception : classer un dossier et écrire à la personne sont deux
 * gestes séparés. On peut faire le premier sans jamais faire le second.
 *
 * Trois choses le rendent difficile à déclencher par distraction :
 *
 *   1. Il n'apparaît QUE sur un dossier déjà marqué « non retenue ».
 *   2. Il demande une confirmation qui AFFICHE L'ADRESSE — c'est le détail qui
 *      rattrape le mauvais dossier ouvert. Même patron que l'invitation
 *      livreur et que les suppressions ailleurs dans le projet.
 *   3. Une fois parti, il disparaît et laisse la date à sa place. L'action
 *      serveur refuse de toute façon un second envoi.
 *
 * Le libellé dit ce qui va se passer (« envoyer la réponse »), pas où l'on
 * clique. Personne ne doit découvrir après coup qu'un courriel est parti.
 */

export type TextesReponseCandidat = {
  titre: string
  /** Décrit ce que le courriel contient, AVANT de cliquer. */
  aide: string
  envoyer: string
  /** Préfixe du `confirm()` — l'adresse est ajoutée en dessous. */
  confirmer: string
  enCours: string
  succes: string
  /** `{date}` interpolé côté serveur. */
  dejaEnvoyeeLe: string
  erreurRefuse: string
  erreurIntrouvable: string
  erreurPasEligible: string
  erreurDejaEnvoyee: string
  /** `{raison}` interpolé ici. */
  erreurEnvoi: string
  erreurTropDeTentatives: string
  erreurServeur: string
}

export function ReponseCandidat({
  id,
  email,
  locale,
  textes,
}: {
  id: string
  email: string
  locale: string
  textes: TextesReponseCandidat
}) {
  const [etat, action, enCours] = useActionState<EtatReponseCandidat, FormData>(
    repondreCandidatRefus,
    {},
  )

  const messages: Record<string, string> = {
    refuse: textes.erreurRefuse,
    introuvable: textes.erreurIntrouvable,
    pas_eligible: textes.erreurPasEligible,
    deja_envoyee: textes.erreurDejaEnvoyee,
    trop_de_tentatives: textes.erreurTropDeTentatives,
    serveur: textes.erreurServeur,
  }
  const erreur = etat.erreur
    ? etat.erreur === 'envoi'
      ? textes.erreurEnvoi.replace('{raison}', etat.raison ?? '—')
      : (messages[etat.erreur] ?? textes.erreurServeur)
    : null

  if (etat.succes) {
    return (
      <p role="status" className="text-sm font-medium text-ko-ink">
        {textes.succes}
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs leading-relaxed text-ko-muted">{textes.aide}</p>
      <form
        action={action}
        onSubmit={(e) => {
          // L'adresse DANS la confirmation : c'est elle qui rattrape le
          // mauvais dossier resté ouvert dans la modale.
          if (!confirm(`${textes.confirmer}\n\n${email}`)) e.preventDefault()
        }}
      >
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="locale" value={locale} />
        <button
          type="submit"
          disabled={enCours}
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
        >
          {enCours ? textes.enCours : textes.envoyer}
        </button>
      </form>
      {erreur && (
        <p role="alert" className="text-sm leading-relaxed text-ko-ink">
          {erreur}
        </p>
      )}
    </div>
  )
}
