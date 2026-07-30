'use client'

import Image from 'next/image'
import { useRef } from 'react'

import { IconeLecture } from '@/components/ui/Icones'
import { PhotoPlaceholder } from '@/components/ui/PhotoPlaceholder'

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
 * ⚠️ PAS D'IFRAME, PAS DE SCRIPT TIERS — ET C'EST DÉLIBÉRÉ
 *
 * La vignette est hébergée par nous, et le clic ouvre la vidéo chez
 * l'hébergeur dans un nouvel onglet. Conséquences, toutes voulues :
 *
 *   - la CSP reste fermée. Aucun `frame-src`, aucun domaine vidéo à
 *     autoriser — l'audit de sécurité de cette session avait justement
 *     resserré ces directives ;
 *   - aucun script YouTube au chargement de la page, donc aucun cookie
 *     tiers et aucun poids ajouté (le contraire de ce que Christian a
 *     demandé en faisant retirer ce qui ralentit le site) ;
 *   - la page reste statique (ISR), rien n'est chargé côté client.
 *
 * Le jour où une lecture SANS quitter le site devient nécessaire, il faudra
 * ouvrir `frame-src` vers youtube-nocookie.com et charger l'iframe seulement
 * au clic (motif « facade ») — jamais au chargement de la page.
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
  }
}) {
  const piste = useRef<HTMLDivElement>(null)

  function defiler(sens: 1 | -1) {
    const el = piste.current
    if (!el) return
    // Un peu moins que la largeur visible : la dernière vignette de l'écran
    // précédent reste partiellement visible, ce qui signale qu'on a avancé
    // plutôt que sauté à un endroit arbitraire. Même réglage que BandeauImages.
    el.scrollBy({ left: sens * el.clientWidth * 0.85, behavior: 'smooth' })
  }

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
        {videos.map((v) => (
          <a
            key={v.url}
            href={v.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group shrink-0 snap-start basis-[78%] sm:basis-[46%] lg:basis-[calc((100%-3.75rem)/4)]"
          >
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

            {/* Le titre EST le nom accessible du lien : pas de `aria-label` en
                plus, qui ferait doublon au lecteur d'écran. */}
            <p className="mt-3 text-sm leading-snug text-ko-ink transition-colors duration-200 group-hover:text-ko-blue">
              {v.titre}
            </p>
            <p className="label-mono mt-1.5 text-ko-muted">{libelles.lire}</p>
          </a>
        ))}
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
    </div>
  )
}
