import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { buttonVariants } from '@/components/ui/Button'
import { GaleriePhotos } from '@/components/ui/GaleriePhotos'
import { PhotoPlaceholder } from '@/components/ui/PhotoPlaceholder'
import { Reveal } from '@/components/ui/Reveal'
import { routing } from '@/i18n/routing'
import { lireConcoursPublies } from '@/lib/concours'
import { alternatesLangues, ROUTES } from '@/lib/routes'

import type { Metadata } from 'next'

type Props = { params: Promise<{ locale: string }> }

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations({ locale, namespace: 'Metadata.concours' })

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}${ROUTES.concours}`,
      languages: alternatesLangues(ROUTES.concours),
    },
  }
}

/**
 * Concours — liste, pas de fiche individuelle (migration 0040, Phase 10).
 *
 * ---------------------------------------------------------------------------
 * UNE SEULE PAGE, PAS DE ROUTE PAR CONCOURS
 *
 * Décision explicite : tout s'affiche ici, dans l'ordre de `ordre`. Si le
 * nombre de concours actifs grandit au point de justifier une fiche dédiée
 * (URL individuelle, partage direct), ce sera un chantier séparé — la table
 * a déjà son `slug` prêt pour ça, mais rien ne le sert aujourd'hui.
 *
 * Masquage — même mécanique que /boutique (concoursActif, voir
 * concours/layout.tsx, Nav.tsx, Footer.tsx, sitemap.ts, robots.ts).
 * ---------------------------------------------------------------------------
 */
export default async function ConcoursPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations('Concours')
  const concours = await lireConcoursPublies(locale)

  function formaterDate(iso: string): string {
    try {
      return new Intl.DateTimeFormat(locale === 'en' ? 'en-CA' : 'fr-CA', { dateStyle: 'long' }).format(
        new Date(`${iso}T00:00:00`),
      )
    } catch {
      return iso
    }
  }

  function plageDates(debut: string | null, fin: string | null): string | null {
    if (debut && fin) return `${t('du')} ${formaterDate(debut)} ${t('au')} ${formaterDate(fin)}`
    if (debut) return formaterDate(debut)
    if (fin) return formaterDate(fin)
    return null
  }

  return (
    <>
      <section className="border-b border-ko-line bg-ko-cream pb-14 pt-28 lg:pb-20 lg:pt-40">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          <span aria-hidden="true" className="block h-px w-8 bg-ko-blue" />
          <h1 className="ko-display mt-6 max-w-[18ch] text-ko-ink">{t('titre_page')}</h1>
          <p className="mt-7 max-w-[56ch] text-base leading-relaxed text-ko-muted lg:text-lg">{t('intro')}</p>
        </div>
      </section>

      <section className="bg-ko-white py-16 lg:py-24">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          {concours.length === 0 ? (
            <Reveal>
              <div className="border border-ko-line bg-ko-cream p-8 lg:p-12">
                <p className="ko-h3 text-ko-ink">{t('vide_titre')}</p>
                <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-ko-muted">{t('vide_texte')}</p>
              </div>
            </Reveal>
          ) : (
            <ul className="space-y-16 lg:space-y-24">
              {concours.map((c) => {
                const dates = plageDates(c.dateDebut, c.dateFin)

                return (
                  <li key={c.id} className="border-b border-ko-line pb-16 last:border-b-0 lg:pb-24">
                    <Reveal>
                      <div className="max-w-[70ch]">
                        <h2 className="ko-h2 text-ko-ink">{c.titre}</h2>
                        {c.accroche && (
                          <p className="mt-3 text-lg leading-relaxed text-ko-muted">{c.accroche}</p>
                        )}
                        {dates && <p className="label-mono mt-4 text-ko-muted">{dates}</p>}
                      </div>

                      <div className="mt-8">
                        {c.photos.length > 0 ? (
                          <GaleriePhotos
                            images={c.photos.map((p) => ({ src: p.url, alt: p.alt }))}
                            titre={c.titre}
                          />
                        ) : (
                          <PhotoPlaceholder ratio="aspect-[16/9]" className="max-w-[520px]" label={c.titre} />
                        )}
                      </div>

                      <p className="mt-8 max-w-[70ch] whitespace-pre-line text-base leading-relaxed text-ko-ink">
                        {c.description}
                      </p>

                      {/* Bloc distinct, replié par défaut — un règlement est un
                          document légal qu'on consulte au besoin, pas un texte
                          qu'on lit en continu avec le reste de la page. */}
                      {c.reglement && (
                        <details className="mt-8 max-w-[70ch] border-t border-ko-line pt-6">
                          <summary className="label-mono cursor-pointer text-ko-muted">
                            {t('reglement_titre')}
                          </summary>
                          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ko-ink">
                            {c.reglement}
                          </p>
                        </details>
                      )}

                      {/* Aucun bouton si aucun lien — pas de rangée vide. */}
                      {c.liens.length > 0 && (
                        <div className="mt-8 flex flex-wrap gap-4">
                          {c.liens.map((lien) => (
                            <a
                              key={lien.id}
                              href={lien.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                            >
                              {lien.libelle}
                              <span aria-hidden="true">→</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </Reveal>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>
    </>
  )
}
