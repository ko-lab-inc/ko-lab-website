'use client'

import Image from 'next/image'
import { useRef } from 'react'

/**
 * Bande continue de vignettes — défilement horizontal, taille fixe.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI CE COMPOSANT EXISTE, EN PLUS DE LA VISIONNEUSE PLEIN ÉCRAN
 *
 * Demande de Christian : « nos réalisations […] et d'autre exposition
 * d'image ». La visionneuse (SlideImages) montre une image à la fois, en
 * plein écran, sur un clic délibéré. Cette bande montre plusieurs photos EN
 * MÊME TEMPS, directement dans le flux de la page — on parcourt la série sans
 * jamais ouvrir de fenêtre, exactement comme la bande de vidéos qui suit une
 * fiche produit chez Bambu Lab (l'exemple donné).
 *
 * ⚠️ COMPOSANT GÉNÉRIQUE, PAS SPÉCIFIQUE AUX RÉALISATIONS
 *
 * Il ne connaît ni « réalisation » ni « série » : seulement une liste
 * d'images, un texte alternatif chacune, et un geste de sélection. C'est
 * voulu — Christian a demandé de garder ce format en mémoire pour une future
 * page (fiches produit façon Bambu Lab). Le jour venu, ce même composant
 * s'y pose sans modification.
 *
 * ---------------------------------------------------------------------------
 * DÉFILEMENT NATIF, PAS UNE ANIMATION MAISON
 *
 * `overflow-x-auto` + `scroll-snap` donnent le geste tactile et le
 * défilement au trackpad gratuitement, avec l'inertie du système
 * d'exploitation — une text qu'un `translateX` fait à la main ne reproduit
 * jamais aussi bien. Les flèches ne font qu'appeler `scrollBy()` sur ce même
 * conteneur ; ce n'est pas un second mécanisme, seulement un raccourci pour
 * la souris sans trackpad.
 * ---------------------------------------------------------------------------
 */

export type VignetteBandeau = { src: string; alt: string }

export function BandeauImages({
  images,
  onSelectionner,
  libelles,
}: {
  images: readonly VignetteBandeau[]
  /** Appelé avec l'INDEX de la vignette cliquée — pas seulement « ouvrir ». */
  onSelectionner: (index: number) => void
  libelles: { groupe: string; position: (n: number, total: number) => string; precedent: string; suivant: string }
}) {
  const piste = useRef<HTMLDivElement>(null)

  function defiler(sens: 1 | -1) {
    const el = piste.current
    if (!el) return
    // Un peu moins que la largeur visible : la dernière vignette de l'écran
    // précédent reste partiellement visible après le défilement, ce qui
    // signale qu'on a avancé plutôt que sauté à un endroit arbitraire.
    el.scrollBy({ left: sens * el.clientWidth * 0.85, behavior: 'smooth' })
  }

  if (images.length === 0) return null

  return (
    <div className="relative">
      <div
        ref={piste}
        role="group"
        aria-label={libelles.groupe}
        className="scrollbar-none flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth"
      >
        {images.map((im, i) => (
          <button
            key={im.src}
            type="button"
            onClick={() => onSelectionner(i)}
            // `im.alt` peut être vide — c'est le cas pour la vignette qui
            // reprend la photo de couverture, déjà nommée par la carte
            // juste au-dessus. Le nom accessible retombe alors sur la
            // position, jamais sur un bouton totalement muet.
            aria-label={im.alt || libelles.position(i + 1, images.length)}
            className="relative h-40 w-64 shrink-0 snap-start overflow-hidden rounded-md bg-ko-photo sm:h-44 sm:w-72 lg:h-48 lg:w-80"
          >
            {/*
              `object-cover`, pas `contain` : ici les vignettes DOIVENT
              partager la même boîte, quelle que soit l'orientation de la
              photo d'origine — c'est le rognage qui rend ça possible. La
              visionneuse plein écran, elle, fait l'inverse (`contain`,
              jamais rogné) parce que son sujet est de montrer la photo
              entière — deux besoins différents, deux traitements différents.
            */}
            <Image src={im.src} alt={im.alt} fill sizes="320px" className="object-cover" />
          </button>
        ))}
      </div>

      {images.length > 1 && (
        <div className="mt-3 flex justify-end gap-2">
          {/*
            ⚠️ Corrigé : un trait fin gris clair (border-ko-line) sur un fond
            de carte tout aussi clair devenait quasi invisible — même défaut
            que le bouton de fermeture de SlideImages, relevé par Christian.
            Bordure sombre et pleine dès le repos, pas seulement au survol :
            l'affordance doit se voir avant qu'on la cherche.
          */}
          <button
            type="button"
            onClick={() => defiler(-1)}
            aria-label={libelles.precedent}
            title={libelles.precedent}
            className="group flex h-9 w-9 items-center justify-center rounded-full border-2 border-ko-ink text-ko-ink transition-colors duration-200 hover:border-ko-blue hover:text-ko-blue"
          >
            {/* `border-ko-ink` explicite : Tailwind ne colore pas les bordures
                en `currentColor` par défaut, un `border-b-2` sans classe de
                couleur retombe sur le gris clair du thème — invisible ici,
                exactement le défaut que ce correctif visait à éliminer. */}
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
