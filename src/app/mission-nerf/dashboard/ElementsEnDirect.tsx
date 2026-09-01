'use client'

import { cn } from '@/lib/utils/cn'

import { IconeCoche, IconeHorloge, IconePersonnes, IconePressePapier } from './Icones'
import { useMissionNerf } from './MissionNerfProvider'

/**
 * Pastille d'état de la zone — en-tête, à droite.
 *
 * `donnees === null` (avant la première lecture réussie) affiche un état
 * neutre, jamais « fermée » ou « ouverte » par défaut : deviner serait pire
 * qu'attendre une seconde de plus.
 */
export function PastilleZone() {
  const { donnees } = useMissionNerf()

  if (!donnees) {
    return (
      <Pastille couleur="slate" texte="CONNEXION…" />
    )
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
        'inline-flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-xs font-semibold tracking-[0.12em]',
        couleur === 'green' && 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
        couleur === 'red' && 'border-rose-500/40 bg-rose-500/10 text-rose-300',
        couleur === 'slate' && 'border-slate-500/40 bg-slate-500/10 text-slate-400',
      )}
    >
      <span
        className={cn(
          'h-2 w-2 rounded-full',
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
        icone={<IconePersonnes className="h-6 w-6" />}
        label="Participants aujourd'hui"
        valeur={participants ?? '—'}
        couleur="cyan"
      />
      <Carte
        icone={<IconePressePapier className="h-6 w-6" />}
        label="Décharges complétées"
        valeur={`${participants ?? '—'} / ${decharges ?? '—'}`}
        couleur="pink"
        note={moyenne ? `moy. ${moyenne} enfant/décharge` : undefined}
      />
      <Carte
        icone={<IconeHorloge className="h-6 w-6" />}
        label="Prochain départ"
        valeur={donnees?.prochainDepart ?? '—'}
        couleur="cyan"
      />
    </div>
  )
}

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
    <div className="flex flex-1 flex-col justify-center gap-2 rounded-xl border border-cyan-400/25 bg-[#060b18] px-6 py-5 shadow-[0_0_30px_-12px_rgba(34,211,238,0.4)]">
      <div className="flex items-center gap-2 text-slate-400">
        <span className={couleur === 'cyan' ? 'text-cyan-400' : 'text-pink-400'}>{icone}</span>
        <span className="font-mono text-[11px] uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p
        className={cn(
          '[font-family:var(--font-nerf-title)] text-4xl font-bold leading-none',
          couleur === 'cyan' ? 'text-cyan-400' : 'text-pink-400',
        )}
      >
        {valeur}
      </p>
      {note && <p className="font-mono text-[11px] text-slate-500">{note}</p>}
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
