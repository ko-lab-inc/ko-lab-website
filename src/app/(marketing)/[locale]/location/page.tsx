import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Image from 'next/image'
import { notFound } from 'next/navigation'

import { BarreDemandeLocation } from '@/components/sections/BarreDemandeLocation'
import { buttonVariants } from '@/components/ui/Button'
import { GaleriePhotos } from '@/components/ui/GaleriePhotos'
import { PhotoPlaceholder } from '@/components/ui/PhotoPlaceholder'
import { Reveal } from '@/components/ui/Reveal'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { lireGaleriePage } from '@/lib/galeries'
import { apercuCategories, lireProduitsLocation } from '@/lib/location-produits'
import { lireReglages } from '@/lib/reglages'
import { CATEGORIES_LOCATION } from '@/lib/rentman/categories'
import { alternatesLangues, routeCategorieLocation, ROUTES } from '@/lib/routes'

import type { Metadata, Viewport } from 'next'

/**
 * THÈME SOMBRE — migration page par page (méthode de 73255f2, accueil).
 * Importé ICI et non dans le layout : App Router ne charge le CSS d'une page
 * que sur sa route, et ses règles sont toutes préfixées par
 * `body:has([data-theme-sombre])`, le marqueur rendu plus bas.
 */
import '@/styles/theme-sombre.css'

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

/** Barre du navigateur mobile assortie au fond sombre — voir theme-sombre.css. */
export const viewport: Viewport = {
  themeColor: '#111210',
}

export default async function LocationPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations('Location')
  const tCommun = await getTranslations('Commun')
  const images = await lireGaleriePage('location', locale)
  // L'URL vient des réglages depuis le 2 octobre 2026 (migration 0051) : elle
  // était figée dans le code, donc la recevoir de Rentman imposait un
  // déploiement. `lireReglages` est déjà appelé pour le téléphone — une seule
  // lecture, mise en cache.
  const reglagesSite = await lireReglages()
  const lienRentman = reglagesSite.lienRentman.trim()

  // Parcours à deux niveaux (9 octobre 2026) : /location montre les CATÉGORIES
  // en photos, un clic mène à /location/categorie/<cle> voir les équipements.
  // L'image de chaque tuile est empruntée à un produit de la catégorie (voir
  // `apercuCategories`). Vide tant que rien n'est publié : la page retombe sur
  // son seul bloc d'invitation, comme avant l'intégration Rentman.
  const apercus = apercuCategories(await lireProduitsLocation(), CATEGORIES_LOCATION)

  // Titre traduit d'une catégorie. Le cast vise le typage strict des clés de
  // messages (global.d.ts) ; `cle` est toujours une CATEGORIES_LOCATION.
  const titreCategorie = (cle: string) => t(`cat_${cle}_titre` as 'cat_mobilier_titre')

  return (
    <div data-theme-sombre>
      {/* En-tête sobre, sans photo — le document de cadrage décrit une « page
          de transition élégante » vers Rentman, pas une vitrine. */}
      <section className="border-b border-ko-line bg-ko-cream pb-14 pt-28 lg:pb-20 lg:pt-40">
        <div className="mx-auto max-w-container px-6 lg:px-16">
          <span aria-hidden="true" className="block h-px w-8 bg-ko-blue" />
          {/* Libelle ajoute le 1er octobre 2026 (§3) : le H1 porte une promesse
              (« Tout ce qu'il faut pour equiper le terrain. ») et non plus le
              nom de la rubrique — c'est ce libelle qui le nomme, comme sur les
              pages de capacites. */}
          <p className="label-mono mt-6">{t('label')}</p>
          <h1 className="ko-display mt-5 max-w-[22ch] text-ko-ink">{t('title')}</h1>
          <p className="mt-7 max-w-[54ch] text-base leading-relaxed text-ko-muted lg:text-lg">
            {t('intro')}
          </p>
        </div>
      </section>

      {/* ----------------------- Catégories en photos -----------------------
          Niveau 1 du parcours. N'apparaît que s'il y a des produits publiés
          (sinon la page garde son seul bloc d'invitation, comme avant). Chaque
          tuile mène à la page de sa catégorie. Les catégories vides sont déjà
          écartées par `apercuCategories` : jamais de tuile vers une impasse. */}
      {apercus.length > 0 && (
        <section className="bg-ko-white py-16 lg:py-24">
          <div className="mx-auto max-w-container px-6 lg:px-16">
            <Reveal>
              <p className="label-mono">{t('categories_label')}</p>
              <p className="mt-5 max-w-[54ch] text-base leading-relaxed text-ko-muted">
                {t('categories_intro')}
              </p>

              {/* Avis photos — demandé par Chris le 8 octobre 2026. Un
                  photographe professionnel renouvelle l'inventaire ; en
                  attendant, certaines photos sont des prises de terrain. Filet
                  bleu à gauche plutôt qu'un bandeau criard. */}
              <p className="mt-5 max-w-[54ch] border-l-2 border-ko-blue pl-4 text-sm leading-relaxed text-ko-muted">
                {t('photos_avis')}
              </p>
            </Reveal>

            <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {apercus.map((a) => {
                const titre = titreCategorie(a.cle)
                const alt = (locale === 'en' ? a.image_alt_en : a.image_alt_fr) || titre
                return (
                  <Reveal key={a.cle} className="h-full">
                    {/* Le nom accessible du lien vient de l'aria-label (verbe
                        d'action) ; le titre visible reste un <h2> pour le plan
                        du document. */}
                    <Link
                      href={routeCategorieLocation(a.cle)}
                      aria-label={t('voir_categorie_aria', { categorie: titre })}
                      className="group flex h-full flex-col border border-ko-line bg-ko-white"
                    >
                      {/* `object-cover` : la photo REMPLIT le cadre 4/3, toutes
                          les tuiles ont donc exactement la même taille — demande
                          du client le 9 octobre 2026 (« remplir la cage, même
                          taille, ce sera beau »). `cover` recadre le débordement
                          sans déformer, contrairement aux fiches produit qui, elles,
                          gardent `object-contain` pour montrer l'article en entier.
                          C'est une image de couverture décorative : un léger
                          recadrage est acceptable ici. */}
                      <div className="relative aspect-[4/3] overflow-hidden bg-ko-cream">
                        {a.image_url ? (
                          <Image
                            src={a.image_url}
                            alt={alt}
                            fill
                            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <PhotoPlaceholder ratio="aspect-[4/3]" className="h-full w-full" />
                        )}
                      </div>

                      <div className="flex flex-1 items-baseline justify-between gap-4 p-5">
                        <h2 className="font-serif text-[22px] leading-tight text-ko-ink underline decoration-transparent underline-offset-4 transition-colors duration-200 group-hover:decoration-ko-blue">
                          {titre}
                        </h2>
                        <span className="shrink-0 font-mono text-sm text-ko-muted">
                          {t('cat_compte', { n: a.count })}
                        </span>
                      </div>
                    </Link>
                  </Reveal>
                )
              })}
            </div>

            <Reveal>
              <p className="mt-12 max-w-[46ch] border-t border-ko-line pt-8 text-sm leading-relaxed text-ko-muted">
                {t('note')}
              </p>
            </Reveal>
          </div>
        </section>
      )}

      {/* ---------------------------- Vers Rentman ---------------------------- */}
      <section className="bg-ko-cream py-16 lg:py-24">
        <div className="mx-auto max-w-container px-6 lg:px-16">
          <Reveal>
            <div className="border border-ko-line bg-ko-white p-8 lg:p-12">
              <h2 className="ko-h2 max-w-[22ch] text-ko-ink">{t('inventaire_titre')}</h2>

              <p className="mt-6 max-w-[54ch] text-base leading-relaxed text-ko-muted">
                {t('inventaire_texte')}
              </p>

              <div className="mt-9 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-8">
                {/* Tant que LIEN_RENTMAN reste le repli '#' (lib/constantes.ts,
                    URL jamais transmise par Christian), le bouton primaire
                    pointe vers le formulaire de contact (`?type=location`)
                    plutôt que de rester masqué. Les deux boutons d'origine
                    reviennent dès que Christian communique l'URL réelle — une
                    seule ligne à changer dans constantes.ts. */}
                {lienRentman !== '' ? (
                  <>
                    {/* Lien externe : <a> et non le <Link> localisé, qui
                        préfixerait l'URL d'une locale. rel="noopener"
                        obligatoire avec target="_blank" (skill 09). */}
                    <a
                      href={lienRentman}
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

      {/* ------------------------------ Galerie ------------------------------ */}
      {/* Branchée sur galeries_photos depuis l'étape 3/3 (migration 0043) —
          Christian a demandé d'y montrer du matériel réel. */}
      {images.length > 0 && (
        <section className="bg-ko-white py-16 lg:py-24">
          <div className="mx-auto max-w-container px-6 lg:px-16">
            <Reveal>
              <p className="label-mono">{tCommun('en_photos')}</p>
              <div className="mt-6">
                <GaleriePhotos titre={t('title')} images={images} />
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* Barre flottante « Voir ma demande » — n'apparaît que si la sélection
          n'est pas vide. Montée par le PanierLocationProvider de location/layout.tsx. */}
      <BarreDemandeLocation />
    </div>
  )
}
