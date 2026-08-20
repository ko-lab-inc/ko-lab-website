import { hasLocale } from 'next-intl'
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { BoutonAjouter } from '@/components/ui/BoutonAjouter'
import { buttonVariants } from '@/components/ui/Button'
import { GalerieProduit } from '@/components/ui/GalerieProduit'
import { Reveal } from '@/components/ui/Reveal'
import { Link } from '@/i18n/navigation'
import { routing, type AppLocale } from '@/i18n/routing'
import { lireProduitsPublies } from '@/lib/produits'
import { lireReglages } from '@/lib/reglages'
import { alternatesLangues, ROUTES, routeProduit } from '@/lib/routes'
import { cn } from '@/lib/utils/cn'
import { origine } from '@/lib/utils/origine'

import type { Metadata } from 'next'

type Props = { params: Promise<{ locale: string; slug: string }> }

export const revalidate = 3600

/**
 * Même drapeau que boutique/page.tsx : les conteneurs restent invisibles
 * tant que l'entente commerciale n'est pas confirmée (skill 21). Une fiche
 * produit atteinte directement par URL doit être bloquée exactement comme
 * la carte l'est dans la grille — sinon le drapeau ne protège rien.
 */


async function chargerProduit(locale: AppLocale, slug: string) {
  const t = await getTranslations({ locale, namespace: 'Boutique' })
  const produits = await lireProduitsPublies(locale)
  const produit = produits.find((p) => p.slug === slug)
  if (!produit) return null

  // Le réglage est relu ici plutôt que reçu en argument : cette fonction sert
  // aussi à `generateMetadata`, qui n'a pas d'autre contexte. La lecture est
  // mise en cache, la répéter ne coûte rien.
  const { solutionsModulaires } = await lireReglages()
  if (produit.categorie === 'conteneurs' && !solutionsModulaires) return null
  return { produit, t }
}

/**
 * Chemins pré-générés au build, à partir du catalogue RÉEL à cet instant.
 *
 * Un produit ajouté depuis /admin/catalogue APRÈS ce build n'est pas dans
 * cette liste — `dynamicParams` reste à sa valeur par défaut (true, non
 * déclaré ici), donc Next le rend à la demande au premier visiteur et met le
 * résultat en cache comme n'importe quelle page ISR. C'est précisément ce qui
 * manquait : avant, la liste venait de SLUGS_PRODUITS, une constante codée en
 * dur qu'un produit ajouté en base ne pouvait jamais rejoindre.
 */
export async function generateStaticParams() {
  // Locale arbitraire : seuls les slugs comptent ici pour la liste des
  // chemins à pré-générer, jamais nom/texte.
  const produits = await lireProduitsPublies('fr')
  return routing.locales.flatMap((locale) =>
    produits.map((p) => ({ locale, slug: p.slug })),
  )
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
      languages: alternatesLangues(routeProduit(slug)),
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

  const reglages = await lireReglages()
  const produits = await lireProduitsPublies(locale)
  const produit = produits.find((p) => p.slug === slug)
  if (!produit || (produit.categorie === 'conteneurs' && !reglages.solutionsModulaires)) notFound()

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

  /**
   * Product — schema.org, SANS `offers`/prix.
   *
   * La note historique de ce fichier expliquait pourquoi aucun balisage
   * n'existait : publier `prixIndicatif` en `Offer.price` le présenterait à
   * Google comme un prix ferme, alors que certains le sont encore
   * provisoires. Ce risque ne concerne QUE le prix — nom, image et
   * description sont des faits déjà vrais aujourd'hui, quel que soit l'état
   * de confirmation du prix. `offers` reste donc absent tant qu'il n'existe
   * pas de distinction en base entre prix confirmé et prix provisoire ; le
   * reste peut être publié sans attendre.
   */
  const imageAbsolue = produit.src
    ? produit.src.startsWith('http')
      ? produit.src
      : `${origine()}${produit.src}`
    : null
  const produitJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: produit.nom,
    description: produit.texte,
    sku: produit.slug,
    url: `${origine()}/${locale}${routeProduit(slug)}`,
    ...(imageAbsolue ? { image: [imageAbsolue] } : {}),
  }

  return (
    <>
      {/* Espace pour la barre d'achat collante (mobile) : sans lui, le dernier
          bloc de contenu se retrouve masqué au premier rendu.
          pb-28 (112 px) et non pb-24 : la barre mesure 97 px à 375 px, le
          prix et le contrôle de quantité passant sur deux lignes. La réserve
          était donc plus courte d'un pixel que ce qu'elle devait couvrir. */}
      <div className="pb-28 lg:pb-0">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(produitJsonLd).replace(/</g, '\\u003c') }}
        />

        {/* Fil d'Ariane plutôt qu'un simple « Retour au catalogue » : il dit
            OÙ l'on se trouve, pas seulement d'où l'on vient — et il rend la
            boutique atteignable depuis n'importe quelle fiche ouverte
            directement depuis un moteur de recherche. */}
        <nav
          aria-label={t('fil_ariane_accueil')}
          className="border-b border-ko-line bg-ko-cream py-6"
        >
          <ol className="mx-auto flex max-w-container flex-wrap items-center gap-2 px-6 text-sm text-ko-muted lg:px-12">
            <li>
              <Link href={ROUTES.accueil} className="transition-colors duration-200 hover:text-ko-black">
                {t('fil_ariane_accueil')}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href={ROUTES.boutique} className="transition-colors duration-200 hover:text-ko-black">
                {t('title')}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            {/* `aria-current="page"` : la dernière miette n'est pas un lien,
                elle désigne la page courante. */}
            <li aria-current="page" className="min-w-0 truncate text-ko-ink">
              {produit.nom}
            </li>
          </ol>
        </nav>

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
                {/* Une seule cellule de grille pour la photo ET le bandeau
                    qui la suit : en frères directs, le bandeau occuperait la
                    deuxième colonne et repousserait la colonne d'infos hors
                    de la grille à deux colonnes. */}
                <div>
                <GalerieProduit
                  src={produit.src}
                  nom={produit.nom}
                  cadrage={produit.cadrage}
                  couleurs={produit.couleurs}
                  labelColoris={t('coloris')}
                  labelPlaceholder={tCommun('photo_placeholder')}
                  enRupture={produit.enRupture}
                >
                  {produit.badgeRibbon && (
                    <span className="absolute left-0 top-4 z-10 flex items-center gap-1.5 bg-ko-blue py-1 pl-3 pr-4 font-mono text-[9px] uppercase tracking-[0.14em] text-ko-black [clip-path:polygon(0_0,100%_0,calc(100%-10px)_50%,100%_100%,0_100%)]">
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
                  {/* Même bandeau que la grille du catalogue — voir la note
                      sur la couleur dans CatalogueBoutique.tsx. */}
                  {produit.enRupture && (
                    <span className="absolute inset-x-0 bottom-0 z-10 bg-ko-black py-1.5 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-ko-white">
                      {t('rupture_stock')}
                    </span>
                  )}
                </GalerieProduit>

                  {/*
                    Bandeau de réassurance, sous la photo — même emplacement
                    que la référence Bambu Store.

                    ⚠️ LE TEXTE N'EST PAS CELUI DE LA RÉFÉRENCE, ET C'EST
                    VOLONTAIRE. Bambu affiche « Free Shipping », « 30-Day Price
                    Protection », « 14-Day Returns », « 1-Year Warranty » :
                    quatre engagements commerciaux qui lieraient KO-LAB si on
                    les recopiait, alors qu'aucune de ces politiques n'a été
                    confirmée. Au Québec une garantie ou une politique de
                    retour annoncée est opposable. Les quatre libellés retenus
                    décrivent le fonctionnement réel de la boutique et sont
                    tirés de textes déjà validés — « commandes accompagnées »
                    et « une équipe qui les utilise réellement » sont mot pour
                    mot ceux de la page boutique.

                    Ce sont quatre clés de traduction (Boutique.reassurance.*).
                    Si KO-LAB offre bien la livraison gratuite, une garantie ou
                    des retours, il suffit de les remplacer.

                    Icônes retirées le 20 août 2026 (revue visuelle, point 6) :
                    chacune répétait en pictogramme ce que le libellé juste en
                    dessous dit déjà — même raisonnement que Besoins.tsx. Le
                    tiret reprend le vocabulaire déjà utilisé pour les listes
                    « ce que ça couvre » du hub /nos-capacites, plutôt qu'un
                    texte nu sans aucun repère.
                  */}
                  <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-ko-line pt-8 lg:grid-cols-4">
                    {[
                      t('reassurance.prix'),
                      t('reassurance.disponibilite'),
                      t('reassurance.accompagnement'),
                      t('reassurance.equipe'),
                    ].map((texte) => (
                      <li key={texte} className="flex gap-2.5 text-sm leading-relaxed text-ko-muted">
                        <span aria-hidden="true" className="text-ko-blue">
                          —
                        </span>
                        <span>{texte}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* ------------------------------ Infos ------------------------------ */}
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ko-muted">
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
                      {reglages.panierActif ? (
                        <BoutonAjouter slug={produit.slug} nom={produit.nom} categorie={nomCategorie} quantiteDisponible={produit.quantiteDisponible} />
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

                  {/*
                    Équivalent du bloc « Informations sur la commande » de la
                    référence — mais décrivant NOTRE parcours, qui n'est pas
                    le sien. Bambu y annonce un délai d'expédition depuis la
                    Californie et aligne les logos de moyens de paiement ;
                    ici il n'y a ni paiement, ni stock, ni expédition : la
                    sélection part en demande et KO-LAB revient avec le prix
                    ferme. Afficher des logos Visa/PayPal sur une page qui
                    n'encaisse rien laisserait croire à un achat immédiat.

                    Placé sous le prix et le bouton, pas au-dessus : il
                    répond à la question qui vient APRÈS l'envie d'acheter,
                    « et ensuite, il se passe quoi ».
                  */}
                  <div className="mt-10 border-t border-ko-line pt-8">
                    <p className="label-mono text-ko-muted">{t('commande.titre')}</p>
                    <ul className="mt-4 space-y-3">
                      {[t('commande.etape_1'), t('commande.etape_2'), t('commande.etape_3')].map(
                        (ligne) => (
                          <li
                            key={ligne}
                            className="flex gap-3 text-sm leading-relaxed text-ko-muted"
                          >
                            <span aria-hidden="true" className="mt-2 h-px w-3 shrink-0 bg-ko-blue" />
                            <span className="max-w-[52ch]">{ligne}</span>
                          </li>
                        ),
                      )}
                    </ul>
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
      {/* `data-barre-achat` : repère lu par WidgetAide, qui remonte sa bulle
          d'aide au-dessus de cette barre quand elle est visible. Un attribut
          plutôt qu'une classe — c'est un point d'accroche fonctionnel, pas du
          style, et le renommer par mégarde en refactorant le CSS casserait le
          calcul silencieusement. */}
      <div
        data-barre-achat
        // `ko-frost`, pas `ko-white` : seuls ko-scrim/ko-frost/ko-accent
        // acceptent un modificateur d'opacité Tailwind (tailwind.config.ts) —
        // `bg-ko-white/95` ne générait aucune règle, laissant la barre
        // totalement transparente sur mobile.
        className="fixed inset-x-0 bottom-0 z-30 border-t border-ko-line bg-ko-frost/95 p-4 backdrop-blur-sm lg:hidden"
      >
        <div className="mx-auto flex max-w-container items-center justify-between gap-4">
          <p className="font-mono text-sm text-ko-ink">{prixFormate}</p>
          {reglages.panierActif ? (
            <BoutonAjouter slug={produit.slug} nom={produit.nom} categorie={nomCategorie} quantiteDisponible={produit.quantiteDisponible} />
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
