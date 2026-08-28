'use client'

import { useState } from 'react'

import { EnteteAdmin, EnteteTableau, PanneauAdmin } from '@/components/layout/CadreAdmin'
import { InvitationLivreur, type TextesInvitationLivreur } from '@/components/sections/InvitationLivreur'
import { LienActivation } from '@/components/ui/LienActivation'
import { IconeFermer } from '@/components/ui/Icones'

export type CandidatLivreur = {
  id: string
  nom: string
  telephone: string
  email: string
  ville: string
  /** Déjà formatée côté serveur — jamais une fonction en prop (RSC). */
  dateFormatee: string
  /** `poste_id` NULL — le rétroremplissage n'a rattaché aucun poste avec certitude. */
  incertain: boolean
}

type ResultatInvitation = { courrielEnvoye: boolean; raisonEchecCourriel?: string; lien: string }

/**
 * Répertoire des candidatures retenues pour « Chauffeur-livreur », PAS
 * ENCORE invitées — étape 3/3, migration 0045 (27 août 2026, Moussa).
 *
 * ---------------------------------------------------------------------------
 * POURQUOI CE N'EST PAS UN QUATRIÈME `ListeProfils`
 *
 * Utilisateurs, Vendeurs et Livreurs partagent tous la même table `profils` —
 * ListeProfils lit un COMPTE, avec identifiants et rôle. Une candidature n'en
 * a pas ENCORE : c'est un formulaire public, sans connexion (migration 0017),
 * jusqu'à ce qu'une invitation lui en crée un.
 *
 * ---------------------------------------------------------------------------
 * DÉCISION RENVERSÉE — ce composant est maintenant INTERACTIF
 *
 * Jusqu'à l'étape 2/3, ce répertoire était strictement en lecture seule
 * (« aucun compte ni accès au site n'est créé pour ces personnes », décision
 * de Christian). Renversé : chaque ligne porte désormais un bouton
 * d'invitation (InvitationLivreur.tsx, partagé avec TableauCandidatures.tsx
 * — « réutilise le code existant »). Une fois invitée, la candidature obtient
 * `invitation_envoyee_le` et disparaît de la requête de page.tsx (filtrée sur
 * `invitation_envoyee_le is null`) — elle n'a donc plus sa place ICI, la
 * personne apparaît dans ListeProfils juste au-dessus à la place.
 *
 * ---------------------------------------------------------------------------
 * ⚠️ COMPOSANT CLIENT, PAS PAR CHOIX DE STYLE — bug réel corrigé le 27 août 2026
 *
 * `inviterCandidatLivreur` revalide `/admin/livreurs` (pour que la personne
 * apparaisse dans ListeProfils sans recharger la page à la main). Testé : ça
 * refait aussitôt la requête serveur de CETTE page, qui ne renvoie plus la
 * candidature tout juste invitée — son `<li>` disparaissait du DOM avant que
 * l'admin ait pu lire ou copier le lien d'activation, souvent en moins d'une
 * seconde. `succesRecents` capture le résultat de CHAQUE invitation réussie
 * (via `onSucces`, voir InvitationLivreur.tsx) et continue de l'afficher
 * indépendamment de `candidats` (qui, lui, vient d'un nouveau rendu serveur
 * et ne la contient plus) — jusqu'à ce que l'admin la ferme explicitement
 * (bouton ×) ou quitte la page. C'est aussi pour ça que le calcul « bloc
 * vide, donc rien à afficher » (point 4) vit maintenant ICI, pas dans
 * page.tsx : page.tsx sait seulement si des candidatures ATTENDENT une
 * invitation, jamais si une invitation vient tout juste de réussir dans le
 * navigateur de l'admin.
 * ---------------------------------------------------------------------------
 */
export function RepertoireLivreurs({
  candidats,
  locale,
  titre,
  intro,
  colonnes,
  invitation,
}: {
  candidats: CandidatLivreur[]
  locale: string
  titre: string
  intro: string
  colonnes: string[]
  invitation: TextesInvitationLivreur
}) {
  const [succesRecents, setSuccesRecents] = useState<Record<string, { candidat: CandidatLivreur; resultat: ResultatInvitation }>>(
    {},
  )

  function fermer(id: string) {
    setSuccesRecents((s) => {
      const { [id]: _retire, ...reste } = s
      return reste
    })
  }

  // Une candidature qui vient de réussir localement ne doit pas apparaître
  // DEUX fois si jamais elle réapparaissait dans `candidats` (ne devrait
  // jamais arriver — invitation_envoyee_le est désormais posé — mais un
  // doublon visuel serait pire qu'une vérification en trop).
  const enAttente = candidats.filter((c) => !(c.id in succesRecents))
  const recents = Object.entries(succesRecents)

  if (enAttente.length === 0 && recents.length === 0) return null

  return (
    <div className="mt-10">
      <EnteteAdmin titre={titre} intro={intro} />

      <PanneauAdmin sansPadding>
        <EnteteTableau colonnes={colonnes} />
        <ul className="divide-y divide-ko-line">
          {enAttente.map((c) => (
            <li key={c.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:gap-6">
              <div className="min-w-0 flex-1">
                <p className="truncate text-base text-ko-ink">{c.nom}</p>
                <p className="mt-0.5 truncate font-mono text-xs text-ko-muted">{c.email}</p>
              </div>
              <span className="shrink-0 text-sm text-ko-muted">{c.telephone}</span>
              <span className="shrink-0 text-sm text-ko-muted">{c.ville}</span>
              <span className="shrink-0 font-mono text-xs text-ko-muted">{c.dateFormatee}</span>
              <div className="shrink-0 sm:w-64">
                <InvitationLivreur
                  id={c.id}
                  email={c.email}
                  locale={locale}
                  incertain={c.incertain}
                  textes={invitation}
                  onSucces={(resultat) => setSuccesRecents((s) => ({ ...s, [c.id]: { candidat: c, resultat } }))}
                />
              </div>
            </li>
          ))}

          {recents.map(([id, { candidat, resultat }]) => (
            <li key={id} className="flex flex-col gap-3 bg-ko-cream px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-base text-ko-ink">{candidat.nom}</p>
                  <p className="mt-0.5 truncate font-mono text-xs text-ko-muted">{candidat.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => fermer(id)}
                  aria-label={invitation.fermer}
                  title={invitation.fermer}
                  className="flex h-9 w-9 shrink-0 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink"
                >
                  <IconeFermer taille={16} />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-ko-ink">
                  {resultat.courrielEnvoye ? invitation.succesTitre : invitation.courrielEchecTitre}
                </p>
                <p className="text-sm leading-relaxed text-ko-ink">
                  {resultat.courrielEnvoye
                    ? invitation.succesTexte
                    : invitation.courrielEchecTexte.replace('{raison}', resultat.raisonEchecCourriel ?? '—')}
                </p>
                <LienActivation
                  lien={resultat.lien}
                  libelles={{
                    label: invitation.lienLabel,
                    aide: invitation.lienAide,
                    copier: invitation.lienCopier,
                    copie: invitation.lienCopie,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      </PanneauAdmin>
    </div>
  )
}
