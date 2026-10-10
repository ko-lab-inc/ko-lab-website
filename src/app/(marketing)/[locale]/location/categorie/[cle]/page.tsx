import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { BarreDemandeLocation } from '@/components/sections/BarreDemandeLocation'
import { CarteProduitLocation } from '@/components/sections/CarteProduitLocation'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { lireProduitsLocation, pourCarte } from '@/lib/location-produits'
import { CATEGORIES_LOCATION } from '@/lib/rentman/categories'
import { alternatesLangues, routeCategorieLocation, ROUTES } from '@/lib/routes'

import type { Metadata, Viewport } from 'next'

/**
 * THÈME SOMBRE — importé ICI, pas dans le layout : App Router ne charge le CSS
 * d'une page que sur sa route, et ses règles sont préfixées par
 * `body:has([data-theme-sombre])`.
 */
import '@/styles/theme-sombre.css'

type Props = { params: Promise<{ locale: string; cle: string }> }

export const revalidate = 3600

/**
 * Page d'UNE catégorie de location — niveau 2 du parcours ajouté le
 * 9 octobre 2026 : /location montre les catégories en photos, un clic mène ici
 * voir les équipements de la catégorie, puis « Ajouter à ma demande ».
 *
 * ---------------------------------------------------------------------------
 * SÉCURITÉ — lecture publique uniquement, aucune écriture
 *
 * `cle` vient de l'URL : elle est validée contre la LISTE BLANCHE
 * `CATEGORIES_LOCATION` avant tout usage (404 sinon). Aucune valeur libre de
 * l'URL n'atteint une requête. Les produits sont lus par `lireProduitsLocation`
 * (client anon, RLS `using (publie)`, `.eq('publie', true)` en défense
 * explicite) : un article dépublié n'apparaît jamais. Pas de Server Action,
 * pas d'endpoint, pas de paramètre de requête injectable.
 */

/** Pré-rend les sept catégories au build (ISR 1 h ensuite). */
export function generateStaticParams() {
  return CATEGORIES_LOCATION.map((cle) => ({ cle }))
}

/** `true` si `cle` est bien une catégorie connue. */
function categorieConnue(cle: string): cle is (typeof CATEGORIES_LOCATION)[number] {
  return (CATEGORIES_LOCATION as readonly string[]).includes(cle)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, cle } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  if (!categorieConnue(cle)) notFound()

  const t = await getTranslations({ locale, namespace: 'Location' })
  const chemin = routeCategorieLocation(cle)

  return {
    title: t(`cat_${cle}_titre` as 'cat_mobilier_titre'),
    // La phrase descriptive déjà écrite pour cette catégorie — jamais une
    // phrase inventée pour Google.
    description: t(`cat_${cle}_texte` as 'cat_mobilier_texte'),
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

export default async function CategorieLocationPage({ params }: Props) {
  const { locale, cle } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  if (!categorieConnue(cle)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations('Location')

  const titre = t(`cat_${cle}_titre` as 'cat_mobilier_titre')
  const texte = t(`cat_${cle}_texte` as 'cat_mobilier_texte')

  // Lecture publique unique, filtrée sur la catégorie validée. `pourCarte`
  // n'envoie au composant que ce qu'une vignette affiche (voir sa note).
  const produits = (await lireProduitsLocation())
    .filter((p) => p.categorie === cle)
    .map(pourCarte)

  return (
    <div data-theme-sombre>
      {/* -------------------------------- En-tête ------------------------------- */}
      <section className="border-b border-ko-line bg-ko-cream pb-12 pt-28 lg:pb-16 lg:pt-40">
        <div className="mx-auto max-w-container px-6 lg:px-16">
          {/* Retour aux catégories — avant le titre, là où on le cherche. */}
          <Link
            href={ROUTES.location}
            className="inline-flex min-h-[44px] items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ko-muted transition-colors duration-200 hover:text-ko-ink"
          >
            <span aria-hidden="true">←</span>
            {t('retour_categories')}
          </Link>

          <span aria-hidden="true" className="mt-6 block h-px w-8 bg-ko-blue" />
          <p className="label-mono mt-6">{t('categories_label')}</p>
          <h1 className="ko-display mt-5 max-w-[20ch] text-ko-ink">{titre}</h1>
          <p className="mt-6 max-w-[54ch] text-base leading-relaxed text-ko-muted lg:text-lg">
            {texte}
          </p>
          <p className="mt-5 font-mono text-sm text-ko-muted">{t('cat_compte', { n: produits.length })}</p>
        </div>
      </section>

      {/* ------------------------------- Produits ------------------------------- */}
      <section className="bg-ko-white py-16 lg:py-24">
        <div className="mx-auto max-w-container px-6 lg:px-16">
          {produits.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {produits.map((produit) => (
                <CarteProduitLocation
                  key={produit.id}
                  produit={produit}
                  locale={locale}
                  prixSurDemande={t('prix_sur_demande')}
                  libelleCategorie={titre}
                />
              ))}
            </div>
          ) : (
            // Catégorie connue mais sans produit publié : on ne tombe pas en
            // 404 (la clé existe), on invite à écrire. /location masque déjà
            // ces catégories, cet état n'est donc atteint que par URL directe.
            <p className="max-w-[46ch] border-l-2 border-ko-blue pl-4 text-base leading-relaxed text-ko-muted">
              {t('cat_vide')}
            </p>
          )}
        </div>
      </section>

      <BarreDemandeLocation />
    </div>
  )
}
