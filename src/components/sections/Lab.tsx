import Image from 'next/image'
import { getTranslations } from 'next-intl/server'

import { Parallax } from '@/components/ui/Parallax'
import { Reveal } from '@/components/ui/Reveal'
import { Link } from '@/i18n/navigation'
import { FILTRE_TERRAIN, IMAGES } from '@/lib/images'
import { ROUTES } from '@/lib/routes'

/**
 * Le LAB — split 50/50 sombre.
 *
 * Photo à gauche, arrondie du seul côté extérieur : le rayon marque le bord
 * de page, la jonction centrale reste franche pour que les deux moitiés
 * lisent comme un seul bloc.
 *
 * En mobile, la photo passe au-dessus en 4/3.
 */
export async function Lab() {
  const t = await getTranslations('Home.lab')

  const etapes = ['etape1', 'etape2', 'etape3', 'etape4'] as const

  return (
    <section className="bg-ko-black">
      <div className="grid grid-cols-1 items-stretch lg:grid-cols-2">
        <Reveal className="relative aspect-[4/3] overflow-hidden rounded-b-2xl lg:aspect-auto lg:min-h-[640px] lg:rounded-b-none lg:rounded-r-2xl">
          {/*
            Photo réelle depuis le 20 août 2026 (IMAGES.lab — voir images.ts
            pour le raisonnement complet sur le choix impression 3D plutôt que
            laser/CNC). C'était la plus grande image Unsplash du site ; elle
            ne l'est plus.
          */}
          {/* D — zoom lié au scroll, scale 1 → 1.1 sur la traversée.
              `mode="traversee"` et non le mode par défaut : celui-ci mesure la
              sortie par le haut, donc l'effet resterait à zéro pendant tout le
              temps où la section est confortablement visible. */}
          <Parallax distance={0} zoom={0.1} mode="traversee" className="absolute inset-0">
            <Image
              src={IMAGES.lab}
              alt=""
              fill
              quality={80}
              sizes="(max-width: 1024px) 100vw, 50vw"
              style={FILTRE_TERRAIN}
              className="object-cover object-center"
            />
          </Parallax>

          {/* Voile bas discret — assied la photo, ne décore pas.
              HORS du Parallax : il ne doit pas se dilater avec la photo. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-ko-scrim/20 to-transparent"
          />
        </Reveal>

        <Reveal className="flex items-center px-6 py-16 lg:px-16 lg:py-28">
          <div className="w-full max-w-[46ch]">
            <p className="label-mono label-mono-d">{t('label')}</p>

            <h2 className="mt-5 font-serif text-[clamp(28px,3.4vw,44px)] font-light leading-[1.08] tracking-[-0.02em] text-ko-white">
              {t.rich('title', {
                em: (chunks) => <em className="italic text-ko-blue2">{chunks}</em>,
              })}
            </h2>

            <p className="mt-4 text-base leading-relaxed text-ko-frost/60">{t('texte')}</p>

            {/* Quatre étapes en filets — vocabulaire de lignes fines du skill 08,
                pas de puces ni d'icônes. */}
            <dl className="mt-10">
              {etapes.map((etape) => (
                <div
                  key={etape}
                  className="flex items-baseline justify-between gap-6 border-t border-ko-line-d py-4"
                >
                  <dt className="text-ko-white">{t(`${etape}_titre`)}</dt>
                  <dd className="text-right text-sm text-ko-frost/50">{t(`${etape}_detail`)}</dd>
                </div>
              ))}
            </dl>

            <Link
              href={ROUTES.lab}
              // /50, pas /30 — bordure trop faible sur zone claire de photo,
              // corrigé le 3 septembre 2026 (voir Hero.tsx pour le détail).
              className="mt-10 inline-flex min-h-[44px] items-center justify-center gap-2.5 rounded-sm border border-ko-frost/50 px-7 py-4 text-sm text-ko-white transition-colors duration-200 hover:border-ko-white hover:bg-ko-frost/10"
            >
              {t('lien')}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
