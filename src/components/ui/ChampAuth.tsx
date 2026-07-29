import { cn } from '@/lib/utils/cn'

import type { ComponentProps } from 'react'

/**
 * Champ des formulaires de compte — libellé, contrôle, aide facultative.
 *
 * Extrait parce que les quatre écrans du parcours (connexion, inscription,
 * mot de passe oublié, nouveau mot de passe) partagent exactement le même
 * champ. Recopié, il aurait fini par diverger sur l'un d'eux — typiquement
 * `min-h-[44px]`, dont l'absence ne se voit qu'au doigt sur un téléphone.
 */
export function ChampAuth({
  id,
  libelle,
  aide,
  className,
  ...props
}: ComponentProps<'input'> & { id: string; libelle: string; aide?: string }) {
  return (
    <div>
      <label htmlFor={id} className="label-mono mb-2 block text-ko-muted">
        {libelle}
      </label>
      <input
        id={id}
        // `aria-describedby` relie l'aide au champ : sans lui, une contrainte
        // comme « 10 caractères minimum » n'est jamais annoncée par un lecteur
        // d'écran, et l'erreur arrive sans qu'on ait su la règle.
        aria-describedby={aide ? `${id}-aide` : undefined}
        className={cn(
          'min-h-[44px] w-full border border-ko-line bg-ko-white px-4 py-3 text-base text-ko-ink transition-colors duration-200 focus:border-ko-blue focus:outline-none',
          className,
        )}
        {...props}
      />
      {aide && (
        <p id={`${id}-aide`} className="mt-1.5 text-sm text-ko-muted">
          {aide}
        </p>
      )}
    </div>
  )
}
