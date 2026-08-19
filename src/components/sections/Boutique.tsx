import { getTranslations } from 'next-intl/server'

import { Reveal } from '@/components/ui/Reveal'
import { Link } from '@/i18n/navigation'
import { ROUTES } from '@/lib/routes'

/**
 * Boutique — section 12 de l'accueil (Phase 5, séparée de l'ancien Offres.tsx).
 *
 * Garde le format carte bordée de l'ancien Offres.tsx, sans photo : contrairement
 * à Location (section 11), aucune photo n'a été fournie pour cette section — la
 * carte reste le format le plus honnête plutôt que d'inventer un visuel.
 *
 * Survol : la bordure passe au bleu (skill 20, `.offre`). Aucun soulèvement,
 * aucune ombre — le skill 08 les interdit.
 */
export async function Boutique() {
  const t = await getTranslations('Home.offres')

  return (
    <section className="bg-ko-cream pb-16 lg:pb-28">
      <div className="mx-auto max-w-container px-6 lg:px-12">
        <Reveal>
          {/* min-h + p-12 : cette carte est la seule section sans visuel de la
              page, elle a besoin d'espace négatif pour ne pas paraître tassée
              entre Location et le CTA final. */}
          <Link
            href={ROUTES.boutique}
            className="group flex min-h-[220px] flex-col border border-ko-line bg-ko-white p-8 transition-colors duration-250 hover:border-ko-blue lg:flex-row lg:items-center lg:justify-between lg:p-12"
          >
            <div>
              <p className="label-mono text-xs">{t('boutique_tag')}</p>

              <h2 className="mt-5 font-serif text-3xl font-light leading-tight text-ko-ink lg:text-4xl">
                {t('boutique_titre')}
              </h2>

              <p className="mt-4 max-w-[46ch] text-sm leading-relaxed text-ko-muted lg:text-base">
                {t('boutique_texte')}
              </p>
            </div>

            <span className="mt-8 inline-flex w-fit shrink-0 items-center gap-2 border-b border-ko-accent/30 pb-0.5 text-sm text-ko-ink transition-[gap,border-color] duration-200 group-hover:gap-3.5 group-hover:border-ko-accent lg:mt-0">
              {t('boutique_lien')}
              <span aria-hidden="true">→</span>
            </span>
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
