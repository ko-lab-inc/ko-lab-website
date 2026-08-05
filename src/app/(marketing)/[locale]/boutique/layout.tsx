import { BandeauPourCommande } from '@/components/ui/BandeauPourCommande'

import type { ReactNode } from 'react'

/**
 * Layout de la section boutique — sert uniquement à poser BandeauPourCommande
 * une seule fois pour tout le sous-arbre (catalogue, fiche produit, panier),
 * sans qu'il se démonte entre ces pages. Voir sa note d'en-tête et
 * lib/panier/pourCommande.ts pour pourquoi ce montage unique compte.
 */
export default function BoutiqueLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <BandeauPourCommande />
      {children}
    </>
  )
}
