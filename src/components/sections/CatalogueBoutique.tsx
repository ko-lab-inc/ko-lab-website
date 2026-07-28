'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

import { PhotoPlaceholder } from '@/components/ui/PhotoPlaceholder'
import { buttonVariants } from '@/components/ui/Button'
import { usePanier } from '@/lib/panier/PanierContext'
import { Link } from '@/i18n/navigation'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils/cn'

/**
 * Catalogue filtrable — skill 21, phase 1 : commande accompagnée, sans panier.
 *
 * Structure inspirée d'une grille marchande (filtres, grille, prix lisible),
 * mais traitée au vocabulaire KO-LAB : filets 1px, aucune pastille colorée,
 * Fraunces pour les noms, bleu en accent unique. Le skill 08 range
 * explicitement le registre e-commerce générique dans les interdits.
 *
 * Absents volontairement : double bouton, étoiles, badge « nouveau », prix
 * barré, pagination. Aucun n'apporte d'information ici.
 */

export type ProduitCarte = {
  slug: string
  categorie: string
  nom: string
  texte: string
  /** URL d'image, ou null pour un emplacement réservé. */
  src: string | null
}

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

/**
 * Ajout à la demande groupée.
 *
 * Une fois le produit retenu, le bouton passe en état « Ajouté » et se
 * désactive : ré-appuyer incrémenterait la quantité sans retour visible, ce qui
 * se lit comme un bug. La quantité se règle sur la page de demande, où elle est
 * visible.
 */
function BoutonAjouter({
  slug,
  nom,
  categorie,
}: {
  slug: string
  nom: string
  categorie: string
}) {
  const t = useTranslations('Panier')
  const { ajouter, contient, pret } = usePanier()

  const dejaDedans = pret && contient(slug)

  return (
    <button
      type="button"
      onClick={() => ajouter({ slug, nom, categorie })}
      disabled={dejaDedans}
      className={cn(
        buttonVariants({ variant: 'primary', size: 'sm' }),
        'mt-auto w-full',
        dejaDedans && 'pointer-events-none',
      )}
    >
      {dejaDedans ? t('ajoute') : t('ajouter')}
      {!dejaDedans && <span aria-hidden="true">+</span>}
    </button>
  )
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
  const [categorie, setCategorie] = useState('all')

  const visibles = useMemo(
    () => produits.filter((p) => categorie === 'all' || p.categorie === categorie),
    [produits, categorie],
  )

  return (
    <>
      {/* ------------------------------ Filtres ------------------------------ */}
      {/* Au-dessus de la grille et non en colonne latérale : une barre de
          filtres à gauche est la signature visuelle d'une boutique en ligne,
          registre que le skill 08 écarte. Même traitement que Réalisations. */}
      <div role="group" aria-label={labelFiltres} className="flex flex-wrap gap-2">
        {filtres.map(({ valeur, label }) => {
          const actif = valeur === categorie

          return (
            <button
              key={valeur}
              type="button"
              onClick={() => setCategorie(valeur)}
              aria-pressed={actif}
              className={cn(
                'min-h-[44px] rounded-sm border px-5 text-sm transition-colors duration-250',
                actif
                  ? 'border-ko-blue bg-ko-blue text-ko-white'
                  : 'border-ko-line text-ko-ink hover:border-ko-ink',
              )}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* ------------------------------ Grille ------------------------------ */}
      {visibles.length === 0 ? (
        <p className="mt-14 text-base text-ko-muted">{aucunResultat}</p>
      ) : (
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((produit) => (
            <article
              key={produit.slug}
              className="group flex flex-col border border-ko-line bg-ko-white transition-colors duration-250 hover:border-ko-blue"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-ko-cream2">
                {produit.src ? (
                  <Image
                    src={produit.src}
                    alt=""
                    fill
                    quality={80}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-[400ms] group-hover:scale-[1.03]"
                  />
                ) : (
                  // Emplacement réservé plutôt qu'une photo de stock approchante :
                  // sur une fiche produit, une image générique désigne un autre
                  // objet que celui nommé (skill 22).
                  <PhotoPlaceholder ratio="aspect-[4/3]" label={photoPlaceholder} />
                )}
              </div>

              <div className="flex flex-1 flex-col p-6">
                {/* Catégorie en mono nu — pas de pastille colorée (skill 08). */}
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ko-blue">
                  {filtres.find((f) => f.valeur === produit.categorie)?.label ?? produit.categorie}
                </p>

                <h3 className="mt-3 font-serif text-[20px] leading-tight text-ko-ink">
                  {produit.nom}
                </h3>

                {/* line-clamp-2 : deux lignes maximum, pour que toutes les
                    cartes d'une rangée gardent la même hauteur de texte. */}
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ko-muted">
                  {produit.texte}
                </p>

                {/* mt-auto : prix et bouton alignés d'une carte à l'autre,
                    quelle que soit la longueur du nom. */}
                {/* Prix sur demande — jamais de montant, jamais de total.
                    Le mt-auto est porté par le bouton d'ajout juste en dessous. */}
                <p className="label-mono mt-6 pb-4">{prixSurDemande}</p>

                {/* Deux chemins distincts, pas un doublon :
                    « Ajouter » constitue une demande groupée, « Demander un
                    prix » part immédiatement pour ce seul produit. */}
                <BoutonAjouter
                  slug={produit.slug}
                  nom={produit.nom}
                  categorie={
                    filtres.find((f) => f.valeur === produit.categorie)?.label ?? produit.categorie
                  }
                />

                <Link
                  href={`${ROUTES.contact}?type=boutique&produit=${produit.slug}`}
                  className={`mt-3 ${buttonVariants({ variant: 'ghost', size: 'sm' })}`}
                >
                  {demanderPrix}
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
