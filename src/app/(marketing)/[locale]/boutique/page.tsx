import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { CatalogueBoutique } from '@/components/sections/CatalogueBoutique'
import { Reveal } from '@/components/ui/Reveal'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { construireProduits } from '@/lib/produits'
import { ROUTES } from '@/lib/routes'

import type { Metadata } from 'next'

type Props = { params: Promise<{ locale: string }> }

export const revalidate = 3600

/**
 * Les conteneurs relèvent des « Solutions modulaires », que le document de
 * cadrage classe explicitement en « préparées mais cachées » : rien ne doit
 * être publié avant la confirmation de l'entente commerciale (skill 21).
 *
 * La catégorie existe donc entièrement dans le code — traductions, produits,
 * filtre — mais reste invisible tant que la variable ne vaut pas exactement
 * 'true'. Comparaison stricte : une variable absente ou vide n'active rien.
 */
const CONTENEURS_ACTIFS = process.env.NEXT_PUBLIC_SOLUTIONS_MODULAIRES === 'true'

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

export default async function BoutiquePage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations('Boutique')
  const tCommun = await getTranslations('Commun')

  // Données partagées avec la fiche produit (src/lib/produits.ts) — un
  // produit ajouté là apparaît automatiquement dans les deux pages.
  const produits = construireProduits(t)

  // Le retrait se fait CÔTÉ SERVEUR : masquer en CSS aurait laissé les trois
  // conteneurs dans le HTML, donc lisibles par n'importe qui — ce qui revient
  // à les publier.
  const produitsVisibles = CONTENEURS_ACTIFS
    ? produits
    : produits.filter((p) => p.categorie !== 'conteneurs')

  const filtres = [
    { valeur: 'all', label: t('cat_tout') },
    { valeur: 'impression', label: t('cat_impression') },
    { valeur: 'laser', label: t('cat_laser') },
    ...(CONTENEURS_ACTIFS ? [{ valeur: 'conteneurs', label: t('cat_conteneurs') }] : []),
    { valeur: 'equipements', label: t('cat_equipements') },
  ]

  return (
    <>
      <section className="border-b border-ko-line bg-ko-cream pb-14 pt-28 lg:pb-20 lg:pt-40">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          <span aria-hidden="true" className="block h-px w-8 bg-ko-blue" />
          <h1 className="ko-display mt-6 max-w-[14ch] text-ko-ink">{t('title')}</h1>

          {/* Positionnement du document de cadrage, mot pour mot. */}
          <p className="ko-h3 mt-7 max-w-[30ch] text-ko-ink">{t('positionnement')}</p>

          <p className="mt-6 max-w-[54ch] text-base leading-relaxed text-ko-muted">{t('intro')}</p>
        </div>
      </section>

      <section className="bg-ko-white py-16 lg:py-24">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          <Reveal>
            <CatalogueBoutique
              produits={produitsVisibles}
              filtres={filtres}
              labelFiltres={t('filtre_categorie')}
              prixSurDemande={t('prix_sur_demande')}
              demanderPrix={t('demander_prix')}
              aucunResultat={t('aucun_resultat')}
              photoPlaceholder={tCommun('photo_placeholder')}
            />
          </Reveal>
        </div>
      </section>

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
