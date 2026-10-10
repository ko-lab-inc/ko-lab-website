'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'

import { BoutonAjouterLocation } from '@/components/sections/BoutonAjouterLocation'
import { CarteProduitLocation } from '@/components/sections/CarteProduitLocation'
import { IconeListe, IconeLoupe, IconeTableauBord } from '@/components/ui/Icones'
import { PhotoPlaceholder } from '@/components/ui/PhotoPlaceholder'
import { Link } from '@/i18n/navigation'
import { routeProduitLocation } from '@/lib/routes'
import { cn } from '@/lib/utils/cn'

import type { ProduitLigne } from '@/lib/location-produits'

/**
 * Catalogue d'UNE catégorie — recherche rapide, tri, bascule liste / carrés.
 *
 * Demandé par le boss le 10 octobre 2026 : « présentés en liste comme dans
 * Drive, avec l'option de les passer en carré, et une barre de recherche
 * rapide », puis « la liste doit être présentable, réfère-toi aux sites de
 * référence du domaine ». La LISTE est donc la vue par défaut.
 *
 * ---------------------------------------------------------------------------
 * CE QUE LES RÉFÉRENCES DU DOMAINE IMPOSENT À UNE LIGNE
 *
 * Rentman (l'ERP même de KO-LAB) et Quipli disent la même chose d'un catalogue
 * de location : une image CLAIRE, le prix visible d'un coup d'œil, un appel à
 * l'action par article, et surtout pas un mur de texte. Booqable ajoute le tri.
 * D'où, par rapport à la première version :
 *
 *   - vignette 80px et non 56 : à 56 on ne reconnaissait pas l'article ;
 *   - un RÉSUMÉ d'une ligne sous le nom (description réelle de Rentman), qui
 *     donne à la liste la densité utile d'un gestionnaire de fichiers ;
 *   - le prix en `text-ko-ink` et non en gris : c'est une information de
 *     décision, pas une note de bas de page ;
 *   - survol de ligne entière, tri, et compteur de résultats vivant.
 *
 * ---------------------------------------------------------------------------
 * COMPOSANT CLIENT, MAIS SANS useTranslations
 *
 * Il est client pour porter trois états : la vue, le tri et le texte cherché.
 * Ses libellés arrivent en PROPS, résolus côté serveur par la page — modèle que
 * le layout marketing désigne comme à privilégier : aucun espace de noms à
 * ajouter à la liste blanche, aucun catalogue de traductions sérialisé en plus.
 *
 * Le rendu reste pré-rendu côté serveur (Next rend aussi les composants client
 * au premier paint) : la liste est dans le HTML, donc indexable.
 *
 * ⚠️ UN SEUL bouton d'ajout par produit dans le DOM. Pas de variante « mobile »
 * masquée en CSS : `hidden` laisserait un second bouton vivant, invisible mais
 * bien présent pour un lecteur d'écran. La mise en page s'adapte par
 * `flex-wrap`, jamais par duplication.
 */

export type LibellesCatalogueCategorie = {
  prixSurDemande: string
  recherchePlaceholder: string
  /** `aria-label` du champ de recherche. */
  rechercheLabel: string
  /** `aria-label` du groupe de bascule d'affichage. */
  vueLabel: string
  vueListe: string
  vueGrille: string
  aucunResultat: string
  colonneEquipement: string
  colonnePrix: string
  triLabel: string
  triNom: string
  triPrixCroissant: string
  triPrixDecroissant: string
  /** Gabarits bruts contenant `{n}` — l'accord se fait ici, côté client. */
  compteUn: string
  comptePlusieurs: string
}

type Vue = 'liste' | 'grille'
type Tri = 'nom' | 'prix_asc' | 'prix_desc'

/**
 * Minuscules sans accents — « éclairage » doit se trouver en tapant
 * « eclairage », et inversement.
 */
function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

export function CatalogueCategorieLocation({
  produits,
  locale,
  libelleCategorie,
  libelles,
}: {
  produits: ProduitLigne[]
  locale: string
  /** Nom TRADUIT de la catégorie — rangé tel quel dans la demande. */
  libelleCategorie: string
  libelles: LibellesCatalogueCategorie
}) {
  const [vue, setVue] = useState<Vue>('liste')
  const [tri, setTri] = useState<Tri>('nom')
  const [recherche, setRecherche] = useState('')

  const nomDe = (p: ProduitLigne) => (locale === 'en' ? p.nom_en : p.nom_fr) || p.nom_fr

  const visibles = useMemo(() => {
    const q = normaliser(recherche.trim())
    // Les deux langues sont fouillées : un nom n'est pas toujours traduit, et
    // l'équipe cherche parfois le terme anglais sur la page française.
    const filtres =
      q === ''
        ? produits
        : produits.filter((p) => normaliser(`${p.nom_fr} ${p.nom_en ?? ''}`).includes(q))

    // 'nom' = l'ordre déjà donné par la base (ordre, puis nom) : on n'y touche pas.
    if (tri === 'nom') return filtres

    const signe = tri === 'prix_asc' ? 1 : -1
    return [...filtres].sort((a, b) => {
      // « Prix sur demande » n'est pas un prix : toujours en fin de liste, quel
      // que soit le sens du tri. Le trier comme un 0 mettrait ces articles en
      // tête d'un tri croissant, ce qui se lirait « les moins chers ».
      if (a.prix === null && b.prix === null) return 0
      if (a.prix === null) return 1
      if (b.prix === null) return -1
      return (a.prix - b.prix) * signe
    })
  }, [produits, recherche, tri])

  const compte = (
    visibles.length === 1 ? libelles.compteUn : libelles.comptePlusieurs
  ).replace('{n}', String(visibles.length))

  return (
    <div>
      {/* -------------------------------- Barre -------------------------------- */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-[1_1_240px]">
          <IconeLoupe
            taille={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ko-muted"
          />
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder={libelles.recherchePlaceholder}
            aria-label={libelles.rechercheLabel}
            className="min-h-[44px] w-full border border-ko-line bg-transparent py-2 pl-12 pr-4 text-base text-ko-ink transition-colors duration-200 placeholder:text-ko-muted focus:border-ko-blue focus:outline-none"
          />
        </div>

        {/* Tri — recommandé par les références du domaine dès qu'une catégorie
            dépasse quelques dizaines d'articles (Décor en compte 108). */}
        <select
          value={tri}
          onChange={(e) => setTri(e.target.value as Tri)}
          aria-label={libelles.triLabel}
          className="min-h-[44px] shrink-0 border border-ko-line bg-ko-white px-3 text-sm text-ko-ink transition-colors duration-200 focus:border-ko-blue focus:outline-none"
        >
          <option value="nom">{libelles.triNom}</option>
          <option value="prix_asc">{libelles.triPrixCroissant}</option>
          <option value="prix_desc">{libelles.triPrixDecroissant}</option>
        </select>

        <div role="group" aria-label={libelles.vueLabel} className="flex shrink-0 gap-2">
          <BoutonVue
            actif={vue === 'liste'}
            onClick={() => setVue('liste')}
            libelle={libelles.vueListe}
          >
            <IconeListe taille={18} />
          </BoutonVue>
          <BoutonVue
            actif={vue === 'grille'}
            onClick={() => setVue('grille')}
            libelle={libelles.vueGrille}
          >
            {/* Quatre tuiles : déjà le signe d'une grille dans ce projet. */}
            <IconeTableauBord taille={18} />
          </BoutonVue>
        </div>
      </div>

      {/* Compteur vivant : il suit la recherche, d'où `aria-live` pour qu'un
          lecteur d'écran entende le nombre de résultats après la frappe. */}
      <p aria-live="polite" className="mt-5 font-mono text-sm text-ko-muted">
        {compte}
      </p>

      {/* ------------------------------ Résultats ------------------------------ */}
      {visibles.length === 0 ? (
        <p className="mt-8 max-w-[46ch] border-l-2 border-ko-blue pl-4 text-base leading-relaxed text-ko-muted">
          {libelles.aucunResultat}
        </p>
      ) : vue === 'grille' ? (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((produit) => (
            <CarteProduitLocation
              key={produit.id}
              produit={produit}
              locale={locale}
              prixSurDemande={libelles.prixSurDemande}
              libelleCategorie={libelleCategorie}
            />
          ))}
        </div>
      ) : (
        <div className="mt-8">
          {/* En-tête de colonnes — le repère « classé » d'un gestionnaire de
              fichiers. Décoratif : masqué sous sm, où les lignes se replient. */}
          <div className="hidden items-center gap-5 border-y border-ko-line px-2 py-3 sm:flex">
            <span className="label-mono flex-1">{libelles.colonneEquipement}</span>
            <span className="label-mono w-28 text-right">{libelles.colonnePrix}</span>
            <span className="w-[150px]" aria-hidden="true" />
          </div>

          <ul>
            {visibles.map((produit) => {
              const nom = nomDe(produit)
              const alt = (locale === 'en' ? produit.image_alt_en : produit.image_alt_fr) || nom
              return (
                <li
                  key={produit.id}
                  className="group border-b border-ko-line transition-colors duration-200 hover:bg-ko-cream"
                >
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-2 py-4">
                    {/* Vignette ET nom dans une seule ancre : deux liens voisins
                        vers la même fiche seraient annoncés deux fois. */}
                    <Link
                      href={routeProduitLocation(produit.slug)}
                      className="flex min-w-0 flex-[1_1_260px] items-center gap-5"
                    >
                      {/* `object-cover` : à cette taille la vignette doit être
                          pleine et toutes identiques. La photo entière reste
                          visible sur la carte et sur la fiche produit. */}
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden border border-ko-line bg-ko-cream">
                        {produit.image_url ? (
                          <Image
                            src={produit.image_url}
                            alt={alt}
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        ) : (
                          <PhotoPlaceholder ratio="aspect-square" className="h-full w-full" />
                        )}
                      </div>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base text-ko-ink underline decoration-transparent underline-offset-4 transition-colors duration-200 group-hover:decoration-ko-blue">
                          {nom}
                        </span>
                        {produit.resume && (
                          <span className="mt-1 block truncate text-sm leading-relaxed text-ko-muted">
                            {produit.resume}
                          </span>
                        )}
                      </span>
                    </Link>

                    <span className="shrink-0 font-mono text-sm text-ko-ink sm:w-28 sm:text-right">
                      {produit.prix != null ? `${produit.prix} $` : libelles.prixSurDemande}
                    </span>

                    <div className="w-full shrink-0 sm:w-[150px]">
                      <BoutonAjouterLocation
                        slug={produit.slug}
                        nom={nom}
                        categorie={libelleCategorie}
                        libelleCourt
                      />
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

/**
 * Bouton de bascule d'affichage — filet 1px, aucun aplat au repos (skill 08).
 *
 * `aria-pressed` et non `aria-selected` : ce sont des bascules, pas un
 * `tablist`. Actif = fond bleu + texte NOIR, jamais blanc (la paire blanc sur
 * `--ko-blue` échoue le contraste, voir CLAUDE.md). L'icône seule ne porte pas
 * le sens : `aria-label` et `title` le disent.
 */
function BoutonVue({
  actif,
  onClick,
  libelle,
  children,
}: {
  actif: boolean
  onClick: () => void
  libelle: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      aria-label={libelle}
      title={libelle}
      className={cn(
        'flex min-h-[44px] min-w-[44px] items-center justify-center border transition-colors duration-200',
        actif
          ? 'border-ko-blue bg-ko-blue text-ko-black'
          : 'border-ko-line text-ko-ink hover:border-ko-blue',
      )}
    >
      {children}
    </button>
  )
}
