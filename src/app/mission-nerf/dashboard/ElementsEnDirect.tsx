'use client'

import { cn } from '@/lib/utils/cn'

import { EncochesCoins } from './Decor'
import { IconeCoche, IconeHorloge, IconePersonnes, IconePressePapier } from './Icones'
import { useMissionNerf } from './MissionNerfProvider'
import { useDecompteDepart } from './useDecompteDepart'

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
 * Les 3 cartes de stats — un seul composant plutôt que trois : les 3
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
 *
 * ⚠️ RÉAGENCEMENT DU 1er SEPTEMBRE 2026 — ce composant rendait un `<div
 * flex-col>` empilant les 3 cartes verticalement (elles vivaient à côté de
 * la caméra). Il rend maintenant un Fragment de 3 `<Carte>` NUES : le
 * parent (dashboard/page.tsx) les place directement comme 3 colonnes d'une
 * grille `grid-cols-4` (avec PanneauDecharge en 4e colonne) — la mise en
 * page/l'espacement égal est désormais la responsabilité du parent, pas de
 * ce composant.
 */
export function CartesStats() {
  const { donnees } = useMissionNerf()
  const decompte = useDecompteDepart(donnees?.prochainDepart)

  const participants = donnees?.participants
  const decharges = donnees?.decharges
  const moyenne =
    participants !== undefined && decharges !== undefined && decharges > 0
      ? (participants / decharges).toFixed(1)
      : null

  // « Périmé » (bascule du 1er septembre, délai de grâce dans
  // useDecompteDepart.ts) traité EXACTEMENT comme « aucune heure réglée » —
  // même valeur affichée, même absence de ligne de décompte. `prochain_depart`
  // n'est ni lu comme périmé ni modifié en base : c'est une décision
  // d'affichage prise ici, à chaque tick, jamais écrite nulle part.
  const departSansHeureUtile = decompte.etat === 'aucun' || decompte.etat === 'perime'

  return (
    <>
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
      <Carte
        icone={<IconeHorloge className="h-9 w-9" />}
        label="Prochain départ"
        // « À VENIR » plutôt qu'un tiret muet quand la zone est ouverte sans
        // heure UTILE (brief du 1er septembre, « signaler l'absence d'heure,
        // sans bloquer », étendu le 1er septembre au cas d'une heure réglée
        // mais périmée depuis plus de 5 min — même état, même message,
        // volontairement indistinguable pour le public). Zone fermée : rien
        // à annoncer, le tiret reste approprié dans les deux cas.
        valeur={departSansHeureUtile ? (donnees?.zoneOuverte ? 'À VENIR' : '—') : (donnees?.prochainDepart ?? '—')}
        couleur="cyan"
        // Ligne de décompte affichée SEULEMENT en compte à rebours ou en
        // grâce « imminent » — jamais sous « À VENIR » ou « — ».
        dessous={
          decompte.etat === 'compte' || decompte.etat === 'imminent' ? (
            <p
              className={
                decompte.etat === 'imminent'
                  ? 'font-mono text-sm font-semibold uppercase tracking-wide text-rose-300 [animation:clignotement-lent_2.4s_ease-in-out_infinite]'
                  : 'font-mono text-sm text-slate-300'
              }
            >
              {decompte.texte}
            </p>
          ) : undefined
        }
      />
    </>
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
  dessous,
}: {
  icone: React.ReactNode
  label: string
  valeur: string | number
  couleur: 'cyan' | 'pink'
  note?: string
  /** Emplacement libre sous le chiffre — utilisé UNIQUEMENT par la carte
   *  « Prochain départ » (useDecompteDepart), les deux autres cartes ne le
   *  passent jamais. */
  dessous?: React.ReactNode
}) {
  return (
    <div className="panel-hud relative flex items-center gap-4 border border-cyan-400/40 bg-[#060b18] px-5 py-4 shadow-[0_0_30px_-12px_rgba(34,211,238,0.35)]">
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
        {dessous}
      </div>
    </div>
  )
}

/**
 * Liste des inscriptions du jour — PRÉNOM SEUL, jamais nom/âge : la route
 * /api/mission-nerf/etat ne renvoie de toute façon que ça (voir `verSortie`
 * dans cette route), mais le rappeler ici documente pourquoi ce composant ne
 * cherche même pas à afficher davantage.
 *
 * ⚠️ RÉAGENCEMENT DU 1er SEPTEMBRE 2026 — affichait auparavant les 4
 * dernières, centrées verticalement (`justify-center`), dans une carte
 * courte à côté des 3 cartes de stats. Le panneau parent
 * (PanneauInscriptionsChrome, dashboard/page.tsx) occupe maintenant toute la
 * hauteur de la rangée caméra ; la limite côté API est passée de 4 à 200
 * (voir api/mission-nerf/etat/route.ts) pour montrer tous les inscrits du
 * jour, avec défilement vertical (`overflow-y-auto`) plutôt qu'un
 * centrage — `justify-center` n'aurait plus de sens avec une vraie liste
 * longue à faire défiler depuis le haut.
 */
export function PanneauInscriptions() {
  const { donnees } = useMissionNerf()
  const lignes = donnees?.dernieres ?? []

  return (
    <ul className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
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
