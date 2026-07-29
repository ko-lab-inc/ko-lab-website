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
      {intro && (
        <p className="mt-4 max-w-[68ch] text-base leading-relaxed text-ko-muted">{intro}</p>
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
    <div className="bg-ko-white p-6">
      <div className="flex items-center gap-2.5">
        {/* L'icône accompagne le libellé, elle ne le remplace pas : à elle
            seule, une enveloppe ne dit pas « demandes reçues ». */}
        {Icone && <Icone taille={16} className="text-ko-muted" />}
        <p className="label-mono text-ko-muted">{libelle}</p>
      </div>
      <p
        className={cn(
          'mt-3 font-mono text-[32px] leading-none',
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
 * `gap-px` sur fond ko-line : deux tuiles voisines partagent un seul filet,
 * au lieu d'en accoler deux et d'obtenir une ligne deux fois trop épaisse.
 */
export function GrilleStats({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-px border border-ko-line bg-ko-line lg:grid-cols-4">
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

/**
 * Écran d'une section pas encore construite.
 *
 * Dit ce qui manque ET pourquoi. Un tableau vide se lirait comme une panne ;
 * une phrase qui nomme la décision bloquante se lit comme une étape.
 */
export function SectionAVenir({
  etiquette,
  texte,
  points,
}: {
  etiquette: string
  texte: string
  /** Ce qu'il faut obtenir ou décider avant de pouvoir construire. */
  points?: string[]
}) {
  return (
    <PanneauAdmin>
      <p className="label-mono text-ko-blue">{etiquette}</p>
      <p className="mt-3 max-w-[64ch] text-base leading-relaxed text-ko-ink">{texte}</p>
      {points && points.length > 0 && (
        <ul className="mt-6 space-y-2.5 border-t border-ko-line pt-5">
          {points.map((p) => (
            <li key={p} className="flex gap-3 text-sm leading-relaxed text-ko-muted">
              <span aria-hidden="true" className="mt-2 h-px w-3 shrink-0 bg-ko-blue" />
              <span className="max-w-[60ch]">{p}</span>
            </li>
          ))}
        </ul>
      )}
    </PanneauAdmin>
  )
}
