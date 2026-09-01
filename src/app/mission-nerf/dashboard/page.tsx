import QRCode from 'qrcode'

import { cn } from '@/lib/utils/cn'

import './dashboard.css'
import { EncochesCoins } from './Decor'
import { IconeBouclierCoche } from './Icones'
import { CartesStats, IndicateurConnexion, PanneauInscriptions, PastilleZone } from './ElementsEnDirect'
import { MissionNerfProvider } from './MissionNerfProvider'

/**
 * Dashboard Mission NERF — écran plein écran affiché sur une TV pendant les
 * événements Expérience Mobile, ouvert dans OBS (Browser Source) pour être
 * incrusté dans le flux diffusé. Prompt 2 : construit CET écran, pas le
 * panneau staff (Prompt 3), sur la fondation posée au Prompt 1 (layout,
 * proxy, robots, migration 0046, route POST de réception).
 *
 * Identité visuelle VOLONTAIREMENT distincte du site KO-LAB (demande
 * explicite) : fond marine, cyan/magenta, Russo One pour les titres et les
 * grands chiffres — aucun token `ko-*` de globals.css n'est utilisé ici,
 * uniquement la palette Tailwind par défaut (cyan/pink/emerald/rose/slate),
 * disponible sans modification de tailwind.config.ts puisque son
 * `theme.extend.colors` AJOUTE les tokens KO-LAB sans retirer la palette
 * standard.
 *
 * ---------------------------------------------------------------------------
 * ⚠️ REVUE VISUELLE DU 1er SEPTEMBRE 2026 (DEUXIÈME PASSE) — maquette
 * ouverte en direct depuis docs/maquette-dashboard-nerf.png, pas depuis une
 * description
 * ---------------------------------------------------------------------------
 * Sept écarts relevés contre le fichier réel :
 *   1. Chevrons de coin (EncochesCoins, Decor.tsx) posés sur TOUS les
 *      panneaux, y compris ceux restés carrés — avant, seul le panneau
 *      caméra en avait, et seulement en L simple.
 *   2. Double liseré rendu plus visible (dashboard.css : écart 3px -> 6px,
 *      opacité 0.22 -> 0.45) — techniquement présent avant, mais les deux
 *      traits se confondaient visuellement en un seul.
 *   3-4. Cartes de droite refaites : icône dans son propre cadre carré à
 *      GAUCHE, aussi haute que le chiffre, label + chiffre empilés à DROITE
 *      (voir ElementsEnDirect.tsx, Carte) — avant, icône minuscule au-dessus
 *      du chiffre.
 *   5. Titre agrandi (text-6xl -> text-8xl) et en-tête restructurée en
 *      grille 3 colonnes pour lui laisser presque toute la largeur centrale.
 *   6. Connecteurs (cercle + trait) ajoutés de part et d'autre de « Centre
 *      de contrôle en direct » — absents avant.
 *   7. Pastille de zone agrandie, coins coupés + chevrons (voir
 *      ElementsEnDirect.tsx, Pastille) — avant, simple pilule arrondie.
 * Non touché (ligne « CE QUI NE SE TOUCHE PAS » du brief) : zone caméra et
 * ses coordonnées, rafraîchissement, gestion d'erreur, QR code, grands
 * chiffres eux-mêmes et leur halo, panneau staff.
 *
 * ---------------------------------------------------------------------------
 * ZONE CAMÉRA TRANSPARENTE — comment, et ce qu'il faut régler dans OBS
 * ---------------------------------------------------------------------------
 * `<PanneauCamera>` ci-dessous n'a AUCUNE couleur de fond — ni sur lui-même,
 * ni sur aucun de ses ancêtres à cet endroit précis de l'écran (voir aussi
 * layout.tsx : html/body sont forcés `background: transparent`). Seuls sa
 * bordure, son étiquette et ses coins décoratifs sont peints ; l'intérieur
 * ne reçoit littéralement aucun pixel opaque.
 *
 * OBS restitue une Browser Source avec un canal alpha par défaut (rendu
 * hors-écran de Chromium/CEF) : tout pixel qu'AUCUNE règle CSS ne peint reste
 * transparent dans le flux composité, sans case à cocher particulière côté
 * OBS. Le corollaire, c'est que le reste du dashboard (en-tête, cartes,
 * panneaux du bas) DOIT rester opaque pour rester lisible — chaque panneau
 * porte donc son propre fond plein (`bg-[#060b18]`), jamais un fond posé sur
 * le <body> qui couvrirait aussi le trou de la caméra.
 *
 * RÉGLAGES OBS :
 *   1. Ajouter une Browser Source, URL = cette page, Largeur 1920, Hauteur
 *      1080. Pas de case « fond transparent » à cocher — le comportement
 *      est automatique, contingent uniquement à ce que la page ne peigne
 *      rien à cet endroit (voir plus haut).
 *   2. Ajouter la source RTSP (Source média, ou le plugin VLC Video Source
 *      si le decodeur RTSP natif d'OBS pose problème) DANS LA MÊME SCÈNE,
 *      et la placer SOUS la Browser Source dans la liste des sources (plus
 *      bas dans la liste = derrière visuellement).
 *   3. Recadrer/positionner la source RTSP pour qu'elle occupe exactement le
 *      rectangle de la zone caméra — coordonnées mesurées sur une capture
 *      1920×1080 réelle, données dans le rapport de la conversation
 *      (dépendent de la résolution native du flux RTSP, pas fournies ici).
 *      Rectangle INCHANGÉ par cette deuxième passe de révision (brief :
 *      « ne se touche pas ») : x:32 y:182 largeur:1221 hauteur:573.
 *   4. Vérification simple avant l'événement : poser une Source couleur
 *      unie dans la scène, sous la Browser Source — si sa couleur apparaît
 *      exactement dans le rectangle caméra et nulle part ailleurs, la
 *      transparence est correcte.
 */

const URL_FORMULAIRE =
  'https://docs.google.com/forms/d/e/1FAIpQLSe8w68uNWha870jIbbiSqnKf8OmueHPBks2GT-oQpvioAuk-w/viewform'

export default async function DashboardMissionNerf() {
  return (
    <MissionNerfProvider>
      <div className="relative flex min-h-screen w-full flex-col gap-5 p-6 text-white lg:gap-6 lg:p-8">
        <Entete />

        <div className="grid flex-1 grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr] lg:gap-6">
          <PanneauCamera />
          <CartesStats />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.3fr_1fr] lg:gap-6">
          <PanneauInscriptionsChrome />
          <PanneauDecharge />
        </div>

        <IndicateurConnexion />
      </div>
    </MissionNerfProvider>
  )
}

/**
 * ⚠️ Seul le panneau caméra doit être transparent (voir la docstring de ce
 * fichier) — l'en-tête, lui, est un fond plein comme les autres panneaux.
 * Sans ce `bg-[#060b18]` explicite, l'en-tête flotterait directement sur le
 * body transparent : invisible dans un navigateur normal (fond blanc par
 * défaut du navigateur), pas seulement dans OBS.
 *
 * Grille 3 colonnes (`lg:grid-cols-[1fr_auto_1fr]`), pas un simple
 * `justify-between` : un flex laisse le bloc central prendre seulement la
 * largeur de son propre contenu, alors que la maquette lui donne presque
 * toute la largeur — la grille force les colonnes latérales à rester
 * étroites (`1fr` égaux, mais leur CONTENU est court) et laisse le texte
 * central se centrer sur une zone bien plus large.
 */
function Entete() {
  return (
    <header className="panel-hud relative grid grid-cols-1 items-center gap-4 border border-cyan-400/40 bg-[#060b18] px-8 py-6 lg:grid-cols-[1fr_auto_1fr]">
      <EncochesCoins taille="md" />

      <div className="flex items-center gap-2 leading-tight">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">Expérience</p>
          <p className="[font-family:var(--font-nerf-title)] text-xl uppercase leading-none text-cyan-400">Mobile</p>
          <p className="[font-family:var(--font-nerf-title)] text-xl uppercase leading-none text-white">Ultime</p>
        </div>
        <TicksMesure nombre={3} />
      </div>

      <TitreMission />

      <div className="flex items-center justify-self-center gap-3 lg:justify-self-end">
        <TicksMesure nombre={4} couleur="pink" />
        <PastilleZone />
      </div>
    </header>
  )
}

/**
 * « MISSION NERF » — dégradé + texture scanline + halo. Répond au relevé
 * du 1er septembre (« plat, sans texture ») : le dégradé et la texture sont
 * posés DANS le texte via `background-clip: text`, le halo via `text-shadow`
 * (deux effets figés, calculés une fois, aucun coût continu).
 *
 * Taille portée à `text-8xl` (deuxième revue, 1er septembre) : la maquette
 * fait occuper au titre presque toute la largeur centrale — `text-6xl`
 * restait nettement plus étroit. Connecteurs (cercle + trait) ajoutés de
 * part et d'autre du sous-titre, absents de la première version.
 */
function TitreMission() {
  return (
    <div className="flex flex-col items-center">
      <h1 className="[font-family:var(--font-nerf-title)] text-5xl uppercase tracking-wide sm:text-6xl lg:text-8xl">
        <span
          className="bg-clip-text text-transparent [text-shadow:0_0_28px_rgba(148,231,255,0.55)]"
          style={{ backgroundImage: TEXTURE_TITRE('#ffffff', '#a9e8ff') }}
        >
          Mission
        </span>{' '}
        <span
          className="bg-clip-text text-transparent [text-shadow:0_0_28px_rgba(236,72,153,0.6)]"
          style={{ backgroundImage: TEXTURE_TITRE('#ffa9dc', '#ec4899') }}
        >
          Nerf
        </span>
      </h1>
      <p className="mt-2 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.3em] text-cyan-300 lg:text-sm">
        <ConnecteurLigne />
        Centre de contrôle en direct
        <ConnecteurLigne inverse />
      </p>
    </div>
  )
}

/** Cercle + trait — connecteurs de part et d'autre du sous-titre, motif
 *  relevé dans la maquette et absent de la première version. */
function ConnecteurLigne({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className={inverse ? 'flex items-center gap-2 flex-row-reverse' : 'flex items-center gap-2'} aria-hidden="true">
      <span className="h-1.5 w-1.5 rounded-full border border-cyan-300" />
      <span className="h-px w-8 bg-cyan-300/60 sm:w-12" />
    </span>
  )
}

/**
 * Texture du titre : fines lignes horizontales (le grain « scanline » d'un
 * écran de contrôle, motif fiable en CSS pur) fondues dans un dégradé de
 * couleur — remplace une première tentative au bruit SVG (feTurbulence) qui
 * se combinait mal avec `background-clip: text` et rendait le titre
 * illisible. Statique, aucun calcul en continu.
 */
function TEXTURE_TITRE(haut: string, bas: string): string {
  return (
    'repeating-linear-gradient(0deg, rgba(10,17,30,0.5) 0px, rgba(10,17,30,0.5) 1px, transparent 1px, transparent 3px), ' +
    `linear-gradient(180deg, ${haut} 0%, ${bas} 100%)`
  )
}

/**
 * Traits de mesure — vocabulaire « instrument technique » répété à plusieurs
 * endroits de l'écran (brief du 1er septembre : « petits traits, tirets
 * décoratifs... absents de l'écran »). Purement décoratif, `aria-hidden`.
 */
function TicksMesure({ nombre, couleur = 'cyan' }: { nombre: number; couleur?: 'cyan' | 'pink' }) {
  return (
    <div className="flex items-end gap-1" aria-hidden="true">
      {Array.from({ length: nombre }).map((_, i) => (
        <span
          key={i}
          className={cn(
            '-skew-x-12',
            couleur === 'cyan' ? 'bg-cyan-400/50' : 'bg-pink-400/50',
            i % 2 === 0 ? 'h-4 w-1' : 'h-2.5 w-1',
          )}
        />
      ))}
    </div>
  )
}

/**
 * Zone caméra — voir la docstring en tête de fichier pour le mécanisme de
 * transparence. `min-h-[46vh]` plutôt qu'une hauteur fixe : garde une taille
 * raisonnable même si le contenu autour change, sans dépendre de `flex-1`
 * seul sur un écran plus bas que 1080px.
 *
 * `EncochesCoins` (taille "md") remplace les 4 coins en L codés en dur ici
 * avant la deuxième revue — même motif que tous les autres panneaux, sans
 * dupliquer le balisage.
 */
function PanneauCamera() {
  return (
    <div className="relative min-h-[46vh] overflow-hidden border border-cyan-400/40 lg:min-h-0">
      <EncochesCoins taille="md" />

      <div className="absolute left-4 top-4 z-10 flex items-center gap-2 bg-black/70 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-white backdrop-blur-sm">
        <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" aria-hidden="true" />
        Caméra en direct — Labyrinthe
      </div>

      {/*
        ⚠️ INTÉRIEUR INTENTIONNELLEMENT VIDE — aucun `bg-*`, aucune image, ni
        ici ni sur un ancêtre à cet endroit. Voir la docstring du fichier :
        c'est ce qui rend ce rectangle transparent pour OBS.
      */}
    </div>
  )
}

/**
 * Chrome statique du panneau « dernières inscriptions » (bordure, titre) —
 * les LIGNES elles-mêmes sont dans PanneauInscriptions (client), voir
 * ElementsEnDirect.tsx.
 */
function PanneauInscriptionsChrome() {
  return (
    <div className="panel-hud relative flex flex-col border border-cyan-400/40 bg-[#060b18] px-7 py-5">
      <EncochesCoins taille="sm" />
      <div className="flex items-center gap-2">
        <TicksMesure nombre={2} />
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-cyan-300">Dernières inscriptions</p>
      </div>
      <PanneauInscriptions />
    </div>
  )
}

/**
 * Panneau décharge + QR — Server Component asynchrone : le SVG est généré
 * une fois par rendu de page via `qrcode`, jamais côté client (pas de
 * dépendance JS supplémentaire envoyée au navigateur pour ça).
 */
async function PanneauDecharge() {
  const svgQr = await QRCode.toString(URL_FORMULAIRE, {
    type: 'svg',
    margin: 1,
    width: 152,
    color: { dark: '#0a1128ff', light: '#ffffffff' },
  })

  return (
    <div className="panel-hud relative flex flex-col items-center justify-between gap-5 border border-pink-500/40 bg-[#060b18] px-7 py-5 sm:flex-row">
      <EncochesCoins couleur="pink" taille="sm" />

      <div className="flex items-center gap-4 text-center sm:text-left">
        <IconeBouclierCoche className="hidden h-10 w-10 shrink-0 text-pink-400 sm:block" />
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-slate-400">Formulaire de décharge</p>
          <p className="[font-family:var(--font-nerf-title)] text-2xl uppercase leading-tight text-pink-400">
            Obligatoire
          </p>
          <p className="font-mono text-xs uppercase tracking-wide text-slate-400">avant de participer</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300">Scannez ici</p>
        <div
          className="rounded-lg bg-white p-2"
          // svgQr vient de QRCode.toString(URL_FORMULAIRE, …) — URL_FORMULAIRE
          // est une constante fixe de ce fichier, jamais une entrée
          // utilisateur : aucun risque d'injection via ce
          // dangerouslySetInnerHTML, seul moyen d'insérer un <svg> déjà
          // sérialisé en chaîne.
          dangerouslySetInnerHTML={{ __html: svgQr }}
        />
      </div>
    </div>
  )
}
