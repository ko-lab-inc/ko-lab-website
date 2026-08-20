import Image from 'next/image'
import { getTranslations } from 'next-intl/server'

import { Parallax } from '@/components/ui/Parallax'
import { Reveal } from '@/components/ui/Reveal'
import { FILTRE_TERRAIN, IMAGES } from '@/lib/images'

/**
 * Crédibilité terrain — section 3 de l'accueil (Phase 5).
 *
 * Fusion de StatsBar.tsx et de l'ancienne PreuveTerrain.tsx : le document de
 * cadrage veut UNE seule preuve (20 000+ heures), pas quatre chiffres étalés
 * sur deux sections consécutives. Les trois autres stats (disciplines, sites,
 * mandats) ne disparaissent pas du site — elles restent dans la carte du hero
 * et reviennent, une à une et là où elles ont un sens, dans les sections 4/7
 * (voir OperationsTerrain.tsx).
 *
 * Le chiffre est rendu tel quel, jamais animé : le skill 08 interdit
 * explicitement le compteur au chargement.
 */
export async function CredibiliteTerrain() {
  const t = await getTranslations('Home.credibilite')
  const tStats = await getTranslations('Home.stats')

  return (
    <section className="relative overflow-hidden bg-ko-black">
      {/*
        Photo réelle depuis le 20 août 2026 (structureEclairee2024, dôme
        gonflable éclairé de nuit) — ne reprend plus l'image du hero : elle y
        apparaissait déjà, plus dans deux pages capacités (revue visuelle,
        point 1). Section 3 de l'accueil, deux sections sous le hero :
        priorité absolue pour une photo distincte, voir images.ts.
      */}
      <Parallax distance={0} zoom={0.1} mode="traversee" className="absolute inset-0">
        <Image
          src={IMAGES.preuveTerrain}
          alt=""
          fill
          quality={80}
          sizes="100vw"
          style={FILTRE_TERRAIN}
          className="object-cover object-center"
        />
      </Parallax>

      <div aria-hidden="true" className="absolute inset-0 bg-ko-scrim/70" />

      <div className="relative z-10 mx-auto max-w-container px-6 py-24 text-center lg:px-12 lg:py-36">
        <Reveal>
          <p className="label-mono label-mono-d">{t('label')}</p>

          {/* Titre du document de cadrage — direction « typographie nettement
              plus grande » : plus large que ko-h1 (58px max), à la mesure
              d'une section qui porte maintenant le titre ET le chiffre. */}
          <h2 className="mx-auto mt-6 max-w-[20ch] font-serif text-[clamp(34px,5vw,64px)] font-light leading-[1.06] tracking-[-0.02em] text-ko-white">
            {t('title')}
          </h2>

          <p className="mt-10 font-serif text-[clamp(90px,13vw,200px)] font-light leading-[0.85] tracking-[-0.03em] text-ko-white">
            {/* Le « + » en bleu : il porte l'idée d'« au-delà », c'est le seul
                endroit du chiffre qui mérite l'accent. */}
            {tStats('heures_valeur').replace('+', '')}
            <span className="text-ko-blue">+</span>
          </p>
          <p className="label-mono label-mono-d mt-3">{tStats('heures_label')}</p>

          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-ko-frost/70">
            {t('phrase')}
          </p>
        </Reveal>
      </div>
    </section>
  )
}
