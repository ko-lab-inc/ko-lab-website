import { cn } from '@/lib/utils/cn'

import type { IconeProps } from '@/components/ui/Icones'
import type { ComponentType, ReactNode } from 'react'

/**
 * Vocabulaire visuel de l'espace équipe.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI DES COMPOSANTS PLUTÔT QUE DU TAILWIND RECOPIÉ
 *
 * Un outil de gestion se juge à sa régularité : six écrans qui alignent leurs
 * titres, leurs filets et leurs panneaux au pixel près se lisent comme un
 * produit, six écrans approximatifs se lisent comme un prototype. Recopier les
 * classes garantissait qu'un `p-6` devienne un `p-5` quelque part.
 *
 * Le vocabulaire reprend celui du site public — filets 1px, pas d'ombre, pas
 * de dégradé, bleu en accent unique (skill 08) — mais avec une densité plus
 * forte : ici on travaille, on ne se laisse pas raconter une histoire.
 *
 * Fond de page en ko-cream, panneaux en ko-white : c'est l'alternance clair /
 * clair du design system qui donne le relief, pas des ombres portées.
 * ---------------------------------------------------------------------------
 */

/** En-tête de section — filet bleu, titre, chapô. Identique sur les six écrans. */
export function EnteteAdmin({
  titre,
  intro,
  action,
}: {
  titre: string
  intro?: string
  /** Bouton ou lien aligné à droite du titre, sur les écrans qui en ont un. */
  action?: ReactNode
}) {
  return (
    <header className="mb-8">
      <span aria-hidden="true" className="block h-px w-8 bg-ko-blue" />
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <h1 className="font-serif text-[clamp(26px,3vw,36px)] font-light leading-[1.1] text-ko-ink">
          {titre}
        </h1>
        {action}
      </div>
      {/*
        Masqué en mobile — demande de Christian, 2 août 2026 : ce chapô
        explicatif repousse les outils réels (recherche, filtres, bouton
        « ajouter ») hors de l'écran sur un téléphone, pour un texte qui
        n'aide plus une fois l'écran déjà connu. Il reste affiché à partir de
        `sm:`, où la largeur ne pose pas ce problème.
      */}
      {intro && (
        <p className="mt-4 hidden max-w-[68ch] text-base leading-relaxed text-ko-muted sm:block">
          {intro}
        </p>
      )}
    </header>
  )
}

/** Panneau blanc bordé — le conteneur par défaut de tout contenu. */
export function PanneauAdmin({
  children,
  className,
  sansPadding = false,
}: {
  children: ReactNode
  className?: string
  /** Pour un tableau qui gère lui-même ses marges de cellule. */
  sansPadding?: boolean
}) {
  return (
    <section
      className={cn(
        'border border-ko-line bg-ko-white',
        sansPadding ? '' : 'p-6 lg:p-7',
        className,
      )}
    >
      {children}
    </section>
  )
}

/**
 * Tuile de chiffre.
 *
 * `accent` réserve le bleu à la valeur qui appelle une action — les demandes
 * non traitées. Tout mettre en bleu reviendrait à ne rien signaler.
 */
export function TuileStat({
  libelle,
  valeur,
  precision,
  accent = false,
  Icone,
}: {
  libelle: string
  valeur: string | number
  precision?: string
  accent?: boolean
  /** Icône en trait, posée en tête de tuile. `aria-hidden` par construction. */
  Icone?: ComponentType<IconeProps>
}) {
  return (
    // `min-w-0` : sans lui, une grille CSS refuse de rétrécir une cellule
    // sous la largeur intrinsèque de son contenu — `truncate` et le `clamp()`
    // ci-dessous n'auraient alors aucun effet en mobile.
    <div className="min-w-0 bg-ko-white p-4 sm:p-6">
      <div className="flex items-center gap-2.5">
        {/* L'icône accompagne le libellé, elle ne le remplace pas : à elle
            seule, une enveloppe ne dit pas « demandes reçues ». */}
        {Icone && <Icone taille={16} className="shrink-0 text-ko-muted" />}
        {/* Pas de `truncate` ici : « Chiffre d'affaires » sur deux lignes
            n'a jamais posé problème — seule la GRANDE valeur en dessous
            débordait. Tronquer le libellé cacherait de l'information pour
            un bug qui ne le concernait pas. */}
        <p className="label-mono text-ko-muted">{libelle}</p>
      </div>
      {/*
        ⚠️ TAILLE RESPONSIVE, PAS UN 32px FIXE — constaté par Christian sur
        mobile : « Chiffre d'affaires » en grille à 2 colonnes réduit chaque
        tuile à ~150px, où « 12 600 $CA » à 32px débordait par-dessus la
        tuile voisine. `clamp()` suit la largeur de l'écran comme le titre de
        EnteteAdmin ci-dessus ; `truncate` reste un filet de sécurité si un
        chiffre futur est encore plus long.
      */}
      <p
        className={cn(
          'mt-3 truncate font-mono text-[clamp(18px,6vw,32px)] leading-none',
          accent ? 'text-ko-blue' : 'text-ko-ink',
        )}
      >
        {valeur}
      </p>
      {precision && <p className="mt-2 text-sm text-ko-muted">{precision}</p>}
    </div>
  )
}

/**
 * Grille de tuiles.
 *
 * Sans bordure ni filet entre tuiles (retiré du groupe stats uniquement,
 * demande de Christian : « les cadres KPI ont une bordure trop visible ») —
 * les tuiles blanches (TuileStat, bg-ko-white) se détachent déjà d'elles-
 * mêmes sur le fond gris de la page, un vrai `gap` suffit à les séparer.
 * Le reste de l'admin (tableaux, formulaires) garde sa bordure `ko-line`.
 */
export function GrilleStats({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {children}
    </div>
  )
}

/** En-tête de tableau — mono, majuscules, filet de séparation. */
export function EnteteTableau({ colonnes }: { colonnes: string[] }) {
  return (
    <div className="hidden border-b border-ko-line px-6 py-3 sm:flex sm:items-center sm:gap-6">
      {colonnes.map((c, i) => (
        <span
          key={c}
          className={cn('label-mono text-ko-muted', i === 0 ? 'min-w-0 flex-1' : 'shrink-0')}
        >
          {c}
        </span>
      ))}
    </div>
  )
}

