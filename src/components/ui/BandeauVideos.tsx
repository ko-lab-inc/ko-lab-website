'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

import { IconeFermer, IconeLecture } from '@/components/ui/Icones'
import { PhotoPlaceholder } from '@/components/ui/PhotoPlaceholder'
import { identifiantYoutube } from '@/lib/utils/youtube'

/**
 * Bande continue de vidéos — quatre visibles, défilement horizontal.
 *
 * ---------------------------------------------------------------------------
 * MÊME FORME QUE BandeauImages, UN CONTENU DIFFÉRENT
 *
 * Demande de Christian, exemple à l'appui : la bande « Check Out What the
 * Pros Are Saying » de bambulab.com — quatre vignettes de vidéo alignées,
 * flèches de part et d'autre. C'est le format déjà retenu pour les photos de
 * réalisations (BandeauImages), transposé à la vidéo : même défilement natif
 * (`overflow-x-auto` + `scroll-snap`), mêmes flèches qui appellent
 * `scrollBy()`.
 *
 * Composant distinct plutôt qu'une option de BandeauImages : une vignette de
 * vidéo porte un titre, un bouton de lecture et un lien sortant — trois
 * choses qu'une photo de chantier n'a pas. Les fusionner aurait donné un
 * composant à deux modes qui ne partagent que le défilement.
 *
 * ---------------------------------------------------------------------------
 * ⚠️ LECTURE EN SURIMPRESSION, IFRAME CRÉÉE AU CLIC SEULEMENT
 *
 * Christian a demandé la lecture sans quitter le site, comme bambulab.com.
 * L'iframe n'existe donc QUE pendant la lecture — motif dit « facade » :
 *
 *   - au chargement de la page il n'y a ni iframe, ni script YouTube, ni
 *     la moindre requête vers Google. Seule la vignette est chargée ;
 *   - `youtube-nocookie.com` et non `youtube.com` : rien n'est déposé tant
 *     que la vidéo n'est pas lancée ;
 *   - à la fermeture, l'iframe est DÉTRUITE (état remis à `undefined`), pas
 *     seulement masquée — sinon le son continue derrière la fenêtre fermée ;
 *   - `frame-src` est la seule directive ouverte (next.config.ts).
 *     `script-src` reste fermé à YouTube : l'iframe charge ses scripts dans
 *     SON contexte, pas dans le nôtre.
 *
 * Une vidéo dont on ne sait pas extraire d'identifiant YouTube n'ouvre pas
 * la surimpression : sa carte reste un lien sortant classique.
 * ---------------------------------------------------------------------------
 */

export type VignetteVideo = {
  /** Lien vers la vidéo chez son hébergeur — ouvert dans un nouvel onglet. */
  url: string
  titre: string
  /**
   * Vignette hébergée par KO-LAB (public/images/… ou Supabase Storage).
   *
   * ⚠️ Pas l'URL de miniature de l'hébergeur (i.ytimg.com et compagnie) :
   * ce serait un domaine de plus à ouvrir dans `img-src`, et une dépendance
   * à une URL qu'on ne contrôle pas.
   */
  vignette: string
}

/** Nombre d'emplacements réservés affichés tant qu'aucune vidéo n'est fournie. */
const EMPLACEMENTS_RESERVES = 4

export function BandeauVideos({
  videos,
  libelles,
}: {
  videos: readonly VignetteVideo[]
  libelles: {
    groupe: string
    lire: string
    precedent: string
    suivant: string
    /** Étiquette des emplacements réservés — ex. « Vidéo à venir ». */
    aVenir: string
    fermer: string
  }
}) {
  const piste = useRef<HTMLDivElement>(null)

  function defiler(sens: 1 | -1) {
    const el = piste.current
    if (!el) return

    /**
     * Une PAGE ENTIÈRE de cartes, pas 85 % de la largeur.
     *
     * ⚠️ Corrigé : le réglage repris de BandeauImages (0.85 × largeur)
     * laissait volontairement dépasser la carte suivante pour signaler qu'on
     * avait avancé. Sur une bande de quatre, ça fait avancer de 3,4 cartes —
     * donc une carte déjà vue revient, et une autre est sautée. Christian :
     * « le slide du LAB doit se faire par 4 d'un coup et non 3 ».
     *
     * Mesuré sur la première carte plutôt que calculé depuis un nombre en
     * dur : la bande montre 1, 2 ou 4 cartes selon la largeur (voir les
     * classes `basis-*`), et ce calcul suit automatiquement.
     */
    const premiere = el.firstElementChild
    if (!premiere) return

    const largeurCarte = premiere.getBoundingClientRect().width
    const ecart = parseFloat(getComputedStyle(el).columnGap) || 0
    const pas = largeurCarte + ecart
    // Nombre de cartes entièrement visibles, au moins une.
    const parPage = Math.max(1, Math.round((el.clientWidth + ecart) / pas))

    el.scrollBy({ left: sens * parPage * pas, behavior: 'smooth' })
  }

  /**
   * Vidéo en cours de lecture. `undefined` = aucune, et surtout AUCUNE
   * iframe dans le document — c'est ce qui fait de ce motif une « facade ».
   */
  const boite = useRef<HTMLDialogElement>(null)
  const [lecture, setLecture] = useState<{ id: string; titre: string } | undefined>(undefined)

  useEffect(() => {
    const el = boite.current
    if (!el) return
    if (lecture !== undefined && !el.open) el.showModal()
    if (lecture === undefined && el.open) el.close()
  }, [lecture])

  // Échap et le clic sur le fond passent par `close` : sans cette
  // synchronisation l'état resterait rempli — donc l'iframe vivante, donc le
  // son toujours audible fenêtre fermée.
  useEffect(() => {
    const el = boite.current
    if (!el) return
    const fermer = () => setLecture(undefined)
    el.addEventListener('close', fermer)
    return () => el.removeEventListener('close', fermer)
  }, [])

  /**
   * Aucune vidéo fournie : quatre emplacements réservés, PAS une section
   * masquée.
   *
   * ⚠️ Premier réflexe (corrigé) : ne rien rendre du tout. Christian n'a
   * alors rien vu sur la page et n'a pas pu valider le format — « je ne vois
   * pas la bande de vidéo sur le lab ». Le document de cadrage tranche
   * d'ailleurs dans l'autre sens : « Prévoir des espaces réservés tant que la
   * sélection finale n'est pas terminée » (voir PhotoPlaceholder, skill 22).
   *
   * L'emplacement réservé dit ce qui manque sans rien inventer — ni fausse
   * vignette, ni faux titre, ni vidéo d'un tiers passée pour la nôtre. Il
   * occupe exactement le format final (16/9), donc le remplacement par de
   * vraies vidéos ne décalera pas la mise en page.
   */
  if (videos.length === 0) {
    return (
      <div className="flex gap-5 overflow-hidden">
        {Array.from({ length: EMPLACEMENTS_RESERVES }, (_, i) => (
          <div
            key={i}
            className="shrink-0 basis-[78%] sm:basis-[46%] lg:basis-[calc((100%-3.75rem)/4)]"
          >
            <PhotoPlaceholder ratio="aspect-video" label={libelles.aVenir} className="rounded-md" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="relative">
      <div
        ref={piste}
        role="group"
        aria-label={libelles.groupe}
        className="scrollbar-none flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth"
      >
        {videos.map((v) => {
          const id = identifiantYoutube(v.url)

          /* Vignette + titre : identiques que la carte ouvre la surimpression
             ou sorte vers l'hébergeur. Extraits pour ne pas les écrire deux
             fois — c'est le CONTENEUR qui change, pas le contenu. */
          const contenu = (
            <>
              {/* 16/9 : le format natif d'une vidéo. Un carré comme les photos
                  produit rognerait le cadrage voulu par la personne qui filme. */}
              <div className="relative aspect-video overflow-hidden rounded-md bg-ko-photo">
                <Image
                  src={v.vignette}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 78vw, (max-width: 1024px) 46vw, 320px"
                  className="object-cover transition-transform duration-[400ms] group-hover:scale-[1.04]"
                />

                {/* Pastille de lecture — pleine et opaque, jamais un simple
                    contour : une vignette de vidéo est souvent sombre et
                    contrastée, un trait fin s'y perdrait. Même raisonnement que
                    les flèches de SlideImages. */}
                <span
                  aria-hidden="true"
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ko-scrim/70 text-ko-white transition-colors duration-200 group-hover:bg-ko-blue">
                    <IconeLecture taille={20} />
                  </span>
                </span>
              </div>

              {/* Le titre EST le nom accessible de la carte : pas de
                  `aria-label` en plus, qui ferait doublon au lecteur d'écran. */}
              <p className="mt-3 text-sm leading-snug text-ko-ink transition-colors duration-200 group-hover:text-ko-blue">
                {v.titre}
              </p>
              <p className="label-mono mt-1.5 text-ko-muted">{libelles.lire}</p>
            </>
          )

          const classes =
            'group shrink-0 snap-start basis-[78%] text-left sm:basis-[46%] lg:basis-[calc((100%-3.75rem)/4)]'

          // Pas d'identifiant YouTube (autre hébergeur) : on ne sait pas
          // l'encadrer, la carte reste un lien sortant classique.
          if (!id) {
            return (
              <a
                key={v.url}
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                className={classes}
              >
                {contenu}
              </a>
            )
          }

          return (
            <button
              key={v.url}
              type="button"
              onClick={() => setLecture({ id, titre: v.titre })}
              className={classes}
            >
              {contenu}
            </button>
          )
        })}
      </div>

      {videos.length > 1 && (
        <div className="mt-5 flex justify-end gap-2">
          {/* `border-ko-ink` explicite sur le chevron : Tailwind ne colore pas
              les bordures en `currentColor` par défaut — un `border-b-2` seul
              retombe sur le gris clair du thème et devient invisible. Défaut
              déjà corrigé dans BandeauImages et la pagination du catalogue. */}
          <button
            type="button"
            onClick={() => defiler(-1)}
            aria-label={libelles.precedent}
            title={libelles.precedent}
            className="group flex h-9 w-9 items-center justify-center rounded-full border-2 border-ko-ink text-ko-ink transition-colors duration-200 hover:border-ko-blue hover:text-ko-blue"
          >
            <span
              aria-hidden="true"
              className="ml-0.5 h-2.5 w-2.5 rotate-45 border-b-2 border-l-2 border-ko-ink transition-colors duration-200 group-hover:border-ko-blue"
            />
          </button>
          <button
            type="button"
            onClick={() => defiler(1)}
            aria-label={libelles.suivant}
            title={libelles.suivant}
            className="group flex h-9 w-9 items-center justify-center rounded-full border-2 border-ko-ink text-ko-ink transition-colors duration-200 hover:border-ko-blue hover:text-ko-blue"
          >
            <span
              aria-hidden="true"
              className="mr-0.5 h-2.5 w-2.5 rotate-45 border-r-2 border-t-2 border-ko-ink transition-colors duration-200 group-hover:border-ko-blue"
            />
          </button>
        </div>
      )}

      {/* --------------------------- Lecture --------------------------- */}
      {/* Même vocabulaire que la visionneuse de photos (SlideImages) : fond
          noir, bouton de fermeture en pastille pleine, fermeture par Échap ou
          par clic sur le fond. */}
      <dialog
        ref={boite}
        aria-label={lecture?.titre ?? libelles.groupe}
        onClick={(e) => {
          if (e.target === boite.current) boite.current?.close()
        }}
        className="h-svh max-h-none w-svw max-w-none overflow-hidden border-0 bg-ko-scrim/95 p-0 text-ko-white backdrop:bg-ko-scrim/80"
      >
        {/* ⚠️ Rendu conditionnel, pas seulement masqué : `lecture` à
            `undefined` retire l'iframe du document, ce qui coupe le son. Une
            iframe cachée continue de jouer. */}
        {lecture && (
          <div className="flex h-full flex-col">
            <div className="flex shrink-0 items-start justify-between gap-4 px-5 py-4 lg:px-8 lg:py-6">
              <h2 className="min-w-0 truncate font-serif text-[20px] font-normal leading-tight text-ko-white lg:text-[26px]">
                {lecture.titre}
              </h2>
              <button
                type="button"
                onClick={() => boite.current?.close()}
                aria-label={libelles.fermer}
                title={libelles.fermer}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ko-scrim/55 text-ko-white transition-colors duration-200 hover:bg-ko-blue"
              >
                <IconeFermer taille={20} />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-6 lg:px-8">
              {/* `aspect-video` + `max-h-full` : la vidéo garde son format
                  quelle que soit la fenêtre, sans jamais déborder. */}
              <div className="aspect-video max-h-full w-full max-w-[1100px]">
                <iframe
                  // `youtube-nocookie.com` : rien n'est déposé avant lecture.
                  // `autoplay=1` est légitime ici — la lecture répond à un
                  // clic explicite, ce n'est pas une vidéo qui démarre seule.
                  src={`https://www.youtube-nocookie.com/embed/${lecture.id}?autoplay=1&rel=0`}
                  title={lecture.titre}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full border-0"
                />
              </div>
            </div>
          </div>
        )}
      </dialog>
    </div>
  )
}
