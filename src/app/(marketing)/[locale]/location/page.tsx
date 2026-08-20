import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { buttonVariants } from '@/components/ui/Button'
import { GaleriePhotos } from '@/components/ui/GaleriePhotos'
import { Reveal } from '@/components/ui/Reveal'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { LIEN_RENTMAN } from '@/lib/constantes'
import { IMAGES } from '@/lib/images'
import { alternatesLangues, ROUTES } from '@/lib/routes'

import type { Metadata } from 'next'

type Props = { params: Promise<{ locale: string }> }

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations({ locale, namespace: 'Metadata.location' })

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}${ROUTES.location}`,
      languages: alternatesLangues(ROUTES.location),
    },
  }
}

export default async function LocationPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations('Location')
  const tCommun = await getTranslations('Commun')

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
                {/* Tant que LIEN_RENTMAN reste le repli '#' (lib/constantes.ts,
                    URL jamais transmise par Christian), le bouton primaire
                    pointe vers le formulaire de contact déjà existant
                    (`?type=location`, celui que le lien secondaire ci-dessous
                    utilise aussi normalement) plutôt que de rester masqué —
                    « un bouton visible qui convertit vaut mieux qu'un bouton
                    absent ». Le libellé change en conséquence : « Voir
                    l'inventaire » mentirait sur ce que ce lien fait vraiment.
                    Le lien secondaire redondant (même destination) disparaît
                    dans cet état ; les deux boutons d'origine reviennent dès
                    que Christian communique l'URL réelle — une seule ligne à
                    changer dans constantes.ts. */}
                {LIEN_RENTMAN !== '#' ? (
                  <>
                    {/* Lien externe : <a> et non le <Link> localisé, qui
                        préfixerait l'URL d'une locale. rel="noopener" est
                        obligatoire avec target="_blank" — sans lui, la page
                        ouverte accède à window.opener (skill 09). */}
                    <a
                      href={LIEN_RENTMAN}
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
                  </>
                ) : (
                  <Link
                    href={`${ROUTES.contact}?type=location`}
                    className={buttonVariants({ variant: 'primary' })}
                  >
                    {t('cta_demande_temporaire')}
                    <span aria-hidden="true">→</span>
                  </Link>
                )}
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

      {/* ------------------------------ Galerie ------------------------------ */}
      {/* Ajoutée le 20 août 2026 — la page restait délibérément sans photo
          (voir la note d'en-tête), mais Christian a demandé d'y montrer du
          matériel réel une fois que les lots du 20 août l'ont permis :
          aménagement de salle + les deux photos DEVFEST déjà utilisées sur
          l'accueil (Phase 5, section Location). */}
      <section className="bg-ko-white py-16 lg:py-24">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          <Reveal>
            <p className="label-mono">{tCommun('en_photos')}</p>
            <div className="mt-6">
              <GaleriePhotos
                titre={t('title')}
                images={[
                  { src: IMAGES.amenagementSalle2023, alt: 'Salle aménagée avec mobilier loué' },
                  { src: IMAGES.locationStructures, alt: 'Structures louées installées sur site' },
                  { src: IMAGES.locationAmbiance, alt: "Ambiance d'un site aménagé avec du mobilier loué" },
                ]}
              />
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
