import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { GaleriePhotos } from '@/components/ui/GaleriePhotos'
import { Reveal } from '@/components/ui/Reveal'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { lireRealisationsPubliees } from '@/lib/realisations'
import { alternatesLangues, ROUTES } from '@/lib/routes'

import type { Metadata, Viewport } from 'next'

/**
 * THÈME SOMBRE — migration page par page (méthode de 73255f2, accueil).
 * Importé ICI et non dans le layout : App Router ne charge le CSS d'une page
 * que sur sa route, et ses règles sont toutes préfixées par
 * `body:has([data-theme-sombre])`, le marqueur rendu plus bas.
 */
import '@/styles/theme-sombre.css'

type Props = { params: Promise<{ locale: string; slug: string }> }

export const revalidate = 3600

/**
 * Page d'UNE réalisation — révision du 20 septembre 2026, §14.1 et §19.
 *
 * N'existe QUE pour les réalisations marquées « fiche » dans l'admin
 * (migration 0047) : le §14 demande de « ne pas forcer chaque album à
 * devenir une réalisation », et le §19 de « créer des pages projets
 * indexables pour les réalisations majeures ». Un album de galerie n'a donc
 * pas de page : son slug renvoie 404, et il n'entre pas dans le sitemap.
 *
 * Aucun texte n'est inventé ici : le titre, la description et les tags
 * viennent de la base, donc de ce que KO-LAB a écrit dans l'admin.
 */
async function lireFiche(locale: 'fr' | 'en', slug: string) {
  const publiees = await lireRealisationsPubliees(locale)
  return publiees?.find((r) => r.slug === slug && r.fiche) ?? null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const fiche = await lireFiche(locale, slug)
  if (!fiche) {
    const t = await getTranslations({ locale, namespace: 'Metadata.introuvable' })
    return { title: t('title'), description: t('description') }
  }

  const chemin = `${ROUTES.realisations}/${slug}`
  const tMeta = await getTranslations({ locale, namespace: 'Metadata.realisations' })

  return {
    title: fiche.titre,
    // La description de la réalisation quand elle existe, sinon celle de la
    // page Réalisations — jamais une phrase inventée pour Google.
    description: fiche.description ?? tMeta('description'),
    alternates: {
      canonical: `/${locale}${chemin}`,
      languages: alternatesLangues(chemin),
    },
  }
}

/** Barre du navigateur mobile assortie au fond sombre — voir theme-sombre.css. */
export const viewport: Viewport = {
  themeColor: '#111210',
}

export default async function RealisationPage({ params }: Props) {
  const { locale, slug } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const fiche = await lireFiche(locale, slug)
  if (!fiche) notFound()

  const t = await getTranslations('Realisations')
  const tCommun = await getTranslations('Commun')

  return (
    <div data-theme-sombre>
      <article>
        <section className="border-b border-ko-line bg-ko-cream pb-10 pt-20 lg:pb-20 lg:pt-40">
          <div className="mx-auto max-w-container px-6 lg:px-16">
            <Reveal>
              <Link href={ROUTES.realisations} className="label-mono text-ko-muted hover:underline">
                ← {t('projet_retour')}
              </Link>

              <h1 className="ko-display mt-6 max-w-[20ch] text-ko-ink">{fiche.titre}</h1>

              {/* §15 : une série qui n'est pas une réalisation KO-LAB le dit,
                  ici aussi — au-dessus du récit, pas en note de bas de page. */}
              {fiche.origine === 'experience_passee' && (
                <p className="mt-6 max-w-[60ch] border-l-2 border-ko-line pl-4 text-sm leading-relaxed text-ko-muted">
                  <span className="label-mono block text-ko-muted">{t('experience_passee')}</span>
                  <span className="mt-2 block">{t('experience_passee_note')}</span>
                </p>
              )}

              {fiche.description && (
                <p className="mt-7 max-w-[62ch] text-base leading-relaxed text-ko-muted lg:text-lg">
                  {fiche.description}
                </p>
              )}

              {fiche.tags.length > 0 && (
                <ul className="mt-8 flex flex-wrap gap-2">
                  {fiche.tags.map((tag) => (
                    <li
                      key={tag}
                      className="label-mono border border-ko-line px-2.5 py-1 text-ko-muted"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              )}
            </Reveal>
          </div>
        </section>

        <section className="bg-ko-white py-10 lg:py-24">
          <div className="mx-auto max-w-container px-6 lg:px-16">
            <Reveal>
              <p className="label-mono">{tCommun('en_photos')}</p>
              <div className="mt-6">
                <GaleriePhotos
                  images={fiche.images.map((im) => ({ src: im.url, alt: im.alt }))}
                  titre={fiche.titre}
                />
              </div>
            </Reveal>
          </div>
        </section>
      </article>
    </div>
  )
}
