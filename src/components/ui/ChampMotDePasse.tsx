'use client'

import { useState } from 'react'

import { IconeOeil, IconeOeilBarre } from '@/components/ui/Icones'

import type { ComponentProps } from 'react'

/**
 * Champ de mot de passe avec révélateur.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI CE BOUTON N'EST PAS UN GADGET
 *
 * Un mot de passe masqué se saisit à l'aveugle : la faute de frappe ne se voit
 * qu'au refus, et sur un formulaire de CRÉATION elle produit un compte dont le
 * mot de passe n'est pas celui qu'on croit. Les recommandations actuelles
 * (NIST SP 800-63B § 5.1.1.2) demandent explicitement de permettre l'affichage.
 *
 * ---------------------------------------------------------------------------
 * CE QUI EST PRÉSERVÉ
 *
 * `autoComplete` reste porté par ce champ, pas par une couche au-dessus : les
 * gestionnaires de mots de passe s'appuient dessus pour distinguer une
 * connexion d'une création.
 *
 * Le bouton est `type="button"` — sans ça, il soumettrait le formulaire à
 * chaque clic, puisqu'un bouton sans type vaut `submit`.
 *
 * Il est hors du flux de tabulation (`tabIndex={-1}`) : à la saisie clavier,
 * on passe du mot de passe au bouton d'envoi, pas par un contrôle
 * d'affichage. Il reste atteignable à la souris et annoncé par son
 * `aria-label`, qui change avec l'état.
 * ---------------------------------------------------------------------------
 */
export function ChampMotDePasse({
  id,
  libelle,
  aide,
  libelleAfficher,
  libelleMasquer,
  ...props
}: ComponentProps<'input'> & {
  id: string
  libelle: string
  aide?: string
  libelleAfficher: string
  libelleMasquer: string
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div>
      <label htmlFor={id} className="label-mono mb-2 block text-ko-muted">
        {libelle}
      </label>

      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          aria-describedby={aide ? `${id}-aide` : undefined}
          // pr-12 : réserve la place du bouton, sinon un mot de passe long
          // passe dessous.
          className="min-h-[44px] w-full border border-ko-line bg-ko-white py-3 pl-4 pr-12 text-base text-ko-ink transition-colors duration-200 focus:border-ko-blue focus:outline-none"
          {...props}
        />

        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? libelleMasquer : libelleAfficher}
          title={visible ? libelleMasquer : libelleAfficher}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink"
        >
          {visible ? <IconeOeilBarre taille={18} /> : <IconeOeil taille={18} />}
        </button>
      </div>

      {aide && (
        <p id={`${id}-aide`} className="mt-1.5 text-sm text-ko-muted">
          {aide}
        </p>
      )}
    </div>
  )
}
