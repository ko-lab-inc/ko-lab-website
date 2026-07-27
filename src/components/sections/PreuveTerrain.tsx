import Image from 'next/image'
import { getTranslations } from 'next-intl/server'

import { Parallax } from '@/components/ui/Parallax'
import { Reveal } from '@/components/ui/Reveal'
import { IMAGES } from '@/lib/images'

/**
 * Preuve terrain — chiffre géant sur photo plein cadre.
 *
 * Reprend la « PHRASE FORTE » du document de cadrage :
 * « Du gouvernement du Canada aux plus grands festivals de la région,
 *   nos équipes sont sur le terrain. »
 *
 * Le chiffre est rendu tel quel, jamais animé : le skill 08 interdit
 * explicitement le compteur au chargement.
 */
export async function PreuveTerrain() {
  const t = await getTranslations('Home.credibilite')
  const tStats = await getTranslations('Home.stats')

  const stats = [
    { cle: 'disciplines', valeur: tStats('disciplines_valeur'), label: tStats('disciplines_label') },
    { cle: 'sites', valeur: tStats('sites_valeur'), label: tStats('sites_label') },
    { cle: 'mandats', valeur: tStats('mandats_valeur'), label: tStats('mandats_label') },
  ]

  // ko-black2 et non ko-black : Le LAB juste au-dessus est déjà en ko-black,
  // et deux sections sombres adjacentes se fondaient en une seule plage de
  // 900px. Ce second noir est plus FROID que ko-black (#0e1116 contre #111210),
  // pas plus clair — la séparation se lit à la température, pas à la luminosité.
  return (
    <section className="relative overflow-hidden bg-ko-black2">
      {/*
        ⚠️ TEMPORAIRE — duplication en attente de la vraie photo KO-LAB 2025-2026
        Reprend l'image du hero. Assumé et visible : mieux vaut un doublon
        identifiable qu'une photo de stock hors sujet (skill 22).
      */}
      {/* D — zoom lié au scroll, scale 1 → 1.1 sur la traversée. Aucune
          translation : la photo occupe déjà tout le cadre. */}
      <Parallax distance={0} zoom={0.1} mode="traversee" className="absolute inset-0">
        <Image
          src={IMAGES.preuveTerrain}
          alt=""
          fill
          quality={80}
          sizes="100vw"
          className="object-cover object-center"
        />
      </Parallax>

      {/* Voile uniforme — le texte occupe toute la largeur, il faut donc
          assombrir uniformément plutôt qu'en dégradé directionnel.
          HORS du Parallax : sinon il se dilaterait avec la photo. */}
      <div aria-hidden="true" className="absolute inset-0 bg-ko-scrim/70" />

      <div className="relative z-10 mx-auto max-w-container px-6 py-20 text-center lg:px-12 lg:py-32">
        <Reveal>
          <p className="label-mono label-mono-d">{t('label')}</p>

          <p className="mt-6 font-serif text-[clamp(80px,12vw,180px)] font-light leading-[0.85] tracking-[-0.03em] text-ko-white">
            {/* Le « + » en bleu : il porte l'idée d'« au-delà », c'est le seul
                endroit du chiffre qui mérite l'accent. */}
            {tStats('heures_valeur').replace('+', '')}
            <span className="text-ko-blue">+</span>
          </p>

          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-ko-frost/70">
            {t('phrase')}
          </p>
        </Reveal>

        <Reveal className="mt-14 grid grid-cols-1 gap-10 border-t border-ko-line-d pt-12 text-left sm:grid-cols-3 sm:gap-8">
          {stats.map((stat) => (
            <div key={stat.cle}>
              <p className="label-mono label-mono-d">{stat.valeur}</p>
              <p className="mt-3 max-w-[24ch] text-sm leading-relaxed text-ko-frost/55">
                {stat.label}
              </p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
