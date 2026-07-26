import { getTranslations } from 'next-intl/server'

import { buttonVariants } from '@/components/ui/Button'
import { Reveal } from '@/components/ui/Reveal'
import { Link } from '@/i18n/navigation'
import { ROUTES } from '@/lib/routes'

/**
 * Appel à l'action final — section 13 de l'accueil.
 *
 * Reprend mot pour mot la formule du document de cadrage :
 * « Alors, qu'est-ce qu'on met sur le terrain? »
 *
 * Fond clair et beaucoup d'espace négatif : après l'écosystème sombre et les
 * deux cartes d'offres, la page doit se rouvrir avant le footer. Aucun visuel,
 * aucun encadré — la question porte seule.
 */
export async function CtaFinal() {
  const t = await getTranslations('Home.cta')

  return (
    <section className="relative overflow-hidden bg-ko-white py-24 lg:py-40">
      {/* Filigrane de clôture — pendant du « 01 » du hero, en crème sur crème. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-12%] right-[-2%] z-0 select-none font-serif text-[clamp(180px,26vw,460px)] font-light leading-none tracking-[-0.04em] text-ko-cream2"
      >
        13
      </span>

      <div className="relative z-10 mx-auto max-w-container px-6 lg:px-12">
        <Reveal>
          {/* Composition centrée : la question de clôture porte seule, sans
              colonne éditoriale. `ko-h1` et non `ko-display` — à 80px la phrase
              tombait sur six lignes et perdait toute tenue. */}
          <div className="mx-auto max-w-3xl text-center">
            <p className="label-mono">{t('label')}</p>

            <h2 className="ko-h1 mt-6 text-ko-ink">{t('title')}</h2>

            <p className="mx-auto mt-8 max-w-[52ch] text-base leading-relaxed text-ko-muted lg:text-lg">
              {t('texte')}
            </p>

            <Link
              href={ROUTES.contact}
              className={`mt-10 ${buttonVariants({ variant: 'primary', size: 'lg' })}`}
            >
              {t('bouton')}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
