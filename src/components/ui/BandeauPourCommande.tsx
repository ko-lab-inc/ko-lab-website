'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import {
  effacerMarquePourCommande,
  lireMarquePourCommande,
  marquerPourCommande,
  type MarquePourCommande,
} from '@/lib/panier/pourCommande'
import { routeCommande } from '@/lib/routes'

/**
 * Bandeau « vous ajoutez des produits à la commande X » — posé par
 * boutique/layout.tsx, donc monté une seule fois pour toute la section
 * boutique (catalogue, fiche produit, panier) et jamais démonté entre ces
 * pages. C'est ce qui permet de lire `?pourCommande=` une fois à l'arrivée
 * puis de laisser sessionStorage porter l'état pendant la navigation — voir
 * lib/panier/pourCommande.ts.
 *
 * `window.location.search` plutôt que `useSearchParams()` : ce dernier exige
 * une limite Suspense dès qu'il est utilisé dans un layout au-dessus de
 * pages statiques (/boutique, /boutique/[slug] le sont). Une lecture unique
 * au montage, en effet, n'a pas besoin d'être réactive aux changements
 * d'URL — la marque elle-même prend le relais ensuite.
 */
export function BandeauPourCommande() {
  const t = useTranslations('Commande')
  const [marque, setMarque] = useState<MarquePourCommande | null>(null)

  useEffect(() => {
    // Fonction imbriquée, pas un appel direct dans le corps de l'effet — même
    // motif que PanierContext.tsx : la règle react-hooks/set-state-in-effect
    // exige un setState « en callback », pas synchrone dans l'effet lui-même.
    const lire = () => {
      const params = new URLSearchParams(window.location.search)
      const id = params.get('pourCommande')
      const numero = params.get('numero')

      if (id && numero) {
        const nouvelle = { id, numero }
        marquerPourCommande(nouvelle)
        setMarque(nouvelle)
        return
      }

      setMarque(lireMarquePourCommande())
    }
    lire()
  }, [])

  if (!marque) return null

  return (
    <div className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 border-b border-ko-line-d bg-ko-black px-6 py-3 text-sm text-ko-white lg:px-12">
      <p>{t('bandeau_texte', { numero: marque.numero })}</p>
      <div className="flex items-center gap-5">
        <Link
          href={routeCommande(marque.id)}
          className="border-b border-ko-blue2 pb-0.5 text-ko-blue2 transition-colors duration-200 hover:text-ko-white"
        >
          {t('bandeau_terminer')} →
        </Link>
        <button
          type="button"
          onClick={() => {
            effacerMarquePourCommande()
            setMarque(null)
          }}
          className="text-ko-muted-d transition-colors duration-200 hover:text-ko-white"
        >
          {t('bandeau_annuler')}
        </button>
      </div>
    </div>
  )
}
