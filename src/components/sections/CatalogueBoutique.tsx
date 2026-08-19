'use client'

import Image from 'next/image'
import { useFormatter, useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

import { BoutonAjouter } from '@/components/ui/BoutonAjouter'
import { buttonVariants } from '@/components/ui/Button'
import { PhotoPlaceholder } from '@/components/ui/PhotoPlaceholder'
import { Link } from '@/i18n/navigation'
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
  panierActif: boolean
  filtres: readonly Filtre[]
  labelFiltres: string
  prixSurDemande: string
  demanderPrix: string
  aucunResultat: string
  photoPlaceholder: string
}

export function CatalogueBoutique({
  produits,
  /**
   * Panier ouvert ou non. Reçu en prop : ce composant est client, une variable
   * d'environnement y serait figée à la compilation et le réglage saisi dans
   * l'espace équipe n'aurait aucun effet.
   */
  panierActif,
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
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-12">
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
          className="mb-5 w-full min-h-[44px] border border-ko-line bg-ko-white px-4 py-3 text-base text-ko-ink transition-colors duration-200 placeholder:text-ko-muted focus:border-ko-blue focus:outline-none lg:mb-8"
        />

        <p className="label-mono mb-3 text-ko-muted lg:mb-4">{labelFiltres}</p>
        {/*
          ⚠️ HORIZONTAL EN MOBILE, LISTE VERTICALE À PARTIR DE `lg:` —
          constaté par Christian : quatre catégories empilées en pleine
          largeur poussaient la grille de produits loin sous la ligne de
          flottaison, avant même d'avoir vu un seul produit. En dessous de
          `lg:`, les catégories deviennent des pastilles qui s'enroulent
          (même motif que les filtres de /realisations) ; à partir de `lg:`,
          on retrouve la colonne latérale à indicateur gauche (référence
          Bambu Store, choix déjà validé par Christian).
        */}
        <div
          role="group"
          aria-label={labelFiltres}
          className="flex flex-wrap gap-2 lg:flex-col lg:flex-nowrap lg:items-start lg:gap-1"
        >
          {filtres.map(({ valeur, label }) => {
            const actif = valeur === categorie

            return (
              <button
                key={valeur}
                type="button"
                onClick={() => setCategorie(valeur)}
                aria-pressed={actif}
                className={cn(
                  'min-h-[40px] rounded-sm border px-4 py-1.5 text-left text-sm transition-colors duration-200',
                  'lg:rounded-none lg:border-x-0 lg:border-t-0 lg:border-l-2 lg:px-3 lg:pl-3',
                  // Phase 2 (18 août 2026) : texte noir sur le fond plein
                  // (mobile), ko-ink sur la variante transparente (desktop) —
                  // le bleu en texte échoue le contraste sur fond clair
                  // (2,15:1), même petit et même en état actif. Le filet
                  // gauche bleu (lg:border-l-2, hors classes conditionnelles)
                  // reste le signal de sélection en desktop.
                  actif
                    ? 'border-ko-blue bg-ko-blue text-ko-black lg:bg-transparent lg:font-medium lg:text-ko-ink'
                    : 'border-ko-line text-ko-ink hover:border-ko-ink lg:border-transparent lg:hover:border-ko-line',
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
          // Gouttières dissociées : 32 px entre colonnes, 48 px entre rangées
          // à partir de `sm`. À gap-5 uniforme, les cadres de deux produits
          // voisins se touchaient presque — c'est le « trop collé » signalé.
          // Un écart vertical plus large qu'horizontal fait aussi lire la
          // grille par rangées plutôt qu'en damier.
          //
          // ⚠️ DEUX COLONNES DÈS LE PLUS PETIT ÉCRAN — demande de Christian,
          // référence Temu : une seule colonne en mobile forçait à faire
          // défiler beaucoup pour voir plusieurs produits. Gouttières
          // resserrées en dessous de `sm` (16 px) : à 32 px, deux cartes de
          // ~150 px de large sur un téléphone étroit se seraient touché le
          // bord de l'écran.
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-8 sm:gap-y-12 lg:grid-cols-3 xl:grid-cols-4">
            {visibles.map((produit) => {
              const nomCategorie =
                filtres.find((f) => f.valeur === produit.categorie)?.label ?? produit.categorie

              return (
                // `relative` : ancre le lien étiré du titre (plus bas), qui
                // couvre toute la carte. `isolate` crée un contexte
                // d'empilement propre à la carte, pour que le z-index du
                // bouton n'ait à rivaliser qu'avec ses propres voisins.
                <article key={produit.slug} className="group relative isolate flex flex-col">
                  {/* Cadre photo — PLUS un lien.
                      La photo et le titre pointaient vers la même fiche par
                      DEUX ancres distinctes, et celle de la photo n'avait pour
                      contenu qu'une image en `alt=""` : un lien sans nom
                      accessible, annoncé « lien » et rien d'autre. Les deux
                      sont désormais une seule ancre, portée par le titre et
                      étirée sur la carte (voir plus bas).

                      `bg-ko-photo` (blanc PUR) et non `bg-ko-white` : les
                      visuels fabricants sont détourés sur #ffffff, et le fond
                      chaud du design system laissait un rectangle plus clair
                      visible autour de chaque appareil. Le filet 1px donne au
                      cadre une limite franche, identique sur les douze cartes
                      — photo présente ou emplacement réservé.

                      `object-contain`, PAS `object-cover` : le produit reste
                      entier et centré, jamais recadré. Padding réduit à p-5 :
                      les images portent déjà 8 % de marge interne, cumuler les
                      deux rapetissait l'appareil au milieu du vide.

                      Au survol le cadre entier avance (scale 1.03) et l'image
                      avance un peu plus (1.06) : l'écart entre les deux donne
                      la profondeur, le produit semble sortir de son cadre.
                      1.03 sur 200 px = 3 px de débord par côté, contre 32 px
                      de gouttière — aucun risque de chevaucher le voisin. */}
                  <div className="relative aspect-square overflow-hidden border border-ko-line bg-ko-photo transition-transform duration-[400ms] group-hover:scale-[1.03]">
                    {/* Ruban — vide tant que Christian n'a pas confirmé un texte
                        vrai par produit (voir le commentaire sur ProduitCarte). */}
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

                    {/* Rupture de stock — bandeau noir plein, pas rouge : la
                        palette du site se limite à trois couleurs plus UN
                        accent bleu (CLAUDE.md), déjà utilisé par « Ajouter au
                        panier » juste en dessous. Un rouge romprait cette
                        règle pour ce seul badge ; le noir dit « indisponible »
                        sans en sortir. Centré en bas de la photo — jamais au
                        même endroit qu'un ruban ou un badge secondaire, les
                        trois pourraient coexister un jour. */}
                    {produit.enRupture && (
                      <span className="absolute inset-x-0 bottom-0 z-10 bg-ko-black py-1.5 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-ko-white">
                        {t('rupture_stock')}
                      </span>
                    )}

                    {produit.src ? (
                      <Image
                        src={produit.src}
                        // Pas redondant avec le lien du titre plus bas (voir la
                        // note plus haut sur l'ancre unique) : cette image n'est
                        // PAS elle-même un lien, donc un alt vide ne fait ici que
                        // priver Google Images d'un texte à indexer, sans le
                        // bénéfice d'accessibilité qui justifiait alt="" quand
                        // l'image était le seul contenu d'un second lien.
                        alt={produit.nom}
                        fill
                        quality={85}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                        className={cn(
                          'transition-transform duration-[400ms] group-hover:scale-[1.06]',
                          // Une photo de scène (conteneur) remplit le cadre
                          // bord à bord : lui appliquer le padding du détouré
                          // laisserait un liseré blanc autour de la photo, qui
                          // se lirait comme un défaut d'alignement.
                          produit.cadrage === 'cover'
                            ? 'object-cover'
                            : 'object-contain p-5',
                          // Grisé automatiquement en rupture — demande de
                          // Christian. `grayscale` seul aurait suffi côté
                          // silhouette, mais deux photos très contrastées
                          // restaient presque aussi lisibles qu'en couleur ;
                          // l'opacité réduite complète le signal.
                          produit.enRupture && 'opacity-50 grayscale',
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
                  </div>

                  <div className="flex flex-1 flex-col pt-4">
                    {/* Catégorie en mono nu — pas de pastille colorée (skill 08). */}
                    <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ko-muted">
                      {nomCategorie}
                    </p>

                    <h3 className="mt-2 font-serif text-[16px] leading-tight text-ko-ink underline decoration-transparent underline-offset-4 transition-colors duration-200 group-hover:decoration-ko-blue sm:text-[18px]">
                      {/*
                        LIEN UNIQUE de la carte, étiré sur toute sa surface.

                        Le pseudo-élément `before` est positionné en absolu sur
                        l'`article` (qui porte `relative`) : la photo, le texte
                        et le prix deviennent donc cliquables sans être DANS
                        l'ancre. Ça règle trois choses d'un coup —
                        - une seule cible au lieu de deux vers la même page ;
                        - un nom accessible réel, le nom du produit, au lieu
                          d'un lien vide autour d'une image en `alt=""` ;
                        - le bouton reste hors du lien, un <button> imbriqué
                          dans un <a> étant du HTML invalide.

                        Contrepartie assumée : sélectionner le texte de la
                        carte à la souris devient malaisé. C'est le compromis
                        connu de ce motif, et il est sans conséquence ici —
                        personne ne copie une description de catalogue.
                      */}
                      <Link
                        href={routeProduit(produit.slug)}
                        className="before:absolute before:inset-0 before:z-0 before:content-['']"
                      >
                        {produit.nom}
                      </Link>
                    </h3>

                    {/* line-clamp-2 : deux lignes maximum, pour que toutes les
                        cartes d'une rangée gardent la même hauteur de texte. */}
                    <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ko-muted">
                      {produit.texte}
                    </p>

                    {/*
                      Prix — aligné à gauche, juste sous le nom (référence
                      Bambu Store). `prixIndicatif` reste un champ numérique
                      structuré : un vrai prix Supabase le remplacera sans
                      toucher au format d'affichage. `null` retombe sur
                      l'ancien "Prix sur demande", pour le cas où le panier
                      est désactivé (réglage « Panier ») et où aucun CTA de
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
                      Panier désactivé (Réglages › Parties du site, voir
                      espace équipe) : on retombe sur l'ancien CTA
                      de contact, pour qu'un simple retour en arrière du drapeau
                      ne laisse jamais une carte sans action.
                    */}
                    {panierActif ? (
                      // `compact` : bouton seul, sans sélecteur de quantité.
                      // À quatre colonnes la carte fait ~210 px ; le sélecteur
                      // en mangeait 130 et « Ajouter au panier » se cassait sur
                      // trois lignes. La quantité se règle sur la fiche produit
                      // et le récapitulatif, où elle est lisible.
                      // `relative z-10` : repasse AU-DESSUS du lien étiré du
                      // titre, qui couvre sinon toute la carte, bouton
                      // compris — un clic sur « Ajouter au panier » partirait
                      // alors vers la fiche produit.
                      <BoutonAjouter
                        slug={produit.slug}
                        nom={produit.nom}
                        categorie={nomCategorie}
                        quantiteDisponible={produit.quantiteDisponible}
                        compact
                        className="relative z-10 mt-4"
                      />
                    ) : (
                      <Link
                        href={`${ROUTES.contact}?type=boutique&produit=${produit.slug}`}
                        className={cn(
                          'relative z-10 mt-4',
                          buttonVariants({ variant: 'primary', size: 'sm' }),
                        )}
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
