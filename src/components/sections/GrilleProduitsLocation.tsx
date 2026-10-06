import Image from 'next/image'

import { BoutonAjouterLocation } from '@/components/sections/BoutonAjouterLocation'
import { PhotoPlaceholder } from '@/components/ui/PhotoPlaceholder'

import type { ProduitLocation } from '@/lib/location-produits'

/**
 * Grille des produits de location — alimentée par `articles_location`
 * (synchronisation Rentman). Première version : une carte par produit,
 * groupées par catégorie.
 *
 * ---------------------------------------------------------------------------
 * `next/image`, ET POURQUOI ÇA RÉPOND À LA QUESTION DE LA COMPRESSION
 *
 * La photo est stockée au format synchronisé (≈ 400 Ko après la compression de
 * la synchro). `next/image` la RÉOPTIMISE à l'affichage : il sert au
 * navigateur une version WebP/AVIF redimensionnée à la taille réelle de la
 * vignette (quelques dizaines de Ko), et pas le fichier stocké. Le poids
 * stocké n'est donc pas ce que le visiteur télécharge — l'optimisation « à
 * l'affichage » demandée le 5 octobre 2026. Le host du bucket est déjà
 * autorisé dans `remotePatterns` (next.config.ts).
 *
 * `sizes` décrit la largeur réelle de la carte selon l'écran, pour que Next
 * choisisse la bonne résolution : pleine largeur sur mobile, moitié en sm,
 * tiers en lg — exactement la grille ci-dessous.
 */

export type LibellesGrilleLocation = {
  /** Titre de section par catégorie, ex. { mobilier: 'Mobilier', … }. */
  categories: Record<string, string>
  prixSurDemande: string
}

const SIZES = '(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw'

function Carte({
  produit,
  locale,
  libelles,
}: {
  produit: ProduitLocation
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
      <div className="relative aspect-[4/5] overflow-hidden bg-ko-cream">
        {produit.image_url ? (
          <Image
            src={produit.image_url}
            alt={alt}
            fill
            sizes={SIZES}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          // Pas de photo sur la fiche Rentman : le placeholder du site, jamais
          // une carte vide. Même ratio que l'image pour ne pas décaler la grille.
          <PhotoPlaceholder ratio="aspect-[4/5]" className="h-full w-full" />
        )}
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="text-base leading-snug text-ko-ink">{nom}</h3>

        <p className="mt-1.5 font-mono text-sm text-ko-muted">
          {produit.prix != null ? `${produit.prix} $` : libelles.prixSurDemande}
        </p>

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
  groupes: Array<{ categorie: string; produits: ProduitLocation[] }>
  locale: string
  libelles: LibellesGrilleLocation
}) {
  return (
    <div className="space-y-14">
      {groupes.map(({ categorie, produits }) => (
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
  )
}
