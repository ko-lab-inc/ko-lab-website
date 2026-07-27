import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { CatalogueBoutique, type ProduitCarte } from '@/components/sections/CatalogueBoutique'
import { Reveal } from '@/components/ui/Reveal'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { IMAGES } from '@/lib/images'
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

  /**
   * ⚠️ CONTENU PROVISOIRE — produits en dur en attendant Supabase.
   *
   * Les images de Bambu Lab et xTool doivent venir des visuels presse
   * officiels : une photo générique sous le nom d'un modèle précis désigne une
   * autre machine. `src: null` affiche donc un emplacement réservé.
   *
   * À l'arrivée de `produits_boutique` :
   *     const supabase = createStaticClient()   // JAMAIS createClient()
   *     const { data } = await supabase.from('produits_boutique')
   *       .select('*').eq('publie', true).order('ordre')
   */
  const produits: ProduitCarte[] = [
    // ---- Impression 3D
    {
      slug: 'bambu-lab-x1-carbon',
      categorie: 'impression',
      nom: t('produits.bambu_x1c_nom'),
      texte: t('produits.bambu_x1c_texte'),
      src: IMAGES.boutiqueImpression3d,
    },
    {
      slug: 'bambu-lab-p1s',
      categorie: 'impression',
      nom: t('produits.bambu_p1s_nom'),
      texte: t('produits.bambu_p1s_texte'),
      src: null,
    },
    {
      slug: 'bambu-lab-ams',
      categorie: 'impression',
      nom: t('produits.bambu_ams_nom'),
      texte: t('produits.bambu_ams_texte'),
      src: null,
    },

    // ---- Découpe laser
    {
      slug: 'xtool-p2',
      categorie: 'laser',
      nom: t('produits.xtool_p2_nom'),
      texte: t('produits.xtool_p2_texte'),
      src: null,
    },
    {
      slug: 'xtool-s1',
      categorie: 'laser',
      nom: t('produits.xtool_s1_nom'),
      texte: t('produits.xtool_s1_texte'),
      src: null,
    },
    {
      slug: 'xtool-f1',
      categorie: 'laser',
      nom: t('produits.xtool_f1_nom'),
      texte: t('produits.xtool_f1_texte'),
      src: null,
    },

    // ---- Équipements
    {
      slug: 'eclairage-temporaire',
      categorie: 'equipements',
      nom: t('produits.equip_eclairage_nom'),
      texte: t('produits.equip_eclairage_texte'),
      src: null,
    },
    {
      slug: 'equipement-manutention',
      categorie: 'equipements',
      nom: t('produits.equip_manutention_nom'),
      texte: t('produits.equip_manutention_texte'),
      src: null,
    },
    {
      slug: 'outillage-installation',
      categorie: 'equipements',
      nom: t('produits.equip_outillage_nom'),
      texte: t('produits.equip_outillage_texte'),
      src: null,
    },

    // ---- Conteneurs — filtrés plus bas tant que le drapeau est inactif
    {
      slug: 'conteneur-20-pieds',
      categorie: 'conteneurs',
      nom: t('produits.cont_20_nom'),
      texte: t('produits.cont_20_texte'),
      src: null,
    },
    {
      slug: 'conteneur-40-pieds-high-cube',
      categorie: 'conteneurs',
      nom: t('produits.cont_40_nom'),
      texte: t('produits.cont_40_texte'),
      src: null,
    },
    {
      slug: 'conteneur-bureau-amenage',
      categorie: 'conteneurs',
      nom: t('produits.cont_bureau_nom'),
      texte: t('produits.cont_bureau_texte'),
      src: null,
    },
  ]

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
