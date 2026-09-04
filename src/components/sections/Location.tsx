import Image from 'next/image'
import { getTranslations } from 'next-intl/server'

import { buttonVariants } from '@/components/ui/Button'
import { Reveal } from '@/components/ui/Reveal'
import { Link } from '@/i18n/navigation'
import { FILTRE_TERRAIN, IMAGES } from '@/lib/images'
import { ROUTES } from '@/lib/routes'

/**
 * Location — section 11 de l'accueil (Phase 5, séparée de l'ancien Offres.tsx).
 *
 * La seule des deux anciennes cartes à recevoir de vraies photos (Storage,
 * dossier rental/) : elle a donc son propre traitement visuel, pendant que
 * Boutique.tsx (section 12) garde le format carte de l'ancien Offres.tsx —
 * sans photo, rien à montrer de plus.
 *
 * Le bouton Rentman externe reste masqué tant que l'URL n'est pas fournie
 * (LIEN_RENTMAN dans constantes.ts, condition posée sur /location/page.tsx,
 * Phase 3) : ce lien-ci pointe vers la page interne /location, jamais
 * directement vers Rentman.
 */
export async function Location() {
  const t = await getTranslations('Home.offres')

  return (
    <section className="bg-ko-cream py-16 lg:py-28">
      <div className="mx-auto max-w-container px-6 lg:px-12">
        <Reveal>
          <p className="label-mono">{t('label')}</p>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <Reveal>
            <p className="label-mono text-xs">{t('location_tag')}</p>

            <h2 className="mt-5 font-serif text-3xl font-light leading-tight text-ko-ink lg:text-4xl">
              {t('location_titre')}
            </h2>

            <p className="mt-4 max-w-[46ch] text-sm leading-relaxed text-ko-muted lg:text-base">
              {t('location_texte')}
            </p>

            <Link href={ROUTES.location} className={`mt-8 ${buttonVariants({ variant: 'ghost' })}`}>
              {t('location_lien')}
              <span aria-hidden="true">→</span>
            </Link>
          </Reveal>

          <Reveal>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative col-span-2 aspect-[16/9] overflow-hidden rounded-xl bg-ko-cream2">
                // ⚠️ unoptimized : contournement de l'optimiseur Vercel, ajouté le
                // 3 septembre 2026. L'optimisation d'images du compte est épuisée —
                // /_next/image répond 402 pour toute transformation PAS DÉJÀ en cache,
                // donc toute image nouvellement câblée s'affiche cassée en production
                // (constaté sur cette photo, vérifié par requête directe : les anciennes
                // largeurs répondent 200, les nouvelles 402). Le fichier source a été
                // redimensionné et converti en WebP exprès pour pouvoir être servi tel
                // quel sans coût de performance déraisonnable.
                // À RETIRER dès que le quota Vercel est rétabli : cette prop prive
                // l'image du srcset responsive, un téléphone télécharge la version
                // pleine largeur.
                <Image
                  unoptimized
                  src={IMAGES.locationAmbiance}
                  alt=""
                  fill
                  quality={80}
                  sizes="(max-width: 1024px) 100vw, 55vw"
                  style={FILTRE_TERRAIN}
                  className="object-cover object-center"
                />
              </div>
              <div className="relative aspect-square overflow-hidden rounded-xl bg-ko-cream2">
                <Image
                  src={IMAGES.locationStructures}
                  alt=""
                  fill
                  quality={80}
                  sizes="(max-width: 1024px) 50vw, 27vw"
                  style={FILTRE_TERRAIN}
                  className="object-cover object-center"
                />
              </div>
              {/* Pas de IMAGES.locationMobilier séparé : c'est la même photo
                  que besoinLouer (section 2) — voir la note dans images.ts. */}
              <div className="relative aspect-square overflow-hidden rounded-xl bg-ko-cream2">
                <Image
                  src={IMAGES.besoinLouer}
                  alt=""
                  fill
                  quality={80}
                  sizes="(max-width: 1024px) 50vw, 27vw"
                  style={FILTRE_TERRAIN}
                  className="object-cover object-center"
                />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
