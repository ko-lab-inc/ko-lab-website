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
 * la caméra). Il rend maintenant un Fragment de 3 cartes NUES : le parent
 * (dashboard/page.tsx) les place directement comme 3 colonnes d'une grille
 * `grid-cols-4` (avec PanneauDecharge en 4e colonne) — la mise en
 * page/l'espacement égal est désormais la responsabilité du parent, pas de
 * ce composant.
 *
 * ⚠️ CORRECTION DU SOIR DU 1er SEPTEMBRE 2026 — la carte « Prochain départ »
 * n'utilise plus le `<Carte>` générique : elle a sa propre hiérarchie
 * visuelle (décompte dominant, heure en secondaire) et un état de plus
 * (« session en cours ») incompatible avec le gabarit valeur+note des deux
 * autres cartes. Voir `CarteProchainDepart` plus bas.
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
    <>
      <Carte
        icone={<IconePersonnes className="h-10 w-10" />}
        label="Participants aujourd'hui"
        valeur={participants ?? '—'}
        couleur="cyan"
      />
      <Carte
        icone={<IconePressePapier className="h-10 w-10" />}
        label="Décharges complétées"
        valeur={`${participants ?? '—'} / ${decharges ?? '—'}`}
        couleur="pink"
        note={moyenne ? `moy. ${moyenne} enfant/décharge` : undefined}
      />
      <CarteProchainDepart />
    </>
  )
}

/**
 * Carte « Prochain départ » — hiérarchie visuelle INVERSÉE par rapport aux
 * deux autres cartes (brief du soir du 1er septembre) :
 *
 *   AVANT : gros chiffre (46px) = heure réglée / « À VENIR » ; décompte en
 *           petit texte (14px) en dessous. Le décompte — la seule info
 *           utile à un parent qui attend — était le plus petit élément.
 *   APRÈS : le décompte (ou l'état, si aucun décompte numérique n'a de
 *           sens) devient l'élément dominant ; l'heure réglée passe en
 *           ligne secondaire, petite, grise, toujours visible tant qu'une
 *           heure existe.
 *
 * Deux tailles pour l'élément dominant, jamais une troisième :
 *   - `text-[46px]` (identique au « 1 » et au « 1 / 1 » des cartes
 *     voisines) pour un DÉCOMPTE NUMÉRIQUE (« dans 14 min », « 0:47 ») —
 *     court, tient large.
 *   - `text-[30px]` pour un LIBELLÉ D'ÉTAT (« DÉPART IMMINENT »,
 *     « SESSION EN COURS », « À VENIR ») — mesuré via canvas.measureText
 *     avec la police et le poids réels (Russo One 400), pas à l'œil :
 *     « SESSION EN COURS » (le plus long des trois) occupe environ 288px
 *     dans une colonne d'environ 326px disponibles à 1920×1080 — marge
 *     d'environ 38px, confortable sans gaspiller la taille. Les deux autres
 *     libellés, plus courts, partagent cette même taille plutôt que de
 *     varier chacun dans son coin — un état ne doit pas paraître plus ou
 *     moins important qu'un autre à cause de sa seule longueur de texte.
 *     `whitespace-nowrap` interdit tout retour à la ligne qui changerait la
 *     hauteur de la carte (contrainte dure : la rangée est calée sur la
 *     hauteur de l'en-tête, 174px, et le trou caméra en dépend).
 */
function CarteProchainDepart() {
  const { donnees } = useMissionNerf()
  const decompte = useDecompteDepart(donnees?.prochainDepart)

  let texteDominant: string
  let libelle: boolean
  switch (decompte.etat) {
    case 'compte':
      texteDominant = decompte.texte
      libelle = false
      break
    case 'imminent':
    case 'enCours':
      texteDominant = decompte.texte
      libelle = true
      break
    default:
      // « aucun » — pas de décompte possible : soit personne n'attend
      // (zone fermée), soit la zone est ouverte sans heure encore réglée
      // (brief du 1er septembre, « signaler l'absence d'heure, sans
      // bloquer »). Seul cas restant où « À VENIR » a un sens — voir la
      // docstring de useDecompteDepart.ts pour pourquoi ce n'est plus le
      // cas d'un départ passé depuis plus de 5 min.
      texteDominant = donnees?.zoneOuverte ? 'À VENIR' : '—'
      libelle = true
  }

  return (
    <div className="panel-hud relative flex h-full items-center gap-4 border border-cyan-400/40 bg-[#060b18] px-5 py-3 shadow-[0_0_30px_-12px_rgba(34,211,238,0.35)]">
      <EncochesCoins couleur="cyan" taille="sm" />

      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-cyan-400/40 bg-cyan-400/5 text-cyan-300">
        <IconeHorloge className="h-10 w-10" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-400">Prochain départ</p>
        <p
          className={cn(
            '[font-family:var(--font-nerf-title)] whitespace-nowrap leading-[1.05] tracking-tight',
            libelle ? 'text-[30px]' : 'text-[46px]',
            decompte.etat === 'imminent'
              ? 'text-rose-300 [animation:clignotement-lent_2.4s_ease-in-out_infinite] [text-shadow:0_0_10px_rgba(244,63,94,0.45),0_0_24px_rgba(244,63,94,0.2)]'
              : 'text-cyan-300 [text-shadow:0_0_10px_rgba(103,232,249,0.45),0_0_24px_rgba(34,211,238,0.2)]',
          )}
        >
          {texteDominant}
        </p>
        {/* Ligne secondaire — heure réglée par défaut (même donnée que le
            panneau staff, « actuellement hh:mm »), REMPLACÉE par le temps
            écoulé, ticker à la seconde, pendant SESSION EN COURS (brief du
            soir du 1er septembre, 2e partie : plus utile à un parent qu'une
            heure figée une fois la partie commencée — même hiérarchie
            « seconde ligne », zéro risque sur la hauteur de la carte).
            ⚠️ `prochain_depart` N'EST PLUS « jamais effacée » — fermer la
            zone l'efface désormais volontairement (staff/actions.ts,
            basculerZone) : c'est exactement ce qui fait disparaître cette
            ligne (et toute la carte SESSION EN COURS) quand la zone ferme,
            au lieu des deux états contradictoires observés en production. */}
        {decompte.etat === 'enCours' ? (
          <p className="font-mono text-sm text-slate-400">Depuis {decompte.ecouleTexte}</p>
        ) : (
          donnees?.prochainDepart && <p className="font-mono text-sm text-slate-400">{donnees.prochainDepart}</p>
        )}
      </div>
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
 * ⚠️ Intensité réduite le soir du 1er septembre (deuxième passe, testé sur
 * la vraie TV/projecteur) : 18px/0,85 + 46px/0,5 lisait trop lumineux en
 * vrai, au point de nuire à la lisibilité des chiffres. Ramené à 10px/0,45
 * + 24px/0,2 — même langage visuel (double halo, teinte de la carte),
 * juste moins agressif.
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
    <div className="panel-hud relative flex h-full items-center gap-4 border border-cyan-400/40 bg-[#060b18] px-5 py-3 shadow-[0_0_30px_-12px_rgba(34,211,238,0.35)]">
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
              ? 'text-cyan-300 [text-shadow:0_0_10px_rgba(103,232,249,0.45),0_0_24px_rgba(34,211,238,0.2)]'
              : 'text-pink-400 [text-shadow:0_0_10px_rgba(244,114,182,0.45),0_0_24px_rgba(236,72,153,0.2)]',
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
