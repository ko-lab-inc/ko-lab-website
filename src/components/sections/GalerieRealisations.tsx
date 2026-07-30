'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

import { SlideImages, type ImageSlide } from '@/components/ui/SlideImages'
import { FILTRE_TERRAIN, FILTRE_TERRAIN_CHAUD } from '@/lib/images'
import { cn } from '@/lib/utils/cn'

import type { CategorieRealisation } from '@/types'

/**
 * Galerie filtrable — skill 21.
 *
 * Le filtrage est purement client : aucun rechargement, aucune requête. Les
 * réalisations arrivent DÉJÀ TRADUITES depuis le composant serveur. C'est ce
 * qui permet de garder next-intl côté serveur : passer les clés brutes aurait
 * obligé à embarquer le catalogue de traductions dans le bundle client.
 *
 * ⚠️ CONTENU PROVISOIRE — trois entrées codées en dur en attendant Supabase.
 * Le jour du branchement, seule la page serveur change ; ce composant reçoit
 * la même forme de données :
 *
 *     const supabase = createStaticClient()   // JAMAIS createClient()
 *     const { data } = await supabase.from('realisations')
 *       .select('slug, titre_fr, titre_en, categorie, images')
 *       .eq('publie', true).order('ordre')
 */

export type RealisationCarte = {
  cle: string
  categorie: CategorieRealisation
  titre: string
  description: string
  tag: string
  src: string
  cadrage: string
  desature: boolean
  /**
   * Images supplémentaires, montrées dans la visionneuse.
   *
   * La première image de la série est TOUJOURS `src` — celle de la carte —
   * pour que le clic ouvre sur ce qu'on vient de regarder. Ce champ ne
   * contient donc que la suite.
   *
   * Vide ou absent : la carte n'ouvre rien. Une visionneuse à une seule image
   * ferait cliquer pour ne rien montrer de plus.
   */
  serie?: readonly ImageSlide[]
}

type Filtre = {
  valeur: CategorieRealisation | 'all'
  label: string
}

type GalerieProps = {
  realisations: readonly RealisationCarte[]
  filtres: readonly Filtre[]
  labelFiltres: string
  aucunResultat: string
}

export function GalerieRealisations({
  realisations,
  filtres,
  labelFiltres,
  aucunResultat,
}: GalerieProps) {
  // Seule chaîne résolue côté client : le compteur est un pluriel ICU dont la
  // valeur change à chaque filtre, il ne peut pas être pré-calculé au serveur.
  // Le coût est nul — NextIntlClientProvider expose déjà le catalogue.
  const t = useTranslations('Realisations')

  const [categorie, setCategorie] = useState<CategorieRealisation | 'all'>('all')

  /**
   * Réalisation dont la série est ouverte, ou `null`.
   *
   * Une seule visionneuse pour toute la grille, montée à la fin. Une par carte
   * mettrait autant de `<dialog>` dans le document, chacun avec ses images —
   * pour n'en montrer qu'un à la fois.
   */
  const [ouverte, setOuverte] = useState<RealisationCarte | null>(null)

  const libellesSlide = useMemo(
    () => ({
      fermer: t('slide_fermer'),
      precedent: t('slide_precedent'),
      suivant: t('slide_suivant'),
      position: (n: number, total: number) => t('slide_position', { n, total }),
    }),
    [t],
  )

  const visibles = useMemo(
    () => realisations.filter((r) => categorie === 'all' || r.categorie === categorie),
    [realisations, categorie],
  )

  return (
    <>
      {/* ------------------------------ Filtres ------------------------------ */}
      {/* `role="group"` plutôt qu'une liste de liens : le filtrage ne change pas
          l'URL, ces boutons ne sont donc pas des destinations navigables. */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div role="group" aria-label={labelFiltres} className="flex flex-wrap gap-2">
        {filtres.map(({ valeur, label }) => {
          const actif = valeur === categorie

          return (
            <button
              key={valeur}
              type="button"
              onClick={() => setCategorie(valeur)}
              aria-pressed={actif}
              className={cn(
                'min-h-[44px] rounded-sm border px-5 text-sm transition-colors duration-250',
                actif
                  ? 'border-ko-blue bg-ko-blue text-ko-white'
                  : 'border-ko-line text-ko-ink hover:border-ko-ink',
              )}
            >
              {label}
            </button>
          )
        })}
      </div>

        {/* Compteur en direct. `aria-live="polite"` : le filtre ne change pas
            l'URL et ne déplace pas le focus — sans annonce, un utilisateur de
            lecteur d'écran n'aurait aucun retour sur l'effet de son clic. */}
        <p aria-live="polite" className="label-mono text-ko-muted">
          {t('compte', { n: visibles.length })}
        </p>
      </div>

      {/* ------------------------------ Grille ------------------------------ */}
      {visibles.length === 0 ? (
        <p className="mt-14 text-base text-ko-muted">{aucunResultat}</p>
      ) : (
        /* Grille asymétrique : la première carte occupe deux colonnes et deux
           rangées. Quand un filtre ne laisse qu'un seul résultat, elle s'étend
           simplement — la mise en page ne se casse pas.

           PAS de `lg:grid-rows-2` : deux rangées explicites combinées à un
           enfant en `h-full` créaient une dépendance circulaire — la rangée
           se dimensionnait sur son contenu, qui se dimensionnait sur la
           rangée. Avec plusieurs cartes les petites rompaient le cycle ; avec
           une seule, la hauteur s'effondrait à zéro.
           Les rangées sont désormais implicites et chaque carte porte son
           propre ratio, donc une hauteur intrinsèque. */
        <div className="mt-14 grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
          {visibles.map((r, i) => {
            const serie = serieDe(r)

            return (
            <article
              key={r.cle}
              className={cn(
                'group relative overflow-hidden rounded-xl bg-ko-cream2',
                i === 0 ? 'lg:col-span-2 lg:row-span-2' : 'lg:col-span-1',
              )}
            >
              {/* La grande carte occupe deux rangées : sur desktop elle doit
                  remplir la hauteur imposée par la colonne de droite, sinon un
                  ratio fixe laisse une bande de fond apparente sous l'image.
                  Le ratio reste en vigueur sous lg, où la grille est linéaire. */}
              <div
                className={cn(
                  'relative',
                  // Ratio TOUJOURS actif, quel que soit le nombre de cartes.
                  // C'est lui qui donne sa hauteur à la carte : sans lui, un
                  // parent sans hauteur explicite plus un `fill` s'effondrent.
                  i === 0 ? 'aspect-[3/2]' : 'aspect-[4/3]',
                )}
              >
                {/*
                  ⚠️ TEMPORAIRE — remplacer par photo KO-LAB 2025-2026
                  Voir skill 22 pour les critères de remplacement.
                */}
                <Image
                  src={r.src}
                  alt=""
                  fill
                  // La grande carte est au-dessus de la ligne de flottaison et
                  // Next la détecte comme élément LCP. Sans `priority`, elle est
                  // chargée en différé et retarde directement la mesure.
                  priority={i === 0}
                  quality={80}
                  sizes={i === 0 ? '(max-width: 1024px) 100vw, 66vw' : '(max-width: 1024px) 100vw, 33vw'}
                  style={r.desature ? FILTRE_TERRAIN_CHAUD : FILTRE_TERRAIN}
                  className={cn(
                    'object-cover transition-transform duration-[400ms] group-hover:scale-[1.02]',
                    r.cadrage,
                  )}
                />

                {/* Voile de lisibilité, renforcé au survol pour laisser
                    apparaître la description. */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-ko-scrim/85 via-ko-scrim/25 to-transparent transition-opacity duration-[400ms] group-hover:from-ko-scrim/95 group-hover:via-ko-scrim/60"
                />

                <span className="label-mono absolute left-4 top-4 rounded bg-ko-scrim/60 px-3 py-1.5 text-ko-frost/90 backdrop-blur-sm">
                  {r.tag}
                </span>

                {/* Ouverture de la série.

                    Un BOUTON, pas un lien : la visionneuse n'a pas d'URL
                    propre et rien n'est navigable derrière. Un lien vers
                    « # » annoncerait une destination qui n'existe pas.

                    Étendu à toute la carte par `absolute inset-0` : la cible
                    est l'image entière, pas une petite zone à viser. Le
                    libellé, lui, reste explicite pour le lecteur d'écran —
                    « Voir les images » seul ne dirait pas de quoi.

                    ⚠️ Placé AVANT le bloc de texte dans l'ordre du document,
                    mais sans z-index : le texte qui suit passe donc au-dessus
                    et reste sélectionnable. */}
                {serie.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setOuverte(r)}
                    aria-label={`${t('voir_serie')} — ${r.titre}`}
                    className="absolute inset-0 cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-ko-blue"
                  >
                    {/* Compteur d'images, en haut à droite, en face du tag.
                        C'est le seul indice qu'il y a plus à voir — sans lui,
                        rien ne distingue une carte cliquable d'une autre. */}
                    <span className="label-mono absolute right-4 top-4 rounded bg-ko-scrim/60 px-3 py-1.5 text-ko-frost/90 backdrop-blur-sm transition-colors duration-[400ms] group-hover:bg-ko-blue group-hover:text-ko-white">
                      {t('serie_compte', { n: serie.length })}
                    </span>
                  </button>
                )}

                <div className="pointer-events-none absolute inset-x-4 bottom-4">
                  <h3
                    className={cn(
                      'font-serif leading-tight text-ko-white',
                      i === 0 ? 'text-[26px]' : 'text-[20px]',
                    )}
                  >
                    {r.titre}
                  </h3>

                  {/* Description révélée au survol. `max-h` plutôt que `hidden` :
                      le texte reste dans le DOM, donc accessible aux lecteurs
                      d'écran et aux moteurs de recherche. */}
                  <p className="max-h-0 overflow-hidden text-sm leading-relaxed text-ko-frost/75 opacity-0 transition-[max-height,opacity,margin] duration-[400ms] group-hover:mt-2 group-hover:max-h-32 group-hover:opacity-100">
                    {r.description}
                  </p>
                </div>
              </div>
            </article>
            )
          })}
        </div>
      )}

      {/* Une seule visionneuse pour toute la grille. `key` : force le
          remontage d'une réalisation à l'autre, sinon l'index de l'image
          resterait celui de la série précédente. */}
      {ouverte && (
        <SlideImages
          key={ouverte.cle}
          ouvert
          onFermer={() => setOuverte(null)}
          images={serieDe(ouverte)}
          titre={ouverte.titre}
          description={ouverte.description}
          libelles={libellesSlide}
        />
      )}
    </>
  )
}

/**
 * Série complète d'une réalisation : sa photo de carte, puis les suivantes.
 *
 * Reconstruite ici plutôt que stockée en double dans les données — sinon la
 * première image devrait être écrite deux fois, et les deux finiraient par
 * diverger le jour où l'on change la photo de couverture.
 */
function serieDe(r: RealisationCarte): readonly ImageSlide[] {
  return [
    {
      src: r.src,
      // Vide : le titre et la description de la réalisation sont déjà lus
      // dans l'entête de la visionneuse. Répéter ferait dire deux fois la
      // même chose.
      alt: '',
      cadrage: r.cadrage,
      style: r.desature ? FILTRE_TERRAIN_CHAUD : FILTRE_TERRAIN,
    },
    ...(r.serie ?? []),
  ]
}
