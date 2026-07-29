'use client'

import Image from 'next/image'
import { useFormatter, useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

import { BoutonAjouter } from '@/components/ui/BoutonAjouter'
import { buttonVariants } from '@/components/ui/Button'
import { PhotoPlaceholder } from '@/components/ui/PhotoPlaceholder'
import { Link } from '@/i18n/navigation'
import { PANIER_ACTIF } from '@/lib/config/features'
import type { ProduitCarte } from '@/lib/produits'
import { ROUTES, routeProduit } from '@/lib/routes'
import { cn } from '@/lib/utils/cn'

export type { ProduitCarte }

/**
 * Catalogue filtrable — skill 21.
 *
 * Rapproché du style Bambu Store sur décision de Christian (changement de
 * direction assumé, boutique seulement — le reste du site garde son
 * traitement anti-générique habituel, skill 08) : filtres en colonne
 * latérale, photos sur fond clair non recadrées, grille dense, prix visible,
 * cartes cliquables vers une fiche produit. Reste au vocabulaire KO-LAB :
 * filets 1px, Fraunces pour les noms, bleu en accent unique — pas de pastille
 * multicolore ni d'ornement décoratif au-delà de ce que Christian a validé.
 */

type Filtre = { valeur: string; label: string }

type Props = {
  produits: readonly ProduitCarte[]
  filtres: readonly Filtre[]
  labelFiltres: string
  prixSurDemande: string
  demanderPrix: string
  aucunResultat: string
  photoPlaceholder: string
}

export function CatalogueBoutique({
  produits,
  filtres,
  labelFiltres,
  prixSurDemande,
  demanderPrix,
  aucunResultat,
  photoPlaceholder,
}: Props) {
  const t = useTranslations('Boutique')
  const format = useFormatter()
  const [categorie, setCategorie] = useState('all')
  const [recherche, setRecherche] = useState('')

  const visibles = useMemo(() => {
    // Normalisation sans accents : « decoupe » doit trouver « découpe », et
    // l'inverse. Sans ça, la recherche échoue sur la moitié du catalogue
    // français dès qu'un accent est omis.
    const normaliser = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')

    const terme = normaliser(recherche.trim())

    return produits.filter((p) => {
      // Les deux filtres se CUMULENT — catégorie active et terme de recherche.
      const parCategorie = categorie === 'all' || p.categorie === categorie
      if (!parCategorie) return false
      if (terme === '') return true
      return normaliser(`${p.nom} ${p.texte}`).includes(terme)
    })
  }, [produits, categorie, recherche])

  // Distingue « rien dans cette catégorie » de « rien pour cette recherche » :
  // deux impasses différentes, deux messages différents.
  const messageVide = recherche.trim() !== '' ? t('aucun_resultat_recherche') : aucunResultat

  return (
    // Colonne latérale sur desktop (référence Bambu Store) : au-dessus de la
    // grille sous lg, où une colonne fixe grignoterait toute la largeur utile.
    <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
      {/* ------------------------------ Filtres ------------------------------ */}
      {/* w-60 et non w-52 : à 208 px, le champ de recherche tronquait sa
          propre invite (« Rechercher un produi… », le « t » invisible relevé
          par Christian). L'invite n'est pas raccourcie pour autant — la
          police du champ reste à 16 px, en dessous desquels iOS zoome
          automatiquement à la mise au point (skill 11). */}
      <aside className="lg:sticky lg:top-24 lg:w-60 lg:shrink-0">
        <label htmlFor="recherche-boutique" className="sr-only">
          {t('recherche_label')}
        </label>
        <input
          id="recherche-boutique"
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder={t('recherche_placeholder')}
          className="mb-8 w-full min-h-[44px] border border-ko-line bg-ko-white px-4 py-3 text-base text-ko-ink transition-colors duration-200 placeholder:text-ko-muted focus:border-ko-blue focus:outline-none"
        />

        <p className="label-mono mb-4 text-ko-muted">{labelFiltres}</p>
        <div role="group" aria-label={labelFiltres} className="flex flex-col items-start gap-1">
          {filtres.map(({ valeur, label }) => {
            const actif = valeur === categorie

            return (
              <button
                key={valeur}
                type="button"
                onClick={() => setCategorie(valeur)}
                aria-pressed={actif}
                className={cn(
                  'min-h-[40px] border-l-2 py-1.5 pl-3 text-left text-sm transition-colors duration-200',
                  actif
                    ? 'border-ko-blue font-medium text-ko-blue'
                    : 'border-transparent text-ko-ink hover:border-ko-line hover:text-ko-blue',
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
      </aside>

      {/* ------------------------------ Grille ------------------------------ */}
      <div className="min-w-0 flex-1">
        {visibles.length === 0 ? (
          <p className="text-base text-ko-muted">{messageVide}</p>
        ) : (
          // Gouttières dissociées : 32 px entre colonnes, 48 px entre rangées.
          // À gap-5 uniforme, les cadres de deux produits voisins se touchaient
          // presque — c'est le « trop collé » signalé. Un écart vertical plus
          // large qu'horizontal fait aussi lire la grille par rangées plutôt
          // qu'en damier.
          <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibles.map((produit) => {
              const nomCategorie =
                filtres.find((f) => f.valeur === produit.categorie)?.label ?? produit.categorie

              return (
                // Plus de bordure au survol autour de la carte ENTIÈRE : elle
                // apparaissait à un cheveu du produit voisin et écrasait
                // l'espace qu'on vient de gagner. Le cadre est désormais porté
                // par la photo seule, en permanence ; le survol se lit au
                // zoom de l'image et au titre qui passe au bleu.
                <article key={produit.slug} className="group flex flex-col">
                  {/* Photo cliquable vers la fiche produit — anchor séparée de
                      celle du titre plus bas : deux cibles identiques sur une
                      même carte est un motif courant et sans ambiguïté au
                      clavier ou au lecteur d'écran (chacune est autonome).

                      `bg-ko-photo` (blanc PUR) et non `bg-ko-white` : les
                      visuels fabricants sont détourés sur #ffffff, et le fond
                      chaud du design system laissait un rectangle plus clair
                      visible autour de chaque appareil. Le filet 1px donne au
                      cadre une limite franche, identique sur les douze cartes
                      — photo présente ou emplacement réservé.

                      `object-contain`, PAS `object-cover` : le produit reste
                      entier et centré, jamais recadré. Padding réduit à p-5 :
                      les images portent déjà 8 % de marge interne, cumuler les
                      deux rapetissait l'appareil au milieu du vide. */}
                  <Link
                    href={routeProduit(produit.slug)}
                    className="relative block aspect-square overflow-hidden border border-ko-line bg-ko-photo"
                  >
                    {/* Ruban — vide tant que Christian n'a pas confirmé un texte
                        vrai par produit (voir le commentaire sur ProduitCarte). */}
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

                    {produit.src ? (
                      <Image
                        src={produit.src}
                        alt=""
                        fill
                        quality={85}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                        className={cn(
                          'transition-transform duration-[400ms] group-hover:scale-[1.04]',
                          // Une photo de scène (conteneur) remplit le cadre
                          // bord à bord : lui appliquer le padding du détouré
                          // laisserait un liseré blanc autour de la photo, qui
                          // se lirait comme un défaut d'alignement.
                          produit.cadrage === 'cover'
                            ? 'object-cover'
                            : 'object-contain p-5',
                        )}
                      />
                    ) : (
                      // Emplacement réservé plutôt qu'une photo de stock approchante :
                      // sur une fiche produit, une image générique désigne un autre
                      // objet que celui nommé (skill 22).
                      //
                      // Ramené au fond du cadre : en ko-cream2 par défaut, les
                      // neuf produits sans photo formaient des blocs beiges
                      // pleins entre les trois cadres blancs — la grille se
                      // lisait comme deux jeux de cartes différents.
                      <PhotoPlaceholder
                        ratio="aspect-square"
                        label={photoPlaceholder}
                        className="bg-ko-photo"
                      />
                    )}
                  </Link>

                  <div className="flex flex-1 flex-col pt-4">
                    {/* `contents` : ce Link disparaît de la boîte, ses enfants
                        restent des enfants directs de la colonne flex — sinon
                        le prix et le bouton, hors du lien, se retrouveraient
                        mal alignés dans une boîte à part. */}
                    <Link href={routeProduit(produit.slug)} className="contents">
                      {/* Catégorie en mono nu — pas de pastille colorée (skill 08). */}
                      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ko-blue">
                        {nomCategorie}
                      </p>

                      <h3 className="mt-2 font-serif text-[18px] leading-tight text-ko-ink transition-colors duration-200 group-hover:text-ko-blue">
                        {produit.nom}
                      </h3>

                      {/* line-clamp-2 : deux lignes maximum, pour que toutes les
                          cartes d'une rangée gardent la même hauteur de texte. */}
                      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ko-muted">
                        {produit.texte}
                      </p>
                    </Link>

                    {/*
                      Prix — aligné à gauche, juste sous le nom (référence
                      Bambu Store). `prixIndicatif` reste un champ numérique
                      structuré : un vrai prix Supabase le remplacera sans
                      toucher au format d'affichage. `null` retombe sur
                      l'ancien "Prix sur demande", pour le cas où le panier
                      est désactivé (PANIER_ACTIF) et où aucun CTA de
                      rechange n'existe encore sur cette carte précise.

                      `mt-auto` : le bloc prix + bouton est plaqué au bas de la
                      carte. Sans lui, un nom sur deux lignes (« Conteneur
                      40 pieds high cube ») décale prix et bouton d'un cran par
                      rapport aux cartes voisines de la même rangée.
                    */}
                    {produit.prixIndicatif !== null ? (
                      <p className="mt-auto pt-3 font-mono text-base text-ko-ink">
                        {format.number(produit.prixIndicatif, {
                          style: 'currency',
                          currency: 'CAD',
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    ) : (
                      <p className="label-mono mt-auto pt-3">{prixSurDemande}</p>
                    )}

                    {/*
                      Panier actif : l'action principale devient l'ajout au
                      panier, prix déjà visible plus haut — plus de « Demander
                      un prix » isolé sur la carte (décision de Christian).
                      Panier désactivé (PANIER_ACTIF=false, voir
                      src/lib/config/features.ts) : on retombe sur l'ancien CTA
                      de contact, pour qu'un simple retour en arrière du drapeau
                      ne laisse jamais une carte sans action.
                    */}
                    {PANIER_ACTIF ? (
                      // `compact` : bouton seul, sans sélecteur de quantité.
                      // À quatre colonnes la carte fait ~210 px ; le sélecteur
                      // en mangeait 130 et « Ajouter au panier » se cassait sur
                      // trois lignes. La quantité se règle sur la fiche produit
                      // et le récapitulatif, où elle est lisible.
                      <BoutonAjouter
                        slug={produit.slug}
                        nom={produit.nom}
                        categorie={nomCategorie}
                        compact
                        className="mt-4"
                      />
                    ) : (
                      <Link
                        href={`${ROUTES.contact}?type=boutique&produit=${produit.slug}`}
                        className={cn('mt-4', buttonVariants({ variant: 'primary', size: 'sm' }))}
                      >
                        {demanderPrix}
                        <span aria-hidden="true">→</span>
                      </Link>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
