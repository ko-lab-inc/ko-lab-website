'use client'

import { useState } from 'react'

import { buttonVariants } from '@/components/ui/Button'

/**
 * Lien d'activation affiché après une invitation (ou un renvoi) — correction
 * du 27 août 2026 : une invitation « livrée » par Resend n'est pas forcément
 * ARRIVÉE (DMARC manquant sur le domaine, corrigé côté DNS, mais l'admin
 * n'avait jusque-là aucun recours si un courriel se perdait quand même).
 *
 * Montré à un admin déjà authentifié, qui vient lui-même de créer ou de
 * renvoyer l'invitation — afficher ce lien n'ouvre aucun accès qu'il n'avait
 * pas déjà. Il peut le transmettre à la main si le courriel n'arrive jamais.
 *
 * Champ en LECTURE SEULE plutôt qu'un simple `<p>` : `readOnly` + `onFocus`
 * sélectionne tout le texte au clic, une deuxième façon de copier si
 * `navigator.clipboard` échoue (contexte non sécurisé, permission refusée).
 */
export function LienActivation({
  lien,
  libelles,
}: {
  lien: string
  libelles: { label: string; aide?: string; copier: string; copie: string }
}) {
  const [copie, setCopie] = useState(false)

  async function copier() {
    try {
      await navigator.clipboard.writeText(lien)
      setCopie(true)
      setTimeout(() => setCopie(false), 2000)
    } catch {
      // Presse-papiers indisponible — le champ readOnly ci-dessous reste
      // sélectionnable/copiable à la main, voir la docstring du fichier.
    }
  }

  return (
    <div>
      <label htmlFor="lien-activation" className="label-mono mb-1.5 block text-ko-muted">
        {libelles.label}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="lien-activation"
          readOnly
          value={lien}
          onFocus={(e) => e.target.select()}
          className="min-h-[40px] w-full min-w-0 flex-1 border border-ko-line bg-ko-cream px-3 font-mono text-xs text-ko-ink focus:border-ko-blue focus:outline-none"
        />
        <button
          type="button"
          onClick={copier}
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
        >
          {copie ? libelles.copie : libelles.copier}
        </button>
      </div>
      {libelles.aide && <p className="mt-1.5 text-xs text-ko-muted">{libelles.aide}</p>}
    </div>
  )
}
