'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, useTransition } from 'react'

import {
  mettreAJourEmplacement,
  televerserPhotoEmplacement,
} from '@/app/(admin)/[locale]/admin/medias-emplacements/actions'
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
 *
 * ---------------------------------------------------------------------------
 * PHOTO ACTUELLE ≠ SÉLECTION — deux marquages distincts, volontairement
 *
 * `photoActuelle` (prop) est ce qui est RÉELLEMENT en base ; `selection`
 * (état local) est ce que la personne vient de cliquer, pas encore
 * enregistré. Les deux peuvent différer pendant qu'on prévisualise un
 * changement — la vignette « Photo actuelle » garde son étiquette même si
 * une autre vignette porte la coche de sélection, pour qu'on comprenne
 * toujours CE QUI VA ÊTRE REMPLACÉ.
 *
 * ---------------------------------------------------------------------------
 * TÉLÉVERSEMENT (27 août 2026) — DÉPÔT IMMÉDIAT, ENREGISTREMENT DIFFÉRÉ
 *
 * Choisir un fichier lance `televerserPhotoEmplacement` tout de suite : le
 * fichier atterrit dans le bucket `medias` et son URL rejoint `selection`,
 * exactement comme un clic sur une vignette de la grille — pas d'attente du
 * bouton Enregistrer pour ce dépôt-là. La ligne `medias_emplacements`, elle,
 * n'est écrite qu'à l'Enregistrer (`mettreAJourEmplacement`, inchangée) :
 * fermer la modale sans enregistrer laisse le fichier dans le bucket, non
 * référencé — même compromis que les photos de FormulaireRealisation
 * (skill 22), un fichier orphelin coûte de l'espace, pas une panne.
 *
 * `fichiersTeleverses` (état local) place la ou les photos tout juste
 * déposées EN TÊTE de la grille, avant `fichiersDisponibles` (calculée côté
 * serveur, donc jamais au courant d'un dépôt qui vient de se produire côté
 * client) — c'est le rafraîchissement demandé, sans recharger la page.
 * ---------------------------------------------------------------------------
 */

export type FichierDisponible = { chemin: string; url: string }

export type TextesSelecteurEmplacement = {
  titreModal: string
  champChoix: string
  aideChoix: string
  /** Libellé du champ de fichier — distingue le geste de la grille juste
   *  au-dessus (« Ou téléverser une nouvelle photo »). */
  champTeleverser: string
  aideTeleverser: string
  champDossier: string
  /** Formats acceptés + taille max, affiché sous le champ de fichier. */
  contraintesPhoto: string
  televersementEnCours: string
  colonneAltFr: string
  colonneAltEn: string
  altEnVide: string
  photoActuelle: string
  retirerPhoto: string
  confirmerRetrait: string
  sansPhoto: string
  enregistrer: string
  enCours: string
  fermer: string
  erreurServeur: string
}

/**
 * Dossier de destination par défaut : celui de la photo ACTUELLE de
 * l'emplacement si elle vient bien du bucket `medias` et que son dossier
 * figure dans la liste connue, sinon le premier dossier de la liste — jamais
 * une chaîne vide, `televerserPhotoEmplacement` refuse tout `dossier` hors
 * liste blanche.
 */
function dossierParDefaut(url: string | null, dossiers: readonly string[]): string {
  const segment = url?.split('/storage/v1/object/public/medias/')[1]?.split('/')[0]
  if (segment && dossiers.includes(segment)) return segment
  return dossiers[0] ?? ''
}

export function SelecteurPhotoEmplacement({
  ouvert,
  onFermer,
  cle,
  photoActuelle,
  altFrActuel,
  altEnActuel,
  fichiersDisponibles,
  dossiers,
  textes,
  onEnregistre,
}: {
  ouvert: boolean
  onFermer: () => void
  cle: string
  /** `null` : emplacement vide assumé (migration 0037), pas encore de photo. */
  photoActuelle: string | null
  altFrActuel: string
  altEnActuel: string | null
  fichiersDisponibles: FichierDisponible[]
  /** Dossiers connus du bucket `medias` (lib/medias-disponibles.ts,
   *  `DOSSIERS_MEDIAS`) — options du sélecteur de destination du
   *  téléversement. */
  dossiers: readonly string[]
  textes: TextesSelecteurEmplacement
  onEnregistre: (maj: { url_stockage: string | null; alt_text_fr: string; alt_text_en: string | null }) => void
}) {
  const boite = useRef<HTMLDialogElement>(null)
  const inputFichier = useRef<HTMLInputElement>(null)
  const [selection, setSelection] = useState<string | null>(photoActuelle)
  const [altFr, setAltFr] = useState(altFrActuel)
  const [altEn, setAltEn] = useState(altEnActuel ?? '')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, demarrer] = useTransition()

  // Fichiers déposés PENDANT cette session d'édition — voir la docstring du
  // fichier (« TÉLÉVERSEMENT »). Distinct de `fichiersDisponibles` (calculée
  // côté serveur avant l'ouverture de la modale) : c'est ce qui permet à la
  // grille de montrer un dépôt tout juste fait, sans recharger la page.
  const [fichiersTeleverses, setFichiersTeleverses] = useState<FichierDisponible[]>([])
  const [dossier, setDossier] = useState(() => dossierParDefaut(photoActuelle, dossiers))
  const [erreurTeleversement, setErreurTeleversement] = useState<string | null>(null)
  const [televersementEnCours, demarrerTeleversement] = useTransition()

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
    setFichiersTeleverses([])
    setDossier(dossierParDefaut(photoActuelle, dossiers))
    setErreurTeleversement(null)
    if (inputFichier.current) inputFichier.current.value = ''
  }, [ouvert, photoActuelle, altFrActuel, altEnActuel, dossiers])

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

  // Geste direct (confirmation puis application immédiate), pas un simple
  // changement de `selection` en attente d'Enregistrer — même patron que
  // SelecteurPhotoPoste.supprimer(). Agit sur la photo réellement en base,
  // indépendamment de ce qui est survolé dans la grille au moment du clic.
  function retirer() {
    if (!window.confirm(textes.confirmerRetrait)) return
    setErreur(null)
    demarrer(async () => {
      const resultat = await mettreAJourEmplacement(cle, null, altFr, altEn || null)
      if (!resultat.success) {
        setErreur(resultat.error ?? textes.erreurServeur)
        return
      }
      onEnregistre({ url_stockage: null, alt_text_fr: altFr, alt_text_en: altEn || null })
      boite.current?.close()
    })
  }

  /**
   * Choisir un fichier lance le dépôt tout de suite (voir la docstring du
   * fichier) : pas de bouton « Téléverser » séparé, `onChange` suffit — le
   * geste attendu est « je choisis mon fichier », pas « je choisis puis je
   * confirme une deuxième fois ».
   */
  function televerser(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0]
    if (!fichier) return
    setErreurTeleversement(null)
    demarrerTeleversement(async () => {
      const donnees = new FormData()
      donnees.append('cle', cle)
      donnees.append('dossier', dossier)
      donnees.append('fichier', fichier)

      const resultat = await televerserPhotoEmplacement(donnees)
      // Vidé dans tous les cas — un échec ne doit pas laisser le champ sur un
      // fichier qu'on ne peut de toute façon pas retéléverser tel quel sans
      // le resélectionner.
      if (inputFichier.current) inputFichier.current.value = ''

      if (!resultat.success) {
        setErreurTeleversement(resultat.error)
        return
      }

      setFichiersTeleverses((f) => [resultat.fichier, ...f])
      setSelection(resultat.fichier.url)
    })
  }

  // ⚠️ `!fichiersTeleverses.some(...)` en plus de la vérification déjà en
  // place sur `fichiersDisponibles` : sans elle, la vignette tout juste
  // déposée réapparaissait UNE SECONDE FOIS après Enregistrer — une fois via
  // `fichiersTeleverses` (jamais vidé à la fermeture, seulement à la
  // réouverture), une fois via ce repli synthétique, `photoActuelle` valant
  // désormais la même URL. Deux entrées de grille pour la même clé React
  // (`f.url`), symptôme observé en test E2E (avertissement React « two
  // children with the same key »).
  const options = [
    ...fichiersTeleverses,
    ...(photoActuelle &&
    !fichiersDisponibles.some((f) => f.url === photoActuelle) &&
    !fichiersTeleverses.some((f) => f.url === photoActuelle)
      ? [{ chemin: cle, url: photoActuelle }, ...fichiersDisponibles]
      : fichiersDisponibles),
  ]

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
        {/* Texte d'aide court — sans lui, une grille de vignettes sans
            contexte ne dit ni ce qu'elle montre, ni qu'un emplacement ne
            porte qu'une photo à la fois. */}
        <p className="mb-3 text-sm leading-relaxed text-ko-muted">{textes.aideChoix}</p>

        {/* Grille de vignettes du bucket — jamais une URL saisie à la main.
            `max-h` + défilement interne : jusqu'à ~40 fichiers disponibles
            au 22 août 2026, une grille non bornée aurait poussé le reste
            du modal (textes alternatifs, Enregistrer) hors de l'écran. */}
        <div className="grid max-h-[280px] grid-cols-4 gap-2 overflow-y-auto border border-ko-line p-2 sm:grid-cols-5">
          {options.map((f) => {
            const estSelectionnee = f.url === selection
            const estActuelle = f.url === photoActuelle
            return (
              <button
                key={f.url}
                type="button"
                onClick={() => setSelection(f.url)}
                aria-pressed={estSelectionnee}
                title={f.chemin}
                className={cn(
                  'relative aspect-square overflow-hidden border-2 bg-ko-cream2 transition-colors duration-200',
                  // Marquage renforcé : anneau + décalage (ring-offset) en
                  // plus de la bordure, pour que la sélection se voie même
                  // à côté de l'étiquette « Photo actuelle » sur une autre
                  // vignette — une simple bordure de 2px passait inaperçue
                  // (retour : « on ne sait pas laquelle est en place »).
                  estSelectionnee
                    ? 'border-ko-ink ring-2 ring-ko-ink ring-offset-2'
                    : 'border-transparent hover:border-ko-line',
                )}
              >
                <Image src={f.url} alt="" fill sizes="100px" className="object-cover" />

                {estActuelle && (
                  <span className="absolute left-1 top-1 rounded bg-ko-ink px-1.5 py-0.5 font-mono text-[9px] uppercase leading-none tracking-wide text-ko-white">
                    {textes.photoActuelle}
                  </span>
                )}

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

        {photoActuelle === null && (
          <p className="mt-2 text-xs italic text-ko-muted">{textes.sansPhoto}</p>
        )}

        {/* Téléversement — geste distinct de la grille au-dessus, libellé
            séparé pour ne pas laisser croire que c'est la même action. */}
        <div className="mt-6 border-t border-ko-line pt-5">
          <label htmlFor={`televerser-${cle}`} className="label-mono mb-2 block text-ko-muted">
            {textes.champTeleverser}
          </label>
          <p className="mb-3 text-sm leading-relaxed text-ko-muted">{textes.aideTeleverser}</p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="sm:w-44 sm:shrink-0">
              <label
                htmlFor={`dossier-${cle}`}
                className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-ko-muted"
              >
                {textes.champDossier}
              </label>
              <select
                id={`dossier-${cle}`}
                value={dossier}
                onChange={(e) => setDossier(e.target.value)}
                disabled={televersementEnCours}
                className="min-h-[40px] w-full border border-ko-line bg-ko-white px-3 py-2 text-sm text-ko-ink transition-colors duration-200 focus:border-ko-blue focus:outline-none disabled:opacity-60"
              >
                {dossiers.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <input
              ref={inputFichier}
              id={`televerser-${cle}`}
              type="file"
              accept="image/webp,image/jpeg,image/png,image/avif"
              disabled={televersementEnCours}
              onChange={televerser}
              className="min-w-0 flex-1 text-sm text-ko-ink file:mr-4 file:min-h-[36px] file:cursor-pointer file:border file:border-ko-line file:bg-ko-cream file:px-4 file:text-sm file:text-ko-ink hover:file:border-ko-ink disabled:opacity-60"
            />
          </div>

          <p className="mt-2 text-xs text-ko-muted">{textes.contraintesPhoto}</p>

          {televersementEnCours && (
            <p role="status" className="mt-2 text-sm text-ko-muted">
              {textes.televersementEnCours}
            </p>
          )}
          {erreurTeleversement && (
            <p role="alert" className="mt-2 text-sm text-ko-ink">
              {erreurTeleversement}
            </p>
          )}
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

        <div className="mt-6 flex items-center gap-5">
          <button
            type="button"
            onClick={enregistrer}
            disabled={enCours}
            className={buttonVariants({ variant: 'primary', size: 'sm' })}
          >
            {enCours ? textes.enCours : textes.enregistrer}
          </button>
          {/* Retire la photo EN BASE directement (confirmation puis
              application) — n'apparaît que s'il y a effectivement une photo
              à retirer. Jamais de suppression du fichier Storage : voir
              actions.ts, seule la colonne url_stockage est modifiée. */}
          {photoActuelle && (
            <button
              type="button"
              onClick={retirer}
              disabled={enCours}
              className="text-sm text-ko-muted transition-colors duration-200 hover:text-ko-ink"
            >
              {textes.retirerPhoto}
            </button>
          )}
        </div>
      </div>
    </dialog>
  )
}
