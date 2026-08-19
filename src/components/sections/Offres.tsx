import { getTranslations } from 'next-intl/server'

import { Reveal } from '@/components/ui/Reveal'
import { Link } from '@/i18n/navigation'
import { ROUTES } from '@/lib/routes'

/**
 * Location + Boutique — sections 11 et 12 de l'accueil.
 *
 * Deux cartes bordées, sans photo : elles arrivent juste après l'écosystème
 * sombre et juste avant le CTA. Une troisième salve d'images alourdirait la
 * fin de page, alors que ces deux offres sont des portes de sortie, pas des
 * arguments visuels.
 *
 * Survol : la bordure passe au bleu (skill 20, `.offre`). Aucun soulèvement,
 * aucune ombre — le skill 08 les interdit.
 */
export async function Offres() {
  const t = await getTranslations('Home.offres')

  const offres = [
    { cle: 'location', href: ROUTES.location },
    { cle: 'boutique', href: ROUTES.boutique },
  ] as const

  return (
    <section className="bg-ko-cream py-16 lg:py-28">
      <div className="mx-auto max-w-container px-6 lg:px-12">
        <Reveal>
          <p className="label-mono">{t('label')}</p>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
          {offres.map(({ cle, href }) => (
            <Reveal key={cle}>
              {/* min-h + p-12 : ces deux cartes sont les seules sans visuel de
                  la page, elles ont besoin d'espace négatif pour ne pas
                  paraître tassées entre l'écosystème et le CTA.
                  `mt-auto` sur le lien colle les deux flèches à la même
                  hauteur, quelle que soit la longueur du texte. */}
              <Link
                href={href}
                className="group flex h-full min-h-[280px] flex-col border border-ko-line bg-ko-white p-8 transition-colors duration-250 hover:border-ko-blue lg:p-12"
              >
                <p className="label-mono text-xs">{t(`${cle}_tag`)}</p>

                <h3 className="mt-5 font-serif text-3xl font-light leading-tight text-ko-ink">
                  {t(`${cle}_titre`)}
                </h3>

                <p className="mt-4 max-w-[42ch] text-sm leading-relaxed text-ko-muted">
                  {t(`${cle}_texte`)}
                </p>

                <span className="mt-auto inline-flex w-fit items-center gap-2 border-b border-ko-accent/30 pb-0.5 pt-8 text-sm text-ko-ink transition-[gap,border-color] duration-200 group-hover:gap-3.5 group-hover:border-ko-accent">
                  {t(`${cle}_lien`)}
                  <span aria-hidden="true">→</span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
