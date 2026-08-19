import { getTranslations } from 'next-intl/server'

import { PhotoPlaceholder } from '@/components/ui/PhotoPlaceholder'
import { Reveal } from '@/components/ui/Reveal'
import { buttonVariants } from '@/components/ui/Button'
import { Link } from '@/i18n/navigation'
import { ROUTES } from '@/lib/routes'

/**
 * Installations (résumé) — section 5 de l'accueil (Phase 5).
 *
 * Extraite de l'ancienne liste éditoriale Capacites.tsx, comme les sections
 * 4 et 7 — mais SANS photo : le lot promis (série _87T75xx) est bloqué, le
 * photographe n'est pas confirmé interne (voir images.ts, installationNacelle).
 * PhotoPlaceholder plutôt qu'une photo de stock : le skill 22 l'interdit
 * explicitement, et une photo Unsplash « installations » réintroduirait
 * exactement le problème de véracité que la Phase 1 a nettoyé.
 *
 * Fond clair — pas seulement par défaut : cinq sections sombres consécutives
 * (Crédibilité, Opérations, cette section si elle avait une photo, Le LAB,
 * Équipements) auraient fusionné en une seule masse noire. L'absence de photo
 * devient ici une respiration bienvenue plutôt qu'un simple manque.
 */
export async function Installations() {
  const t = await getTranslations('Home.installations')
  const tCommun = await getTranslations('Commun')

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
            <PhotoPlaceholder ratio="aspect-[4/3]" label={tCommun('photo_placeholder')} className="rounded-2xl" />
          </Reveal>
        </div>
      </div>
    </section>
  )
}
