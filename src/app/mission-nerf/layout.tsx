import '@/styles/globals.css'

import type { Metadata } from 'next'
import type { ReactNode } from 'react'

/**
 * ROOT LAYOUT de Mission NERF — rend son propre <html>.
 *
 * Troisième root layout du dépôt, à côté de (marketing)/[locale]/layout.tsx
 * et (admin)/[locale]/layout.tsx — même raisonnement que ce dernier : un
 * dashboard plein écran affiché sur une TV n'a besoin ni de la nav, ni du
 * pied de page, ni du panier du site vitrine, et OBS doit pouvoir l'ouvrir
 * en Browser Source sans rien d'autre à l'écran.
 *
 * Hors du groupe (marketing) ET hors de [locale], délibérément : voir le
 * rapport de la conversation (Mission NERF, Prompt 1) pour les quatre
 * décisions qui justifient cette structure — en résumé, aucun layout
 * ancêtre ne peut être « retiré » par un enfant en App Router, et ce
 * dashboard n'a aucun contenu à traduire.
 *
 * Aucune police chargée ici : la typographie de l'écran TV reste à décider
 * au prompt qui construira l'écran lui-même, pas à celui qui pose la
 * fondation.
 */

export const metadata: Metadata = {
  title: 'Mission NERF',
  // Écran interne, jamais destiné à un moteur de recherche — même
  // raisonnement que (admin)/[locale]/layout.tsx. Défense en profondeur :
  // robots.ts bloque déjà /mission-nerf, ceci reste vrai même si robots.txt
  // n'était pas respecté par un robot donné.
  robots: { index: false, follow: false },
}

export default function MissionNerfLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  )
}
