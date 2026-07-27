import { cn } from '@/lib/utils/cn'

import type { SVGProps } from 'react'

/**
 * Icônes SVG dessinées à la main — aucune librairie.
 *
 * Le skill 08 interdit les icônes 3D, les emojis, les illustrations dégradées
 * et les pastilles colorées. Ce qui reste autorisé — et cohérent avec le
 * vocabulaire de filets 1px du design system — c'est le trait seul :
 * `stroke` uniquement, `currentColor`, aucun aplat.
 *
 * `currentColor` est ce qui rend ces icônes utilisables partout : la couleur
 * vient de la classe `text-*` du parent, donc jamais codée en dur. Une icône
 * posée sur fond sombre hérite naturellement de ko-blue2.
 *
 * ⚠️ Ces icônes ACCOMPAGNENT un libellé, elles ne le remplacent jamais.
 * Elles sont donc `aria-hidden` sans exception : les annoncer doublerait
 * l'information pour un lecteur d'écran.
 */

type IconeProps = SVGProps<SVGSVGElement> & {
  /** Côté du carré, en pixels. 24 pour les cartes, 20 pour la stats bar. */
  taille?: number
}

/**
 * Enveloppe commune. Centralise les attributs de trait : les redéclarer sur
 * chaque icône garantissait qu'une finisse par diverger.
 */
function Icone({ taille = 24, className, children, ...props }: IconeProps) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn('shrink-0', className)}
      {...props}
    >
      {children}
    </svg>
  )
}

/* =============================================================================
 * Section Besoins
 * ========================================================================== */

/** 01 — Déployer une équipe. Trois silhouettes groupées. */
export function IconeEquipe(props: IconeProps) {
  return (
    <Icone {...props}>
      <circle cx="9" cy="7.5" r="3.2" />
      <path d="M2.5 20v-1.2A4.8 4.8 0 0 1 7.3 14h3.4a4.8 4.8 0 0 1 4.8 4.8V20" />
      <path d="M16.2 4.8a3.2 3.2 0 0 1 0 5.4" />
      <path d="M18 14.4A4.8 4.8 0 0 1 21.5 19v1" />
    </Icone>
  )
}

/** 02 — Installer un projet. Grue à tour, flèche et charge suspendue. */
export function IconeGrue(props: IconeProps) {
  return (
    <Icone {...props}>
      {/* Cinq traits seulement : sol, mât, flèche, câble, charge. Une version
          plus détaillée (contre-flèche, treillis) se brouille à 24px. */}
      <path d="M3.5 21h17" />
      <path d="M7 21V4.5" />
      <path d="M7 4.5h12" />
      <path d="M16.5 4.5v4" />
      <path d="M14 8.5h5v4.5h-5z" />
    </Icone>
  )
}

/** 03 — Fabriquer une solution. Puce, pour la précision d'atelier. */
export function IconePuce(props: IconeProps) {
  return (
    <Icone {...props}>
      <rect x="5" y="5" width="14" height="14" rx="1.5" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="0.5" />
      <path d="M9.5 2.5V5M14.5 2.5V5M9.5 19v2.5M14.5 19v2.5" />
      <path d="M2.5 9.5H5M2.5 14.5H5M19 9.5h2.5M19 14.5h2.5" />
    </Icone>
  )
}

/** 04 — Louer de l'équipement. Camion vu de côté. */
export function IconeCamion(props: IconeProps) {
  return (
    <Icone {...props}>
      <path d="M1.5 5.5h12v10h-12z" />
      <path d="M13.5 9h3.6l3.4 3.4v3.1h-7z" />
      <circle cx="6" cy="18" r="2.2" />
      <circle cx="17" cy="18" r="2.2" />
      <path d="M8.2 18h6.6" />
    </Icone>
  )
}

/* =============================================================================
 * Stats bar
 * ========================================================================== */

/** Heures de travail terrain. */
export function IconeHorloge(props: IconeProps) {
  return (
    <Icone {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6.8V12l3.6 2.1" />
    </Icone>
  )
}

/** Disciplines opérationnelles. Hexagone avec noyau — un réseau de métiers. */
export function IconeHexagone(props: IconeProps) {
  return (
    <Icone {...props}>
      <path d="M12 2.6 20.2 7.3v9.4L12 21.4 3.8 16.7V7.3z" />
      <circle cx="12" cy="12" r="2.6" />
    </Icone>
  )
}

/** Sites et horaires coordonnés. */
export function IconePin(props: IconeProps) {
  return (
    <Icone {...props}>
      <path d="M12 21.5s7-5.9 7-11.5a7 7 0 1 0-14 0c0 5.6 7 11.5 7 11.5z" />
      <circle cx="12" cy="9.8" r="2.6" />
    </Icone>
  )
}

/** Mandats gouvernementaux. Fronton et colonnes. */
export function IconeInstitution(props: IconeProps) {
  return (
    <Icone {...props}>
      <path d="M2.5 21h19" />
      <path d="M12 3 3.5 7.8h17z" />
      <path d="M6 11v7M10 11v7M14 11v7M18 11v7" />
      <path d="M4 21v-2.2h16V21" />
    </Icone>
  )
}

/* =============================================================================
 * Écosystème
 * ========================================================================== */

/** Impression Turbo — grand format et production visuelle. */
export function IconeImprimante(props: IconeProps) {
  return (
    <Icone {...props}>
      <path d="M6.5 8.5V3h11v5.5" />
      <path d="M6.5 17H4a2 2 0 0 1-2-2v-4.5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2V15a2 2 0 0 1-2 2h-2.5" />
      <path d="M6.5 13.5h11V21h-11z" />
    </Icone>
  )
}

/** Vêtement Spartan — confection et personnalisation. */
export function IconeCiseaux(props: IconeProps) {
  return (
    <Icone {...props}>
      <circle cx="6" cy="6.5" r="2.6" />
      <circle cx="6" cy="17.5" r="2.6" />
      <path d="M8.2 8 20 19.5" />
      <path d="M8.2 16 20 4.5" />
    </Icone>
  )
}

/** Expérience Mobile Ultime — arcade et stations de jeu. */
export function IconeManette(props: IconeProps) {
  return (
    <Icone {...props}>
      <path d="M17.2 6.5H6.8A4.8 4.8 0 0 0 2 11.3v1.4a4.8 4.8 0 0 0 4.8 4.8h10.4a4.8 4.8 0 0 0 4.8-4.8v-1.4a4.8 4.8 0 0 0-4.8-4.8z" />
      <path d="M6.5 12h3.4M8.2 10.3v3.4" />
      {/* Deux boutons pleins : à ce diamètre, un cercle en trait seul se lit
          comme un anneau flou plutôt que comme un bouton. Exception assumée
          au « stroke uniquement ». */}
      <circle cx="15.6" cy="10.8" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="17.8" cy="13.2" r="0.9" fill="currentColor" stroke="none" />
    </Icone>
  )
}

/** Centre de l'auto VIP — entretien mécanique et flotte. */
export function IconeCle(props: IconeProps) {
  return (
    <Icone {...props}>
      <path d="M19.8 5.6a4.8 4.8 0 0 1-6.2 6.2L6.2 19.2a2.3 2.3 0 0 1-3.3-3.3l7.4-7.4a4.8 4.8 0 0 1 6.2-6.2l-3 3 2.3 2.3z" />
    </Icone>
  )
}
