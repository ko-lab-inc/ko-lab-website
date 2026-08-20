import Image from 'next/image'
import { getTranslations } from 'next-intl/server'

import { Reveal } from '@/components/ui/Reveal'
import { Link } from '@/i18n/navigation'
import { FILTRE_TERRAIN, IMAGES } from '@/lib/images'
import { lireReglages } from '@/lib/reglages'
import { ROUTES } from '@/lib/routes'

/**
 * Boutique — section 12 de l'accueil (Phase 5, séparée de l'ancien Offres.tsx).
 *
 * Format carte bordée de l'ancien Offres.tsx conservé (skill 20, `.offre` —
 * bordure au bleu au survol, jamais de soulèvement ni d'ombre), mais plus
 * sans photo depuis le 20 août 2026 (revue visuelle, point 4) : c'était la
 * seule section de l'accueil sans aucun visuel, un vide relevé à côté de la
 * section 4 (Opérations, pleine largeur, immersive). boutiqueImpression3d
 * comble le trou — une vraie photo d'atelier KO-LAB posée depuis la Phase 8,
 * jamais câblée nulle part jusqu'ici (voir images.ts).
 *
 * ⚠️ boutiqueActive (0029) — lu ici plutôt que reçu en prop : les 13 sections
 * de l'accueil sont toutes montées sans props depuis page.tsx (voir ce
 * fichier), chacune résout ses propres besoins. Suivre ce même modèle évite
 * d'être la seule section à casser ce motif pour une seule prop.
 */
export async function Boutique() {
  const reglages = await lireReglages()
  if (!reglages.boutiqueActive) return null

  const t = await getTranslations('Home.offres')

  return (
    <section className="bg-ko-cream pb-16 lg:pb-28">
      <div className="mx-auto max-w-container px-6 lg:px-12">
        <Reveal>
          <Link
            href={ROUTES.boutique}
            className="group grid grid-cols-1 items-center gap-8 border border-ko-line bg-ko-white p-8 transition-colors duration-250 hover:border-ko-blue lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-14 lg:p-12"
          >
            <div>
              <p className="label-mono text-xs">{t('boutique_tag')}</p>

              <h2 className="mt-5 font-serif text-3xl font-light leading-tight text-ko-ink lg:text-4xl">
                {t('boutique_titre')}
              </h2>

              <p className="mt-4 max-w-[46ch] text-sm leading-relaxed text-ko-muted lg:text-base">
                {t('boutique_texte')}
              </p>

              <span className="mt-8 inline-flex w-fit shrink-0 items-center gap-2 border-b border-ko-accent/30 pb-0.5 text-sm text-ko-ink transition-[gap,border-color] duration-200 group-hover:gap-3.5 group-hover:border-ko-accent">
                {t('boutique_lien')}
                <span aria-hidden="true">→</span>
              </span>
            </div>

            <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
              <Image
                src={IMAGES.boutiqueImpression3d}
                alt=""
                fill
                quality={80}
                sizes="(max-width: 1024px) 100vw, 35vw"
                style={FILTRE_TERRAIN}
                className="object-cover object-center"
              />
            </div>
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
