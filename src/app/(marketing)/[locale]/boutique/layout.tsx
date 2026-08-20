import { notFound } from 'next/navigation'

import { BandeauPourCommande } from '@/components/ui/BandeauPourCommande'
import { lireReglages } from '@/lib/reglages'

import type { ReactNode } from 'react'

/**
 * Layout de la section boutique — sert uniquement à poser BandeauPourCommande
 * une seule fois pour tout le sous-arbre (catalogue, fiche produit, panier),
 * sans qu'il se démonte entre ces pages. Voir sa note d'en-tête et
 * lib/panier/pourCommande.ts pour pourquoi ce montage unique compte.
 *
 * ⚠️ boutiqueActive (0029) — VÉRIFIÉ UNE SEULE FOIS, ICI. Tout ce qui vit sous
 * /boutique (catalogue, fiche produit, demande de prix, détails de commande)
 * passe par ce layout : un seul `notFound()` ici couvre tout le sous-arbre,
 * plutôt que de répéter le contrôle dans chaque page.tsx avec le risque
 * d'en oublier une. Distinct de panierActif, déjà vérifié séparément par les
 * pages qui en ont besoin — désactiver la boutique entière est une décision
 * différente de désactiver seulement son panier.
 */
export default async function BoutiqueLayout({ children }: { children: ReactNode }) {
  const reglages = await lireReglages()
  if (!reglages.boutiqueActive) notFound()

  return (
    <>
      <BandeauPourCommande />
      {children}
    </>
  )
}
