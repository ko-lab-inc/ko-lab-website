import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Image from 'next/image'
import { notFound } from 'next/navigation'

import { BarreDemandeLocation } from '@/components/sections/BarreDemandeLocation'
import { BoutonAjouterLocation } from '@/components/sections/BoutonAjouterLocation'
import { PhotoPlaceholder } from '@/components/ui/PhotoPlaceholder'
import { buttonVariants } from '@/components/ui/Button'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { lireProduitLocation } from '@/lib/location-produits'
import { CATEGORIES_LOCATION } from '@/lib/rentman/categories'
import { alternatesLangues, routeProduitLocation, ROUTES } from '@/lib/routes'

import type { Metadata, Viewport } from 'next'

/**
 * THÈME SOMBRE — importé ICI, pas dans le layout : App Router ne charge le CSS
 * d'une page que sur sa route, et ses règles sont préfixées par
 * `body:has([data-theme-sombre])`.
 */
import '@/styles/theme-sombre.css'

type Props = { params: Promise<{ locale: string; slug: string }> }

export const revalidate = 3600

/**
 * Fiche d'UN article de location — étape 2 du parcours de la référence
 * (Black Tie / Booqable) : on clique un produit pour le voir en grand, puis on
 * l'ajoute à sa demande sans repartir du catalogue.
 *
 * Aucun texte n'est inventé : nom, description et prix viennent de
 * `articles_location`, donc de Rentman. Un article dépublié renvoie 404 (voir
 * lireProduitLocation) — il ne doit pas rester accessible par son URL.
 *
 * Pas de `generateStaticParams`, comme /realisations/[slug] : rendu à la
 * demande puis mis en cache 1 h. La route de revalidation
 * (/api/location/revalider) ne vise que le catalogue ; une fiche se rafraîchit
 * d'elle-même en moins d'une heure, ce qui suffit pour une description.
 */

/** Nom et texte alternatif dans la langue demandée, avec repli sur le français. */
function textes(
  produit: NonNullable<Awaited<ReturnType<typeof lireProduitLocation>>>,
  locale: string,
) {
  const nom = (locale === 'en' ? produit.nom_en : produit.nom_fr) || produit.nom_fr
  const description =
    (locale === 'en' ? produit.description_en : produit.description_fr) || produit.description_fr
  const alt = (locale === 'en' ? produit.image_alt_en : produit.image_alt_fr) || nom
  return { nom, description, alt }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const produit = await lireProduitLocation(slug)
  if (!produit) {
    const t = await getTranslations({ locale, namespace: 'Metadata.introuvable' })
    return { title: t('title'), description: t('description') }
  }

  const { nom, description } = textes(produit, locale)
  const chemin = routeProduitLocation(slug)
  const tMeta = await getTranslations({ locale, namespace: 'Metadata.location' })

  return {
    title: nom,
    // La description de l'article quand elle existe, sinon celle de la page
    // Location — jamais une phrase inventée pour Google.
    description: description ?? tMeta('description'),
    alternates: {
      canonical: `/${locale}${chemin}`,
      languages: alternatesLangues(chemin),
    },
    // La photo du produit comme image de partage. `openGraph` redéfini ici
    // REMPLACE celui du layout : Next ne fusionne pas les sous-clés, d'où la
    // reprise explicite de l'image (celle du produit, ou le repli du site).
    openGraph: {
      type: 'website',
      title: nom,
      description: description ?? tMeta('description'),
      images: [produit.image_url ?? '/images/og/og-defaut.jpg'],
    },
  }
}

/** Barre du navigateur mobile assortie au fond sombre — voir theme-sombre.css. */
export const viewport: Viewport = {
  themeColor: '#111210',
}

export default async function FicheProduitLocation({ params }: Props) {
  const { locale, slug } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const produit = await lireProduitLocation(slug)
  if (!produit) notFound()

  const t = await getTranslations('Location')
  const tDemande = await getTranslations('DemandeLocation')
  const { nom, description, alt } = textes(produit, locale)

  // Libellé de catégorie traduit : c'est lui qu'on affiche ET qu'on range dans
  // la demande, pour que l'équipe lise « Mobilier » et non « mobilier ».
  const cleCategorie = (CATEGORIES_LOCATION as readonly string[]).includes(produit.categorie)
    ? produit.categorie
    : null
  const categorie = cleCategorie
    ? t(`cat_${cleCategorie}_titre` as 'cat_mobilier_titre')
    : produit.categorie

  return (
    <div data-theme-sombre>
      <section className="bg-ko-white pb-20 pt-28 lg:pb-28 lg:pt-40">
        <div className="mx-auto max-w-container px-6 lg:px-16">
          {/* Retour au catalogue — avant le titre, à la place où on le cherche. */}
          <Link
            href={ROUTES.location}
            className="inline-flex min-h-[44px] items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ko-muted transition-colors duration-200 hover:text-ko-ink"
          >
            <span aria-hidden="true">←</span>
            {tDemande('retour_catalogue')}
          </Link>

          <div className="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-20">
            {/* ------------------------------ Photo ------------------------------ */}
            {/* `object-contain` sur un cadre 3/4, même règle que les vignettes
                du catalogue : les photos n'ont pas toutes le même rapport, et
                c'est ICI qu'un recadrage se verrait le plus — c'est la plus
                grande image du site. Toute la photo doit être visible, quitte
                à laisser une bande sur les formats minoritaires. */}
            <div className="relative aspect-[3/4] overflow-hidden border border-ko-line bg-ko-cream">
              {produit.image_url ? (
                <Image
                  src={produit.image_url}
                  alt={alt}
                  fill
                  // Une seule grande image : moitié de l'écran en lg, pleine
                  // largeur en dessous.
                  sizes="(min-width: 1024px) 45vw, 92vw"
                  // LCP de cette page : chargée sans attendre.
                  priority
                  className="object-contain"
                />
              ) : (
                <PhotoPlaceholder ratio="aspect-[3/4]" className="h-full w-full" />
              )}
            </div>

            {/* ------------------------------ Texte ------------------------------ */}
            <div className="lg:py-4">
              <p className="label-mono">{categorie}</p>

              <h1 className="ko-h1 mt-5 max-w-[18ch] text-ko-ink">{nom}</h1>

              <p className="mt-6 font-mono text-lg text-ko-ink">
                {produit.prix != null ? `${produit.prix} $` : t('prix_sur_demande')}
              </p>

              {description && (
                <p className="mt-8 max-w-[52ch] text-base leading-relaxed text-ko-muted">
                  {description}
                </p>
              )}

              <div className="mt-10 max-w-[340px]">
                <BoutonAjouterLocation
                  slug={produit.slug}
                  nom={nom}
                  categorie={categorie}
                  avecQuantite
                />
              </div>

              <p className="mt-6 max-w-[46ch] text-sm leading-relaxed text-ko-muted">
                {tDemande('fiche_note')}
              </p>

              <Link
                href={ROUTES.locationDemande}
                className={`mt-8 ${buttonVariants({ variant: 'text' })}`}
              >
                {tDemande('barre_voir')}
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Même barre flottante que le catalogue : après un ajout depuis la
          fiche, on doit pouvoir filer vers sa demande sans revenir en arrière. */}
      <BarreDemandeLocation />
    </div>
  )
}
