import Image from 'next/image'
import { getTranslations } from 'next-intl/server'

import { buttonVariants } from '@/components/ui/Button'
import { HeroScrollEffets } from '@/components/ui/HeroScrollEffets'
import { Reveal } from '@/components/ui/Reveal'
import { Link } from '@/i18n/navigation'
import { FILTRE_TERRAIN, IMAGES } from '@/lib/images'
import { ROUTES } from '@/lib/routes'

/**
 * Hero — conteneur arrondi flottant, photo plein cadre.
 *
 * La nav reste pleine largeur au-dessus ; le hero est encarté avec des marges
 * et un rayon, ce qui le détache du fond de page.
 *
 * Aucun Reveal sur le texte : `.reveal` démarre à opacity 0 et n'est levée
 * qu'après l'hydratation. Le h1 étant l'élément LCP, le masquer coûterait
 * directement sur l'objectif de 2,5 s du skill 12.
 */
export async function Hero() {
  const t = await getTranslations('Home.hero')
  const tStats = await getTranslations('Home.stats')

  // Disciplines/sites/mandats retirés (LOT C, §24, révision Joe Himad, 30 août
  // 2026) : des pseudo-compteurs à l'apparence chiffrée pour des valeurs qui
  // n'en étaient pas ("6", "Multi", "Gouv."), aucune vérifiable. « 20 000+
  // heures de travail terrain » reste le seul chiffre public approuvé
  // (CLAUDE.md) — une seule entrée, plus un tableau. Les clés
  // Home.stats.disciplines_*/sites_*/mandats_* restent dans messages/*.json,
  // volontairement non supprimées (consigne du brief) : inutilisées depuis
  // ici — /a-propos (bloc « En bref ») les lit encore, retrait traité à
  // part (même lot, description avant code, voir le rapport).
  const stat = { valeur: tStats('heures_valeur'), label: tStats('heures_label') }

  // Marges latérales ALIGNÉES SUR LA NAV (logo à gauche, bouton à droite) :
  // mx-6 / lg:mx-10 / xl:mx-16, les mêmes valeurs que son px-6 / lg:px-10 /
  // xl:px-16 (Nav.tsx) — « de l'espace de gauche à droite », 19 septembre
  // 2026. Changer l'un sans l'autre casse l'alignement.
  return (
    <section className="mx-6 mt-3 lg:mx-10 lg:mt-4 xl:mx-16">
      <HeroScrollEffets>
      {/* Silhouette (19 septembre 2026, maquette de Christian) : haut plus
          arrondi, bas SANS rayon — le coin bas-droit reste droit, le coin
          bas-gauche descend en pointe grâce à l'échancrure plus bas. */}
      <div data-hero-cadre className="relative min-h-[90vh] overflow-hidden rounded-t-[2.5rem] bg-ko-black lg:rounded-t-[4rem]">
        {/*
          ⚠️ TEMPORAIRE — remplacer par photo KO-LAB 2025-2026
          Voir skill 22 pour les critères de remplacement.
          FILTRE_TERRAIN (images.ts) : traitement partagé par TOUTES les photos
          terrain du site — c'est cette section qui sert de référence aux autres.
        */}
        <Image
          src={IMAGES.hero}
          alt=""
          fill
          priority
          // ⚠️ `priority` NE POSE PLUS `fetchpriority="high"` automatiquement
          // sur Next 16.2.11 — vérifié en lisant get-img-props.js : la prop
          // `fetchPriority` de l'<Image> alimente directement l'attribut,
          // sans dérivation depuis `priority`/`preload` (contrairement à ce
          // que la doc historique de Next laissait supposer). Constaté en
          // production, Lighthouse : `priorityHinted: false` sur le hero
          // malgré `priority`, ni le <img> ni son <link rel="preload"> ne
          // portaient l'attribut. Posé ici explicitement — comportement de
          // la librairie qu'on ne contrôle pas, pas un bug KO-LAB.
          fetchPriority="high"
          quality={85}
          sizes="100vw"
          // data-hero-photo : cible du zoom de scroll (voir HeroScrollEffets).
          data-hero-photo
          style={FILTRE_TERRAIN}
          className="object-cover object-center"
        />

        {/*
          Deux voiles, couleur --ko-black-rgb (exactement le fond de page :
          à 100 % au ras des bords gauche et bas, la photo s'y fond).

          À PARTIR DE xl (≥ 1280 px) — Christian, 19 septembre 2026 :
          « réduire deux fois l'assombrissement, juste un peu sur les côtés
          et le bas ». Le voile ne couvre plus que la COLONNE DE TEXTE (côté
          gauche) : 100 % au bord, 72 % à 22 %, 55 % à 48 %, nul de 70 à
          85 %, 25 % au bord droit ; bas : 100 % au bord, 40 % à 12 %, nul
          dès 45 %. Moitié droite de la photo entièrement dégagée.
          Luminance moyenne à 1440 : centre 0,029 → 0,046, tiers droit
          0,089 → 0,153.

          lg (1024-1279) : 100 → 55 % à 40 % → nul dès 75 % ; mobile et
          tablette : 100 → 45 → 10 % ; bas linéaire dans les deux. Mesuré :
          une vignette sur les seuls bords y fait tomber le titre à 1,4-2,4:1
          autour des lettres (le texte couvre alors la moitié ou la totalité
          de la photo, gilets blancs juste derrière) ; la variante xl, à
          1024, à 2,15:1.

          Plus clair que ceci : le titre casse. Toute retouche → remesurer
          le contraste AUTOUR DES LETTRES, photo chargée, halo compris.
        */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-ko-scrim via-ko-scrim/[0.45] to-ko-scrim/10 lg:via-ko-scrim/[0.55] lg:via-40% lg:to-transparent lg:to-75% xl:bg-[linear-gradient(to_right,rgb(var(--ko-black-rgb))_0%,rgb(var(--ko-black-rgb)/0.72)_22%,rgb(var(--ko-black-rgb)/0.55)_48%,transparent_70%,transparent_85%,rgb(var(--ko-black-rgb)/0.25)_100%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-ko-scrim to-transparent xl:bg-[linear-gradient(to_top,rgb(var(--ko-black-rgb))_0%,rgb(var(--ko-black-rgb)/0.4)_12%,transparent_45%)]"
        />

        {/* Filigrane — blanc à 5 %, purement textural. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[-8%] left-[-2%] select-none font-serif text-[clamp(200px,30vw,520px)] font-light leading-none tracking-[-0.04em] text-ko-frost/5"
        >
          01
        </span>

        {/*
          Échancrure du bas — une bande de la couleur du FOND DE PAGE posée
          sur le bas de la photo, coin haut-gauche très arrondi : la photo
          ne descend jusqu'en bas qu'au bord gauche, en pointe, et le
          bas-droit reste à angle droit (maquette du 19 septembre 2026).
          bg-ko-white et non une couleur fixe : c'est le fond de page dans
          les deux thèmes (#111210 sous la couche sombre). Sous le contenu
          (z-10), au-dessus des voiles.
        */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 z-[5] h-10 rounded-tl-[4rem_2.5rem] bg-ko-white lg:h-20 lg:rounded-tl-[7rem_5rem]"
        />

        {/*
          Contour de la POINTE bas-gauche — blanc fin, discret (25 %,
          relevé de 15 % à la demande : « un peu plus visible »), demandé le 19 septembre 2026 : le bord gauche se fond dans
          le fond de page, la pointe s'y perdait. Deux traits :
          - la courbe : une boîte de la taille exacte du coin arrondi de
            l'échancrure (64×40 / lg 112×80), même rayon, bordure haute et
            gauche — le rayon consomme toute la boîte, seul l'arc est tracé ;
          - le bord gauche au-dessus de la pointe, qui s'efface en montant.
        */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 z-[6] h-10 w-16 rounded-tl-[4rem_2.5rem] border-l border-t border-ko-frost/25 lg:h-20 lg:w-28 lg:rounded-tl-[7rem_5rem]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 z-[6] h-40 w-px bg-gradient-to-t from-ko-frost/25 to-transparent lg:h-64"
        />

        {/*
          Liseré du bord DROIT seulement — blanc à 10 %. Demande du
          19 septembre 2026 : les bords de la photo se fondent dans le fond
          de page, surtout à gauche, mais le droit reste distinguable. Posé
          à l'intérieur, sous l'échancrure, qui l'arrête net à l'angle
          droit du bas. (Remplace le box-shadow du thème sombre, qui cernait
          tout le rectangle.)
        */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[4] rounded-t-[2.5rem] border-r border-ko-frost/10 lg:rounded-t-[4rem]"
        />

        {/* ------------------------------ Contenu ------------------------------ */}
        {/* bottom-10 / lg:bottom-20 : au-dessus de l'échancrure, sur la photo.
            data-hero-texte : le bloc monte plus vite que la photo au scroll
            — le texte « décolle » de l'image (voir HeroScrollEffets). */}
        <div data-hero-texte className="absolute bottom-10 left-0 z-10 max-w-3xl p-6 lg:bottom-20 lg:p-10">
          {/* Pastille sombre (même motif que le label de CredibiliteTerrain) :
              petit texte bleu posé sur la photo — sur le ciel, en mobile, il
              tombait à 2,09:1 en production (mesuré le 19 septembre 2026,
              55 % de sa boîte sous 4,5:1). La pastille le rend indépendant
              de la photo. */}
          <p className="flex w-fit items-center gap-3 rounded bg-ko-scrim/60 px-3 py-1.5 backdrop-blur-sm">
            <span aria-hidden="true" className="h-px w-8 bg-ko-blue" />
            <span className="label-mono label-mono-d">{t('tag')}</span>
          </p>

          {/* data-hero-titre : rétrécit et s'efface au scroll. Rendu à
              opacité 1 sans transformation dans le HTML initial — le LCP
              n'est jamais retardé. */}
          <h1
            data-hero-titre
            // Halo sombre centré, large et doux : depuis que les voiles ne
            // couvrent plus que les bords (19 septembre 2026), c'est lui qui
            // porte la lisibilité du titre sur la photo — le détacher de
            // l'image sans l'assombrir. Mesuré avec lui (contraste-texte).
            className="mt-5 font-serif text-[clamp(40px,5.5vw,76px)] font-light leading-[1.04] tracking-[-0.025em] text-ko-white [text-shadow:0_0_3px_rgba(0,0,0,0.95),0_0_18px_rgba(0,0,0,0.85),0_0_48px_rgba(0,0,0,0.8)]"
          >
            {t.rich('title', { em: (chunks) => <em className="italic text-ko-blue">{chunks}</em> })}
          </h1>

          <p className="mt-4 max-w-md text-base leading-relaxed text-ko-frost/70 [text-shadow:0_0_3px_rgba(0,0,0,0.95),0_0_12px_rgba(0,0,0,0.9),0_0_30px_rgba(0,0,0,0.85)]">
            {t('subtitle')}
          </p>

          <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            {/* `bleu`, pas `primary` — audit contraste du 27 août 2026 :
                `primary` est désormais noir (fond clair), mais ce bouton
                vit à l'intérieur de la carte NOIRE du hero, où le bleu
                reste libre par la règle elle-même. Voir Button.tsx. */}
            <Link href={ROUTES.contact} className={buttonVariants({ variant: 'bleu' })}>
              {t('cta_primary')}
              <span aria-hidden="true">→</span>
            </Link>

            {/* Ghost blanc : la variante claire du design system a une bordure
                ko-line, invisible sur photo sombre. Bordure passée de /30 à
                /50 le 3 septembre 2026 (signalé sur mobile réel) : contre une
                zone claire de la photo (sol, ciel), un filet blanc à 30 %
                d'opacité se distinguait à peine du bouton plein juste à côté —
                même changement reporté sur les 3 autres usages de cette
                classe (EquipementsDeploiement.tsx, Lab.tsx,
                OperationsTerrain.tsx), vocabulaire partagé. */}
            <Link
              href={ROUTES.capacites}
              className="inline-flex min-h-[44px] items-center justify-center gap-2.5 rounded-sm border border-ko-frost/50 px-7 py-4 text-sm text-ko-white transition-colors duration-200 hover:border-ko-white hover:bg-ko-frost/10"
            >
              {t('cta_secondary')}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        {/* --------------------------- Carte stat --------------------------- */}
        {/* Masquée sous md : elle chevaucherait le titre sur un écran étroit
            (inchangé par ce lot — n'affecte que ≥768px, jamais le téléphone).
            Carte à une seule entrée depuis le 30 août 2026 (LOT C, §24) :
            `grid grid-cols-2` n'avait plus de sens à un seul chiffre, aurait
            laissé trois cases vides plutôt qu'une carte simple. */}
        <Reveal className="absolute bottom-16 right-8 z-10 hidden md:block lg:bottom-28">
          {/* data-hero-carte : remonte de 30px à contre-sens du défilement. */}
          <div
            data-hero-carte
            className="rounded-2xl border border-ko-frost/15 bg-ko-frost/10 p-6 backdrop-blur-md"
          >
            <p className="font-serif text-[32px] font-light leading-none text-ko-white">
              {stat.valeur}
            </p>
            <p className="mt-2 max-w-[16ch] font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-ko-frost/55">
              {stat.label}
            </p>
          </div>
        </Reveal>
      </div>
      </HeroScrollEffets>
    </section>
  )
}
