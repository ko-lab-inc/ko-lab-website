'use client'

import { useActionState } from 'react'

import {
  changerRole,
  renvoyerInvitation,
  supprimerUtilisateur,
  type EtatRenvoiInvitation,
  type EtatRole,
} from '@/app/(admin)/[locale]/admin/utilisateurs/actions'
import { buttonVariants } from '@/components/ui/Button'
import { IconePoubelle } from '@/components/ui/Icones'
import { LienActivation } from '@/components/ui/LienActivation'
import { cn } from '@/lib/utils/cn'
import type { Role } from '@/types'

/**
 * Une ligne du tableau des utilisateurs, avec son sélecteur de rôle.
 *
 * Un formulaire PAR LIGNE plutôt qu'un formulaire global : chaque changement
 * est indépendant, et une soumission unique obligerait à deviner lesquelles
 * des lignes ont bougé — puis à écrire toutes les autres pour rien.
 *
 * ⚠️ Ce composant n'applique aucune règle d'autorisation. Il masque le
 * sélecteur pour un non-administrateur, mais c'est du confort d'affichage :
 * la décision est prise dans la Server Action et, en dernier ressort, par la
 * politique RLS `profils_maj_admin`. Masquer un contrôle n'a jamais empêché
 * personne d'appeler l'action directement.
 */
export function LigneUtilisateur({
  id,
  courriel,
  role,
  cree,
  estSoi,
  peutModifier,
  locale,
  origine,
  libelles,
}: {
  id: string
  courriel: string
  role: Role
  cree: string
  estSoi: boolean
  peutModifier: boolean
  locale: string
  /**
   * Origine du compte et statut d'activation — /admin/utilisateurs
   * seulement (étape 2/3, migration 0045). `undefined` sur /admin/vendeurs
   * et /admin/livreurs, qui n'affichent pas cette colonne : ListeProfils ne
   * la leur passe pas, voir son en-tête. Vient de `auth.users`
   * (invited_at, email_confirmed_at) — jamais lu par PostgREST/RLS, d'où le
   * calcul en amont, dans la page, à la clé de service.
   */
  origine?: { viaInvitation: boolean; actif: boolean }
  libelles: {
    roles: Record<Role, string>
    enregistrer: string
    soiMeme: string
    erreurRefuse: string
    erreurSoiMeme: string
    erreurServeur: string
    supprimer: string
    confirmerSuppression: string
    /** Utilisés seulement si `origine` est fourni — voir sa note. */
    origineInvitation?: string
    origineInscription?: string
    statutActif?: string
    statutEnAttente?: string
    /**
     * Renvoi d'invitation — point 3 de la correction du 27 août 2026.
     * N'apparaissent que sur un compte `origine.viaInvitation && !origine.actif`.
     */
    renvoyer?: string
    renvoiEnCours?: string
    renvoiTitre?: string
    renvoiTexte?: string
    renvoiCourrielEchecTitre?: string
    /** `{raison}` interpolé côté client — voir ModaleInvitation.tsx. */
    renvoiCourrielEchecTexte?: string
    lienLabel?: string
    lienAide?: string
    lienCopier?: string
    lienCopie?: string
    erreurRenvoiIntrouvable?: string
    erreurRenvoiPasInvite?: string
    erreurRenvoiDejaActif?: string
    erreurRenvoiTentatives?: string
    erreurRenvoiServeur?: string
  }
}) {
  const [etat, action, enCours] = useActionState<EtatRole, FormData>(changerRole, {})
  const [etatRenvoi, actionRenvoi, renvoiEnCours] = useActionState<EtatRenvoiInvitation, FormData>(
    renvoyerInvitation,
    {},
  )

  const messages: Record<string, string> = {
    refuse: libelles.erreurRefuse,
    soi_meme: libelles.erreurSoiMeme,
    serveur: libelles.erreurServeur,
  }
  const erreur = etat.erreur ? (messages[etat.erreur] ?? libelles.erreurServeur) : null

  const peutRenvoyer = peutModifier && !estSoi && origine?.viaInvitation && !origine.actif

  const messagesRenvoi: Record<string, string | undefined> = {
    introuvable: libelles.erreurRenvoiIntrouvable,
    pas_invite: libelles.erreurRenvoiPasInvite,
    deja_actif: libelles.erreurRenvoiDejaActif,
    refuse: libelles.erreurRefuse,
    trop_de_tentatives: libelles.erreurRenvoiTentatives,
    serveur: libelles.erreurRenvoiServeur,
  }
  const erreurRenvoi = etatRenvoi.erreur ? (messagesRenvoi[etatRenvoi.erreur] ?? libelles.erreurRenvoiServeur) : null

  return (
    <li className="flex flex-col gap-3 px-6 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <p className="truncate text-base text-ko-ink">
            {courriel}
            {estSoi && <span className="ml-2 label-mono">{libelles.soiMeme}</span>}
          </p>
          <p className="mt-0.5 font-mono text-xs text-ko-muted">{cree}</p>
          {origine && (
            <p className="mt-0.5 font-mono text-xs text-ko-muted">
              {origine.viaInvitation ? libelles.origineInvitation : libelles.origineInscription}
              {' · '}
              {origine.actif ? libelles.statutActif : libelles.statutEnAttente}
            </p>
          )}
          {erreur && (
            <p role="alert" className="mt-1.5 text-sm text-ko-ink">
              {erreur}
            </p>
          )}
        </div>

        {peutModifier && !estSoi ? (
          <div className="flex shrink-0 items-center gap-2">
            <form action={action} className="flex items-center gap-2">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="locale" value={locale} />
              <label htmlFor={`role-${id}`} className="sr-only">
                {libelles.roles[role]}
              </label>
              <select
                id={`role-${id}`}
                name="role"
                defaultValue={role}
                className="min-h-[44px] border border-ko-line bg-ko-white px-3 text-sm text-ko-ink transition-colors duration-200 focus:border-ko-blue focus:outline-none"
              >
                {(Object.keys(libelles.roles) as Role[]).map((r) => (
                  <option key={r} value={r}>
                    {libelles.roles[r]}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={enCours}
                className={buttonVariants({ variant: 'ghost', size: 'sm' })}
              >
                {libelles.enregistrer}
              </button>
            </form>

            {/* Suppression — même geste que TableauRealisations/TableauVideos :
                un `confirm()` qui bloque la soumission au clic sur « Annuler ».
                L'action elle-même revérifie admin + anti-auto-suppression côté
                serveur (voir supprimerUtilisateur) : ce contrôle client n'est
                qu'un confort d'affichage, pas la barrière. */}
            <form
              action={supprimerUtilisateur}
              onSubmit={(e) => {
                if (!confirm(`${libelles.confirmerSuppression}\n\n${courriel}`)) e.preventDefault()
              }}
            >
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                aria-label={`${libelles.supprimer} — ${courriel}`}
                title={libelles.supprimer}
                className="flex h-9 w-9 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink"
              >
                <IconePoubelle taille={17} />
              </button>
            </form>

            {/* Renvoi d'invitation — point 3 de la correction du 27 août 2026.
                Seulement sur un compte invité jamais activé : réutilise le
                compte existant plutôt que d'obliger à le supprimer puis le
                recréer. */}
            {peutRenvoyer && (
              <form action={actionRenvoi}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="locale" value={locale} />
                <button
                  type="submit"
                  disabled={renvoiEnCours}
                  className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                >
                  {renvoiEnCours ? libelles.renvoiEnCours : libelles.renvoyer}
                </button>
              </form>
            )}
          </div>
        ) : (
          // Son propre compte, ou un éditeur qui regarde : le rôle reste lisible,
          // il n'est simplement pas modifiable ici.
          <span
            className={cn(
              'shrink-0 font-mono text-xs uppercase tracking-[0.14em]',
              role === 'client' ? 'text-ko-muted' : 'text-ko-ink',
            )}
          >
            {libelles.roles[role]}
          </span>
        )}
      </div>

      {/* Résultat du renvoi — pleine largeur, sous la ligne principale.
          `etatRenvoi.succes` couvre les DEUX issues (courriel accepté ou
          non par Resend), voir renvoyerInvitation dans actions.ts : le lien
          s'affiche dans les deux cas, jamais seulement en cas d'échec. */}
      {(etatRenvoi.succes || erreurRenvoi) && (
        <div className="border-t border-ko-line pt-3">
          {etatRenvoi.succes ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-ko-ink">
                {etatRenvoi.courrielEnvoye ? libelles.renvoiTitre : libelles.renvoiCourrielEchecTitre}
              </p>
              <p className="text-sm leading-relaxed text-ko-ink">
                {etatRenvoi.courrielEnvoye
                  ? libelles.renvoiTexte
                  : (libelles.renvoiCourrielEchecTexte ?? '').replace('{raison}', etatRenvoi.raisonEchecCourriel ?? '—')}
              </p>
              {etatRenvoi.lien && (
                <LienActivation
                  lien={etatRenvoi.lien}
                  libelles={{
                    label: libelles.lienLabel ?? '',
                    aide: libelles.lienAide,
                    copier: libelles.lienCopier ?? '',
                    copie: libelles.lienCopie ?? '',
                  }}
                />
              )}
            </div>
          ) : (
            <p role="alert" className="text-sm text-ko-ink">
              {erreurRenvoi}
            </p>
          )}
        </div>
      )}
    </li>
  )
}
