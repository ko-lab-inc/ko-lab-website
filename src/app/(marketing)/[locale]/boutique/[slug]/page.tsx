import { hasLocale } from 'next-intl'
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { BoutonAjouter } from '@/components/ui/BoutonAjouter'
import { buttonVariants } from '@/components/ui/Button'
import { GalerieProduit } from '@/components/ui/GalerieProduit'
import { Reveal } from '@/components/ui/Reveal'
import { Link } from '@/i18n/navigation'
import { routing, type AppLocale } from '@/i18n/routing'
import { PANIER_ACTIF } from '@/lib/config/features'
import { construireProduits, SLUGS_PRODUITS } from '@/lib/produits'
import { ROUTES, routeProduit } from '@/lib/routes'
import { cn } from '@/lib/utils/cn'

import type { Metadata } from 'next'

type Props = { params: Promise<{ locale: string; slug: string }> }

export const revalidate = 3600

/**
 * Même drapeau que boutique/page.tsx : les conteneurs restent invisibles
 * tant que l'entente commerciale n'est pas confirmée (skill 21). Une fiche
 * produit atteinte directement par URL doit être bloquée exactement comme
 * la carte l'est dans la grille — sinon le drapeau ne protège rien.
 */
const CONTENEURS_ACTIFS = process.env.NEXT_PUBLIC_SOLUTIONS_MODULAIRES === 'true'

async function chargerProduit(locale: AppLocale, slug: string) {
  const t = await getTranslations({ locale, namespace: 'Boutique' })
  const produit = construireProduits(t).find((p) => p.slug === slug)
  if (!produit) return null
  if (produit.categorie === 'conteneurs' && !CONTENEURS_ACTIFS) return null
  return { produit, t }
}

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => SLUGS_PRODUITS.map((slug) => ({ locale, slug })))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const trouve = await chargerProduit(locale, slug)
  if (!trouve) return {}
  const { produit } = trouve

  return {
    title: produit.nom,
    description: produit.texte,
    alternates: {
      canonical: `/${locale}${routeProduit(slug)}`,
      languages: {
        fr: `/fr${routeProduit(slug)}`,
        en: `/en${routeProduit(slug)}`,
        'x-default': `/fr${routeProduit(slug)}`,
      },
    },
  }
}

export default async function FicheProduitPage({ params }: Props) {
  const { locale, slug } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations('Boutique')
  const tCommun = await getTranslations('Commun')
  const format = await getFormatter({ locale })

  const produit = construireProduits(t).find((p) => p.slug === slug)
  if (!produit || (produit.categorie === 'conteneurs' && !CONTENEURS_ACTIFS)) notFound()

  // Même table que les filtres de la grille (boutique/page.tsx) — dupliquée
  // ici en 4 lignes plutôt qu'extraite : elle n'est lue qu'à ces deux
  // endroits, et les deux dépendent d'un traducteur différent à chaque appel.
  const nomCategorie =
    {
      impression: t('cat_impression'),
      laser: t('cat_laser'),
      conteneurs: t('cat_conteneurs'),
      equipements: t('cat_equipements'),
    }[produit.categorie] ?? produit.categorie

  const prixFormate =
    produit.prixIndicatif !== null
      ? format.number(produit.prixIndicatif, {
          style: 'currency',
          currency: 'CAD',
          maximumFractionDigits: 0,
        })
      : t('prix_sur_demande')

  return (
    <>
      {/* Espace pour la barre d'achat collante (mobile) : sans lui, le dernier
          bloc de contenu se retrouve masqué au premier rendu. */}
      <div className="pb-24 lg:pb-0">
        <section className="border-b border-ko-line bg-ko-cream py-6">
          <div className="mx-auto max-w-container px-6 lg:px-12">
            <Link
              href={ROUTES.boutique}
              className="inline-flex items-center gap-2 text-sm text-ko-muted transition-colors duration-200 hover:text-ko-blue"
            >
              <span aria-hidden="true">←</span>
              {t('retour_catalogue')}
            </Link>
          </div>
        </section>

        <section className="bg-ko-white py-14 lg:py-20">
          <div className="mx-auto max-w-container px-6 lg:px-12">
            <Reveal>
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
                {/* ------------------------------ Photo ------------------------------
                    Cadre + sélecteur de coloris. Le seul état de la fiche vit
                    dans ce composant client ; tout le reste (nom, texte, prix,
                    métadonnées) est rendu sur le serveur. Sans coloris — cas
                    des douze produits actuels — il se comporte exactement
                    comme le bloc image qu'il remplace. */}
                <GalerieProduit
                  src={produit.src}
                  cadrage={produit.cadrage}
                  couleurs={produit.couleurs}
                  labelColoris={t('coloris')}
                  labelPlaceholder={tCommun('photo_placeholder')}
                >
                  {produit.badgeRibbon && (
                    <span className="absolute left-0 top-4 z-10 flex items-center gap-1.5 bg-ko-blue py-1 pl-3 pr-4 font-mono text-[9px] uppercase tracking-[0.14em] text-ko-white [clip-path:polygon(0_0,100%_0,calc(100%-10px)_50%,100%_100%,0_100%)]">
                      {produit.badgeRibbonIcone && <produit.badgeRibbonIcone taille={12} />}
                      {produit.badgeRibbon}
                    </span>
                  )}
                  {produit.badgeSecondaire && (
                    <span className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-sm bg-ko-black px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-ko-white">
                      {produit.badgeSecondaireIcone && <produit.badgeSecondaireIcone taille={12} />}
                      {produit.badgeSecondaire}
                    </span>
                  )}
                </GalerieProduit>

                {/* ------------------------------ Infos ------------------------------ */}
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ko-blue">
                    {nomCategorie}
                  </p>

                  <h1 className="mt-4 font-serif text-[clamp(28px,4vw,44px)] font-light leading-[1.1] text-ko-ink">
                    {produit.nom}
                  </h1>

                  {/* Texte complet, non tronqué — contrairement à la carte du
                      catalogue (line-clamp-2), la fiche est l'endroit pour le
                      lire en entier. */}
                  <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-ko-muted">
                    {produit.texte}
                  </p>

                  {/*
                    Masqué sous lg : la barre d'achat collante (plus bas) porte
                    seule le prix et l'action sur mobile/tablette. Les deux
                    versions restant visibles en même temps se chevauchaient
                    sur une page courte, sans même avoir besoin de défiler —
                    capture à l'appui. Une seule surface active par taille
                    d'écran, jamais les deux ensemble.
                  */}
                  <div className="mt-8 hidden lg:block">
                    <p className="font-mono text-lg text-ko-ink">{prixFormate}</p>

                    <div className="mt-6">
                      {PANIER_ACTIF ? (
                        <BoutonAjouter slug={produit.slug} nom={produit.nom} categorie={nomCategorie} />
                      ) : (
                        <Link
                          href={`${ROUTES.contact}?type=boutique&produit=${produit.slug}`}
                          className={buttonVariants({ variant: 'primary' })}
                        >
                          {t('demander_prix')}
                          <span aria-hidden="true">→</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </div>

      {/*
        Barre d'achat collante — référence Bambu Store, mobile/tablette
        uniquement (lg:hidden) : au-delà, le bouton de la colonne d'infos est
        déjà visible sans défilement, une deuxième copie flottante serait
        redondante (skill 08 déconseille l'ornement qui n'ajoute rien).
      */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ko-line bg-ko-white/95 p-4 backdrop-blur-sm lg:hidden">
        <div className="mx-auto flex max-w-container items-center justify-between gap-4">
          <p className="font-mono text-sm text-ko-ink">{prixFormate}</p>
          {PANIER_ACTIF ? (
            <BoutonAjouter slug={produit.slug} nom={produit.nom} categorie={nomCategorie} />
          ) : (
            <Link
              href={`${ROUTES.contact}?type=boutique&produit=${produit.slug}`}
              className={cn('shrink-0', buttonVariants({ variant: 'primary', size: 'sm' }))}
            >
              {t('demander_prix')}
            </Link>
          )}
        </div>
      </div>
    </>
  )
}
