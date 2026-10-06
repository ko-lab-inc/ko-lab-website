import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { DemandeLocation } from '@/components/sections/DemandeLocation'
import { Reveal } from '@/components/ui/Reveal'
import { routing } from '@/i18n/routing'
import { lireReglages, messageAbsence } from '@/lib/reglages'
import { ROUTES } from '@/lib/routes'

import type { Metadata, Viewport } from 'next'

/**
 * THÈME SOMBRE — importé ICI, pas dans le layout : App Router ne charge le CSS
 * d'une page que sur sa route, et ses règles sont préfixées par
 * `body:has([data-theme-sombre])`. Même mécanique que /location et /contact.
 */
import '@/styles/theme-sombre.css'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations({ locale, namespace: 'DemandeLocation' })

  return {
    title: t('titre'),
    // Récapitulatif d'une sélection personnelle : aucune raison d'être indexé.
    robots: { index: false, follow: false },
    alternates: { canonical: `/${locale}${ROUTES.locationDemande}` },
  }
}

export const viewport: Viewport = {
  themeColor: '#111210',
}

export default async function DemandeLocationPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations('DemandeLocation')

  // Délai + éventuel message d'absence (migration 0053) pour le panneau de
  // succès — résolus côté serveur, comme sur la page de contact.
  const reglages = await lireReglages()
  const absence = messageAbsence(reglages, locale)

  return (
    <div data-theme-sombre>
      <section className="border-b border-ko-line bg-ko-cream pb-14 pt-28 lg:pb-20 lg:pt-40">
        <div className="mx-auto max-w-container px-6 lg:px-16">
          <span aria-hidden="true" className="block h-px w-8 bg-ko-blue" />
          <p className="label-mono mt-6">{t('label')}</p>
          <h1 className="ko-display mt-5 max-w-[20ch] text-ko-ink">{t('titre')}</h1>
          <p className="mt-7 max-w-[54ch] text-base leading-relaxed text-ko-muted lg:text-lg">
            {t('intro')}
          </p>
        </div>
      </section>

      <section className="bg-ko-white py-16 lg:py-24">
        <div className="mx-auto max-w-container px-6 lg:px-16">
          <Reveal>
            <DemandeLocation delaiReponseHeures={reglages.delaiReponseHeures} absence={absence} />
          </Reveal>
        </div>
      </section>
    </div>
  )
}
