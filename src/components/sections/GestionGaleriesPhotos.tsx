'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useActionState, useRef, useState, useTransition } from 'react'

import {
  ajouterPhotoGalerie,
  deplacerPhotoGalerie,
  modifierAltGalerie,
  supprimerPhotoGalerie,
  type EtatPhotoGalerie,
} from '@/app/(admin)/[locale]/admin/medias-emplacements/actions'
import { buttonVariants } from '@/components/ui/Button'
import { IconeChevronBas, IconePoubelle } from '@/components/ui/Icones'

import type { PageGalerie } from '@/lib/galeries-photos'

/**
 * Onglet « Nos capacités » de /admin/medias-emplacements — galeries « En
 * photos » à nombre variable, table `galeries_photos` (migration 0043).
 *
 * Patron suivi : GestionPhotosConcours.tsx (ajout par `useActionState`,
 * déplacement/retrait par appel direct + `router.refresh()`, pas de
 * `revalidatePath` côté action). Deux écarts assumés, documentés dans
 * actions.ts : rôle ÉQUIPE (pas admin seul) et retrait qui NE SUPPRIME PAS
 * le fichier du bucket.
 *
 * ---------------------------------------------------------------------------
 * TRANSITION PARTAGÉE PAR SECTION POUR DÉPLACER/RETIRER, PROPRE À CHAQUE
 * CARTE POUR L'ALT
 *
 * `SectionGalerie` porte UN SEUL `useTransition` pour déplacer/retirer,
 * partagé par toutes les cartes de cette page — même patron que
 * GestionPhotosConcours (`enCours` désactive toute la liste pendant un
 * déplacement, pas seulement la ligne concernée) : deux déplacements
 * concurrents dans la même série pourraient calculer une voisine déjà
 * périmée. L'édition de l'alt, elle, n'a pas ce risque (aucune notion
 * d'ordre) : chaque `CartePhotoGalerie` porte donc son PROPRE
 * `useTransition`, pour ne pas bloquer les autres cartes le temps d'un
 * champ texte.
 * ---------------------------------------------------------------------------
 */

export type PhotoGalerie = {
  id: string
  url_stockage: string
  alt_fr: string
  alt_en: string | null
}

export type GroupeGalerie = {
  page: PageGalerie
  titre: string
  photos: readonly PhotoGalerie[]
}

export type LibellesGaleriesPhotos = {
  vide: string
  champFichier: string
  aideFichier: string
  televerser: string
  televersementEnCours: string
  colonneAltFr: string
  colonneAltEn: string
  altEnVide: string
  monter: string
  descendre: string
  retirer: string
  confirmerRetrait: string
  erreurFichier: string
}

export function GestionGaleriesPhotos({
  groupes,
  libelles,
}: {
  groupes: readonly GroupeGalerie[]
  libelles: LibellesGaleriesPhotos
}) {
  return (
    <div className="space-y-14">
      {groupes.map((groupe) => (
        <SectionGalerie key={groupe.page} groupe={groupe} libelles={libelles} />
      ))}
    </div>
  )
}

function SectionGalerie({
  groupe,
  libelles,
}: {
  groupe: GroupeGalerie
  libelles: LibellesGaleriesPhotos
}) {
  const router = useRouter()
  const formulaireAjout = useRef<HTMLFormElement>(null)
  const [enCoursOrdre, demarrerOrdre] = useTransition()

  const [etat, action, ajoutEnCours] = useActionState<EtatPhotoGalerie, FormData>(
    async (precedent, donnees) => {
      const resultat = await ajouterPhotoGalerie(precedent, donnees)
      if (resultat.succes) {
        formulaireAjout.current?.reset()
        router.refresh()
      }
      return resultat
    },
    {},
  )

  function deplacer(photoId: string, sens: 'haut' | 'bas') {
    demarrerOrdre(async () => {
      const donnees = new FormData()
      donnees.set('photo_id', photoId)
      donnees.set('sens', sens)
      await deplacerPhotoGalerie(donnees)
      router.refresh()
    })
  }

  function retirer(photoId: string) {
    if (!window.confirm(libelles.confirmerRetrait)) return
    demarrerOrdre(async () => {
      const donnees = new FormData()
      donnees.set('photo_id', photoId)
      await supprimerPhotoGalerie(donnees)
      router.refresh()
    })
  }

  const messages: Record<string, string> = { fichier: libelles.erreurFichier }
  const erreur = etat.erreur ? (messages[etat.erreur] ?? libelles.erreurFichier) : null

  return (
    <div id={`galerie-${groupe.page}`}>
      <h2 className="ko-h3 mb-5 text-[20px] text-ko-ink">{groupe.titre}</h2>

      {groupe.photos.length === 0 ? (
        <p className="mb-6 text-sm text-ko-muted">{libelles.vide}</p>
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {groupe.photos.map((photo, i) => (
            <CartePhotoGalerie
              key={photo.id}
              photo={photo}
              estPremiere={i === 0}
              estDerniere={i === groupe.photos.length - 1}
              deplacementEnCours={enCoursOrdre}
              onMonter={() => deplacer(photo.id, 'haut')}
              onDescendre={() => deplacer(photo.id, 'bas')}
              onRetirer={() => retirer(photo.id)}
              libelles={libelles}
            />
          ))}
        </div>
      )}

      <form
        ref={formulaireAjout}
        action={action}
        className="flex flex-wrap items-end gap-3 border-t border-ko-line pt-5"
      >
        <input type="hidden" name="page" value={groupe.page} />
        <div className="min-w-0 flex-1">
          <label htmlFor={`fichier-${groupe.page}`} className="label-mono mb-1.5 block text-ko-muted">
            {libelles.champFichier}
          </label>
          <input
            id={`fichier-${groupe.page}`}
            name="fichier"
            type="file"
            required
            accept="image/webp,image/jpeg,image/png,image/avif"
            className="w-full text-sm text-ko-ink file:mr-4 file:min-h-[36px] file:cursor-pointer file:border file:border-ko-line file:bg-ko-cream file:px-3 file:text-sm file:text-ko-ink hover:file:border-ko-ink"
          />
          <p className="mt-1 text-xs text-ko-muted">{libelles.aideFichier}</p>
        </div>
        <div className="min-w-0 flex-1">
          <label htmlFor={`alt-fr-${groupe.page}`} className="label-mono mb-1.5 block text-ko-muted">
            {libelles.colonneAltFr}
          </label>
          <input
            id={`alt-fr-${groupe.page}`}
            name="alt_fr"
            required
            maxLength={200}
            className="min-h-[40px] w-full border border-ko-line bg-ko-white px-3 py-2 text-sm text-ko-ink focus:border-ko-blue focus:outline-none"
          />
        </div>
        <div className="min-w-0 flex-1">
          <label htmlFor={`alt-en-${groupe.page}`} className="label-mono mb-1.5 block text-ko-muted">
            {libelles.colonneAltEn}
          </label>
          <input
            id={`alt-en-${groupe.page}`}
            name="alt_en"
            maxLength={200}
            placeholder={libelles.altEnVide}
            className="min-h-[40px] w-full border border-ko-line bg-ko-white px-3 py-2 text-sm text-ko-ink focus:border-ko-blue focus:outline-none"
          />
        </div>
        <button type="submit" disabled={ajoutEnCours} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          {ajoutEnCours ? libelles.televersementEnCours : libelles.televerser}
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

function CartePhotoGalerie({
  photo,
  estPremiere,
  estDerniere,
  deplacementEnCours,
  onMonter,
  onDescendre,
  onRetirer,
  libelles,
}: {
  photo: PhotoGalerie
  estPremiere: boolean
  estDerniere: boolean
  deplacementEnCours: boolean
  onMonter: () => void
  onDescendre: () => void
  onRetirer: () => void
  libelles: LibellesGaleriesPhotos
}) {
  const [altFr, setAltFr] = useState(photo.alt_fr)
  const [altEn, setAltEn] = useState(photo.alt_en ?? '')
  const [erreurAlt, setErreurAlt] = useState<string | null>(null)
  const [enCoursAlt, demarrerAlt] = useTransition()

  // Autosave au blur — comparé aux dernières valeurs enregistrées, pas à
  // chaque frappe : un champ texte de 200 caractères ne doit pas déclencher
  // une requête par lettre.
  function enregistrerAlt() {
    const fr = altFr.trim()
    if (!fr) {
      // alt_fr est obligatoire (colonne NOT NULL) — un champ vidé à la main
      // revient à la dernière valeur connue plutôt que de tenter un
      // enregistrement qui échouerait de toute façon côté serveur.
      setAltFr(photo.alt_fr)
      return
    }
    const en = altEn.trim() || null
    if (fr === photo.alt_fr && en === photo.alt_en) return

    demarrerAlt(async () => {
      const resultat = await modifierAltGalerie(photo.id, fr, en)
      setErreurAlt(resultat.success ? null : (resultat.error ?? null))
    })
  }

  return (
    <div className="border border-ko-line bg-ko-white p-3">
      <div className="relative aspect-square overflow-hidden bg-ko-cream2">
        {/*
         * PERFORMANCE ADMIN — corrigé le 27 août 2026 (constat : écrans
         * admin lents à l'ouverture).
         *
         * L'ancien `sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw,
         * 25vw"` calculait une fraction du VIEWPORT, sans tenir compte de la
         * sidebar admin fixe (240px, CadreAdmin/layout.tsx) ni du padding —
         * sur cet écran, `25vw` d'un viewport de 1280px demandait 320px
         * alors que la cellule de grille réelle (grid-cols-4, gap 16px, sous
         * la sidebar) fait environ 230px. Résultat mesuré : la seule
         * combinaison largeur × format de tout l'admin à dépasser 96px,
         * demandée pour CHACUNE des photos affichées simultanément (jusqu'à
         * 21 sur cet écran) — 330 Ko rien que pour cette grille, contre 5 à
         * 12 Ko sur les autres écrans admin.
         *
         * `256px` fixe : même largeur partagée que les panneaux « voir » de
         * réalisations/concours/carrières (voir TableauRealisations.tsx) —
         * DEUX largeurs pour tout l'admin (64px, 256px) au lieu d'une par
         * écran, pour limiter le nombre de combinaisons distinctes que
         * l'optimiseur doit produire et mettre en cache.
         */}
        <Image src={photo.url_stockage} alt="" fill sizes="256px" className="object-cover" />
      </div>

      <label className="mt-3 block">
        <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-ko-muted">
          {libelles.colonneAltFr}
        </span>
        <input
          value={altFr}
          onChange={(e) => setAltFr(e.target.value)}
          onBlur={enregistrerAlt}
          maxLength={200}
          className="min-h-[36px] w-full border border-ko-line bg-ko-white px-2.5 py-1.5 text-xs text-ko-ink focus:border-ko-blue focus:outline-none"
        />
      </label>
      <label className="mt-2 block">
        <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-ko-muted">
          {libelles.colonneAltEn}
        </span>
        <input
          value={altEn}
          onChange={(e) => setAltEn(e.target.value)}
          onBlur={enregistrerAlt}
          maxLength={200}
          placeholder={libelles.altEnVide}
          className="min-h-[36px] w-full border border-ko-line bg-ko-white px-2.5 py-1.5 text-xs text-ko-ink focus:border-ko-blue focus:outline-none"
        />
      </label>

      {(enCoursAlt || erreurAlt) && (
        <p role={erreurAlt ? 'alert' : 'status'} className="mt-1.5 text-xs text-ko-muted">
          {enCoursAlt ? libelles.televersementEnCours : erreurAlt}
        </p>
      )}

      <div className="mt-2.5 flex items-center justify-between border-t border-ko-line pt-2.5">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onMonter}
            disabled={deplacementEnCours || estPremiere}
            aria-label={libelles.monter}
            title={libelles.monter}
            className="flex h-8 w-8 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink disabled:opacity-30"
          >
            <IconeChevronBas taille={14} className="rotate-180" />
          </button>
          <button
            type="button"
            onClick={onDescendre}
            disabled={deplacementEnCours || estDerniere}
            aria-label={libelles.descendre}
            title={libelles.descendre}
            className="flex h-8 w-8 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink disabled:opacity-30"
          >
            <IconeChevronBas taille={14} />
          </button>
        </div>
        <button
          type="button"
          onClick={onRetirer}
          disabled={deplacementEnCours}
          aria-label={libelles.retirer}
          title={libelles.retirer}
          className="flex h-8 w-8 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink"
        >
          <IconePoubelle taille={14} />
        </button>
      </div>
    </div>
  )
}
