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

import type { ProduitCarte } from '@/lib/location-produits'

/**
 * Catalogue d'UNE catégorie — recherche rapide et bascule liste / carrés.
 *
 * Demandé par le boss le 10 octobre 2026 : « présentés en liste comme dans
 * Drive, avec l'option de les passer en carré comme maintenant, et une barre
 * de recherche rapide ». La LISTE est donc la vue par défaut ; les carrés
 * (l'ancienne grille) restent à un clic.
 *
 * ---------------------------------------------------------------------------
 * COMPOSANT CLIENT, MAIS SANS useTranslations
 *
 * Il est client pour porter deux états : la vue et le texte cherché. Ses
 * libellés arrivent en PROPS, résolus côté serveur par la page — modèle que le
 * layout marketing désigne comme à privilégier : aucun espace de noms à ajouter
 * à la liste blanche, aucun catalogue de traductions sérialisé en plus.
 *
 * Le rendu reste pré-rendu côté serveur (Next rend aussi les composants client
 * au premier paint) : la liste des produits est bien dans le HTML, donc
 * indexable, même avant l'hydratation.
 *
 * ⚠️ UN SEUL bouton d'ajout par produit dans le DOM. Pas de variante « mobile »
 * masquée en CSS : `hidden` laisserait un second bouton vivant, invisible mais
 * bien présent pour un lecteur d'écran (même règle que BoutonAjouterLocation).
 * La mise en page s'adapte par `flex-wrap`, pas par duplication.
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
}

type Vue = 'liste' | 'grille'

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
  produits: ProduitCarte[]
  locale: string
  /** Nom TRADUIT de la catégorie — rangé tel quel dans la demande. */
  libelleCategorie: string
  libelles: LibellesCatalogueCategorie
}) {
  const [vue, setVue] = useState<Vue>('liste')
  const [recherche, setRecherche] = useState('')

  const nomDe = (p: ProduitCarte) => (locale === 'en' ? p.nom_en : p.nom_fr) || p.nom_fr

  const visibles = useMemo(() => {
    const q = normaliser(recherche.trim())
    if (q === '') return produits
    // Les deux langues sont fouillées : un nom n'est pas toujours traduit, et
    // l'équipe cherche parfois le terme anglais sur la page française.
    return produits.filter((p) =>
      normaliser(`${p.nom_fr} ${p.nom_en ?? ''}`).includes(q),
    )
  }, [produits, recherche])

  return (
    <div>
      {/* ------------------------------- Barre ------------------------------- */}
      <div className="mb-8 flex flex-wrap items-center gap-3 border-b border-ko-line pb-6">
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

      {/* ------------------------------ Résultats ----------------------------- */}
      {visibles.length === 0 ? (
        <p
          // `polite` : annoncé après la frappe, sans couper la saisie en cours.
          aria-live="polite"
          className="max-w-[46ch] border-l-2 border-ko-blue pl-4 text-base leading-relaxed text-ko-muted"
        >
          {libelles.aucunResultat}
        </p>
      ) : vue === 'grille' ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
        <div>
          {/* En-tête de colonnes — le repère « classé » d'un gestionnaire de
              fichiers. Décoratif : masqué sous sm, où les lignes se replient. */}
          <div className="hidden items-center gap-4 border-b border-ko-line pb-3 sm:flex">
            <span className="label-mono flex-1">{libelles.colonneEquipement}</span>
            <span className="label-mono w-24 text-right">{libelles.colonnePrix}</span>
            <span className="w-[190px]" aria-hidden="true" />
          </div>

          <ul>
            {visibles.map((produit) => {
              const nom = nomDe(produit)
              const alt =
                (locale === 'en' ? produit.image_alt_en : produit.image_alt_fr) || nom
              return (
                <li key={produit.id} className="border-b border-ko-line">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-3 py-3">
                    {/* Vignette ET nom dans une seule ancre : deux liens voisins
                        vers la même fiche seraient annoncés deux fois. */}
                    <Link
                      href={routeProduitLocation(produit.slug)}
                      className="group flex min-w-0 flex-[1_1_220px] items-center gap-4"
                    >
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden border border-ko-line bg-ko-cream">
                        {produit.image_url ? (
                          <Image
                            src={produit.image_url}
                            alt={alt}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        ) : (
                          <PhotoPlaceholder ratio="aspect-square" className="h-full w-full" />
                        )}
                      </div>

                      <span className="min-w-0 flex-1 truncate text-base text-ko-ink underline decoration-transparent underline-offset-4 transition-colors duration-200 group-hover:decoration-ko-blue">
                        {nom}
                      </span>
                    </Link>

                    <span className="shrink-0 font-mono text-sm text-ko-muted sm:w-24 sm:text-right">
                      {produit.prix != null ? `${produit.prix} $` : libelles.prixSurDemande}
                    </span>

                    <div className="w-full shrink-0 sm:w-[190px]">
                      <BoutonAjouterLocation
                        slug={produit.slug}
                        nom={nom}
                        categorie={libelleCategorie}
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
