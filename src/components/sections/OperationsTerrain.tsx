import Image from 'next/image'
import { getTranslations } from 'next-intl/server'

import { Parallax } from '@/components/ui/Parallax'
import { Reveal } from '@/components/ui/Reveal'
import { Link } from '@/i18n/navigation'
import { FILTRE_TERRAIN, IMAGES } from '@/lib/images'
import { resoudreEmplacement } from '@/lib/medias-emplacements'
import { ROUTES } from '@/lib/routes'

/**
 * Opérations terrain (résumé) — section 4 de l'accueil (Phase 5).
 *
 * Extraite de l'ancienne liste éditoriale Capacites.tsx : chaque capacité a
 * maintenant sa propre section pleine largeur, photo + bloc statistique en
 * overlay (référence Rentman.io demandée), plutôt qu'une ligne parmi quatre
 * dans une liste — la direction vise l'éditorial et l'immersif, pas quatre
 * cartes identiques (skill 08).
 *
 * Le bloc statistique reprend « Multi / Sites et horaires coordonnés
 * simultanément » de Home.stats — déjà vérifié, déjà affiché ailleurs sur le
 * site (hero) — plutôt qu'un chiffre inventé pour cette section : aucune
 * statistique nouvelle propre aux Opérations terrain n'a été fournie, et
 * CLAUDE.md interdit d'affirmer un nombre sans preuve.
 */
export async function OperationsTerrain() {
  const t = await getTranslations('Home.operations')
  const tStats = await getTranslations('Home.stats')

  // operations_terrain (migration 0031, route A) — pilote UNIQUEMENT la photo
  // desktop ci-dessous. La version mobile (operationsCrewVertical) reste
  // câblée en dur sur images.ts : c'est un FICHIER différent, recadré pour un
  // écran portrait, pas un simple object-position appliqué à la même image —
  // un seul champ URL par emplacement (route A) ne peut pas représenter deux
  // fichiers pour un même emplacement. Changer operations_terrain depuis
  // l'admin ne changera donc que la photo desktop ; limite connue à
  // documenter pour Christian, pas un oubli.
  const photoOperations = await resoudreEmplacement('operations_terrain')

  return (
    <section className="relative overflow-hidden bg-ko-black">
      <Parallax distance={60} className="absolute inset-x-0 top-0 h-[calc(100%+80px)]">
        {/* Deux fichiers pour le même sujet : le cadrage vertical prend le
            relais sous lg plutôt que de forcer un recadrage paysage dans un
            écran portrait (skill 11). */}
        <Image
          src={photoOperations.url}
          alt={photoOperations.alt}
          fill
          quality={82}
          sizes="100vw"
          style={FILTRE_TERRAIN}
          className="hidden object-cover object-center lg:block"
        />
        {/* Source verticale : sujet (équipe) sur le tiers bas du cadre, le
            reste est du ciel. Sans recadrage, le conteneur mobile (proche du
            ratio source) affiche quasiment tout le ciel et réduit l'équipe à
            une bande étroite en bas — repéré à l'écran, pas en lisant le
            code. object-[50%_78%] + zoom recentrent sur l'équipe. */}
        <Image
          src={IMAGES.operationsCrewVertical}
          alt=""
          fill
          quality={82}
          sizes="100vw"
          style={FILTRE_TERRAIN}
          className="scale-125 object-cover object-[50%_78%] lg:hidden"
        />
      </Parallax>

      {/*
        Voile UNIFORME et non un dégradé — ce ciel-là est trop clair pour
        qu'un dégradé (10 % en haut) laisse assez de contraste au texte blanc
        ou au label bleu à cet endroit précis (mesuré : blanc plein ~2,46:1,
        label-mono-d ~1,5:1 sur le ciel filtré à 10 % de voile — sous 4,5:1
        dans les deux cas). 65 % constant garantit ≥ 10:1 pour le texte blanc
        même dans la zone la plus claire de CETTE photo, contrairement à
        CredibiliteTerrain où 70 % avait déjà été validé sur une photo
        différente — le nombre est recalculé ici, pas copié.
      */}
      <div aria-hidden="true" className="absolute inset-0 bg-ko-scrim/65" />

      <div className="relative z-10 mx-auto flex min-h-[560px] max-w-container flex-col justify-end px-6 py-16 lg:min-h-[680px] lg:px-12 lg:py-24">
        <Reveal className="max-w-2xl">
          {/* Pastille propre plutôt que label-mono-d nu : le bleu-2 seul ne
              passe 4,5:1 que sur --ko-black (6,37:1, voir globals.css) — sur
              une photo, même voilée à 65 %, il retombe sous 2:1 dans les
              zones claires (mesuré). Même pastille que Realisations.tsx
              (bg-ko-scrim/60 + backdrop-blur), qui garantit ≥ 8:1 quel que
              soit ce qu'il y a dessous. */}
          <p className="inline-flex items-center rounded bg-ko-scrim/60 px-3 py-1.5 backdrop-blur-sm">
            <span className="label-mono label-mono-d">{t('label')}</span>
          </p>

          <h2 className="mt-5 font-serif text-[clamp(34px,5.2vw,64px)] font-light leading-[1.05] tracking-[-0.02em] text-ko-white">
            {t('title')}
          </h2>

          <p className="mt-6 max-w-[52ch] text-base leading-relaxed text-ko-frost/70 lg:text-lg">
            {t('texte')}
          </p>

          {/* Ghost blanc sur photo — PAS buttonVariants({variant:'ghost'}) :
              cette variante est réglée pour fond clair (text-ko-ink,
              border-ko-line), illisible ici. Même classe que le CTA
              secondaire du hero et le lien de Lab.tsx — vocabulaire établi
              pour un bouton fantôme sur photo sombre. */}
          <Link
            href={ROUTES.operations}
            className="mt-8 inline-flex min-h-[44px] items-center justify-center gap-2.5 rounded-sm border border-ko-frost/30 px-7 py-4 text-sm text-ko-white transition-colors duration-200 hover:border-ko-white hover:bg-ko-frost/10"
          >
            {t('lien')}
            <span aria-hidden="true">→</span>
          </Link>
        </Reveal>

        {/* Bloc statistique en overlay — même vocabulaire visuel que la carte
            du hero (glass discret), masqué sous md où l'espace manque pour le
            poser sans chevaucher le texte. */}
        <Reveal className="absolute right-6 top-16 hidden md:block lg:right-12 lg:top-24">
          <div className="rounded-2xl border border-ko-frost/15 bg-ko-frost/10 px-6 py-5 backdrop-blur-md">
            <p className="font-serif text-[32px] font-light leading-none text-ko-white">
              {tStats('sites_valeur')}
            </p>
            <p className="mt-2 max-w-[18ch] font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-ko-frost/55">
              {tStats('sites_label')}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
