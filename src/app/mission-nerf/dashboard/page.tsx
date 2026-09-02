import Image from 'next/image'
import QRCode from 'qrcode'

import { cn } from '@/lib/utils/cn'

import './dashboard.css'
import { CanevasAEchelle } from './CanevasAEchelle'
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
 *      1920×1080 réelle (dépendent de la résolution native du flux RTSP, pas
 *      fournies ici).
 *      ⚠️ RECTANGLE CHANGÉ par le réagencement du 1er septembre (caméra
 *      élargie 2fr → 3fr, cartes redescendues en bas) — l'ancien repère
 *      (x:32 y:182 largeur:1221 hauteur:573) NE S'APPLIQUE PLUS. Re-mesurer
 *      sur une capture 1920×1080 fraîche avant de recadrer la source RTSP
 *      dans OBS, sinon l'image débordera ou laissera des bandes vides.
 *   4. Vérification simple avant l'événement : poser une Source couleur
 *      unie dans la scène, sous la Browser Source — si sa couleur apparaît
 *      exactement dans le rectangle caméra et nulle part ailleurs, la
 *      transparence est correcte.
 */

const URL_FORMULAIRE =
  'https://docs.google.com/forms/d/e/1FAIpQLSe8w68uNWha870jIbbiSqnKf8OmueHPBks2GT-oQpvioAuk-w/viewform'

/**
 * ---------------------------------------------------------------------------
 * RÉAGENCEMENT DU 1er SEPTEMBRE 2026 (demande du boss, sur site) — trois
 * changements, non liés à la maquette d'origine
 * ---------------------------------------------------------------------------
 * 1. Caméra élargie (2fr → 3fr) : plus de place à l'image en direct.
 * 2. Les 3 cartes (Participants/Décharges/Prochain départ), auparavant
 *    empilées à droite de la caméra, descendent en bas et deviennent 3
 *    colonnes d'une rangée de 4 (avec le panneau décharge/QR, lui aussi
 *    rétréci pour matcher) — largeurs et espacements égaux.
 * 3. « Dernières inscriptions » prend leur ancienne place à droite de la
 *    caméra : plus grand, défilable verticalement (voir PanneauInscriptions
 *    dans ElementsEnDirect.tsx et la limite relevée de 4 à 200 lignes côté
 *    API), pour montrer tous les inscrits du jour plutôt que les 4 derniers.
 *
 *    ⚠️ `min-h-screen` → `h-screen` sur le conteneur racine, dans la même
 *    passe : une liste longue avec `min-h-screen` (« au moins » la hauteur
 *    de l'écran, sans plafond) poussait toute la page plus haute que 1080px
 *    au lieu de faire défiler le panneau — `overflow-y-auto` sur un enfant
 *    `flex-1` n'a d'effet que si un ancêtre lui impose une hauteur FERME,
 *    pas seulement un minimum.
 *
 *    ⚠️ `h-screen` → `h-[1080px]` (et `w-full` → `w-[1920px]`) le soir même,
 *    DEUXIÈME passe : ouvert directement dans un onglet de navigateur
 *    redimensionné (pas via OBS), le dashboard débordait franchement —
 *    textes d'état coupés, badge de zone qui retombe sur deux lignes, QR
 *    coupé par le bord de fenêtre. Cause : toutes les tailles de cet écran
 *    sont des pixels FIXES (`text-[30px]`, `h-[174px]`, `w-[420px]`…),
 *    délibérément, pour un rendu identique au pixel près dans OBS (toujours
 *    exactement 1920×1080, fixé dans la Browser Source) — mais `h-screen`
 *    faisait varier la hauteur du CONTENEUR selon la fenêtre réelle sans
 *    jamais faire varier ces valeurs fixes à l'intérieur, d'où le
 *    débordement dès que la fenêtre n'était plus 1920×1080 pile.
 *
 *    Le canevas est maintenant un rectangle FIXE 1920×1080, mis à l'échelle
 *    dans son ensemble par CanevasAEchelle.tsx pour tenir dans la fenêtre
 *    réelle, quelle qu'elle soit — voir sa docstring pour le détail et la
 *    preuve que le cas OBS (viewport exactement 1920×1080) reste
 *    inchangé au pixel près (échelle = 1, aucune mise à l'échelle).
 */
export default async function DashboardMissionNerf() {
  return (
    <MissionNerfProvider>
      <CanevasAEchelle>
        <div className="relative flex h-[1080px] w-[1920px] flex-col gap-6 overflow-hidden p-8 text-white">
          <Entete />

          {/* ⚠️ N'est PLUS une grille à 2 colonnes depuis cette révision — brief
              du boss : « Dernières inscriptions » doit laisser voir la caméra
              À TRAVERS elle (vitre sombre semi-transparente), pas lui prendre
              sa propre portion de largeur à côté. La caméra occupe maintenant
              TOUTE la largeur de cette rangée ; le panneau inscriptions est
              posé PAR-DESSUS en position absolue, à droite, avec un fond
              `bg-[#060b18]/55` au lieu d'un fond plein — la vidéo transparaît
              au travers de son propre fond, pas seulement dans le rectangle
              resté vide. `min-h-0` toujours nécessaire sur ce conteneur pour
              que la liste défile dans le panneau plutôt que de déborder (voir
              PanneauInscriptionsChrome plus bas). */}
          <div className="relative min-h-0 flex-1">
            <PanneauCamera />
            <PanneauInscriptionsChrome />
          </div>

          {/* h-[174px] = hauteur mesurée de l'en-tête (<header>) — demande du
              boss : la rangée du bas doit faire EXACTEMENT la même hauteur
              que la section MISSION NERF, pour garantir un maximum d'espace
              à la caméra (rangée flex-1 au-dessus). Les 4 panneaux ont chacun
              `h-full` pour remplir cette hauteur fixe plutôt que de la
              dicter par leur contenu. */}
          <div className="grid h-[174px] shrink-0 grid-cols-4 gap-6">
            <CartesStats />
            <PanneauDecharge />
          </div>

          <IndicateurConnexion />
        </div>
      </CanevasAEchelle>
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
 * Grille 3 colonnes (`grid-cols-[1fr_auto_1fr]`), pas un simple
 * `justify-between` : un flex laisse le bloc central prendre seulement la
 * largeur de son propre contenu, alors que la maquette lui donne presque
 * toute la largeur — la grille force les colonnes latérales à rester
 * étroites (`1fr` égaux, mais leur CONTENU est court) et laisse le texte
 * central se centrer sur une zone bien plus large.
 */
function Entete() {
  return (
    <header className="panel-hud relative grid grid-cols-[1fr_auto_1fr] items-center gap-4 border border-cyan-400/40 bg-[#060b18] px-8 py-6">
      <EncochesCoins taille="md" />

      <div className="flex items-center gap-2">
        {/* ⚠️ 116px, pas plus — toujours « trop petit » de l'avis du boss après
            96px (h-24), mais mesuré : la colonne du titre (MISSION NERF +
            sous-titre) fait 124px de haut, c'est ELLE qui fixe la hauteur de
            l'en-tête (174px), qui fixe à son tour la hauteur de la rangée du
            bas (même contrainte) ET la hauteur disponible à la caméra
            au-dessus. Dépasser 124px ferait grandir l'en-tête tout entier —
            116px est le maximum qui laisse encore une marge de sécurité (8px)
            sans toucher à aucune des mesures déjà calibrées. */}
        <Image
          src="/mission-nerf/logo-nerf.png"
          alt="Expérience Mobile Ultime"
          width={500}
          height={500}
          priority
          className="h-[116px] w-[116px] shrink-0"
        />
        <TicksMesure nombre={3} />
      </div>

      <TitreMission />

      <div className="flex items-center justify-self-end gap-3">
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
      <h1 className="[font-family:var(--font-nerf-title)] text-8xl uppercase tracking-wide">
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
      <p className="mt-2 flex items-center gap-3 font-mono text-sm uppercase tracking-[0.3em] text-cyan-300">
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
      <span className="h-px w-12 bg-cyan-300/60" />
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
 * transparence.
 *
 * `EncochesCoins` (taille "md") remplace les 4 coins en L codés en dur ici
 * avant la deuxième revue — même motif que tous les autres panneaux, sans
 * dupliquer le balisage.
 *
 * ⚠️ `absolute inset-0` depuis la révision « vitre sombre » — occupe
 * maintenant TOUTE la largeur de la rangée (le parent, `page.tsx`, est
 * passé de grille 2 colonnes à conteneur `relative` simple), avec
 * PanneauInscriptionsChrome posé par-dessus en overlay semi-transparent à
 * droite. Toujours transparent partout SAUF sous cet overlay.
 *
 * ⚠️ `min-h-[46vh] lg:min-h-0` RETIRÉ le soir du 1er septembre (passage au
 * canevas fixe 1920×1080, voir CanevasAEchelle.tsx) : `46vh` mesurait la
 * hauteur du VRAI viewport du navigateur, plus rien à voir avec la hauteur
 * du canevas une fois celui-ci fixé puis mis à l'échelle — et de toute
 * façon inutile : `inset-0` fixe déjà la taille exactement sur le parent
 * (`relative min-h-0 flex-1`), un `min-height` ne peut rien y changer.
 */
function PanneauCamera() {
  return (
    <div className="absolute inset-0 overflow-hidden border border-cyan-400/40">
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
 *
 * ⚠️ `min-h-0` + `overflow-hidden` ici, `min-h-0 overflow-y-auto` sur le
 * `<ul>` dans PanneauInscriptions — nécessaire pour que la liste défile
 * DANS le panneau plutôt que de pousser le panneau plus haut que son
 * voisin. Sans `min-h-0` sur les deux niveaux, un enfant flex ne rétrécit
 * jamais sous la taille de son contenu — piège classique qui empêcherait
 * tout simplement le défilement d'apparaître.
 *
 * ⚠️ « VITRE SOMBRE » — brief du boss sur site : ce panneau doit laisser
 * voir la caméra à travers lui, pas juste être posé à côté. Deux
 * changements pour ça :
 *   1. `absolute inset-y-0 right-0` au lieu d'être une colonne de grille —
 *      il flotte maintenant PAR-DESSUS PanneauCamera (élargie à toute la
 *      largeur de la rangée), pas à côté.
 *   2. `bg-[#060b18]/55` au lieu de `bg-[#060b18]` plein — 55 % d'opacité,
 *      choisi comme point de départ « sombre mais on voit à travers »,
 *      valeur à ajuster après un premier coup d'œil réel (le boss doit
 *      juger si c'est lisible/joli en vrai, pas en théorie).
 *
 * ⚠️ PAS de `backdrop-blur` — inutile ici : ce filtre ne floute que ce que
 * LE NAVIGATEUR a lui-même dessiné derrière l'élément. La caméra n'existe
 * pas à ce stade (zone laissée vide exprès, voir PanneauCamera) — c'est OBS
 * qui la compose PAR-DESSOUS, APRÈS que le navigateur ait fini de rendre la
 * page. Un `backdrop-blur` ici flouterait du vide, pas la vidéo finale.
 *
 * ⚠️ `!absolute` (avec le `!`) — piège découvert en testant : `.panel-hud`
 * (dashboard.css) fixe lui-même `position: relative` sur CE MÊME élément.
 * Classe utilitaire Tailwind et règle CSS classique ont la même
 * spécificité (une classe) ; celle chargée en dernier dans le bundle
 * gagnait, ce qui annulait silencieusement `absolute` — le panneau
 * retombait dans le flux normal (pleine largeur, hauteur de son contenu)
 * au lieu de flotter par-dessus la caméra. Le `!` force l'`!important`
 * Tailwind, qui gagne quelle que soit l'ordre de chargement.
 */
function PanneauInscriptionsChrome() {
  return (
    <div className="panel-hud !absolute inset-y-0 right-0 z-10 flex w-[420px] min-h-0 flex-col overflow-hidden border border-cyan-400/40 bg-[#060b18]/55 px-7 py-5">
      <EncochesCoins taille="sm" />
      <div className="flex shrink-0 items-center gap-2">
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
 *
 * ⚠️ Empilé verticalement et centré depuis le réagencement du 1er septembre
 * (avant : icône+texte à gauche, QR à droite, côte à côte) — ce panneau est
 * maintenant une des 4 colonnes égales de la rangée du bas, plus étroit
 * qu'avant ; la disposition horizontale d'origine n'aurait plus eu la place
 * de respirer.
 *
 * ⚠️ Repassé en ligne horizontale (icône+texte à gauche, QR à droite) le
 * 1er septembre, après le premier essai empilé verticalement : le brief
 * demandait de RÉDUIRE la hauteur de toute la rangée du bas (empilé
 * verticalement, c'était le panneau le plus haut des 4, donc celui qui
 * forçait la hauteur de la rangée entière via l'étirement CSS Grid). QR
 * réduit à 90px (130px, puis 152px avant) pour la même raison ; « Scannez
 * ici » réintroduit sous le QR dans une révision suivante (retiré une
 * seule fois, dans cette passe-ci — pas d'un bout à l'autre du chantier).
 *
 * ⚠️ QR remonté à 118px le soir du 1er septembre (deuxième passe, retour du
 * terrain) : à 90px, illisible par un téléphone à distance normale — trop
 * peu de pixels par module malgré `shape-rendering: crispEdges` déjà posé
 * par défaut par la bibliothèque `qrcode` (vérifié en inspectant le SVG
 * généré : ce n'était donc pas un problème d'anti-aliasing à corriger,
 * seulement de taille). 118px reste dans le budget de hauteur de la carte
 * (174px, moins padding, icône et libellé « Scannez ici ») — vérifié par
 * mesure réelle, pas à l'œil.
 */
async function PanneauDecharge() {
  const svgQr = await QRCode.toString(URL_FORMULAIRE, {
    type: 'svg',
    margin: 1,
    width: 125,
    color: { dark: '#0a1128ff', light: '#ffffffff' },
  })

  return (
    // ⚠️ py-2 (pas py-3 comme les 3 autres cartes) — LOCAL à ce panneau
    // uniquement, pour regagner de la place verticale au QR. Mesuré : à
    // py-3 + p-1.5 sur la boîte blanche, la marge restante au-dessus/en
    // dessous de la colonne QR+libellé n'était que de 1,25px de CHAQUE
    // côté — trop juste pour grandir encore sans risquer un débordement
    // (le clip-path de .panel-hud coupe silencieusement tout ce qui dépasse
    // la boîte, ça n'aurait pas fait grandir la carte, ça aurait rogné le
    // QR). Ce padding réduit ne touche QUE cette carte, pas les 3 autres.
    <div className="panel-hud relative flex h-full items-center justify-between gap-4 border border-pink-500/40 bg-[#060b18] px-5 py-2">
      <EncochesCoins couleur="pink" taille="sm" />

      <div className="flex items-center gap-3">
        <IconeBouclierCoche className="h-10 w-10 shrink-0 text-pink-400" />
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wide text-slate-400">Formulaire de décharge</p>
          <p className="[font-family:var(--font-nerf-title)] text-lg uppercase leading-tight text-pink-400">
            Obligatoire
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-center gap-0.5">
        <div
          className="rounded-lg bg-white p-1"
          // svgQr vient de QRCode.toString(URL_FORMULAIRE, …) — URL_FORMULAIRE
          // est une constante fixe de ce fichier, jamais une entrée
          // utilisateur : aucun risque d'injection via ce
          // dangerouslySetInnerHTML, seul moyen d'insérer un <svg> déjà
          // sérialisé en chaîne.
          dangerouslySetInnerHTML={{ __html: svgQr }}
        />
        <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-cyan-300">Scannez ici</p>
      </div>
    </div>
  )
}
