import { notFound } from 'next/navigation'

import { lireReglages } from '@/lib/reglages'

import type { ReactNode } from 'react'

/**
 * Garde de la section concours — même mécanique que boutique/layout.tsx.
 *
 * ⚠️ concoursActif (migration 0040) — VÉRIFIÉ UNE SEULE FOIS, ICI. Un seul
 * `notFound()` couvre tout le sous-arbre (aujourd'hui une seule page, la
 * liste — pas de fiche individuelle, voir la note d'en-tête de page.tsx).
 * `notFound()` appelé depuis un layout du groupe (marketing) retombe sur
 * `not-found.tsx` de ce groupe — la 404 stylée du site, pas la page
 * générique de Next (voir sa propre note d'en-tête).
 */
export default async function ConcoursLayout({ children }: { children: ReactNode }) {
  const reglages = await lireReglages()
  if (!reglages.concoursActif) notFound()

  return <>{children}</>
}
