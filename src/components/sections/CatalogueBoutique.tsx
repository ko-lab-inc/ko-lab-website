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
 * traitement anti-générique habituel, skill 08) : rubans de badge, prix
 * visible, cartes cliquables vers une fiche produit. Reste au vocabulaire
 * KO-LAB : filets 1px, Fraunces pour les noms, bleu en accent unique — pas de
 * pastille multicolore ni d'ornement décoratif au-delà de ce que Christian a
 * validé.
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
    <>
      {/* ------------------------------ Filtres ------------------------------ */}
      {/* Au-dessus de la grille et non en colonne latérale : une barre de
          filtres à gauche est la signature visuelle d'une boutique en ligne,
          registre que le skill 08 écarte. Même traitement que Réalisations. */}
      {/* Recherche au-dessus des filtres : c'est l'entrée la plus directe,
          et elle reste utilisable au clavier sans passer par les catégories. */}
      <label htmlFor="recherche-boutique" className="sr-only">
        {t('recherche_label')}
      </label>
      <input
        id="recherche-boutique"
        type="search"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder={t('recherche_placeholder')}
        className="mb-6 w-full min-h-[44px] max-w-md border border-ko-line bg-ko-white px-4 py-3 text-base text-ko-ink transition-colors duration-200 placeholder:text-ko-muted focus:border-ko-blue focus:outline-none"
      />

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
      {/*
        Conteneur normal de la page (max-w-container, gap-5) — la version
        pleine largeur essayée plus tôt se lisait trop dense/trop large,
        revenue en arrière sur retour de Christian.
      */}
      {visibles.length === 0 ? (
        <p className="mt-14 text-base text-ko-muted">{messageVide}</p>
      ) : (
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((produit) => {
            const nomCategorie =
              filtres.find((f) => f.valeur === produit.categorie)?.label ?? produit.categorie

            return (
              <article
                key={produit.slug}
                className="group flex flex-col border border-ko-line bg-ko-white transition-colors duration-250 hover:border-ko-blue"
              >
                {/* Photo cliquable vers la fiche produit — anchor séparée de
                    celle du titre plus bas : deux cibles identiques sur une
                    même carte est un motif courant et sans ambiguïté au
                    clavier ou au lecteur d'écran (chacune est autonome). */}
                <Link
                  href={routeProduit(produit.slug)}
                  className="relative block aspect-[4/3] overflow-hidden bg-ko-cream2"
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
                </Link>

                <div className="flex flex-1 flex-col p-6">
                  {/* `contents` : ce Link disparaît de la boîte, ses enfants
                      restent des enfants directs de la colonne flex — sinon
                      le prix et le bouton, hors du lien, se retrouveraient
                      mal alignés dans une boîte à part. */}
                  <Link href={routeProduit(produit.slug)} className="contents">
                    {/* Catégorie en mono nu — pas de pastille colorée (skill 08). */}
                    <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ko-blue">
                      {nomCategorie}
                    </p>

                    <h3 className="mt-3 font-serif text-[20px] leading-tight text-ko-ink transition-colors duration-200 group-hover:text-ko-blue">
                      {produit.nom}
                    </h3>

                    {/* line-clamp-2 : deux lignes maximum, pour que toutes les
                        cartes d'une rangée gardent la même hauteur de texte. */}
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ko-muted">
                      {produit.texte}
                    </p>

                    {/* Rend la destination explicite : le survol du titre seul
                        (changement de couleur) ne suffit pas à annoncer
                        qu'une carte entière est cliquable. */}
                    <span className="mt-3 inline-flex items-center gap-2 text-sm text-ko-blue">
                      {t('voir_produit')}
                      <span aria-hidden="true">→</span>
                    </span>
                  </Link>

                  {/*
                    Prix indicatif visible — changement de direction assumé
                    (Bambu Store en référence). `prixIndicatif` reste un champ
                    numérique structuré : un vrai prix Supabase le remplacera
                    sans toucher au format d'affichage. `null` retombe sur
                    l'ancien "Prix sur demande", pour le cas où le panier est
                    désactivé (PANIER_ACTIF) et où aucun CTA de rechange
                    n'existe encore sur cette carte précise.
                  */}
                  {produit.prixIndicatif !== null ? (
                    <p className="mt-6 font-mono text-sm text-ko-ink">
                      {t('a_partir_de', {
                        prix: format.number(produit.prixIndicatif, {
                          style: 'currency',
                          currency: 'CAD',
                          maximumFractionDigits: 0,
                        }),
                      })}
                    </p>
                  ) : (
                    <p className="label-mono mt-6">{prixSurDemande}</p>
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
                    <BoutonAjouter
                      slug={produit.slug}
                      nom={produit.nom}
                      categorie={nomCategorie}
                      className="mt-auto"
                    />
                  ) : (
                    <Link
                      href={`${ROUTES.contact}?type=boutique&produit=${produit.slug}`}
                      className={cn('mt-auto', buttonVariants({ variant: 'primary', size: 'sm' }))}
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
    </>
  )
}
