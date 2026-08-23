'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, useTransition } from 'react'

import { mettreAJourEmplacement } from '@/app/(admin)/[locale]/admin/medias-emplacements/actions'
import { buttonVariants } from '@/components/ui/Button'
import { IconeCoche, IconeFermer } from '@/components/ui/Icones'
import { cn } from '@/lib/utils/cn'

/**
 * Modal de sélection d'une photo, en grille — remplace la saisie d'URL brute
 * de l'ancien /admin/medias-emplacements (aucune URL Supabase visible nulle
 * part dans cet écran, demande explicite).
 *
 * ---------------------------------------------------------------------------
 * CONTRÔLÉ DEPUIS LE PARENT, PAS DE DÉCLENCHEUR INTÉGRÉ
 *
 * Contrairement à SelecteurPhotoPoste (bouton + modal dans un seul
 * composant), ce modal est ouvert par DEUX déclencheurs distincts dans
 * TableauEmplacements — la vignette (colonne Aperçu) ET le crayon (colonne
 * Actions), tous deux sur la même ligne — d'où `ouvert`/`onFermer` en props,
 * même patron que PreviewMediaModal.
 *
 * ---------------------------------------------------------------------------
 * GRILLE, PAS DROPDOWN — À LA DIFFÉRENCE DE SelecteurPhotoPoste
 *
 * Même source de données (lib/medias-disponibles.ts) que le sélecteur de
 * photo de poste, mais présentation différente : une grille de vignettes
 * cliquables, demandée explicitement pour cet écran plutôt que le menu
 * déroulant de chemins de fichiers utilisé par /admin/carrieres.
 *
 * ⚠️ La photo ACTUELLE de cet emplacement n'apparaît PAS dans
 * `fichiersDisponibles` : cette fonction exclut tout fichier déjà réservé
 * par une ligne de `medias_emplacements` — y compris CETTE ligne. Sans la
 * réintroduire explicitement, la grille se rechargerait vide de la seule
 * photo qu'on est en train de modifier. Voir `options` plus bas.
 * ---------------------------------------------------------------------------
 */

export type FichierDisponible = { chemin: string; url: string }

export type TextesSelecteurEmplacement = {
  titreModal: string
  champChoix: string
  colonneAltFr: string
  colonneAltEn: string
  altEnVide: string
  enregistrer: string
  enCours: string
  fermer: string
  erreurServeur: string
}

export function SelecteurPhotoEmplacement({
  ouvert,
  onFermer,
  cle,
  photoActuelle,
  altFrActuel,
  altEnActuel,
  fichiersDisponibles,
  textes,
  onEnregistre,
}: {
  ouvert: boolean
  onFermer: () => void
  cle: string
  photoActuelle: string
  altFrActuel: string
  altEnActuel: string | null
  fichiersDisponibles: FichierDisponible[]
  textes: TextesSelecteurEmplacement
  onEnregistre: (maj: { url_stockage: string; alt_text_fr: string; alt_text_en: string | null }) => void
}) {
  const boite = useRef<HTMLDialogElement>(null)
  const [selection, setSelection] = useState(photoActuelle)
  const [altFr, setAltFr] = useState(altFrActuel)
  const [altEn, setAltEn] = useState(altEnActuel ?? '')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, demarrer] = useTransition()

  useEffect(() => {
    const el = boite.current
    if (!el) return
    if (ouvert && !el.open) el.showModal()
    if (!ouvert && el.open) el.close()
  }, [ouvert])

  // Réinitialise le formulaire aux valeurs de LIGNE COURANTE à chaque
  // ouverture — sans ça, rouvrir sur un autre emplacement après une édition
  // annulée garderait la sélection/saisie du précédent.
  useEffect(() => {
    if (!ouvert) return
    setSelection(photoActuelle)
    setAltFr(altFrActuel)
    setAltEn(altEnActuel ?? '')
    setErreur(null)
  }, [ouvert, photoActuelle, altFrActuel, altEnActuel])

  useEffect(() => {
    const el = boite.current
    if (!el) return
    const fermer = () => onFermer()
    el.addEventListener('close', fermer)
    return () => el.removeEventListener('close', fermer)
  }, [onFermer])

  function enregistrer() {
    setErreur(null)
    demarrer(async () => {
      const resultat = await mettreAJourEmplacement(cle, selection, altFr, altEn || null)
      if (!resultat.success) {
        setErreur(resultat.error ?? textes.erreurServeur)
        return
      }
      onEnregistre({ url_stockage: selection, alt_text_fr: altFr, alt_text_en: altEn || null })
      boite.current?.close()
    })
  }

  const options = fichiersDisponibles.some((f) => f.url === photoActuelle)
    ? fichiersDisponibles
    : [{ chemin: cle, url: photoActuelle }, ...fichiersDisponibles]

  return (
    <dialog
      ref={boite}
      aria-labelledby={`titre-emplacement-${cle}`}
      onClick={(e) => {
        if (e.target === boite.current) boite.current?.close()
      }}
      className="w-[calc(100vw-2rem)] max-w-[600px] border border-ko-line bg-ko-white p-0 text-ko-ink shadow-card backdrop:bg-ko-scrim/60"
    >
      <div className="max-h-[85svh] overflow-y-auto p-6 lg:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <h2 id={`titre-emplacement-${cle}`} className="ko-h3 text-[20px] text-ko-ink">
            {textes.titreModal} — <span className="font-mono text-[16px]">{cle}</span>
          </h2>
          <button
            type="button"
            onClick={() => boite.current?.close()}
            aria-label={textes.fermer}
            className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink"
          >
            <IconeFermer taille={18} />
          </button>
        </div>

        <label className="label-mono mb-2 block text-ko-muted">{textes.champChoix}</label>
        {/* Grille de vignettes du bucket — jamais une URL saisie à la main.
            `max-h` + défilement interne : jusqu'à ~40 fichiers disponibles
            au 22 août 2026, une grille non bornée aurait poussé le reste
            du modal (textes alternatifs, Enregistrer) hors de l'écran. */}
        <div className="grid max-h-[280px] grid-cols-4 gap-2 overflow-y-auto border border-ko-line p-2 sm:grid-cols-5">
          {options.map((f) => {
            const estSelectionnee = f.url === selection
            return (
              <button
                key={f.url}
                type="button"
                onClick={() => setSelection(f.url)}
                aria-pressed={estSelectionnee}
                title={f.chemin}
                className={cn(
                  'relative aspect-square overflow-hidden border-2 bg-ko-cream2 transition-colors duration-200',
                  estSelectionnee ? 'border-ko-ink' : 'border-transparent hover:border-ko-line',
                )}
              >
                <Image src={f.url} alt="" fill sizes="100px" className="object-cover" />
                {estSelectionnee && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-ko-ink text-ko-white"
                  >
                    <IconeCoche taille={12} />
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`alt-fr-${cle}`} className="label-mono mb-1.5 block text-ko-muted">
              {textes.colonneAltFr}
            </label>
            <input
              id={`alt-fr-${cle}`}
              value={altFr}
              onChange={(e) => setAltFr(e.target.value)}
              className="min-h-[40px] w-full border border-ko-line bg-ko-white px-3 py-2 text-sm text-ko-ink transition-colors duration-200 focus:border-ko-blue focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor={`alt-en-${cle}`} className="label-mono mb-1.5 block text-ko-muted">
              {textes.colonneAltEn}
            </label>
            <input
              id={`alt-en-${cle}`}
              value={altEn}
              onChange={(e) => setAltEn(e.target.value)}
              placeholder={textes.altEnVide}
              className="min-h-[40px] w-full border border-ko-line bg-ko-white px-3 py-2 text-sm text-ko-ink transition-colors duration-200 focus:border-ko-blue focus:outline-none"
            />
          </div>
        </div>

        {erreur && (
          <p role="alert" className="mt-4 text-sm text-ko-ink">
            {erreur}
          </p>
        )}

        <div className="mt-6">
          <button
            type="button"
            onClick={enregistrer}
            disabled={enCours}
            className={buttonVariants({ variant: 'primary', size: 'sm' })}
          >
            {enCours ? textes.enCours : textes.enregistrer}
          </button>
        </div>
      </div>
    </dialog>
  )
}
