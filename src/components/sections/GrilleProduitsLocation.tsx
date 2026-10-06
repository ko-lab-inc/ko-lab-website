'use client'

import Image from 'next/image'
import { useState } from 'react'

import { BoutonAjouterLocation } from '@/components/sections/BoutonAjouterLocation'
import { PhotoPlaceholder } from '@/components/ui/PhotoPlaceholder'
import { Link } from '@/i18n/navigation'
import { routeProduitLocation } from '@/lib/routes'
import { cn } from '@/lib/utils/cn'

import type { ProduitCarte } from '@/lib/location-produits'

/**
 * Grille des produits de location — alimentée par `articles_location`
 * (synchronisation Rentman), groupée par catégorie, avec filtre.
 *
 * ---------------------------------------------------------------------------
 * COMPOSANT CLIENT, MAIS SANS useTranslations
 *
 * Il est client pour porter l'état du filtre. Ses libellés arrivent en PROPS,
 * résolus côté serveur par la page — c'est le modèle que le layout marketing
 * désigne comme à privilégier (voir sa note sur CatalogueBoutique) : aucun
 * espace de noms à ajouter à la liste blanche, aucun catalogue de traductions
 * sérialisé en plus.
 *
 * Ce qu'on lui passe est sérialisé dans le HTML : d'où `ProduitCarte`
 * (lib/location-produits.ts) et non `ProduitLocation` entier.
 *
 * ---------------------------------------------------------------------------
 * `next/image`, ET POURQUOI ÇA RÉPOND À LA QUESTION DE LA COMPRESSION
 *
 * La photo est stockée au format synchronisé (≈ 400 Ko après la compression de
 * la synchro). `next/image` la RÉOPTIMISE à l'affichage : il sert au
 * navigateur une version WebP/AVIF redimensionnée à la taille réelle de la
 * vignette (quelques dizaines de Ko), et pas le fichier stocké. Le host du
 * bucket est déjà autorisé dans `remotePatterns` (next.config.ts).
 */

export type LibellesGrilleLocation = {
  /** Titre de section par catégorie, ex. { mobilier: 'Mobilier', … }. */
  categories: Record<string, string>
  prixSurDemande: string
  /** Libellé du filtre « toutes catégories ». */
  filtreTout: string
  /** `aria-label` du groupe de filtres. */
  filtreLabel: string
}

const SIZES = '(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw'

type Groupe = { categorie: string; produits: ProduitCarte[] }

function Carte({
  produit,
  locale,
  libelles,
}: {
  produit: ProduitCarte
  locale: string
  libelles: LibellesGrilleLocation
}) {
  const nom = (locale === 'en' ? produit.nom_en : produit.nom_fr) || produit.nom_fr
  const alt = (locale === 'en' ? produit.image_alt_en : produit.image_alt_fr) || nom

  return (
    <article className="group flex flex-col border border-ko-line bg-ko-white">
      {/* ⚠️ RATIO PORTRAIT (4/5), PAS PAYSAGE.
          Les photos de Roxanne sont prises au téléphone en PORTRAIT (1600×2133,
          un ratio 3/4), et le produit est souvent dans le BAS de l'image (on
          regarde dans un bac : le rebord vide en haut, le contenu en dessous).
          Un cadre paysage 4/3 + object-cover coupait une bande horizontale au
          milieu — donc surtout le vide, pas le produit (constaté le
          5 octobre 2026). Un cadre 4/5 montre ~94 % de la photo portrait :
          le produit redevient visible, sans trop allonger la carte. */}
      {/* Photo ET titre dans UNE seule ancre vers la fiche produit : deux liens
          voisins vers la même page seraient annoncés deux fois par un lecteur
          d'écran. Son nom accessible vient du titre qu'elle contient, pas de
          l'image. Le bouton d'ajout reste DEHORS — un <button> dans un <a> est
          du HTML invalide. */}
      <Link href={routeProduitLocation(produit.slug)} className="flex flex-col">
        {/* ⚠️ `object-contain`, PAS `object-cover` — changé le 6 octobre 2026.
            Les photos n'ont pas toutes le même rapport (mesuré ce jour-là sur
            les 14 photos publiées : onze portraits 3/4, un 2/3, une paysage
            4/3, une carrée). Un cadre unique en `cover` rognait jusqu'à 40 %
            de la largeur de la photo paysage et coupait le produit sur les
            autres. `contain` montre TOUTE la photo quel que soit son rapport.
            Le cadre suit le rapport dominant (3/4) : les onze portraits le
            remplissent exactement, seules les deux photos hors format laissent
            une bande. */}
        <div className="relative aspect-[3/4] overflow-hidden bg-ko-cream">
          {produit.image_url ? (
            <Image
              src={produit.image_url}
              alt={alt}
              fill
              sizes={SIZES}
              className="object-contain transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            // Pas de photo sur la fiche Rentman : le placeholder du site, jamais
            // une carte vide. Même ratio que l'image pour ne pas décaler la grille.
            <PhotoPlaceholder ratio="aspect-[3/4]" className="h-full w-full" />
          )}
        </div>

        <div className="p-4 pb-0 sm:p-5 sm:pb-0">
          <h3 className="text-base leading-snug text-ko-ink underline decoration-transparent underline-offset-4 transition-colors duration-200 group-hover:decoration-ko-blue">
            {nom}
          </h3>

          <p className="mt-1.5 font-mono text-sm text-ko-muted">
            {produit.prix != null ? `${produit.prix} $` : libelles.prixSurDemande}
          </p>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4 pt-0 sm:p-5 sm:pt-0">

        {/* `mt-auto` : le bouton reste collé en bas quelle que soit la hauteur
            du nom, pour que tous les boutons d'une rangée s'alignent.
            « Ajouter à ma demande » : l'action centrale du modèle de la
            référence (Black Tie) — on constitue une liste avant d'envoyer une
            seule demande groupée, au lieu d'une demande par produit. */}
        <div className="mt-auto pt-4">
          <BoutonAjouterLocation
            slug={produit.slug}
            nom={nom}
            categorie={libelles.categories[produit.categorie] ?? produit.categorie}
          />
        </div>
      </div>
    </article>
  )
}

export function GrilleProduitsLocation({
  groupes,
  locale,
  libelles,
}: {
  groupes: Groupe[]
  locale: string
  libelles: LibellesGrilleLocation
}) {
  /** `null` = toutes les catégories. */
  const [filtre, setFiltre] = useState<string | null>(null)

  const total = groupes.reduce((n, g) => n + g.produits.length, 0)
  const visibles = filtre === null ? groupes : groupes.filter((g) => g.categorie === filtre)

  return (
    <div>
      {/* Filtre masqué sous deux catégories : un unique bouton « Tout » à côté
          d'un seul choix ne filtre rien et n'est qu'un ornement (skill 08). */}
      {groupes.length > 1 && (
        <div
          role="group"
          aria-label={libelles.filtreLabel}
          className="mb-10 flex flex-wrap gap-2 border-b border-ko-line pb-6"
        >
          <Puce actif={filtre === null} onClick={() => setFiltre(null)}>
            {libelles.filtreTout} ({total})
          </Puce>

          {groupes.map((g) => (
            <Puce
              key={g.categorie}
              actif={filtre === g.categorie}
              onClick={() => setFiltre(g.categorie)}
            >
              {libelles.categories[g.categorie] ?? g.categorie} ({g.produits.length})
            </Puce>
          ))}
        </div>
      )}

      <div className="space-y-14">
        {visibles.map(({ categorie, produits }) => (
          <section key={categorie} aria-labelledby={`cat-${categorie}`}>
            <h2
              id={`cat-${categorie}`}
              className="ko-h3 mb-6 text-[clamp(20px,2.4vw,26px)] text-ko-ink"
            >
              {libelles.categories[categorie] ?? categorie}
            </h2>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {produits.map((produit) => (
                <Carte key={produit.id} produit={produit} locale={locale} libelles={libelles} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

/**
 * Puce de filtre — filet 1px, aucun fond coloré à l'état inactif (skill 08).
 *
 * `aria-pressed` et non `aria-selected` : ce sont des boutons bascule
 * indépendants, pas un `tablist`. Actif = fond bleu + texte NOIR, jamais blanc
 * — la paire blanc sur `--ko-blue` échoue le contraste (CLAUDE.md).
 */
function Puce({
  actif,
  onClick,
  children,
}: {
  actif: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={cn(
        'min-h-[44px] border px-4 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors duration-200',
        actif
          ? 'border-ko-blue bg-ko-blue text-ko-black'
          : 'border-ko-line text-ko-ink hover:border-ko-blue',
      )}
    >
      {children}
    </button>
  )
}
