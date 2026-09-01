import QRCode from 'qrcode'

import { cn } from '@/lib/utils/cn'

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
 * explicite) : fond marine, cyan/magenta, Orbitron pour les titres — aucun
 * token `ko-*` de globals.css n'est utilisé ici, uniquement la palette
 * Tailwind par défaut (cyan/pink/emerald/rose/slate), disponible sans
 * modification de tailwind.config.ts puisque son `theme.extend.colors`
 * AJOUTE les tokens KO-LAB sans retirer la palette standard.
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
 *   4. Vérification simple avant l'événement : poser une Source couleur
 *      unie dans la scène, sous la Browser Source — si sa couleur apparaît
 *      exactement dans le rectangle caméra et nulle part ailleurs, la
 *      transparence est correcte.
 *
 * Point non vérifiable depuis ici : le comportement exact peut varier selon
 * la version d'OBS et si l'accélération matérielle de la Browser Source est
 * activée — à confirmer avec le test de la Source couleur ci-dessus avant
 * de faire confiance à l'incrustation un soir d'événement.
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
 */
function Entete() {
  return (
    <header className="flex flex-col items-center gap-4 rounded-2xl border border-cyan-400/20 bg-[#060b18] px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-2 leading-tight">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">Expérience</p>
          <p className="[font-family:var(--font-nerf-title)] text-xl font-black uppercase leading-none text-cyan-400">
            Mobile
          </p>
          <p className="[font-family:var(--font-nerf-title)] text-xl font-black uppercase leading-none text-white">
            Ultime
          </p>
        </div>
        <div className="ml-1 flex gap-1" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-4 w-1 -skew-x-12 bg-cyan-400/50" />
          ))}
        </div>
      </div>

      <div className="text-center">
        <h1 className="[font-family:var(--font-nerf-title)] text-4xl font-black uppercase tracking-wide lg:text-6xl">
          <span className="text-white">Mission</span> <span className="text-pink-500">Nerf</span>
        </h1>
        <p className="mt-1 font-mono text-xs uppercase tracking-[0.3em] text-cyan-300 lg:text-sm">
          Centre de contrôle en direct
        </p>
      </div>

      <PastilleZone />
    </header>
  )
}

/** 4 coins en L — motif HUD répété sur le panneau caméra. */
function CoinsDecoratifs() {
  const base = 'pointer-events-none absolute h-5 w-5 border-cyan-400/70'
  return (
    <>
      <span className={cn(base, 'left-0 top-0 border-l-2 border-t-2')} />
      <span className={cn(base, 'right-0 top-0 border-r-2 border-t-2')} />
      <span className={cn(base, 'bottom-0 left-0 border-b-2 border-l-2')} />
      <span className={cn(base, 'bottom-0 right-0 border-b-2 border-r-2')} />
    </>
  )
}

/**
 * Zone caméra — voir la docstring en tête de fichier pour le mécanisme de
 * transparence. `min-h-[46vh]` plutôt qu'une hauteur fixe : garde une taille
 * raisonnable même si le contenu autour change, sans dépendre de `flex-1`
 * seul sur un écran plus bas que 1080px.
 */
function PanneauCamera() {
  return (
    <div className="relative min-h-[46vh] overflow-hidden rounded-2xl border border-cyan-400/30 lg:min-h-0">
      <CoinsDecoratifs />

      <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded bg-black/70 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-white backdrop-blur-sm">
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
    <div className="flex flex-col rounded-xl border border-cyan-400/25 bg-[#060b18] px-6 py-5">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-cyan-300">Dernières inscriptions</p>
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
    <div className="flex flex-col items-center justify-between gap-5 rounded-xl border border-pink-500/30 bg-[#060b18] px-6 py-5 sm:flex-row">
      <div className="flex items-center gap-4 text-center sm:text-left">
        <IconeBouclierCoche className="hidden h-10 w-10 shrink-0 text-pink-400 sm:block" />
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-slate-400">Formulaire de décharge</p>
          <p className="[font-family:var(--font-nerf-title)] text-2xl font-black uppercase leading-tight text-pink-400">
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
