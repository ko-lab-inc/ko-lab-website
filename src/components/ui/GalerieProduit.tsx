'use client'

import Image from 'next/image'
import { useState } from 'react'

import { PhotoPlaceholder } from '@/components/ui/PhotoPlaceholder'
import type { VarianteCouleur } from '@/lib/produits'
import { cn } from '@/lib/utils/cn'

import type { ReactNode } from 'react'

/**
 * Visuel de la fiche produit, et son sélecteur de coloris.
 *
 * Composant client parce que changer de coloris change l'image sans recharger
 * la page — c'est le seul état de toute la fiche. Le reste (nom, texte, prix,
 * métadonnées) est rendu sur le serveur et le reste : le skill 01 impose les
 * Server Components par défaut, on ne bascule que ce qui a réellement besoin
 * d'un état.
 *
 * Les libellés arrivent en props, résolus côté serveur, plutôt que par
 * useTranslations — même modèle que CatalogueBoutique, et ça évite d'élargir
 * la liste blanche de messages envoyés au navigateur (voir layout.tsx).
 *
 * ⚠️ Sans coloris (cas des douze produits actuels), ce composant se comporte
 * exactement comme le bloc image qu'il remplace : aucune pastille n'est
 * rendue, aucun état n'est utilisé.
 */
export function GalerieProduit({
  src,
  cadrage,
  couleurs,
  labelColoris,
  labelPlaceholder,
  children,
}: {
  src: string | null
  cadrage?: 'contain' | 'cover'
  couleurs?: VarianteCouleur[]
  /** Intitulé du sélecteur, p. ex. « Coloris ». */
  labelColoris: string
  labelPlaceholder: string
  /** Rubans et badges posés en absolu sur le cadre. */
  children?: ReactNode
}) {
  const [index, setIndex] = useState(0)

  // Un seul coloris n'est pas un choix : afficher une pastille unique et
  // inerte donnerait l'impression d'une option, alors qu'il n'y a rien à
  // sélectionner. Le sélecteur n'apparaît qu'à partir de deux.
  const variantes = couleurs && couleurs.length > 1 ? couleurs : null

  // `?? src` couvre le cas d'un index qui sortirait du tableau — impossible
  // par construction, mais noUncheckedIndexedAccess l'exige, et retomber sur
  // la photo par défaut vaut mieux qu'un cadre vide.
  const visuel = variantes ? (variantes[index]?.src ?? src) : src

  return (
    <div>
      {/* Même cadre que la grille du catalogue : filet 1px et fond blanc PUR
          (ko-photo, voir globals.css). Les visuels fabricants sont détourés
          sur #ffffff — sur le blanc chaud du design system, un rectangle plus
          clair se voyait autour de l'appareil. Un produit ne peut pas changer
          d'apparence entre la grille et sa fiche. */}
      <div className="relative aspect-square overflow-hidden border border-ko-line bg-ko-photo">
        {children}

        {visuel ? (
          <Image
            // `key` sur l'URL : sans elle React réutilise le même <img> et
            // Next garde brièvement l'ancienne image affichée pendant le
            // chargement de la nouvelle — le coloris semble ne pas répondre.
            key={visuel}
            src={visuel}
            alt=""
            fill
            priority
            quality={85}
            sizes="(max-width: 1024px) 100vw, 50vw"
            className={cn(cadrage === 'cover' ? 'object-cover' : 'object-contain p-8')}
          />
        ) : (
          // ⚠️ Une seule photo par produit dans le modèle actuel — pas de
          // galerie de miniatures (skill 22 : mieux vaut un emplacement
          // réservé identifiable qu'une image approximative). La galerie de la
          // référence Bambu Store suppose plusieurs angles par produit,
          // absents ici.
          <PhotoPlaceholder
            ratio="aspect-square"
            label={labelPlaceholder}
            className="bg-ko-photo"
          />
        )}
      </div>

      {variantes && (
        <div className="mt-6">
          <p className="label-mono mb-3 text-ko-muted">{labelColoris}</p>

          {/* `aria-pressed` plutôt qu'un vrai radiogroup : même motif que les
              filtres de catégorie du catalogue, pour que les deux surfaces se
              comportent pareil au clavier et au lecteur d'écran. */}
          <div role="group" aria-label={labelColoris} className="flex flex-wrap gap-1">
            {variantes.map((couleur, i) => {
              const actif = i === index

              return (
                <button
                  key={couleur.src}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-pressed={actif}
                  // 44 px de cible tactile (skill 11) pour une pastille de
                  // 32 px : le carré reste petit à l'œil sans devenir
                  // impossible à viser au pouce.
                  className="flex h-11 w-11 items-center justify-center"
                >
                  <span className="sr-only">{couleur.nom}</span>
                  <span
                    aria-hidden="true"
                    // La couleur vient de la donnée produit, pas de la
                    // palette — voir VarianteCouleur dans produits.ts. Le
                    // filet et l'anneau de sélection, eux, restent des tokens.
                    style={{ backgroundColor: couleur.echantillon }}
                    className={cn(
                      'h-8 w-8 border transition-shadow duration-200',
                      actif
                        ? 'border-ko-blue shadow-[0_0_0_2px_var(--ko-white),0_0_0_3px_var(--ko-blue)]'
                        : 'border-ko-line',
                    )}
                  />
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
