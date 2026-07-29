'use client'

import { useActionState } from 'react'

import { changerRole, type EtatRole } from '@/app/(admin)/[locale]/admin/utilisateurs/actions'
import { buttonVariants } from '@/components/ui/Button'
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
  libelles,
}: {
  id: string
  courriel: string
  role: Role
  cree: string
  estSoi: boolean
  peutModifier: boolean
  locale: string
  libelles: {
    roles: Record<Role, string>
    enregistrer: string
    soiMeme: string
    erreurRefuse: string
    erreurSoiMeme: string
    erreurServeur: string
  }
}) {
  const [etat, action, enCours] = useActionState<EtatRole, FormData>(changerRole, {})

  const messages: Record<string, string> = {
    refuse: libelles.erreurRefuse,
    soi_meme: libelles.erreurSoiMeme,
    serveur: libelles.erreurServeur,
  }
  const erreur = etat.erreur ? (messages[etat.erreur] ?? libelles.erreurServeur) : null

  return (
    <li className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="truncate text-base text-ko-ink">
          {courriel}
          {estSoi && <span className="ml-2 label-mono text-ko-blue">{libelles.soiMeme}</span>}
        </p>
        <p className="mt-0.5 font-mono text-xs text-ko-muted">{cree}</p>
        {erreur && (
          <p role="alert" className="mt-1.5 text-sm text-ko-ink">
            {erreur}
          </p>
        )}
      </div>

      {peutModifier && !estSoi ? (
        <form action={action} className="flex shrink-0 items-center gap-2">
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
      ) : (
        // Son propre compte, ou un éditeur qui regarde : le rôle reste lisible,
        // il n'est simplement pas modifiable ici.
        <span
          className={cn(
            'shrink-0 font-mono text-xs uppercase tracking-[0.14em]',
            role === 'invite' ? 'text-ko-muted' : 'text-ko-blue',
          )}
        >
          {libelles.roles[role]}
        </span>
      )}
    </li>
  )
}
