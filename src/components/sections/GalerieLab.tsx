import Image from 'next/image'

import { FILTRE_TERRAIN } from '@/lib/images'

/**
 * Grille de photos du LAB — les 7 emplacements lab_1..lab_7
 * (medias_emplacements, migrations 0031/0033). Patron délibérément différent
 * de GaleriePhotos (bande + visionneuse plein écran) : une grille simple,
 * sans interaction, ne justifie pas le même mécanisme.
 *
 * Server Component — pas de `use client` malgré la demande initiale : aucune
 * interaction ici (pas de lightbox, pas d'état), et Route A a établi la
 * règle inverse pour cette raison précise (voir Besoins.tsx, OperationsTerrain.tsx
 * etc.). Un composant client pour une grille statique n'aurait chargé du JS
 * pour rien.
 */

export type PhotoGalerieLab = { url: string; alt: string }

export function GalerieLab({ photos }: { photos: readonly PhotoGalerieLab[] }) {
  if (photos.length === 0) return null

  return (
    <section className="border-t border-ko-line bg-ko-white py-16 lg:py-24">
      <div className="mx-auto max-w-container px-6 lg:px-12">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {photos.map((photo, i) => (
            <div
              key={i}
              className="relative aspect-square overflow-hidden rounded-xl bg-ko-cream2"
            >
              <Image
                src={photo.url}
                alt={photo.alt}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                style={FILTRE_TERRAIN}
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
