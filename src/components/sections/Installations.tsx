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
 *
 * Photo agrandie le 20 août 2026 (revue visuelle, point 4) : à côté de la
 * section 4 (Opérations, pleine largeur, immersive), le cadre 4/3 centré
 * paraissait faible en comparaison. La colonne photo passe devant la colonne
 * texte (1.1fr contre 0.9fr) et occupe toute la hauteur de la rangée au lieu
 * d'un cadre figé — MAIS le fond reste clair : basculer en sombre casserait
 * l'alternance avec la section 4 et recréerait le problème de répétition que
 * le point 1 vient de corriger (deux sections voisines, même traitement).
 * Pastille ajoutée sur la photo — texte descriptif, jamais un chiffre : la
 * seule statistique autorisée sur le site (20 000 heures) vit déjà en
 * section 3, aucune autre n'est vérifiable.
 */
export async function Installations() {
  const t = await getTranslations('Home.installations')

  return (
    <section className="bg-ko-white py-16 lg:py-28">
      <div className="mx-auto max-w-container px-6 lg:px-12">
        <div className="grid grid-cols-1 items-stretch gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
          <Reveal className="flex flex-col justify-center">
            <p className="label-mono">{t('label')}</p>

            <h2 className="mt-5 max-w-[16ch] font-serif text-[clamp(34px,5vw,64px)] font-light leading-[1.05] tracking-[-0.02em] text-ko-ink">
              {t('title')}
            </h2>

            <p className="mt-6 max-w-[48ch] text-base leading-relaxed text-ko-muted lg:text-lg">
              {t('texte')}
            </p>

            <Link href={ROUTES.installations} className={`mt-8 w-fit ${buttonVariants({ variant: 'ghost' })}`}>
              {t('lien')}
              <span aria-hidden="true">→</span>
            </Link>
          </Reveal>

          <Reveal>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl lg:aspect-auto lg:h-full lg:min-h-[420px]">
              <Image
                src={IMAGES.installationsPrincipale}
                alt=""
                fill
                quality={80}
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover object-top"
              />

              {/* Repère textuel, pas un chiffre — décrit ce que montre la
                  photo (sapin décoré, hall d'atrium), même vocabulaire de
                  pastille que Realisations.tsx (bg-ko-scrim/60 + blur). */}
              <span className="absolute left-4 top-4 rounded bg-ko-scrim/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ko-frost/90 backdrop-blur-sm">
                {t('pastille')}
              </span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
