'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useActionState, useRef, useState, useTransition } from 'react'

import {
  ajouterPhotoConcours,
  deplacerPhotoConcours,
  supprimerPhotoConcours,
  type EtatPhotoConcours,
} from '@/app/(admin)/[locale]/admin/concours/actions'
import { buttonVariants } from '@/components/ui/Button'
import { IconeChevronBas, IconePoubelle } from '@/components/ui/Icones'

/**
 * Photos d'un concours — table concours_photos, bucket concours.
 *
 * ---------------------------------------------------------------------------
 * PAS DE `revalidatePath` CÔTÉ ACTION — `router.refresh()` ICI À LA PLACE
 *
 * Chaque mutation (ajout, retrait, déplacement) est une Server Action à part,
 * indépendante du formulaire principal (voir la note d'en-tête de
 * FormulaireConcours.tsx : la table enfant a besoin d'un `concours_id` déjà
 * existant). `router.refresh()` redemande les données du composant serveur
 * parent (page.tsx) après chaque succès — le dialogue reste ouvert (son état
 * client ne dépend pas de ce rafraîchissement), seule la liste se met à jour.
 * ---------------------------------------------------------------------------
 */

export type PhotoConcours = {
  id: string
  concours_id: string
  url_stockage: string
  alt_fr: string
  alt_en: string | null
  ordre: number
}

export type LibellesPhotosConcours = {
  titre: string
  vide: string
  nouvelle: string
  nouvelleAide: string
  /** Distinct de `nouvelle` : ce texte porte le SUBMIT, `nouvelle` porte le
   *  <label> du champ fichier — un accessible name partagé entre les deux
   *  contrôles les rendait impossibles à distinguer (lecteur d'écran comme
   *  sélecteur automatisé). */
  televerser: string
  altFr: string
  altEn: string
  monter: string
  descendre: string
  retirer: string
  erreurFichier: string
  enCours: string
  manqueFichier: string
  manqueAltFr: string
  manqueFichierEtAlt: string
}

/**
 * Plafond CÔTÉ CLIENT — même bug, même correction que GestionGaleriesPhotos.tsx
 * (« page d'erreur brute » sur /admin/medias-emplacements, 27 août 2026) :
 * un seul fichier assez lourd dépasse `serverActions.bodySizeLimit` (7 Mo,
 * next.config.ts) avant même que `ajouterPhotoConcours` ne s'exécute. Cet
 * écran partage exactement la même ligne d'ajout (fichier + alt FR requis,
 * bouton non gardé côté client) — même défaut, même remède.
 */
const TAILLE_MAX_PHOTO = 6 * 1024 * 1024

function formaterMo(octets: number): string {
  return (octets / (1024 * 1024)).toFixed(1)
}

export function GestionPhotosConcours({
  concoursId,
  photos,
  libelles,
}: {
  concoursId: string
  photos: PhotoConcours[]
  libelles: LibellesPhotosConcours
}) {
  const router = useRouter()
  const [enCours, demarrer] = useTransition()
  const formulaireAjout = useRef<HTMLFormElement>(null)

  // Voir GestionGaleriesPhotos.tsx — même mécanique de suivi hors FormData.
  const [fichierPret, setFichierPret] = useState(false)
  const [altFr, setAltFr] = useState('')
  const [erreurTaille, setErreurTaille] = useState<string | null>(null)

  const [etat, action, ajoutEnCours] = useActionState<EtatPhotoConcours, FormData>(
    async (precedent, donnees) => {
      const resultat = await ajouterPhotoConcours(precedent, donnees)
      if (resultat.succes) {
        formulaireAjout.current?.reset()
        setFichierPret(false)
        setAltFr('')
        setErreurTaille(null)
        router.refresh()
      }
      return resultat
    },
    {},
  )

  function fichierChoisi(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0]
    if (!fichier) {
      setFichierPret(false)
      setErreurTaille(null)
      return
    }
    if (fichier.size > TAILLE_MAX_PHOTO) {
      setFichierPret(false)
      setErreurTaille(
        `${fichier.name} fait ${formaterMo(fichier.size)} Mo — la limite est de ${formaterMo(TAILLE_MAX_PHOTO)} Mo. Choisissez un fichier plus léger.`,
      )
      return
    }
    setFichierPret(true)
    setErreurTaille(null)
  }

  const pret = fichierPret && altFr.trim() !== ''
  const messageManquant = erreurTaille
    ? erreurTaille
    : !fichierPret && !altFr.trim()
      ? libelles.manqueFichierEtAlt
      : !fichierPret
        ? libelles.manqueFichier
        : !altFr.trim()
          ? libelles.manqueAltFr
          : null

  function deplacer(photoId: string, sens: 'haut' | 'bas') {
    demarrer(async () => {
      const donnees = new FormData()
      donnees.set('photo_id', photoId)
      donnees.set('sens', sens)
      await deplacerPhotoConcours(donnees)
      router.refresh()
    })
  }

  function retirer(photoId: string) {
    demarrer(async () => {
      const donnees = new FormData()
      donnees.set('photo_id', photoId)
      await supprimerPhotoConcours(donnees)
      router.refresh()
    })
  }

  const messages: Record<string, string> = { fichier: libelles.erreurFichier }
  const erreur = etat.erreur ? (messages[etat.erreur] ?? libelles.erreurFichier) : null

  return (
    <div>
      <p className="label-mono mb-3 text-ko-muted">{libelles.titre}</p>

      {photos.length === 0 ? (
        <p className="text-sm text-ko-muted">{libelles.vide}</p>
      ) : (
        <ul className="mb-5 space-y-2">
          {photos.map((photo, i) => (
            <li key={photo.id} className="flex items-center gap-3 border border-ko-line bg-ko-white p-2">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden bg-ko-cream2">
                {/* 64px partagé admin-wide, pas 56px — voir TableauRealisations.tsx. */}
                <Image src={photo.url_stockage} alt="" fill className="object-cover" sizes="64px" />
              </div>
              <span className="min-w-0 flex-1 truncate text-sm text-ko-ink">{photo.alt_fr || '—'}</span>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => deplacer(photo.id, 'haut')}
                  disabled={enCours || i === 0}
                  aria-label={libelles.monter}
                  title={libelles.monter}
                  className="flex h-9 w-9 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink disabled:opacity-30"
                >
                  <IconeChevronBas taille={16} className="rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={() => deplacer(photo.id, 'bas')}
                  disabled={enCours || i === photos.length - 1}
                  aria-label={libelles.descendre}
                  title={libelles.descendre}
                  className="flex h-9 w-9 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink disabled:opacity-30"
                >
                  <IconeChevronBas taille={16} />
                </button>
                <button
                  type="button"
                  onClick={() => retirer(photo.id)}
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

      <form
        ref={formulaireAjout}
        action={action}
        onSubmit={(e) => {
          if (!pret) e.preventDefault()
        }}
        className="flex flex-wrap items-end gap-3 border-t border-ko-line pt-4"
      >
        <input type="hidden" name="concours_id" value={concoursId} />
        <div className="min-w-0 flex-1">
          <label htmlFor="photo-fichier" className="label-mono mb-1.5 block text-ko-muted">
            {libelles.nouvelle}
          </label>
          <input
            id="photo-fichier"
            name="fichier"
            type="file"
            required
            accept="image/webp,image/jpeg,image/png,image/avif"
            onChange={fichierChoisi}
            className="w-full text-sm text-ko-ink file:mr-4 file:min-h-[36px] file:cursor-pointer file:border file:border-ko-line file:bg-ko-cream file:px-3 file:text-sm file:text-ko-ink hover:file:border-ko-ink"
          />
          <p className="mt-1 text-xs text-ko-muted">{libelles.nouvelleAide}</p>
        </div>
        <div className="min-w-0 flex-1">
          <label htmlFor="photo-alt-fr" className="label-mono mb-1.5 block text-ko-muted">
            {libelles.altFr}
          </label>
          <input
            id="photo-alt-fr"
            name="alt_fr"
            required
            maxLength={200}
            value={altFr}
            onChange={(e) => setAltFr(e.target.value)}
            className="min-h-[40px] w-full border border-ko-line bg-ko-white px-3 py-2 text-sm text-ko-ink focus:border-ko-blue focus:outline-none"
          />
        </div>
        <div className="min-w-0 flex-1">
          <label htmlFor="photo-alt-en" className="label-mono mb-1.5 block text-ko-muted">
            {libelles.altEn}
          </label>
          <input
            id="photo-alt-en"
            name="alt_en"
            maxLength={200}
            className="min-h-[40px] w-full border border-ko-line bg-ko-white px-3 py-2 text-sm text-ko-ink focus:border-ko-blue focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={ajoutEnCours || !pret}
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
        >
          {ajoutEnCours ? libelles.enCours : libelles.televerser}
        </button>
      </form>

      {!pret && !ajoutEnCours && messageManquant && (
        <p role={erreurTaille ? 'alert' : 'status'} className="mt-2 text-sm text-ko-muted">
          {messageManquant}
        </p>
      )}

      {erreur && (
        <p role="alert" className="mt-2 text-sm text-ko-ink">
          {erreur}
        </p>
      )}
    </div>
  )
}
