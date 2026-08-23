'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useRef, useTransition } from 'react'

import {
  ajouterLienConcours,
  deplacerLienConcours,
  supprimerLienConcours,
  type EtatLienConcours,
} from '@/app/(admin)/[locale]/admin/concours/actions'
import { buttonVariants } from '@/components/ui/Button'
import { IconeChevronBas, IconePoubelle } from '@/components/ui/Icones'

/**
 * Liens d'un concours — table concours_liens. Libres (Facebook, YouTube,
 * site externe, vidéo...), seule la présence de `https://` est vérifiée
 * (actions.ts, schémaLien) — aucune contrainte de domaine.
 *
 * Même stratégie de rafraîchissement que GestionPhotosConcours.tsx :
 * `router.refresh()` après chaque mutation, pas de `revalidatePath` côté
 * action (voir sa note d'en-tête).
 */

export type LienConcours = {
  id: string
  concours_id: string
  libelle_fr: string
  libelle_en: string | null
  url: string
  ordre: number
}

export type LibellesLiensConcours = {
  titre: string
  vide: string
  libelleFr: string
  libelleEn: string
  url: string
  urlAide: string
  ajouter: string
  monter: string
  descendre: string
  retirer: string
  erreurUrl: string
  enCours: string
}

export function GestionLiensConcours({
  concoursId,
  liens,
  libelles,
}: {
  concoursId: string
  liens: LienConcours[]
  libelles: LibellesLiensConcours
}) {
  const router = useRouter()
  const [enCours, demarrer] = useTransition()
  const formulaireAjout = useRef<HTMLFormElement>(null)

  const [etat, action, ajoutEnCours] = useActionState<EtatLienConcours, FormData>(
    async (precedent, donnees) => {
      const resultat = await ajouterLienConcours(precedent, donnees)
      if (resultat.succes) {
        formulaireAjout.current?.reset()
        router.refresh()
      }
      return resultat
    },
    {},
  )

  function deplacer(lienId: string, sens: 'haut' | 'bas') {
    demarrer(async () => {
      const donnees = new FormData()
      donnees.set('lien_id', lienId)
      donnees.set('sens', sens)
      await deplacerLienConcours(donnees)
      router.refresh()
    })
  }

  function retirer(lienId: string) {
    demarrer(async () => {
      const donnees = new FormData()
      donnees.set('lien_id', lienId)
      await supprimerLienConcours(donnees)
      router.refresh()
    })
  }

  const messages: Record<string, string> = { url: libelles.erreurUrl, donnees: libelles.erreurUrl }
  const erreur = etat.erreur ? (messages[etat.erreur] ?? libelles.erreurUrl) : null

  return (
    <div>
      <p className="label-mono mb-3 text-ko-muted">{libelles.titre}</p>

      {liens.length === 0 ? (
        <p className="text-sm text-ko-muted">{libelles.vide}</p>
      ) : (
        <ul className="mb-5 space-y-2">
          {liens.map((lien, i) => (
            <li key={lien.id} className="flex items-center gap-3 border border-ko-line bg-ko-white p-2">
              <span className="min-w-0 flex-1 truncate text-sm text-ko-ink">
                {lien.libelle_fr} <span className="text-ko-muted">— {lien.url}</span>
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => deplacer(lien.id, 'haut')}
                  disabled={enCours || i === 0}
                  aria-label={libelles.monter}
                  title={libelles.monter}
                  className="flex h-9 w-9 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink disabled:opacity-30"
                >
                  <IconeChevronBas taille={16} className="rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={() => deplacer(lien.id, 'bas')}
                  disabled={enCours || i === liens.length - 1}
                  aria-label={libelles.descendre}
                  title={libelles.descendre}
                  className="flex h-9 w-9 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink disabled:opacity-30"
                >
                  <IconeChevronBas taille={16} />
                </button>
                <button
                  type="button"
                  onClick={() => retirer(lien.id)}
                  disabled={enCours}
                  aria-label={libelles.retirer}
                  title={libelles.retirer}
                  className="flex h-9 w-9 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink"
                >
                  <IconePoubelle taille={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form ref={formulaireAjout} action={action} className="flex flex-wrap items-end gap-3 border-t border-ko-line pt-4">
        <input type="hidden" name="concours_id" value={concoursId} />
        <div className="min-w-0 flex-1">
          <label htmlFor="lien-libelle-fr" className="label-mono mb-1.5 block text-ko-muted">
            {libelles.libelleFr}
          </label>
          <input
            id="lien-libelle-fr"
            name="libelle_fr"
            required
            maxLength={120}
            className="min-h-[40px] w-full border border-ko-line bg-ko-white px-3 py-2 text-sm text-ko-ink focus:border-ko-blue focus:outline-none"
          />
        </div>
        <div className="min-w-0 flex-1">
          <label htmlFor="lien-libelle-en" className="label-mono mb-1.5 block text-ko-muted">
            {libelles.libelleEn}
          </label>
          <input
            id="lien-libelle-en"
            name="libelle_en"
            maxLength={120}
            className="min-h-[40px] w-full border border-ko-line bg-ko-white px-3 py-2 text-sm text-ko-ink focus:border-ko-blue focus:outline-none"
          />
        </div>
        <div className="min-w-0 flex-[2]">
          <label htmlFor="lien-url" className="label-mono mb-1.5 block text-ko-muted">
            {libelles.url}
          </label>
          <input
            id="lien-url"
            name="url"
            type="url"
            required
            maxLength={500}
            placeholder="https://"
            pattern="https://.*"
            className="min-h-[40px] w-full border border-ko-line bg-ko-white px-3 py-2 text-sm text-ko-ink focus:border-ko-blue focus:outline-none"
          />
          <p className="mt-1 text-xs text-ko-muted">{libelles.urlAide}</p>
        </div>
        <button type="submit" disabled={ajoutEnCours} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          {ajoutEnCours ? libelles.enCours : libelles.ajouter}
        </button>
      </form>

      {erreur && (
        <p role="alert" className="mt-2 text-sm text-ko-ink">
          {erreur}
        </p>
      )}
    </div>
  )
}
