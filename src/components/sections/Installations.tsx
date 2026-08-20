import Image from 'next/image'
import { getTranslations } from 'next-intl/server'

import { Reveal } from '@/components/ui/Reveal'
import { buttonVariants } from '@/components/ui/Button'
import { Link } from '@/i18n/navigation'
import { IMAGES } from '@/lib/images'
import { ROUTES } from '@/lib/routes'

/**
 * Installations (résumé) — section 5 de l'accueil (Phase 5).
 *
 * Extraite de l'ancienne liste éditoriale Capacites.tsx, comme les sections
 * 4 et 7. Est restée sans photo (PhotoPlaceholder) jusqu'au 19 août 2026 :
 * le lot promis (série _87T75xx) était bloqué, le photographe pas confirmé
 * interne. Christian l'a confirmé ce jour-là — voir images.ts,
 * installationsPrincipale (sapin décoré, atrium — la plus représentative des
 * trois photos propres du lot, vérifiées une par une avant tout usage).
 *
 * Fond clair — pas seulement par défaut : cinq sections sombres consécutives
 * (Crédibilité, Opérations, cette section, Le LAB, Équipements) auraient
 * fusionné en une seule masse noire même avec une vraie photo ici — le fond
 * clair reste la bonne respiration entre les deux blocs sombres qui
 * l'encadrent.
 */
export async function Installations() {
  const t = await getTranslations('Home.installations')

  return (
    <section className="bg-ko-white py-16 lg:py-28">
      <div className="mx-auto max-w-container px-6 lg:px-12">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-20">
          <Reveal>
            <p className="label-mono">{t('label')}</p>

            <h2 className="mt-5 max-w-[16ch] font-serif text-[clamp(34px,5vw,64px)] font-light leading-[1.05] tracking-[-0.02em] text-ko-ink">
              {t('title')}
            </h2>

            <p className="mt-6 max-w-[48ch] text-base leading-relaxed text-ko-muted lg:text-lg">
              {t('texte')}
            </p>

            <Link href={ROUTES.installations} className={`mt-8 ${buttonVariants({ variant: 'ghost' })}`}>
              {t('lien')}
              <span aria-hidden="true">→</span>
            </Link>
          </Reveal>

          <Reveal>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image
                src={IMAGES.installationsPrincipale}
                alt=""
                fill
                quality={80}
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover object-top"
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
