'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'

import { IconeFermer } from '@/components/ui/Icones'
import { cn } from '@/lib/utils/cn'

/**
 * Visionneuse plein écran — une série d'images, une à la fois.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI <dialog> ET PAS UNE DIV EN POSITION FIXE
 *
 * `showModal()` apporte gratuitement ce qu'une div oblige à réécrire, et mal :
 * le piège de focus, la fermeture par Échap, le fond inerte, et la sortie du
 * flux d'accessibilité pour tout ce qui est derrière. Une visionneuse maison
 * laisse presque toujours le lecteur d'écran parcourir la page cachée.
 *
 * ---------------------------------------------------------------------------
 * CE QUI EST DÉLIBÉRÉMENT ABSENT
 *
 * Pas de défilement automatique. Une image qui change toute seule interrompt
 * la lecture, et personne n'a jamais réussi à la rattraper au bon moment. On
 * avance quand on décide d'avancer.
 *
 * Pas de bibliothèque de carrousel : trois gestes — suivant, précédent,
 * fermer — ne justifient pas 40 ko de dépendance, ni le style à défaire
 * derrière.
 * ---------------------------------------------------------------------------
 */

export type ImageSlide = {
  src: string
  /**
   * Description de CE QUE MONTRE l'image.
   *
   * ⚠️ Pas le titre de la réalisation : il est déjà lu juste à côté, et le
   * répéter ferait dire deux fois la même chose au lecteur d'écran. Vide si
   * l'image est purement illustrative et n'ajoute rien au texte.
   */
  alt: string
  style?: React.CSSProperties
}

export type LibellesSlide = {
  fermer: string
  precedent: string
  suivant: string
  /** Gabarit du compteur, ex. « {n} sur {total} ». */
  position: (n: number, total: number) => string
}

export function SlideImages({
  images,
  titre,
  description,
  indexInitial = 0,
  ouvert,
  onFermer,
  libelles,
}: {
  images: readonly ImageSlide[]
  titre: string
  description?: string
  indexInitial?: number
  ouvert: boolean
  onFermer: () => void
  libelles: LibellesSlide
}) {
  const boite = useRef<HTMLDialogElement>(null)
  const [index, setIndex] = useState(indexInitial)

  const total = images.length
  const aller = useCallback(
    (pas: number) => setIndex((i) => (i + pas + total) % total),
    [total],
  )

  // Ouverture et fermeture pilotées par le parent, mais c'est la méthode
  // native qui agit : `open` posé à la main donnerait une boîte non modale,
  // sans piège de focus ni fond inerte.
  useEffect(() => {
    const el = boite.current
    if (!el) return
    if (ouvert && !el.open) {
      setIndex(indexInitial)
      el.showModal()
    }
    if (!ouvert && el.open) el.close()
  }, [ouvert, indexInitial])

  // Échap ferme nativement : sans écouter `close`, l'état du parent resterait
  // « ouvert » et rouvrir la même image deviendrait impossible.
  useEffect(() => {
    const el = boite.current
    if (!el) return
    el.addEventListener('close', onFermer)
    return () => el.removeEventListener('close', onFermer)
  }, [onFermer])

  // Flèches du clavier. Attaché au dialogue, pas au document : sans ça,
  // l'écoute continuerait de tourner une fois la visionneuse refermée.
  useEffect(() => {
    const el = boite.current
    if (!el || !ouvert) return
    const touche = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') aller(1)
      if (e.key === 'ArrowLeft') aller(-1)
    }
    el.addEventListener('keydown', touche)
    return () => el.removeEventListener('keydown', touche)
  }, [ouvert, aller])

  /**
   * Balayage tactile.
   *
   * `touchend` moins `touchstart` sur l'axe X, avec un seuil : sans lui, un
   * simple appui tremblé changerait d'image. 50 px correspond à un geste
   * intentionnel, pas à un doigt qui bouge.
   *
   * L'axe Y sert de garde : un balayage vertical est un défilement, pas une
   * navigation.
   */
  const depart = useRef<{ x: number; y: number } | null>(null)
  const debutToucher = (e: React.TouchEvent) => {
    const t = e.changedTouches[0]
    depart.current = t ? { x: t.clientX, y: t.clientY } : null
  }
  const finToucher = (e: React.TouchEvent) => {
    const d = depart.current
    const t = e.changedTouches[0]
    depart.current = null
    if (!d || !t) return

    const dx = t.clientX - d.x
    const dy = t.clientY - d.y
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return
    aller(dx < 0 ? 1 : -1)
  }

  const courante = images[index]
  if (!courante) return null

  return (
    <dialog
      ref={boite}
      aria-label={titre}
      // Clic sur le fond : le `::backdrop` n'est pas un élément à part, c'est
      // le dialogue lui-même qui reçoit l'événement. Comparer la cible évite
      // de fermer quand on clique l'image.
      onClick={(e) => {
        if (e.target === boite.current) boite.current?.close()
      }}
      // `overflow-hidden` sur les deux niveaux : un visionneur plein écran ne
      // doit jamais faire apparaître de scrollbar. `object-contain` garantit
      // déjà que l'image ne dépasse pas sa boîte ; si un débordement apparaît
      // malgré tout — un très long texte de description, par exemple — il
      // vaut mieux le couper que casser l'écran plein cadre.
      // `ko-scrim`, pas `ko-black` : seuls ko-scrim/ko-frost/ko-accent
      // acceptent un modificateur d'opacité Tailwind (voir tailwind.config.ts)
      // — `bg-ko-black/95` ne générait aucune règle, laissant le fond blanc
      // par défaut du <dialog>, d'où le titre text-ko-white illisible dessus.
      className="h-svh max-h-none w-svw max-w-none overflow-hidden border-0 bg-ko-scrim/95 p-0 text-ko-white backdrop:bg-ko-scrim/80"
    >
      <div className="flex h-full flex-col overflow-hidden">
        {/* ---------------------------- Entête ---------------------------- */}
        <div className="flex shrink-0 items-start justify-between gap-4 px-5 py-4 lg:px-8 lg:py-6">
          <div className="min-w-0">
            {/* `text-ko-white` explicite plutôt que l'héritage du `<dialog>` :
                un poids léger (300) en petite taille sur noir pur perd déjà du
                contraste ; laisser la couleur à l'héritage aurait ajouté un
                risque de plus si un jour un wrapper intermédiaire change la
                couleur du texte. */}
            <h2 className="truncate font-serif text-[20px] font-normal leading-tight text-ko-white lg:text-[26px]">
              {titre}
            </h2>
            {description && (
              <p className="mt-1 max-w-[70ch] text-sm leading-relaxed text-ko-frost/80">
                {description}
              </p>
            )}
          </div>

          {/*
            Fermeture — le seul chemin de retour vers la page, donc jamais
            discrète.

            ⚠️ Corrigé : une icône seule à 70 % d'opacité sur fond noir devient
            quasi invisible — relevé par Christian, qui ne la voyait plus une
            fois la visionneuse ouverte. Même traitement que les flèches
            maintenant : pastille pleine et opaque, visible sans survol, pas
            seulement au passage de la souris.
          */}
          <button
            type="button"
            onClick={() => boite.current?.close()}
            aria-label={libelles.fermer}
            title={libelles.fermer}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ko-scrim/55 text-ko-white transition-colors duration-200 hover:bg-ko-blue hover:text-ko-black"
          >
            <IconeFermer taille={20} />
          </button>
        </div>

        {/* ----------------------------- Image ----------------------------- */}
        <div
          onTouchStart={debutToucher}
          onTouchEnd={finToucher}
          className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-2 lg:px-8"
        >
          {/*
            La « scène ».

            ⚠️ POURQUOI UNE BOÎTE À TAILLE FIXE, ET PAS `inset-0` DIRECTEMENT
            SUR LE CONTENEUR PLEIN ÉCRAN.
            Sans elle, chaque photo est mise à l'échelle du plein écran
            SÉPARÉMENT : un paysage remplit une grande partie de l'écran, un
            portrait suivant se retrouve visuellement bien plus petit — deux
            tailles perçues différentes d'une image à l'autre, pour la même
            visionneuse. La scène fixe la même boîte pour toutes les photos ;
            chacune s'y contient à sa manière (un portrait y sera pilier-boxé,
            un paysage la remplira davantage en largeur), mais le CADRE, lui,
            ne change jamais d'une image à l'autre.
          */}
          <div className="relative h-full w-full max-w-[1100px]">
            {/*
              Toutes les images sont montées, une seule visible.

              ⚠️ Le réflexe serait de ne rendre que l'image courante. Elle
              serait alors téléchargée au moment du clic sur « suivant » : sur
              une connexion de chantier, ça fait un écran noir d'une seconde à
              chaque passage. Montées ensemble, les suivantes sont déjà en
              cache.

              C'est tenable parce qu'une réalisation compte quelques images,
              pas deux cents. Le jour où une série devient longue, ne monter
              que l'image courante et ses deux voisines.
            */}
            {images.map((im, i) => (
              <div
                key={im.src}
                aria-hidden={i !== index}
                className={cn(
                  'absolute inset-0 transition-opacity duration-300',
                  i === index ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
              >
                <Image
                  src={im.src}
                  alt={i === index ? im.alt : ''}
                  fill
                  // `contain` : une photo de chantier recadrée en `cover` perd
                  // justement ce qu'on est venu regarder.
                  //
                  // ⚠️ AUCUN `object-position` ici, à la différence des cartes
                  // de la grille. Un recadrage comme `object-[22%_40%]` a un
                  // sens pour un `object-cover` qui ROGNE l'image dans un
                  // cadre fixe — il indique quelle partie garder. En
                  // `object-contain`, rien n'est rogné : ce même décalage
                  // pousse l'image entière hors du centre de la boîte, avec un
                  // grand vide de l'autre côté.
                  className="object-contain"
                  style={im.style}
                  sizes="(max-width: 1100px) 100vw, 1100px"
                  quality={85}
                  priority={i === indexInitial}
                />
              </div>
            ))}
          </div>

          {total > 1 && (
            <>
              <BoutonFleche
                direction="precedent"
                libelle={libelles.precedent}
                onClick={() => aller(-1)}
              />
              <BoutonFleche
                direction="suivant"
                libelle={libelles.suivant}
                onClick={() => aller(1)}
              />
            </>
          )}
        </div>

        {/* ------------------------- Pied de page ------------------------- */}
        {/* Grille en trois colonnes égales plutôt que `justify-between` :
            celui-ci collait les traits au bord droit de l'écran, loin de
            l'image qu'ils commandent. Ici la colonne du milieu est centrée sur
            la page quelle que soit la longueur du compteur. */}
        {total > 1 && (
          <div className="grid shrink-0 grid-cols-3 items-center px-5 py-3 lg:px-8 lg:py-5">
            {/* `aria-live` : la position change sans que le focus bouge. Sans
                annonce, un utilisateur de lecteur d'écran ne saurait pas où il
                en est dans la série. */}
            <p aria-live="polite" className="label-mono text-ko-frost/70">
              {libelles.position(index + 1, total)}
            </p>

            {/* Pastilles cliquables plutôt que décoratives : sur une série
                courte, atteindre directement la troisième image vaut mieux que
                deux clics sur « suivant ». */}
            <div className="flex items-center justify-center gap-1.5">
              {images.map((im, i) => (
                <button
                  key={im.src}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={libelles.position(i + 1, total)}
                  aria-current={i === index}
                  // Cible de 44px, dont seuls 2px sont peints : le trait reste
                  // discret sans devenir impossible à toucher.
                  className="flex h-11 w-10 items-center justify-center"
                >
                  <span
                    className={cn(
                      'h-0.5 w-full transition-colors duration-200',
                      i === index ? 'bg-ko-blue' : 'bg-ko-frost/30',
                    )}
                  />
                </button>
              ))}
            </div>

            {/* Troisième colonne vide : elle équilibre la grille et garde les
                traits au centre exact. */}
            <span aria-hidden="true" />
          </div>
        )}
      </div>
    </dialog>
  )
}

/**
 * Flèche de navigation.
 *
 * Chevron dessiné en CSS — deux bordures et une rotation — plutôt qu'une
 * icône de plus dans le fichier partagé : c'est la même forme que celle des
 * lignes Capacités de l'accueil, et elle n'existe qu'ici.
 */
function BoutonFleche({
  direction,
  libelle,
  onClick,
}: {
  direction: 'precedent' | 'suivant'
  libelle: string
  onClick: () => void
}) {
  const precedent = direction === 'precedent'

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={libelle}
      title={libelle}
      className={cn(
        'group absolute inset-y-0 flex w-16 items-center justify-center lg:w-24',
        precedent ? 'left-0' : 'right-0',
      )}
    >
      {/*
        Pastille sous le chevron.

        ⚠️ Sans elle, le chevron seul se perd sur une photo : les images de
        chantier sont sombres ET contrastées, un trait clair de 1 px y disparaît
        dans les hautes lumières et se confond avec le décor dans les ombres. Le
        fond opaque garantit le contraste quelle que soit l'image dessous —
        c'est de la lisibilité, pas de la décoration.
      */}
      <span
        aria-hidden="true"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-ko-scrim/55 transition-colors duration-200 group-hover:bg-ko-blue"
      >
        {/* Les deux chevrons tournent de 45° : c'est le CHOIX DES BORDURES qui
            décide du sens. Bas + gauche pointe à gauche, haut + droite pointe
            à droite. Décalé d'un pixel pour compenser le centre optique — une
            pointe centrée géométriquement paraît toujours trop à droite. */}
        <span
          className={cn(
            // Largeurs posées par côté : `border-2` combiné à `border-b`
            // laisse l'ordre de génération de Tailwind décider laquelle des
            // deux l'emporte, et le chevron sort à 1 px une fois sur deux.
            'h-3 w-3 rotate-45 border-ko-frost/85 transition-colors duration-200 group-hover:border-ko-black',
            precedent ? 'ml-1 border-b-2 border-l-2' : 'mr-1 border-r-2 border-t-2',
          )}
        />
      </span>
    </button>
  )
}
