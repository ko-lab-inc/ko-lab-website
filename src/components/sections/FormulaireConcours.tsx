'use client'

import { useActionState, useState } from 'react'

import {
  creerConcours,
  modifierConcours,
  type EtatConcours,
} from '@/app/(admin)/[locale]/admin/concours/actions'
import { buttonVariants } from '@/components/ui/Button'
import {
  GestionLiensConcours,
  type LibellesLiensConcours,
  type LienConcours,
} from '@/components/sections/GestionLiensConcours'
import {
  GestionPhotosConcours,
  type LibellesPhotosConcours,
  type PhotoConcours,
} from '@/components/sections/GestionPhotosConcours'
import { slugifier } from '@/lib/utils/slug'
import { cn } from '@/lib/utils/cn'

/**
 * Création et édition d'un concours — un seul formulaire pour les deux,
 * même architecture que FormulairePoste.tsx (deux colonnes FR/EN, champ par
 * champ). La gestion des photos et des liens n'apparaît qu'en ÉDITION : les
 * deux tables enfants exigent un `concours_id` qui n'existe pas encore
 * pendant la création — même contrainte que SelecteurPhotoPoste, qui a
 * besoin d'un `posteId` réel.
 */

export type Concours = {
  id: string
  slug: string
  titre_fr: string
  titre_en: string | null
  accroche_fr: string | null
  accroche_en: string | null
  description_fr: string
  description_en: string | null
  reglement_fr: string | null
  reglement_en: string | null
  date_debut: string | null
  date_fin: string | null
  publie: boolean
  ordre: number
  photos: PhotoConcours[]
  liens: LienConcours[]
}

export type LibellesConcours = {
  slug: string
  titreFr: string
  titreEn: string
  accrocheFr: string
  accrocheEn: string
  descriptionFr: string
  descriptionEn: string
  reglementFr: string
  reglementEn: string
  dateDebut: string
  dateFin: string
  publie: string
  sectionFr: string
  sectionEn: string
  enregistrer: string
  creer: string
  enCours: string
  succes: string
  erreurDonnees: string
  erreurSlug: string
  erreurRefuse: string
  erreurServeur: string
  photos: LibellesPhotosConcours
  liens: LibellesLiensConcours
}

const CHAMP =
  'min-h-[40px] w-full border border-ko-line bg-ko-white px-3 py-2 text-sm text-ko-ink transition-colors duration-200 focus:border-ko-blue focus:outline-none'

function Champ({
  id,
  libelle,
  children,
}: {
  id: string
  libelle: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="label-mono mb-1.5 block text-ko-muted">
        {libelle}
      </label>
      {children}
    </div>
  )
}

/**
 * Interrupteur publié/hors ligne — même patron visuel que celui de
 * FormulaireReglages.tsx (module-privé là-bas, redéfini ici plutôt
 * qu'exporté pour un seul consommateur de plus).
 */
function InterrupteurPublie({ libelle, defaut }: { libelle: string; defaut: boolean }) {
  return (
    <label className="group flex min-h-[44px] w-fit cursor-pointer items-center gap-3">
      <input type="checkbox" name="publie" defaultValue="true" defaultChecked={defaut} className="peer sr-only" />
      <span
        aria-hidden="true"
        className="relative h-6 w-11 shrink-0 rounded-full bg-ko-line transition-colors duration-200 peer-checked:bg-ko-blue peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ko-blue"
      >
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-ko-white shadow-sm transition-transform duration-200 group-has-[:checked]:translate-x-5" />
      </span>
      <span className="text-sm text-ko-ink">{libelle}</span>
    </label>
  )
}

export function FormulaireConcours({
  locale,
  concours,
  libelles,
}: {
  locale: string
  /** Absent = création. */
  concours?: Concours
  libelles: LibellesConcours
}) {
  const [etat, action, enCours] = useActionState<EtatConcours, FormData>(
    concours ? modifierConcours : creerConcours,
    {},
  )

  // Slug : proposé depuis titre_fr tant que l'admin n'a pas touché le champ
  // lui-même — décision explicite du 23 août 2026, à la différence de
  // realisations/produits_boutique où le slug reste caché et automatique.
  const [slug, setSlug] = useState(concours?.slug ?? '')
  const [slugTouche, setSlugTouche] = useState(Boolean(concours))

  const messages: Record<string, string> = {
    donnees: libelles.erreurDonnees,
    slug: libelles.erreurSlug,
    refuse: libelles.erreurRefuse,
    serveur: libelles.erreurServeur,
  }
  const erreur = etat.erreur ? (messages[etat.erreur] ?? libelles.erreurServeur) : null

  return (
    <div className="space-y-8">
      <form action={action} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />
        {concours && <input type="hidden" name="id" value={concours.id} />}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Champ id="concours-titre" libelle={libelles.titreFr}>
            <input
              id="concours-titre"
              name="titre_fr"
              required
              minLength={2}
              maxLength={150}
              defaultValue={concours?.titre_fr}
              onChange={(e) => {
                if (!slugTouche) setSlug(slugifier(e.target.value))
              }}
              className={CHAMP}
            />
          </Champ>

          <Champ id="concours-slug" libelle={libelles.slug}>
            <input
              id="concours-slug"
              name="slug"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              maxLength={80}
              value={slug}
              onChange={(e) => {
                setSlugTouche(true)
                setSlug(e.target.value)
              }}
              className={CHAMP}
            />
          </Champ>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Champ id="concours-date-debut" libelle={libelles.dateDebut}>
            <input
              id="concours-date-debut"
              name="date_debut"
              type="date"
              defaultValue={concours?.date_debut ?? ''}
              className={CHAMP}
            />
          </Champ>
          <Champ id="concours-date-fin" libelle={libelles.dateFin}>
            <input
              id="concours-date-fin"
              name="date_fin"
              type="date"
              defaultValue={concours?.date_fin ?? ''}
              className={CHAMP}
            />
          </Champ>
        </div>

        <InterrupteurPublie libelle={libelles.publie} defaut={concours?.publie ?? false} />

        {/* Deux colonnes FR/EN, champ par champ — même disposition que
            FormulairePoste.tsx : un champ EN vide se repère d'un coup d'œil
            en face de son équivalent FR rempli. */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 border-t border-ko-line pt-4 lg:grid-cols-2">
          <p className="label-mono -mb-1 text-ko-muted lg:col-span-1">{libelles.sectionFr}</p>
          <p className="label-mono -mb-1 hidden text-ko-muted lg:col-span-1 lg:block">
            {libelles.sectionEn}
          </p>

          <Champ id="concours-titre-en" libelle={libelles.titreEn}>
            <input
              id="concours-titre-en"
              name="titre_en"
              maxLength={150}
              defaultValue={concours?.titre_en ?? ''}
              className={CHAMP}
            />
          </Champ>
          <div className="hidden lg:block" />

          <Champ id="concours-accroche" libelle={libelles.accrocheFr}>
            <input
              id="concours-accroche"
              name="accroche_fr"
              maxLength={300}
              defaultValue={concours?.accroche_fr ?? ''}
              className={CHAMP}
            />
          </Champ>
          <Champ id="concours-accroche-en" libelle={libelles.accrocheEn}>
            <input
              id="concours-accroche-en"
              name="accroche_en"
              maxLength={300}
              defaultValue={concours?.accroche_en ?? ''}
              className={CHAMP}
            />
          </Champ>

          <Champ id="concours-description" libelle={libelles.descriptionFr}>
            <textarea
              id="concours-description"
              name="description_fr"
              required
              minLength={2}
              rows={5}
              maxLength={3000}
              defaultValue={concours?.description_fr}
              className={cn(CHAMP, 'resize-y')}
            />
          </Champ>
          <Champ id="concours-description-en" libelle={libelles.descriptionEn}>
            <textarea
              id="concours-description-en"
              name="description_en"
              rows={5}
              maxLength={3000}
              defaultValue={concours?.description_en ?? ''}
              className={cn(CHAMP, 'resize-y')}
            />
          </Champ>

          <Champ id="concours-reglement" libelle={libelles.reglementFr}>
            <textarea
              id="concours-reglement"
              name="reglement_fr"
              rows={6}
              maxLength={8000}
              defaultValue={concours?.reglement_fr ?? ''}
              className={cn(CHAMP, 'resize-y')}
            />
          </Champ>
          <Champ id="concours-reglement-en" libelle={libelles.reglementEn}>
            <textarea
              id="concours-reglement-en"
              name="reglement_en"
              rows={6}
              maxLength={8000}
              defaultValue={concours?.reglement_en ?? ''}
              className={cn(CHAMP, 'resize-y')}
            />
          </Champ>
        </div>

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

        <button type="submit" disabled={enCours} className={buttonVariants({ variant: 'primary', size: 'sm' })}>
          {enCours ? libelles.enCours : concours ? libelles.enregistrer : libelles.creer}
        </button>
      </form>

      {/* Photos et liens : uniquement en édition, voir la note d'en-tête. */}
      {concours && (
        <div className="space-y-8 border-t border-ko-line pt-6">
          <GestionPhotosConcours concoursId={concours.id} photos={concours.photos} libelles={libelles.photos} />
          <GestionLiensConcours concoursId={concours.id} liens={concours.liens} libelles={libelles.liens} />
        </div>
      )}
    </div>
  )
}
