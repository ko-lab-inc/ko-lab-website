import { cn } from '@/lib/utils/cn'

/**
 * Graphiques de l'espace équipe — SVG rendu CÔTÉ SERVEUR.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI PAS DE BIBLIOTHÈQUE DE GRAPHIQUES
 *
 * Recharts, Chart.js et compagnie imposent trois choses dont on n'a pas
 * besoin : un composant client (donc du JavaScript envoyé au navigateur pour
 * dessiner ce qui ne bougera jamais), une dépendance de plus à suivre pour les
 * avis de sécurité, et souvent un `<canvas>` ou des styles injectés qui se
 * heurtent à la CSP stricte de next.config.ts.
 *
 * Ici tout est du SVG produit sur le serveur : zéro octet de JavaScript, zéro
 * dépendance, zéro exception CSP. Ces graphiques n'ont aucune interaction —
 * pas d'infobulle au survol, pas de zoom — et c'est le bon compromis pour des
 * chiffres qu'on lit, pas qu'on explore.
 *
 * ---------------------------------------------------------------------------
 * COULEURS
 *
 * Le skill 08 interdit la pastille multicolore. Les segments se distinguent
 * donc par des OPACITÉS du bleu KO-LAB (token ko-accent, le seul qui accepte
 * un modificateur d'alpha), pas par cinq teintes différentes. Un dégradé de
 * densité se lit aussi bien et reste dans la palette.
 *
 * ---------------------------------------------------------------------------
 * ACCESSIBILITÉ
 *
 * Un graphique est une image : `role="img"` et un `aria-label` qui énonce les
 * chiffres. Les valeurs sont EN PLUS écrites en clair sous chaque
 * visualisation — un lecteur d'écran n'a donc jamais à interpréter un tracé,
 * et l'information reste disponible si le SVG ne s'affiche pas.
 * ---------------------------------------------------------------------------
 */

/**
 * Densités de bleu par rang, du plus dense au plus léger.
 *
 * ⚠️ CLASSES ÉCRITES EN ENTIER, jamais construites par concaténation.
 * Tailwind analyse le TEXTE SOURCE pour décider quelles classes générer :
 * `'stroke-ko-accent' + '/70'` ne serait détecté nulle part, la classe
 * n'existerait pas dans le CSS produit, et les segments de l'anneau
 * s'afficheraient invisibles — sans aucune erreur pour le signaler.
 */
const TRAITS = [
  'stroke-ko-accent',
  'stroke-ko-accent/70',
  'stroke-ko-accent/50',
  'stroke-ko-accent/35',
  'stroke-ko-accent/22',
  'stroke-ko-accent/15',
] as const

const FONDS = [
  'bg-ko-accent',
  'bg-ko-accent/70',
  'bg-ko-accent/50',
  'bg-ko-accent/35',
  'bg-ko-accent/22',
  'bg-ko-accent/15',
] as const

const trait = (rang: number) => TRAITS[Math.min(rang, TRAITS.length - 1)] ?? TRAITS[5]
const fond = (rang: number) => FONDS[Math.min(rang, FONDS.length - 1)] ?? FONDS[5]

/* ==========================================================================
 * Barres par intervalle — évolution sur une période
 * ========================================================================== */

/**
 * Des BARRES et non une courbe, pour deux raisons.
 *
 * 1. Une courbe interpole entre les points : elle sous-entend qu'il s'est
 *    passé quelque chose entre deux journées. Sur des comptes journaliers
 *    épars — six demandes sur trente jours — le tracé produisait des pics en
 *    aiguille reliés par une ligne plate, ce qui se lit comme un signal
 *    continu alors que ce sont six événements distincts.
 * 2. En HTML plutôt qu'en SVG. Les utilitaires `fill-*` de Tailwind ne
 *    sortaient pas dans le CSS produit — l'aire s'affichait en NOIR, le fill
 *    par défaut du SVG. Des `<div>` avec `bg-*` évitent la classe de
 *    problèmes entière, et restent rendus côté serveur, sans un octet de JS.
 */
export function BarresPeriode({
  points,
  libelle,
  vide,
}: {
  /** Une valeur par intervalle, dans l'ordre chronologique. */
  points: number[]
  /** Résumé, lu par un lecteur d'écran et affiché sous le graphique. */
  libelle: string
  /** Affiché à la place des barres quand tout est à zéro. */
  vide: string
}) {
  const max = Math.max(...points, 1)
  const total = points.reduce((s, v) => s + v, 0)

  // Tout à zéro : une rangée de barres invisibles se lirait comme un
  // graphique cassé plutôt que comme une absence de données.
  if (total === 0) {
    return (
      <div className="flex h-[186px] items-center justify-center border border-ko-line bg-ko-white">
        <p className="text-sm text-ko-muted">{vide}</p>
      </div>
    )
  }

  return (
    <div className="border border-ko-line bg-ko-white p-5">
      <div
        role="img"
        aria-label={libelle}
        className="flex h-[130px] items-end gap-[2px]"
      >
        {points.map((v, i) => (
          <div
            // L'index suffit : la série est un rang de jours de longueur
            // fixe, jamais réordonnée.
            key={i}
            // Un filet de 2px même à zéro : la journée existe, elle n'a
            // simplement rien reçu. Sans lui, l'axe des jours disparaît.
            style={{ height: v === 0 ? '2px' : `${Math.max(6, (v / max) * 100)}%` }}
            className={v === 0 ? 'flex-1 bg-ko-line' : 'flex-1 bg-ko-accent/80'}
          />
        ))}
      </div>
      <p className="mt-4 text-sm text-ko-muted">{libelle}</p>
    </div>
  )
}

/* ==========================================================================
 * Anneau de répartition
 * ========================================================================== */

export type Segment = { libelle: string; valeur: number }

export function AnneauSegments({
  segments,
  total,
  libelleTotal,
  vide,
}: {
  segments: Segment[]
  total: number
  libelleTotal: string
  vide: string
}) {
  const presents = segments.filter((s) => s.valeur > 0)

  if (total === 0 || presents.length === 0) {
    return <p className="text-sm text-ko-muted">{vide}</p>
  }

  // Rayon choisi pour que la circonférence tombe sur un nombre commode :
  // 2πr ≈ 100 avec r = 15.915, donc chaque pourcentage vaut 1 unité de
  // stroke-dasharray. Plus lisible que de calculer des arcs.
  const R = 15.915
  const CIRC = 100
  let offset = 25 // décalage qui place le départ à midi plutôt qu'à 3 heures

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
      <div className="relative h-[140px] w-[140px] shrink-0">
        <svg viewBox="0 0 40 40" role="img" aria-label={`${libelleTotal} : ${total}`}>
          {presents.map((s, i) => {
            const part = (s.valeur / total) * CIRC
            const dash = `${part} ${CIRC - part}`
            const el = (
              <circle
                key={s.libelle}
                cx="20"
                cy="20"
                r={R}
                fill="none"
                strokeWidth={5}
                strokeDasharray={dash}
                strokeDashoffset={offset}
                className={trait(i)}
              />
            )
            // L'offset se décale du segment précédent. Négatif parce que
            // stroke-dashoffset avance dans le sens inverse du tracé.
            offset -= part
            return el
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl text-ko-ink">{total}</span>
          <span className="label-mono text-ko-muted">{libelleTotal}</span>
        </div>
      </div>

      {/* Légende en texte : c'est elle qui porte l'information, l'anneau ne
          fait que la mettre en forme. */}
      <ul className="min-w-0 flex-1 space-y-2">
        {presents.map((s, i) => (
          <li key={s.libelle} className="flex items-center gap-3 text-sm">
            <span
              aria-hidden="true"
              className={cn('h-2.5 w-2.5 shrink-0', fond(i))}
            />
            <span className="min-w-0 flex-1 truncate text-ko-ink">{s.libelle}</span>
            <span className="shrink-0 font-mono text-xs text-ko-muted">
              {s.valeur} · {Math.round((s.valeur / total) * 100)} %
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ==========================================================================
 * Classement à barres
 * ========================================================================== */

export function ListeClassee({ entrees }: { entrees: Segment[] }) {
  const max = Math.max(...entrees.map((e) => e.valeur), 1)

  return (
    <ul className="space-y-4">
      {entrees.map((e, i) => (
        <li key={e.libelle}>
          <div className="flex items-baseline justify-between gap-4">
            <span className="min-w-0 truncate text-sm text-ko-ink">{e.libelle}</span>
            <span className="shrink-0 font-mono text-xs text-ko-muted">{e.valeur}</span>
          </div>
          {/* Piste + remplissage : la piste donne l'échelle, sans elle une
              barre courte se lit comme une barre coupée. */}
          <div className="mt-1.5 h-1 w-full bg-ko-line">
            <div
              className={cn('h-full', fond(i))}
              style={{ width: `${Math.round((e.valeur / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
