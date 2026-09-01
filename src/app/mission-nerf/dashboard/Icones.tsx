/**
 * Icônes du dashboard Mission NERF — traits fins (1.15, aminci depuis la
 * revue du 1er septembre 2026 : 1.6 lisait comme lourd/générique face à la
 * maquette), `currentColor`, jamais les icônes du site vitrine
 * (Icones.tsx de components/ui) : identité propre à cet écran, voir la
 * docstring de dashboard/page.tsx.
 */

const TRAIT = 1.15

type Props = { className?: string }

export function IconePersonnes({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={TRAIT} className={className}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M15.5 14.2c2.5.4 4.5 2.6 4.5 5.3" />
    </svg>
  )
}

export function IconePressePapier({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={TRAIT} className={className}>
      <rect x="5" y="4" width="14" height="17" rx="1" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="M9 12.5l2 2 4-4.2" />
    </svg>
  )
}

/** Petits traits d'heure (12/3/6/9) — le détail « instrument » qui manquait
 *  à cette icône avant la revue du 1er septembre. */
export function IconeHorloge({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={TRAIT} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.2l3.5 2" />
      <path d="M12 3.4v1.4M12 19.2v1.4M20.6 12h-1.4M4.8 12H3.4" strokeWidth={TRAIT * 0.85} />
    </svg>
  )
}

export function IconeBouclierCoche({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={TRAIT} className={className}>
      <path d="M12 2.5l7 3v5.7c0 4.6-3 8.5-7 10.3-4-1.8-7-5.7-7-10.3V5.5l7-3z" />
      <path d="M8.7 12l2.3 2.3 4.3-4.6" />
    </svg>
  )
}

export function IconeCoche({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <path d="M4 12.5l5 5L20 6" />
    </svg>
  )
}

/** Point plein — pastille « en direct » du panneau caméra. */
export function PointPlein({ className }: Props) {
  return (
    <svg viewBox="0 0 8 8" fill="currentColor" className={className}>
      <circle cx="4" cy="4" r="4" />
    </svg>
  )
}
