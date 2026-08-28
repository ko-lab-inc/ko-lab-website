'use client'

import { useActionState } from 'react'

import { inviterCandidatLivreur, type EtatInvitationCandidat } from '@/app/(admin)/[locale]/admin/candidatures/actions'
import { buttonVariants } from '@/components/ui/Button'
import { LienActivation } from '@/components/ui/LienActivation'

export type TextesInvitationLivreur = {
  inviter: string
  /** Préfixe du `confirm()` — l'adresse de la personne est ajoutée après, même patron que confirmerSuppression ailleurs dans le projet. */
  confirmer: string
  incertain: string
  enCours: string
  /** Bouton × de RepertoireLivreurs.tsx uniquement — clé générique `t('fermer')`, sans rapport avec l'invitation elle-même. */
  fermer: string
  succesTitre: string
  succesTexte: string
  courrielEchecTitre: string
  /** `{raison}` interpolé côté client — voir ModaleInvitation.tsx. */
  courrielEchecTexte: string
  lienLabel: string
  lienAide: string
  lienCopier: string
  lienCopie: string
  erreurRefuse: string
  erreurExisteDeja: string
  erreurIntrouvable: string
  erreurPasEligible: string
  erreurTropDeTentatives: string
  erreurServeur: string
}

/**
 * Bouton + résultat de l'invitation d'une candidature retenue comme livreur
 * — étape 3/3 (migration 0045). Partagé entre TableauCandidatures.tsx (voir
 * le détail d'UNE candidature) et RepertoireLivreurs.tsx (liste des
 * candidatures retenues pas encore invitées) : « réutilise le code
 * d'invitation existant, ne le duplique pas » couvre aussi bien l'ACTION
 * (inviterCandidatLivreur) que ce COMPOSANT — deux endroits, un seul bouton.
 *
 * `incertain` : `true` quand `poste_id` est NULL sur cette candidature (le
 * rétroremplissage n'a rattaché aucun poste avec certitude) — l'appelant
 * décide déjà s'il affiche ce composant dans ce cas (voir ses deux
 * consommateurs), ce booléen ne sert ici qu'à AFFICHER l'avertissement, pas
 * à décider si le bouton apparaît. Le serveur (inviterCandidatLivreur)
 * revérifie `poste_id` de toute façon — ce composant ne fait jamais
 * confiance à ce qu'on lui passe pour l'autorisation, seulement pour
 * l'affichage.
 *
 * ⚠️ `onSucces` — bug réel trouvé en testant RepertoireLivreurs.tsx : cette
 * action y `revalidatePath` /admin/livreurs (pour que la personne invitée
 * apparaisse dans ListeProfils juste au-dessus), ce qui refait aussitôt la
 * requête serveur de la page — laquelle ne renvoie plus CETTE candidature,
 * puisqu'elle porte désormais `invitation_envoyee_le`. Le `<li>` qui
 * contient ce composant disparaît alors du DOM avant que l'admin ait pu
 * lire ou copier le lien, souvent en moins d'une seconde. `onSucces` laisse
 * l'appelant CAPTURER le résultat avant que ça n'arrive, pour continuer à
 * l'afficher lui-même indépendamment de la liste — voir RepertoireLivreurs.tsx.
 * TableauCandidatures.tsx (le détail d'une candidature) n'a pas ce problème
 * — sa modale ne disparaît jamais sous l'effet d'une revalidation — donc il
 * n'a pas besoin de ce callback, seulement du rendu de secours ci-dessous.
 */
export function InvitationLivreur({
  id,
  email,
  locale,
  incertain,
  textes,
  onSucces,
}: {
  id: string
  email: string
  locale: string
  incertain: boolean
  textes: TextesInvitationLivreur
  onSucces?: (resultat: { courrielEnvoye: boolean; raisonEchecCourriel?: string; lien: string }) => void
}) {
  // `onSucces` appelé DEPUIS le wrapper de l'action, pas depuis un
  // `useEffect` sur `etat` — un `useEffect` s'est révélé trop tard : la
  // revalidation déclenchée par `inviterCandidatLivreur` (elle retire cette
  // candidature de la page /admin/livreurs) et la mise à jour de `etat`
  // arrivent dans le MÊME cycle, et React peut démonter ce composant avant
  // que l'effet planifié n'ait eu la main — constaté en test, le rappel ne
  // partait jamais. Ici, `onSucces` s'exécute à l'intérieur de la promesse
  // de l'action elle-même, avant que quoi que ce soit ne se re-rende —
  // garanti d'avoir lieu, quel que soit le sort de CE composant ensuite.
  const [etat, action, enCours] = useActionState<EtatInvitationCandidat, FormData>(
    async (precedent, donnees) => {
      const resultat = await inviterCandidatLivreur(precedent, donnees)
      if (resultat.succes && resultat.lien) {
        onSucces?.({
          courrielEnvoye: resultat.courrielEnvoye ?? false,
          raisonEchecCourriel: resultat.raisonEchecCourriel,
          lien: resultat.lien,
        })
      }
      return resultat
    },
    {},
  )

  const messages: Record<string, string> = {
    refuse: textes.erreurRefuse,
    existe_deja: textes.erreurExisteDeja,
    introuvable: textes.erreurIntrouvable,
    pas_eligible: textes.erreurPasEligible,
    trop_de_tentatives: textes.erreurTropDeTentatives,
    serveur: textes.erreurServeur,
  }
  const erreur = etat.erreur ? (messages[etat.erreur] ?? textes.erreurServeur) : null

  if (etat.succes) {
    const titre = etat.courrielEnvoye ? textes.succesTitre : textes.courrielEchecTitre
    const texte = etat.courrielEnvoye
      ? textes.succesTexte
      : textes.courrielEchecTexte.replace('{raison}', etat.raisonEchecCourriel ?? '—')

    return (
      <div className="space-y-3">
        <p className="text-sm font-medium text-ko-ink">{titre}</p>
        <p className="text-sm leading-relaxed text-ko-ink">{texte}</p>
        {etat.lien && (
          <LienActivation
            lien={etat.lien}
            libelles={{
              label: textes.lienLabel,
              aide: textes.lienAide,
              copier: textes.lienCopier,
              copie: textes.lienCopie,
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {incertain && <p className="text-xs leading-relaxed text-ko-muted">{textes.incertain}</p>}
      <form
        action={action}
        onSubmit={(e) => {
          if (!confirm(`${textes.confirmer}\n\n${email}`)) e.preventDefault()
        }}
      >
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="locale" value={locale} />
        <button type="submit" disabled={enCours} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          {enCours ? textes.enCours : textes.inviter}
        </button>
      </form>
      {erreur && (
        <p role="alert" className="text-sm text-ko-ink">
          {erreur}
        </p>
      )}
    </div>
  )
}
