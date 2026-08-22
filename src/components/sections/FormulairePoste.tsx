'use client'

import { useActionState } from 'react'

import {
  creerPoste,
  modifierPoste,
  type EtatPoste,
} from '@/app/(admin)/[locale]/admin/carrieres/actions'
import { buttonVariants } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'

/**
 * Création et édition d'un poste — un seul formulaire pour les deux.
 *
 * Même architecture que FormulaireProduit.tsx : les champs sont identiques,
 * seule l'action diffère. Pas de photo ici (postes_carrieres n'a pas cette
 * colonne) — le formulaire le plus simple des trois construits cette session.
 */

export type Poste = {
  id: string
  titre_fr: string
  departement: string
  type: string
  description_fr: string | null
  exigences_fr: string | null
  actif: boolean
  photo_url: string | null
}

export type LibellesPoste = {
  titre: string
  departement: string
  type: string
  description: string
  exigences: string
  exigencesAide: string
  types: Record<string, string>
  enregistrer: string
  creer: string
  enCours: string
  succes: string
  erreurDonnees: string
  erreurRefuse: string
  erreurServeur: string
}

const CHAMP =
  'min-h-[40px] w-full border border-ko-line bg-ko-white px-3 py-2 text-sm text-ko-ink transition-colors duration-200 focus:border-ko-blue focus:outline-none'

function Champ({
  id,
  libelle,
  aide,
  children,
}: {
  id: string
  libelle: string
  aide?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="label-mono mb-1.5 block text-ko-muted">
        {libelle}
      </label>
      {children}
      {aide && <p className="mt-1 text-xs text-ko-muted">{aide}</p>}
    </div>
  )
}

export function FormulairePoste({
  locale,
  poste,
  libelles,
}: {
  locale: string
  /** Absent = création. */
  poste?: Poste
  libelles: LibellesPoste
}) {
  const [etat, action, enCours] = useActionState<EtatPoste, FormData>(
    poste ? modifierPoste : creerPoste,
    {},
  )

  const messages: Record<string, string> = {
    donnees: libelles.erreurDonnees,
    refuse: libelles.erreurRefuse,
    serveur: libelles.erreurServeur,
  }
  const erreur = etat.erreur ? (messages[etat.erreur] ?? libelles.erreurServeur) : null

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      {poste && <input type="hidden" name="id" value={poste.id} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Champ id="poste-titre" libelle={libelles.titre}>
          <input
            id="poste-titre"
            name="titre_fr"
            required
            minLength={2}
            maxLength={150}
            defaultValue={poste?.titre_fr}
            className={CHAMP}
          />
        </Champ>

        <Champ id="poste-departement" libelle={libelles.departement}>
          <input
            id="poste-departement"
            name="departement"
            required
            minLength={2}
            maxLength={100}
            defaultValue={poste?.departement}
            className={CHAMP}
          />
        </Champ>

        <div className="sm:col-span-2">
          <Champ id="poste-type" libelle={libelles.type}>
            <select
              id="poste-type"
              name="type"
              defaultValue={poste?.type ?? 'temps-plein'}
              className={CHAMP}
            >
              {Object.entries(libelles.types).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Champ>
        </div>
      </div>

      <Champ id="poste-description" libelle={libelles.description}>
        <textarea
          id="poste-description"
          name="description"
          rows={3}
          defaultValue={poste?.description_fr ?? ''}
          maxLength={2000}
          className={cn(CHAMP, 'resize-y')}
        />
      </Champ>

      <Champ id="poste-exigences" libelle={libelles.exigences} aide={libelles.exigencesAide}>
        <textarea
          id="poste-exigences"
          name="exigences"
          rows={4}
          defaultValue={poste?.exigences_fr ?? ''}
          maxLength={2000}
          className={cn(CHAMP, 'resize-y')}
        />
      </Champ>

      {erreur && (
        <p role="alert" className="text-sm text-ko-ink">
          {erreur}
        </p>
      )}
      {etat.succes && (
        <p role="status" className="text-sm font-medium text-ko-ink">
          {libelles.succes}
        </p>
      )}

      <button
        type="submit"
        disabled={enCours}
        className={buttonVariants({ variant: 'primary', size: 'sm' })}
      >
        {enCours ? libelles.enCours : poste ? libelles.enregistrer : libelles.creer}
      </button>
    </form>
  )
}
