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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations({ locale, namespace: 'Metadata.boutique' })

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}${ROUTES.boutique}`,
      languages: {
        fr: `/fr${ROUTES.boutique}`,
        en: `/en${ROUTES.boutique}`,
        'x-default': `/fr${ROUTES.boutique}`,
      },
    },
  }
}

/**
 * Boutique — catalogue sur commande.
 *
 * Phase 1 du skill 21 : aucun panier, aucun paiement. Chaque produit mène au
 * formulaire de contact avec `?type=boutique` présélectionné.
 *
 * ⚠️ CONTENU PROVISOIRE — six produits en dur, deux marques. À l'arrivée de la
 * table `produits_boutique` (skill 03) :
 *
 *     const supabase = createStaticClient()   // JAMAIS createClient()
 *     const { data } = await supabase.from('produits_boutique')
 *       .select('*').eq('publie', true).order('ordre')
 *
 * `prix` reste `null` en base pour l'instant : le skill 03 prévoit
 * explicitement « null = sur demande », ce que la page affiche déjà.
 */
export default async function BoutiquePage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations('Boutique')

  const marques = [
    {
      nom: 'Bambu Lab',
      produits: [
        { cle: 'bambu_x1c', nom: t('produits.bambu_x1c_nom'), texte: t('produits.bambu_x1c_texte') },
        { cle: 'bambu_p1s', nom: t('produits.bambu_p1s_nom'), texte: t('produits.bambu_p1s_texte') },
        { cle: 'bambu_ams', nom: t('produits.bambu_ams_nom'), texte: t('produits.bambu_ams_texte') },
      ],
    },
    {
      nom: 'xTool',
      produits: [
        { cle: 'xtool_p2', nom: t('produits.xtool_p2_nom'), texte: t('produits.xtool_p2_texte') },
        { cle: 'xtool_s1', nom: t('produits.xtool_s1_nom'), texte: t('produits.xtool_s1_texte') },
        { cle: 'xtool_f1', nom: t('produits.xtool_f1_nom'), texte: t('produits.xtool_f1_texte') },
      ],
    },
  ]

  return (
    <>
      <section className="border-b border-ko-line bg-ko-cream pb-14 pt-28 lg:pb-20 lg:pt-40">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          <span aria-hidden="true" className="block h-px w-8 bg-ko-blue" />
          <h1 className="ko-display mt-6 max-w-[14ch] text-ko-ink">{t('title')}</h1>

          {/* Le positionnement du document de cadrage, mot pour mot. */}
          <p className="ko-h3 mt-7 max-w-[30ch] text-ko-ink">{t('positionnement')}</p>

          <p className="mt-6 max-w-[54ch] text-base leading-relaxed text-ko-muted">{t('intro')}</p>
        </div>
      </section>

      {/* ------------------------------ Catalogue ------------------------------ */}
      {marques.map((marque, iMarque) => (
        <section
          key={marque.nom}
          className={iMarque % 2 === 0 ? 'bg-ko-white py-16 lg:py-24' : 'bg-ko-cream py-16 lg:py-24'}
        >
          <div className="mx-auto max-w-container px-6 lg:px-12">
            <Reveal>
              <header className="flex items-baseline gap-4 border-b border-ko-line pb-6">
                <span className="label-mono">{t('filtre_marque')}</span>
                <h2 className="ko-h2 text-ko-ink">{marque.nom}</h2>
              </header>
            </Reveal>

            <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
              {marque.produits.map((produit) => (
                <Reveal key={produit.cle}>
                  {/* Bordure au bleu au survol — interaction `.offre` du
                      skill 20. Aucun soulèvement, aucune ombre. */}
                  <article className="flex h-full flex-col border border-ko-line bg-ko-white p-7 transition-colors duration-250 hover:border-ko-blue">
                    <h3 className="font-serif text-[20px] leading-tight text-ko-ink">
                      {produit.nom}
                    </h3>

                    <p className="mt-3 text-sm leading-relaxed text-ko-muted">{produit.texte}</p>

                    {/* mt-auto : les prix et boutons s'alignent sur une même
                        ligne quelle que soit la longueur des descriptions. */}
                    <p className="label-mono mt-auto pt-8">{t('prix_sur_demande')}</p>

                    <Link
                      href={`${ROUTES.contact}?type=boutique`}
                      className={`mt-4 ${buttonVariants({ variant: 'ghost', size: 'sm' })}`}
                    >
                      {t('demander_prix')}
                      <span aria-hidden="true">→</span>
                    </Link>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* ---------------------------- Services ---------------------------- */}
      <section className="bg-ko-black py-16 lg:py-24">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          <Reveal>
            <p className="label-mono label-mono-d">{t('services_titre')}</p>
            <p className="ko-h3 mt-5 max-w-[34ch] text-ko-white">{t('services_texte')}</p>

            <Link
              href={`${ROUTES.contact}?type=boutique`}
              className="mt-9 inline-flex min-h-[44px] items-center justify-center gap-2.5 rounded-sm border border-ko-frost/30 px-7 py-4 text-sm text-ko-white transition-colors duration-200 hover:border-ko-white hover:bg-ko-frost/10"
            >
              {t('demande.envoyer')}
              <span aria-hidden="true">→</span>
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  )
}
