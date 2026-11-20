import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound, redirect } from 'next/navigation'

import { ListeFaq } from '@/components/sections/BlocsGeo'
import { buttonVariants } from '@/components/ui/Button'
import { JsonLd } from '@/components/ui/JsonLd'
import { Reveal } from '@/components/ui/Reveal'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { contenuGeo, ROUTE_SERVICE, SERVICES_GEO } from '@/lib/geo/contenu'
import { jsonLdFaq } from '@/lib/geo/json-ld'
import { PAGE_FAQ } from '@/lib/geo/pages'
import { lireReglages, messageAbsence } from '@/lib/reglages'
import { ROUTES } from '@/lib/routes'

import type { Metadata, Viewport } from 'next'

/** THÈME SOMBRE — même méthode que les autres pages, voir theme-sombre.css. */
import '@/styles/theme-sombre.css'

/**
 * Questions fréquentes — corrections GEO du 14 novembre 2026 (proposition 3).
 *
 * La page répondait 404. Elle rassemble, en texte clair et entièrement
 * déplié, les réponses qu'un visiteur ou un moteur de réponse cherche :
 * zones desservies, délais, capacités, location ou achat, soumission,
 * contact. Le contenu vit dans lib/geo/contenu.ts.
 *
 * FRANÇAIS SEULEMENT pour ce lot : /en/faq renvoie vers /fr/faq (307, pas
 * 308 : la version anglaise est appelée à exister). Pas de hreflang tant
 * qu'il n'y a pas de vraie traduction, même règle que sitemap.ts.
 *
 * Le bloc FAQPage ne déclare QUE les questions générales. Celles de chaque
 * service sont affichées ici aussi, mais déclarées sur leur propre page :
 * Google demande de ne baliser qu'une seule fois une question répétée.
 */
type Props = { params: Promise<{ locale: string }> }

export const revalidate = 3600

export const viewport: Viewport = {
  themeColor: '#111210',
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  if (locale !== 'fr') return { robots: { index: false, follow: true } }

  return {
    title: PAGE_FAQ.metaTitre,
    description: PAGE_FAQ.metaDescription,
    alternates: { canonical: `/fr${ROUTES.faq}` },
  }
}

export default async function FaqPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const reglages = await lireReglages()
  const contenu = contenuGeo(locale, reglages)
  if (!contenu) redirect(`/fr${ROUTES.faq}`)

  const tCta = await getTranslations('Capacites.cta')
  const absence = messageAbsence(reglages, locale)

  return (
    <div data-theme-sombre>
      <JsonLd donnees={jsonLdFaq(contenu.faqGenerale)} />

      <section className="border-b border-ko-line bg-ko-cream pb-14 pt-28 lg:pb-20 lg:pt-40">
        <div className="mx-auto max-w-container px-6 lg:px-16">
          <span aria-hidden="true" className="block h-px w-8 bg-ko-blue" />
          <p className="label-mono mt-6">{PAGE_FAQ.eyebrow}</p>
          <h1 className="ko-display mt-5 max-w-[20ch] text-ko-ink">{PAGE_FAQ.titre}</h1>
          <p className="mt-7 max-w-[60ch] text-base leading-relaxed text-ko-muted lg:text-lg">
            {PAGE_FAQ.intro}
          </p>
        </div>
      </section>

      <section className="bg-ko-white py-16 lg:py-24">
        <div className="mx-auto max-w-container px-6 lg:px-16">
          <Reveal>
            <h2 className="ko-h2 text-ko-ink">{PAGE_FAQ.generalTitre}</h2>
            <div className="mt-8">
              <ListeFaq questions={contenu.faqGenerale} />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-ko-line bg-ko-cream py-16 lg:py-24">
        <div className="mx-auto max-w-container space-y-16 px-6 lg:space-y-20 lg:px-16">
          {SERVICES_GEO.map((cle) => {
            const service = contenu.services[cle]
            return (
              <Reveal key={cle}>
                <p className="label-mono">{PAGE_FAQ.parServiceLabel}</p>
                <h2 className="ko-h2 mt-5 text-ko-ink">{service.nom}</h2>
                <div className="mt-8">
                  <ListeFaq questions={service.faq} />
                </div>
                <Link
                  href={ROUTE_SERVICE[cle]}
                  className={`mt-8 ${buttonVariants({ variant: 'text' })}`}
                >
                  {PAGE_FAQ.lienService} {service.nom}
                  <span aria-hidden="true">→</span>
                </Link>
              </Reveal>
            )
          })}
        </div>
      </section>

      <section className="border-t border-ko-line bg-ko-white py-20 lg:py-28">
        <div className="mx-auto max-w-container px-6 lg:px-16">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className="label-mono">{tCta('label')}</p>
              <h2 className="ko-h2 mt-5 text-ko-ink">{tCta('title')}</h2>
              <p className="mx-auto mt-6 max-w-[48ch] text-base leading-relaxed text-ko-muted">
                {absence ?? tCta('texte', { heures: reglages.delaiReponseHeures })}
              </p>
              <Link
                href={ROUTES.contact}
                className={`mt-9 ${buttonVariants({ variant: 'primary' })}`}
              >
                {tCta('bouton')}
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
