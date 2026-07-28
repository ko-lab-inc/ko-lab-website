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

        {/* --------------------------- Bloc stats --------------------------- */}
        {/*
          Chiffres à même la photo, sans carte fermée (rentman.io en référence) :
          la petite carte glassmorphique précédente diluait des chiffres qui
          doivent dominer. L'ombre portée assure la lisibilité sur la photo,
          quel que soit le point où elle tombe — pas un fond opaque global qui
          reconstituerait la carte qu'on retire.
          En haut à droite plutôt qu'en bas : le contenu principal (tag, h1,
          sous-titre, boutons) occupe déjà tout le bas-gauche sous lg, où les
          deux blocs se chevaucheraient en une seule colonne empilée.
        */}
        <Reveal className="absolute right-5 top-6 z-10 sm:right-8 sm:top-8 lg:right-10 lg:top-10">
          {/*
            data-hero-carte : remonte de 30px à contre-sens du défilement —
            nom conservé, HeroScrollEffets cible cet attribut, pas son style.

            Grille 2×2 à TOUS les breakpoints, pas d'empilement en une seule
            colonne sur mobile : mesuré à 375px, quatre lignes de chiffres à
            40px+ poussaient le bloc jusque dans le h1 et le tag (chevauchement
            visible, capture à l'appui). Deux rangées compactes tiennent sous
            le tag sans jamais atteindre le texte, ancré en bas.
          */}
          <div data-hero-carte className="grid grid-cols-2 gap-x-5 gap-y-5">
            {stats.map((stat) => (
              <div key={stat.label} className="text-right">
                <p className="font-serif text-[clamp(32px,7vw,80px)] font-light leading-none text-ko-white [text-shadow:0_4px_24px_rgba(0,0,0,0.65)]">
                  {stat.valeur}
                </p>
                <p className="mt-2 max-w-[15ch] font-mono text-[9px] uppercase leading-relaxed tracking-[0.12em] text-ko-frost/70 [text-shadow:0_2px_10px_rgba(0,0,0,0.7)] sm:max-w-[18ch] sm:text-[10px] sm:tracking-[0.14em]">
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
