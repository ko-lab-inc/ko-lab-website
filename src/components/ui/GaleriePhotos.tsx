'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { BandeauImages, type VignetteBandeau } from '@/components/ui/BandeauImages'
import { SlideImages } from '@/components/ui/SlideImages'

/**
 * Bande de vignettes + visionneuse plein écran, assemblées une fois pour
 * toute page qui n'a qu'une seule série (pas de filtre, pas de grille de
 * cartes) — contrairement à GalerieRealisations.tsx, qui gère plusieurs
 * réalisations à la fois et réimplémente cet assemblage pour cette raison.
 *
 * `BandeauImages` et `SlideImages` restent génériques (voir leurs propres
 * commentaires) ; ce composant est la colle entre les deux — état de
 * l'index ouvert, rien de plus — pensé pour être réutilisé partout où une
 * page a « une série de photos » à montrer (pages capacités, page location),
 * sans dupliquer ce `useState` à chaque fois.
 */
export function GaleriePhotos({
  images,
  titre,
}: {
  images: readonly VignetteBandeau[]
  /** Titre lu dans l'entête de la visionneuse plein écran. */
  titre: string
}) {
  const [ouvert, setOuvert] = useState(false)
  const [indexOuverture, setIndexOuverture] = useState(0)
  const t = useTranslations('Commun')

  if (images.length === 0) return null

  const libellesPartages = {
    precedent: t('galerie_precedent'),
    suivant: t('galerie_suivant'),
    position: (n: number, total: number) => t('galerie_position', { n, total }),
  }

  return (
    <>
      <BandeauImages
        images={images}
        onSelectionner={(index) => {
          setIndexOuverture(index)
          setOuvert(true)
        }}
        libelles={{ groupe: t('galerie_groupe'), ...libellesPartages }}
      />

      <SlideImages
        ouvert={ouvert}
        indexInitial={indexOuverture}
        onFermer={() => setOuvert(false)}
        images={images}
        titre={titre}
        libelles={{ fermer: t('galerie_fermer'), ...libellesPartages }}
      />
    </>
  )
}
