'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, useTransition } from 'react'

import { attribuerPhotoPoste } from '@/app/(admin)/[locale]/admin/carrieres/actions'
import { buttonVariants } from '@/components/ui/Button'
import { IconeFermer, IconeGalerie } from '@/components/ui/Icones'

/**
 * Vignette 80×80 cliquable + modal d'attribution d'une photo de poste —
 * colonne « Photo » de /admin/carrieres (migration 0032, photo_url).
 *
 * Le dropdown ne propose que `fichiersDisponibles` (calculé côté serveur par
 * lib/medias-disponibles.ts) : les fichiers déjà réservés à un emplacement
 * de medias_emplacements, ET cinq fichiers à droits incertains, en sont
 * exclus avant même d'arriver ici — voir ce fichier pour le détail. Ce
 * composant n'a pas à connaître cette logique, juste à afficher la liste
 * qu'on lui donne.
 */

export type FichierDisponible = { chemin: string; url: string }

export type TextesPhotoPoste = {
  colonnePhoto: string
  modifierPhoto: string
  titreModal: string
  aucunePhoto: string
  champChoix: string
  optionAucune: string
  enregistrer: string
  enCours: string
  supprimerPhoto: string
  fermer: string
  erreurServeur: string
  /** Marquage du repli département — voir la vignette ci-dessous. */
  repliPhoto: string
}

export function SelecteurPhotoPoste({
  posteId,
  titrePoste,
  photoActuelle,
  photoRepli,
  fichiersDisponibles,
  textes,
  onChange,
}: {
  posteId: string
  titrePoste: string
  photoActuelle: string | null
  /** Photo que /carrieres afficherait pour ce poste EN L'ABSENCE de
   *  `photoActuelle` (repli département, lib/carrieres-photo.ts) — `null` si
   *  le département n'a pas de repli. Affichée avec un marquage visuel : ce
   *  n'est pas une photo choisie pour ce poste, deux postes du même
   *  département la partagent. */
  photoRepli: string | null
  fichiersDisponibles: FichierDisponible[]
  textes: TextesPhotoPoste
  onChange: (nouvellePhoto: string | null) => void
}) {
  const boite = useRef<HTMLDialogElement>(null)
  const [ouvert, setOuvert] = useState(false)
  const [selection, setSelection] = useState(photoActuelle ?? '')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, demarrer] = useTransition()

  useEffect(() => {
    const el = boite.current
    if (!el) return
    if (ouvert && !el.open) el.showModal()
    if (!ouvert && el.open) el.close()
  }, [ouvert])

  useEffect(() => {
    const el = boite.current
    if (!el) return
    const fermer = () => setOuvert(false)
    el.addEventListener('close', fermer)
    return () => el.removeEventListener('close', fermer)
  }, [])

  function ouvrir() {
    setSelection(photoActuelle ?? '')
    setErreur(null)
    setOuvert(true)
  }

  function enregistrer() {
    setErreur(null)
    demarrer(async () => {
      const resultat = await attribuerPhotoPoste(posteId, selection || null)
      if (!resultat.success) {
        setErreur(resultat.error ?? textes.erreurServeur)
        return
      }
      onChange(selection || null)
      setOuvert(false)
    })
  }

  function supprimer() {
    setErreur(null)
    demarrer(async () => {
      const resultat = await attribuerPhotoPoste(posteId, null)
      if (!resultat.success) {
        setErreur(resultat.error ?? textes.erreurServeur)
        return
      }
      onChange(null)
      setOuvert(false)
    })
  }

  // La photo déjà enregistrée peut ne plus figurer dans fichiersDisponibles
  // (réservée ailleurs entre-temps) — gardée en tête de liste pour que le
  // dropdown ne perde jamais la valeur réellement en base.
  const options =
    photoActuelle && !fichiersDisponibles.some((f) => f.url === photoActuelle)
      ? [{ chemin: photoActuelle, url: photoActuelle }, ...fichiersDisponibles]
      : fichiersDisponibles

  return (
    <>
      <button
        type="button"
        onClick={ouvrir}
        aria-label={
          photoActuelle
            ? `${textes.modifierPhoto} — ${titrePoste}`
            : photoRepli
              ? `${textes.repliPhoto} — ${titrePoste}`
              : `${textes.modifierPhoto} — ${titrePoste}`
        }
        title={photoActuelle ? textes.modifierPhoto : photoRepli ? textes.repliPhoto : textes.modifierPhoto}
        className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden border border-ko-line bg-ko-cream2 transition-opacity duration-200 hover:opacity-80"
      >
        {photoActuelle ? (
          <Image src={photoActuelle} alt="" width={80} height={80} className="h-full w-full object-cover" />
        ) : photoRepli ? (
          <>
            <Image src={photoRepli} alt="" width={80} height={80} className="h-full w-full object-cover" />
            {/* Marquage du repli — sans lui, deux postes du même département
                afficheraient la même vignette sans qu'on comprenne pourquoi,
                et on croirait à tort qu'une photo a été choisie pour CE
                poste. `bg-ko-scrim`/`text-ko-white` : seuls tokens du projet
                acceptant un modificateur d'opacité sur une photo (skill 02,
                tailwind.config.ts). */}
            {/* Label court et littéral, pas `textes.repliPhoto` (bien trop
                long pour 80px) — même convention que <BadgeTraductionEn>
                plus haut dans ce fichier : l'explication complète vit dans
                le `title`/`aria-label` du bouton, pas dans le badge. */}
            <span className="absolute inset-x-0 bottom-0 bg-ko-scrim/85 py-[3px] text-center font-mono text-[8px] uppercase leading-none tracking-wide text-ko-white">
              Repli
            </span>
          </>
        ) : (
          <IconeGalerie taille={22} className="text-ko-muted" />
        )}
      </button>

      <dialog
        ref={boite}
        aria-labelledby={`titre-photo-poste-${posteId}`}
        onClick={(e) => {
          if (e.target === boite.current) setOuvert(false)
        }}
        className="w-[calc(100vw-2rem)] max-w-[480px] border border-ko-line bg-ko-white p-0 text-ko-ink shadow-card backdrop:bg-ko-scrim/60"
      >
        <div className="max-h-[85svh] overflow-y-auto p-6 lg:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <h2 id={`titre-photo-poste-${posteId}`} className="ko-h3 text-[20px] text-ko-ink">
              {textes.titreModal}
            </h2>
            <button
              type="button"
              onClick={() => setOuvert(false)}
              aria-label={textes.fermer}
              className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink"
            >
              <IconeFermer taille={18} />
            </button>
          </div>

          {/* Grande préview, min 200×200 (demandé) — réagit immédiatement au
              changement de sélection dans le dropdown, avant tout enregistrement. */}
          <div className="relative mx-auto flex h-[200px] w-[200px] items-center justify-center overflow-hidden border border-ko-line bg-ko-cream2">
            {selection ? (
              <Image src={selection} alt="" width={200} height={200} className="h-full w-full object-cover" />
            ) : (
              <span className="px-4 text-center text-sm text-ko-muted">{textes.aucunePhoto}</span>
            )}
          </div>

          <div className="mt-6">
            <label htmlFor={`choix-photo-poste-${posteId}`} className="label-mono mb-1.5 block text-ko-muted">
              {textes.champChoix}
            </label>
            <select
              id={`choix-photo-poste-${posteId}`}
              value={selection}
              onChange={(e) => setSelection(e.target.value)}
              className="min-h-[40px] w-full border border-ko-line bg-ko-white px-3 py-2 text-sm text-ko-ink transition-colors duration-200 focus:border-ko-blue focus:outline-none"
            >
              <option value="">{textes.optionAucune}</option>
              {options.map((f) => (
                <option key={f.url} value={f.url}>
                  {f.chemin}
                </option>
              ))}
            </select>
          </div>

          {erreur && (
            <p role="alert" className="mt-4 text-sm text-ko-ink">
              {erreur}
            </p>
          )}

          <div className="mt-6 flex items-center gap-5">
            <button
              type="button"
              onClick={enregistrer}
              disabled={enCours}
              className={buttonVariants({ variant: 'primary', size: 'sm' })}
            >
              {enCours ? textes.enCours : textes.enregistrer}
            </button>
            {photoActuelle && (
              <button
                type="button"
                onClick={supprimer}
                disabled={enCours}
                className="text-sm text-ko-muted transition-colors duration-200 hover:text-ko-ink"
              >
                {textes.supprimerPhoto}
              </button>
            )}
          </div>
        </div>
      </dialog>
    </>
  )
}
