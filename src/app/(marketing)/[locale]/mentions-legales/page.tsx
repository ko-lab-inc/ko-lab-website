import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound, redirect } from 'next/navigation'

import { ListeFaq, TableauComparatif } from '@/components/sections/BlocsGeo'
import { DocumentLegal } from '@/components/sections/DocumentLegal'
import { JsonLd } from '@/components/ui/JsonLd'
import { Reveal } from '@/components/ui/Reveal'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { contenuGeo, ROUTE_SERVICE, SERVICES_GEO } from '@/lib/geo/contenu'
import { jsonLdFaq } from '@/lib/geo/json-ld'
import { contenuMentionsLegales } from '@/lib/geo/pages'
import { lireReglages } from '@/lib/reglages'
import { ROUTES } from '@/lib/routes'

import type { Metadata, Viewport } from 'next'

/** THÈME SOMBRE — même méthode que les autres pages légales. */
import '@/styles/theme-sombre.css'

/**
 * Mentions légales — corrections GEO du 14 novembre 2026 (proposition 2).
 *
 * La page répondait 404. Elle reprend le gabarit des deux autres pages
 * légales (DocumentLegal), puis ajoute ce que la proposition demande : un
 * tableau « quel document consulter », une courte FAQ et les liens vers les
 * services.
 *
 * NEQ ajouté le 19 novembre 2026 (constante `NEQ` de lib/geo/pages.ts,
 * vérifié au Registre des entreprises). L'adresse d'affaires, elle, vient
 * des réglages (migration 0052).
 *
 * FRANÇAIS SEULEMENT : /en/mentions-legales renvoie vers la version
 * française, comme /en/faq.
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

  const page = contenuMentionsLegales(await lireReglages())
  return {
    title: page.metaTitre,
    description: page.metaDescription,
    alternates: { canonical: `/fr${ROUTES.mentionsLegales}` },
  }
}

const LIEN =
  'inline-flex min-h-[44px] items-center text-sm text-ko-ink underline decoration-ko-line underline-offset-4 transition-colors duration-200 hover:decoration-ko-blue'

export default async function MentionsLegalesPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const reglages = await lireReglages()
  const geo = contenuGeo(locale, reglages)
  if (!geo) redirect(`/fr${ROUTES.mentionsLegales}`)

  const page = contenuMentionsLegales(reglages)
  const tFooter = await getTranslations('Footer')
  const tNav = await getTranslations('Nav')

  return (
    <div data-theme-sombre>
      <JsonLd donnees={jsonLdFaq(page.faq)} />

      <DocumentLegal
        eyebrow={page.eyebrow}
        titre={page.titre}
        intro={page.intro}
        miseAJour={page.miseAJour}
        sections={page.sections}
      />

      <section className="border-t border-ko-line bg-ko-cream py-16 lg:py-24">
        <div className="mx-auto max-w-container space-y-16 px-6 lg:space-y-20 lg:px-16">
          <Reveal>
            <p className="label-mono">{page.documentsLabel}</p>
            <h2 className="ko-h3 mt-5 text-ko-ink">{page.documents.titre}</h2>
            <div className="mt-8">
              <TableauComparatif comparatif={page.documents} />
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-1">
              <li>
                <Link href={ROUTES.politiqueConfidentialite} className={LIEN}>
                  {tFooter('confidentialite')}
                </Link>
              </li>
              <li>
                <Link href={ROUTES.conditionsUtilisation} className={LIEN}>
                  {tFooter('conditionsUtilisation')}
                </Link>
              </li>
            </ul>
          </Reveal>

          <Reveal>
            <p className="label-mono">{page.faqLabel}</p>
            <h2 className="ko-h3 mt-5 text-ko-ink">{page.faqTitre}</h2>
            <div className="mt-8">
              <ListeFaq questions={page.faq} />
            </div>
          </Reveal>

          <Reveal>
            <p className="label-mono">{page.servicesLabel}</p>
            <h2 className="ko-h3 mt-5 text-ko-ink">{page.servicesTitre}</h2>
            <ul className="mt-6 grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
              {SERVICES_GEO.map((cle) => (
                <li key={cle}>
                  <Link href={ROUTE_SERVICE[cle]} className={LIEN}>
                    {geo.services[cle].nom}
                  </Link>
                </li>
              ))}
              <li>
                <Link href={ROUTES.faq} className={LIEN}>
                  {geo.libelles.faqTitre}
                </Link>
              </li>
              <li>
                <Link href={ROUTES.contact} className={LIEN}>
                  {tNav('contact')}
                </Link>
              </li>
            </ul>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
