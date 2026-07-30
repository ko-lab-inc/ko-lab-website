import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { FormulaireContact } from '@/components/sections/FormulaireContact'
import { Reveal } from '@/components/ui/Reveal'
import { routing } from '@/i18n/routing'
import { lireReglages } from '@/lib/reglages'
import { ROUTES } from '@/lib/routes'

import type { Metadata } from 'next'

type Props = { params: Promise<{ locale: string }> }

/**
 * Page de contact.
 *
 * Pas de `revalidate` : le formulaire est client et l'enveloppe est statique,
 * mais `useSearchParams` (pour ?type=carriere) impose une frontière Suspense.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations({ locale, namespace: 'Metadata.contact' })

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}${ROUTES.contact}`,
    },
  }
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations('Contact')
  const tFooter = await getTranslations('Footer')
  const tNav = await getTranslations('Nav')

  // Coordonnées pilotées depuis les réglages (0011), pas depuis les fichiers
  // de traduction : elles changent sans déploiement.
  const reglages = await lireReglages()

  return (
    <>
      <section className="border-b border-ko-line bg-ko-cream pb-14 pt-28 lg:pb-20 lg:pt-40">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          <span aria-hidden="true" className="block h-px w-8 bg-ko-blue" />
          <h1 className="ko-display mt-6 max-w-[16ch] text-ko-ink">{t('title')}</h1>
          <p className="mt-7 max-w-[52ch] text-base leading-relaxed text-ko-muted lg:text-lg">
            {t('intro')}
          </p>
        </div>
      </section>

      <section className="bg-ko-white py-16 lg:py-24">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          <div className="grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-24">
            {/* --------------------------- Formulaire --------------------------- */}
            <Reveal>
              {/* Suspense obligatoire : useSearchParams bascule tout l'arbre
                  client en rendu dynamique s'il n'est pas isolé, ce qui
                  empêcherait la prégénération de cette page. */}
              <Suspense fallback={<div className="min-h-[560px]" />}>
                <FormulaireContact />
              </Suspense>
            </Reveal>

            {/* ------------------------------ Infos ------------------------------ */}
            <Reveal>
              {/* lg:sticky : la colonne d'infos reste à l'écran pendant qu'on
                  descend dans le formulaire, qui est nettement plus haut. */}
              <aside className="lg:sticky lg:top-28">
                <p className="label-mono">{tFooter('contact_titre')}</p>

                <address className="mt-6 space-y-5 not-italic">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-ko-muted">
                      {reglages.contactRegion}
                    </p>
                    <a
                      href={`mailto:${reglages.contactCourriel}`}
                      className="mt-2 inline-flex min-h-[44px] items-center border-b border-ko-line pb-0.5 font-serif text-[22px] text-ko-ink transition-colors duration-200 hover:border-ko-blue hover:text-ko-blue"
                    >
                      {reglages.contactCourriel}
                    </a>
                  </div>

                  {reglages.contactTelephone && (
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-ko-muted">
                        {t('form.telephone')}
                      </p>
                      <a
                        href={`tel:${reglages.contactTelephone.replace(/[^+\d]/g, '')}`}
                        className="mt-2 inline-flex min-h-[44px] items-center border-b border-ko-line pb-0.5 font-serif text-[22px] text-ko-ink transition-colors duration-200 hover:border-ko-blue hover:text-ko-blue"
                      >
                        {reglages.contactTelephone}
                      </a>
                    </div>
                  )}
                </address>

                <p className="mt-8 max-w-[34ch] border-t border-ko-line pt-8 text-sm leading-relaxed text-ko-muted">
                  {t('succes.texte')}
                </p>

                <p className="label-mono mt-10">{tNav('capacites')}</p>
                <p className="mt-3 max-w-[34ch] text-sm leading-relaxed text-ko-muted">
                  {tNav('cta')} — {tFooter('signature')}
                </p>
              </aside>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  )
}
