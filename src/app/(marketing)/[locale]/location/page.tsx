import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { buttonVariants } from '@/components/ui/Button'
import { Reveal } from '@/components/ui/Reveal'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { ROUTES } from '@/lib/routes'

import type { Metadata } from 'next'

type Props = { params: Promise<{ locale: string }> }

export const revalidate = 3600

/**
 * ⚠️ PROVISOIRE — l'URL Rentman n'est pas encore connue.
 *
 * `#` volontairement, et non une URL inventée : un lien mort vers un domaine
 * plausible serait plus difficile à repérer qu'une ancre vide. Le bouton reste
 * visible pour valider la mise en page.
 */
const URL_RENTMAN = '#'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations({ locale, namespace: 'Metadata.location' })

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}${ROUTES.location}`,
      languages: {
        fr: `/fr${ROUTES.location}`,
        en: `/en${ROUTES.location}`,
        'x-default': `/fr${ROUTES.location}`,
      },
    },
  }
}

export default async function LocationPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations('Location')

  const categories = [
    { cle: 'remorques', titre: t('cat_remorques_titre'), texte: t('cat_remorques_texte') },
    { cle: 'nacelles', titre: t('cat_nacelles_titre'), texte: t('cat_nacelles_texte') },
    { cle: 'outils', titre: t('cat_outils_titre'), texte: t('cat_outils_texte') },
    { cle: 'mobilier', titre: t('cat_mobilier_titre'), texte: t('cat_mobilier_texte') },
  ]

  return (
    <>
      {/* En-tête sobre, sans photo — le document de cadrage décrit une « page
          de transition élégante » vers Rentman, pas une vitrine. */}
      <section className="border-b border-ko-line bg-ko-cream pb-14 pt-28 lg:pb-20 lg:pt-40">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          <span aria-hidden="true" className="block h-px w-8 bg-ko-blue" />
          <h1 className="ko-display mt-6 max-w-[16ch] text-ko-ink">{t('title')}</h1>
          <p className="mt-7 max-w-[54ch] text-base leading-relaxed text-ko-muted lg:text-lg">
            {t('intro')}
          </p>
        </div>
      </section>

      {/* ---------------------------- Vers Rentman ---------------------------- */}
      <section className="bg-ko-white py-16 lg:py-24">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          <Reveal>
            <div className="border border-ko-line bg-ko-cream p-8 lg:p-12">
              <h2 className="ko-h2 max-w-[22ch] text-ko-ink">{t('inventaire_titre')}</h2>

              <p className="mt-6 max-w-[54ch] text-base leading-relaxed text-ko-muted">
                {t('inventaire_texte')}
              </p>

              <div className="mt-9 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-8">
                {/* Lien externe : <a> et non le <Link> localisé, qui préfixerait
                    l'URL d'une locale. rel="noopener" est obligatoire avec
                    target="_blank" — sans lui, la page ouverte accède à
                    window.opener (skill 09). */}
                <a
                  href={URL_RENTMAN}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: 'primary' })}
                >
                  {t('cta_rentman')}
                  <span aria-hidden="true">→</span>
                </a>

                <Link
                  href={`${ROUTES.contact}?type=location`}
                  className={buttonVariants({ variant: 'text' })}
                >
                  {t('cta_demande')}
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ----------------------------- Catégories ----------------------------- */}
      <section className="bg-ko-cream py-16 lg:py-24">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          <Reveal>
            <p className="label-mono">{t('categories_label')}</p>
          </Reveal>

          {/* Effet « joint » du skill 08 : le fond de la grille dessine les
              filets, aucune bordure n'est tracée sur les cellules. */}
          <div className="mt-10 grid grid-cols-1 gap-px bg-ko-line sm:grid-cols-2 lg:grid-cols-4">
            {categories.map(({ cle, titre, texte }, i) => (
              <Reveal key={cle} className="bg-ko-cream">
                <div className="h-full px-7 py-9">
                  <span className="label-mono">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="mt-5 font-serif text-[22px] leading-tight text-ko-ink">{titre}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ko-muted">{texte}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <p className="mt-12 max-w-[46ch] border-t border-ko-line pt-8 text-sm leading-relaxed text-ko-muted">
              {t('note')}
            </p>
          </Reveal>
        </div>
      </section>
    </>
  )
}
