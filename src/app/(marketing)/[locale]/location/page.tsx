import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { BarreDemandeLocation } from '@/components/sections/BarreDemandeLocation'
import { GrilleProduitsLocation } from '@/components/sections/GrilleProduitsLocation'
import { buttonVariants } from '@/components/ui/Button'
import { GaleriePhotos } from '@/components/ui/GaleriePhotos'
import { Reveal } from '@/components/ui/Reveal'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { lireGaleriePage } from '@/lib/galeries'
import { grouperParCategorie, lireProduitsLocation, pourCarte } from '@/lib/location-produits'
import { lireReglages } from '@/lib/reglages'
import { CATEGORIES_LOCATION } from '@/lib/rentman/categories'
import { alternatesLangues, ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils/cn'

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
  // déploiement. `lireReglages` est déjà appelé plus bas pour le téléphone —
  // une seule lecture, mise en cache.
  const reglagesSite = await lireReglages()
  const lienRentman = reglagesSite.lienRentman.trim()

  // Produits de location synchronisés depuis Rentman (migration 0048). Vide
  // tant que rien n'est publié : la page retombe alors sur le bloc d'invitation
  // plus bas, comme avant.
  const produits = await lireProduitsLocation()
  // Allégé en `ProduitCarte` : la grille est un composant client, tout ce
  // qu'on lui passe part dans le HTML (voir sa note d'en-tête).
  const groupes = grouperParCategorie(produits, CATEGORIES_LOCATION).map((g) => ({
    categorie: g.categorie,
    produits: g.produits.map(pourCarte),
  }))

  // ⚠️ Passé de 4 à 7 catégories le 3 septembre 2026 (point 18 du prompt de
  // corrections finales) : les 4 anciennes (Remorques/Nacelles/Outils/
  // Mobilier événementiel) donnaient l'impression que l'offre de location
  // se limitait à de l'équipement de chantier — contredisait le texte
  // d'intro de cette même page (« Mobilier, scène, clôtures, éclairage,
  // décor, équipements terrain et infrastructures »), déjà à jour depuis
  // une passe précédente mais jamais suivi ici. Remorques et nacelles sont
  // repliées dans « Équipements terrain », comme le brief le permet
  // explicitement plutôt que de les faire disparaître.
  const categories = [
    { cle: 'mobilier', titre: t('cat_mobilier_titre'), texte: t('cat_mobilier_texte') },
    { cle: 'scenes', titre: t('cat_scenes_titre'), texte: t('cat_scenes_texte') },
    { cle: 'clotures', titre: t('cat_clotures_titre'), texte: t('cat_clotures_texte') },
    { cle: 'eclairage', titre: t('cat_eclairage_titre'), texte: t('cat_eclairage_texte') },
    { cle: 'decor', titre: t('cat_decor_titre'), texte: t('cat_decor_texte') },
    { cle: 'equipements_terrain', titre: t('cat_equipements_terrain_titre'), texte: t('cat_equipements_terrain_texte') },
    { cle: 'infrastructures', titre: t('cat_infrastructures_titre'), texte: t('cat_infrastructures_texte') },
  ]

  return (
    <div data-theme-sombre>
      {/* En-tête sobre, sans photo — le document de cadrage décrit une « page
          de transition élégante » vers Rentman, pas une vitrine. */}
      <section className="border-b border-ko-line bg-ko-cream pb-14 pt-28 lg:pb-20 lg:pt-40">
        <div className="mx-auto max-w-container px-6 lg:px-16">
          <span aria-hidden="true" className="block h-px w-8 bg-ko-blue" />
          {/* Libelle ajoute le 1er octobre 2026 (§3) : le H1 porte desormais
              une promesse (« Tout ce qu'il faut pour equiper le terrain. »)
              et non plus le nom de la rubrique — c'est ce libelle qui le
              nomme, comme sur les pages de capacites. */}
          <p className="label-mono mt-6">{t('label')}</p>
          <h1 className="ko-display mt-5 max-w-[22ch] text-ko-ink">{t('title')}</h1>
          <p className="mt-7 max-w-[54ch] text-base leading-relaxed text-ko-muted lg:text-lg">
            {t('intro')}
          </p>
        </div>
      </section>

      {/* ------------------------- Produits de location ------------------------
          Grille alimentée par la synchronisation Rentman (migration 0048).
          N'apparaît que s'il y a des produits publiés — sinon la page garde
          son seul bloc d'invitation, comme avant l'intégration. */}
      {produits.length > 0 && (
        <section className="bg-ko-white py-16 lg:py-24">
          <div className="mx-auto max-w-container px-6 lg:px-16">
            <Reveal>
              <p className="label-mono">{t('produits_titre')}</p>
              <p className="mt-5 max-w-[54ch] text-base leading-relaxed text-ko-muted">
                {t('produits_intro')}
              </p>
            </Reveal>

            <div className="mt-12">
              <GrilleProduitsLocation
                groupes={groupes}
                locale={locale}
                libelles={{
                  categories: Object.fromEntries(categories.map((c) => [c.cle, c.titre])),
                  prixSurDemande: t('prix_sur_demande'),
                  filtreTout: t('filtre_tout'),
                  filtreLabel: t('filtre_label'),
                }}
              />
            </div>
          </div>
        </section>
      )}

      {/* ---------------------------- Vers Rentman ---------------------------- */}
      <section className="bg-ko-white py-16 lg:py-24">
        <div className="mx-auto max-w-container px-6 lg:px-16">
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
                {lienRentman !== '' ? (
                  <>
                    {/* Lien externe : <a> et non le <Link> localisé, qui
                        préfixerait l'URL d'une locale. rel="noopener" est
                        obligatoire avec target="_blank" — sans lui, la page
                        ouverte accède à window.opener (skill 09). */}
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

      {/* ----------------------------- Catégories ----------------------------- */}
      <section className="bg-ko-cream py-16 lg:py-24">
        <div className="mx-auto max-w-container px-6 lg:px-16">
          <Reveal>
            <p className="label-mono">{t('categories_label')}</p>
          </Reveal>

          {/* Effet « joint » du skill 08 : le fond de la grille dessine les
              filets, aucune bordure n'est tracée sur les cellules.

              ⚠️ Corollaire : une cellule MANQUANTE laisse voir ce fond, donc
              un rectangle gris. Avec 7 catégories dans une grille de 2 ou 4
              colonnes, la dernière rangée en laissait toujours une — un bloc
              vide que personne n'avait demandé (signalé le 1er octobre 2026).
              La dernière carte occupe donc deux colonnes et referme la
              rangée. Vaut tant que le nombre de catégories est impair ; si
              une 8ᵉ apparaît, retirer ce `col-span` (la grille se referme
              toute seule). */}
          <div className="mt-10 grid grid-cols-1 gap-px bg-ko-line sm:grid-cols-2 lg:grid-cols-4">
            {categories.map(({ cle, titre, texte }, i) => (
              <Reveal
                key={cle}
                className={cn(
                  'bg-ko-cream',
                  categories.length % 2 === 1 && i === categories.length - 1 && 'sm:col-span-2',
                )}
              >
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
      {/* Branchée sur galeries_photos depuis l'étape 3/3 (migration 0043) —
          la page restait délibérément sans photo avant le 20 août 2026 (voir
          la note d'en-tête), Christian a depuis demandé d'y montrer du
          matériel réel. */}
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
