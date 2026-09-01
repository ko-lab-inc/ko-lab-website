import { JetBrains_Mono, Russo_One } from 'next/font/google'

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
 * -----------------------------------------------------------------------------
 * TOUCHÉ AU PROMPT 2 (construction de l'écran) — deux ajouts, motivés
 * -----------------------------------------------------------------------------
 * 1. Polices — Russo One (titre « MISSION NERF » ET grands chiffres : bloc,
 *    rond, fort contraste, lisible à 3 mètres — remplace Orbitron le 1er
 *    septembre 2026, dont le zéro barré et le dessin anguleux lisaient comme
 *    « cassé » plutôt que technique, relevé par Christian) et JetBrains Mono
 *    (labels, timestamps — même police que le reste du site, mais chargée
 *    ICI, indépendamment : ce layout ne dépend d'aucun autre, sur le même
 *    principe qui a justifié son existence).
 *
 *    Les deux via next/font/google : téléchargées au build, servies depuis
 *    ko-lab-center.ca — même mécanisme, même fiabilité que Fraunces/
 *    Instrument Sans/JetBrains Mono du site vitrine, déjà éprouvé en
 *    production. Repli explicite (`system-ui, sans-serif` / `monospace`)
 *    si jamais un fichier de police échouait à charger.
 *
 * 2. `background: transparent` forcé sur html/body — nécessaire pour que la
 *    zone caméra du dashboard (voir dashboard/page.tsx) soit un vrai trou
 *    transparent pour OBS, pas juste visuellement sombre. `globals.css` fixe
 *    `body { background-color: var(--ko-white) }` pour le reste du site
 *    (@layer base) ; un style en ligne sur l'élément l'emporte sur cette
 *    règle sans y toucher. Le fond visuellement sombre du dashboard vient
 *    des PANNEAUX eux-mêmes (chacun son propre fond plein), jamais du body —
 *    voir la note de dashboard/page.tsx pour le détail du mécanisme.
 */

const russoOne = Russo_One({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-nerf-title',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

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
    <html
      lang="fr"
      className={`${russoOne.variable} ${jetbrainsMono.variable}`}
      style={{ backgroundColor: 'transparent' }}
    >
      <body className="font-mono antialiased" style={{ backgroundColor: 'transparent' }}>
        {children}
      </body>
    </html>
  )
}
