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

  const stats = [
    { valeur: tStats('heures_valeur'), label: tStats('heures_label') },
    { valeur: tStats('disciplines_valeur'), label: tStats('disciplines_label') },
    { valeur: tStats('sites_valeur'), label: tStats('sites_label') },
    { valeur: tStats('mandats_valeur'), label: tStats('mandats_label') },
  ]

  return (
    <section className="mx-3 mt-3 lg:mx-4 lg:mt-4">
      <HeroScrollEffets>
      <div className="relative min-h-[90vh] overflow-hidden rounded-3xl bg-ko-black shadow-[0_8px_40px_rgba(0,0,0,0.15)]">
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
          Deux voiles superposés, uniquement pour la lisibilité du texte —
          jamais décoratifs (skill 08). Le premier dégage la colonne gauche,
          le second ancre le bas du cadre où se pose le contenu.
          ko-scrim est le seul token acceptant un modificateur d'opacité.
        */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-ko-scrim/[0.88] via-ko-scrim/[0.45] to-ko-scrim/10"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-ko-scrim/75 to-transparent"
        />

        {/* Filigrane — blanc à 5 %, purement textural. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[-8%] left-[-2%] select-none font-serif text-[clamp(200px,30vw,520px)] font-light leading-none tracking-[-0.04em] text-ko-frost/5"
        >
          01
        </span>

        {/* ------------------------------ Contenu ------------------------------ */}
        <div className="absolute bottom-0 left-0 z-10 max-w-3xl p-6 lg:p-10">
          <p className="flex items-center gap-3">
            <span aria-hidden="true" className="h-px w-8 bg-ko-blue" />
            <span className="label-mono label-mono-d">{t('tag')}</span>
          </p>

          {/* data-hero-titre : rétrécit et s'efface au scroll. Rendu à
              opacité 1 sans transformation dans le HTML initial — le LCP
              n'est jamais retardé. */}
          <h1
            data-hero-titre
            className="mt-5 font-serif text-[clamp(40px,5.5vw,76px)] font-light leading-[1.04] tracking-[-0.025em] text-ko-white"
          >
            {t.rich('title', { em: (chunks) => <em className="italic text-ko-blue">{chunks}</em> })}
          </h1>

          <p className="mt-4 max-w-md text-base leading-relaxed text-ko-frost/70">
            {t('subtitle')}
          </p>

          <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Link href={ROUTES.contact} className={buttonVariants({ variant: 'primary' })}>
              {t('cta_primary')}
              <span aria-hidden="true">→</span>
            </Link>

            {/* Ghost blanc : la variante claire du design system a une bordure
                ko-line, invisible sur photo sombre. */}
            <Link
              href={ROUTES.capacites}
              className="inline-flex min-h-[44px] items-center justify-center gap-2.5 rounded-sm border border-ko-frost/30 px-7 py-4 text-sm text-ko-white transition-colors duration-200 hover:border-ko-white hover:bg-ko-frost/10"
            >
              {t('cta_secondary')}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        {/* --------------------------- Carte stats --------------------------- */}
        {/* Masquée sous md : elle chevaucherait le titre sur un écran étroit. */}
        <Reveal className="absolute bottom-8 right-8 z-10 hidden md:block">
          {/* data-hero-carte : remonte de 30px à contre-sens du défilement. */}
          <div
            data-hero-carte
            className="grid grid-cols-2 gap-4 rounded-2xl border border-ko-frost/15 bg-ko-frost/10 p-6 backdrop-blur-md"
          >
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="font-serif text-[32px] font-light leading-none text-ko-white">
                  {stat.valeur}
                </p>
                <p className="mt-2 max-w-[16ch] font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-ko-frost/55">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
      </HeroScrollEffets>
    </section>
  )
}
