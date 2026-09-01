'use client'

import { cn } from '@/lib/utils/cn'

import { EncochesCoins } from './Decor'
import { IconeCoche, IconeHorloge, IconePersonnes, IconePressePapier } from './Icones'
import { useMissionNerf } from './MissionNerfProvider'

/**
 * Pastille d'état de la zone — en-tête, à droite.
 *
 * ⚠️ Agrandie et dotée de coins coupés + chevrons le 1er septembre (revue
 * contre docs/maquette-dashboard-nerf.png) : la première version était une
 * pilule arrondie simple, nettement plus petite et plus discrète que la
 * maquette.
 *
 * `donnees === null` (avant la première lecture réussie) affiche un état
 * neutre, jamais « fermée » ou « ouverte » par défaut : deviner serait pire
 * qu'attendre une seconde de plus.
 */
export function PastilleZone() {
  const { donnees } = useMissionNerf()

  if (!donnees) {
    return <Pastille couleur="slate" texte="CONNEXION…" />
  }

  return donnees.zoneOuverte ? (
    <Pastille couleur="green" texte="ZONE OUVERTE" />
  ) : (
    <Pastille couleur="red" texte="ZONE FERMÉE" />
  )
}

function Pastille({ couleur, texte }: { couleur: 'green' | 'red' | 'slate'; texte: string }) {
  return (
    <span
      className={cn(
        'panel-hud relative inline-flex items-center gap-3 border px-6 py-3 font-mono text-sm font-semibold tracking-[0.12em]',
        couleur === 'green' && 'border-emerald-400/60 bg-emerald-400/10 text-emerald-300',
        couleur === 'red' && 'border-rose-500/60 bg-rose-500/10 text-rose-300',
        couleur === 'slate' && 'border-slate-500/50 bg-slate-500/10 text-slate-400',
      )}
      style={{ '--coupe': '10px' } as React.CSSProperties}
    >
      <EncochesCoins couleur={couleur === 'red' ? 'pink' : 'cyan'} taille="sm" />
      <span
        className={cn(
          'h-2.5 w-2.5 rounded-full',
          couleur === 'green' && 'bg-emerald-400',
          couleur === 'red' && 'bg-rose-500',
          couleur === 'slate' && 'bg-slate-400',
        )}
      />
      {texte}
    </span>
  )
}

/**
 * Les 3 cartes de droite — un seul composant plutôt que trois : les 3
 * valeurs viennent de la MÊME lecture (useMissionNerf), pas de trois fetch
 * séparés, donc pas de raison de séparer leur rendu non plus.
 *
 * ⚠️ « Décharges complétées » : la maquette montre 127/127 avec une coche
 * verte, mais ces deux nombres ne sont PRESQUE JAMAIS égaux — un parent
 * inscrit jusqu'à 5 enfants sur une seule décharge, donc participants > décharges
 * en fonctionnement normal. Une coche « succès » n'aurait donc de sens que
 * dans un cas qui n'arrive quasiment jamais. Remplacée par une moyenne
 * enfants/décharge — une info réelle et toujours vraie, plutôt qu'un
 * symbole de réussite qui ne s'allumerait jamais en pratique.
 */
export function CartesStats() {
  const { donnees } = useMissionNerf()

  const participants = donnees?.participants
  const decharges = donnees?.decharges
  const moyenne =
    participants !== undefined && decharges !== undefined && decharges > 0
      ? (participants / decharges).toFixed(1)
      : null

  return (
    <div className="flex h-full flex-col justify-between gap-4">
      <Carte
        icone={<IconePersonnes className="h-9 w-9" />}
        label="Participants aujourd'hui"
        valeur={participants ?? '—'}
        couleur="cyan"
      />
      <Carte
        icone={<IconePressePapier className="h-9 w-9" />}
        label="Décharges complétées"
        valeur={`${participants ?? '—'} / ${decharges ?? '—'}`}
        couleur="pink"
        note={moyenne ? `moy. ${moyenne} enfant/décharge` : undefined}
      />
      <Carte icone={<IconeHorloge className="h-9 w-9" />} label="Prochain départ" valeur={donnees?.prochainDepart ?? '—'} couleur="cyan" />
    </div>
  )
}

/**
 * Grands chiffres — Russo One (rond, massif, une seule graisse, pas de
 * `font-bold`/`font-black` : le fichier de police chargé ne porte QUE le
 * poids 400, forcer un poids non chargé produirait un gras synthétique du
 * navigateur, plus flou que la police elle-même). Halo en `text-shadow`
 * pour le côté « lumineux » relevé manquant le 1er septembre — statique,
 * calculé une fois, aucun coût continu sur 10 h.
 *
 * ⚠️ Disposition refaite le 1er septembre (revue contre la maquette) :
 * l'icône vivait en petit à côté du label, au-dessus du chiffre. La
 * maquette la place dans son PROPRE cadre à gauche, aussi haute que le
 * chiffre, label + chiffre empilés à droite — refait à l'identique.
 */
function Carte({
  icone,
  label,
  valeur,
  couleur,
  note,
}: {
  icone: React.ReactNode
  label: string
  valeur: string | number
  couleur: 'cyan' | 'pink'
  note?: string
}) {
  return (
    <div className="panel-hud relative flex flex-1 items-center gap-4 border border-cyan-400/40 bg-[#060b18] px-5 py-4 shadow-[0_0_30px_-12px_rgba(34,211,238,0.35)]">
      <EncochesCoins couleur={couleur} taille="sm" />

      <div
        className={cn(
          'flex h-16 w-16 shrink-0 items-center justify-center rounded-md border',
          couleur === 'cyan' ? 'border-cyan-400/40 bg-cyan-400/5 text-cyan-300' : 'border-pink-400/40 bg-pink-400/5 text-pink-400',
        )}
      >
        {icone}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-400">{label}</p>
        <p
          className={cn(
            '[font-family:var(--font-nerf-title)] text-[46px] leading-[1.05] tracking-tight',
            couleur === 'cyan'
              ? 'text-cyan-300 [text-shadow:0_0_18px_rgba(103,232,249,0.85),0_0_46px_rgba(34,211,238,0.5)]'
              : 'text-pink-400 [text-shadow:0_0_18px_rgba(244,114,182,0.85),0_0_46px_rgba(236,72,153,0.5)]',
          )}
        >
          {valeur}
        </p>
        {note && <p className="font-mono text-[11px] text-slate-500">{note}</p>}
      </div>
    </div>
  )
}

/**
 * Liste des 4 dernières inscriptions — PRÉNOM SEUL, jamais nom/âge : la
 * route /api/mission-nerf/etat ne renvoie de toute façon que ça (voir
 * `verSortie` dans cette route), mais le rappeler ici documente pourquoi ce
 * composant ne cherche même pas à afficher davantage.
 */
export function PanneauInscriptions() {
  const { donnees } = useMissionNerf()
  const lignes = donnees?.dernieres ?? []

  return (
    <ul className="flex flex-1 flex-col justify-center gap-1">
      {lignes.length === 0 ? (
        <li className="py-2 text-sm text-slate-500">En attente des premières inscriptions…</li>
      ) : (
        lignes.map((ligne, i) => (
          <li
            key={i}
            className="grid grid-cols-[1fr_auto_auto] items-center gap-6 border-t border-white/5 py-3 first:border-t-0 first:pt-0"
          >
            <span className="truncate text-lg text-white">{ligne.prenom}</span>
            <span className="font-mono text-sm text-slate-400">{ligne.heure}</span>
            <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wide text-emerald-400">
              <IconeCoche className="h-3.5 w-3.5" />
              validé
            </span>
          </li>
        ))
      )}
    </ul>
  )
}

/**
 * Indicateur de connexion perdue — DISCRET (brief, §« tenue sur 10 heures »).
 * Coin de l'écran, petit, ambre plutôt que rouge alarmant : signale sans
 * paniquer un parent qui regarderait l'écran au mauvais moment.
 */
export function IndicateurConnexion() {
  const { connexionPerdue } = useMissionNerf()
  if (!connexionPerdue) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-amber-400/40 bg-[#060b18]/90 px-3 py-1.5 font-mono text-[11px] text-amber-300 backdrop-blur-sm">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
      connexion instable — dernières données affichées
    </div>
  )
}
