import Image from 'next/image'

import { BoutonAjouterLocation } from '@/components/sections/BoutonAjouterLocation'
import { PhotoPlaceholder } from '@/components/ui/PhotoPlaceholder'
import { Link } from '@/i18n/navigation'
import { routeProduitLocation } from '@/lib/routes'

import type { ProduitCarte } from '@/lib/location-produits'

/**
 * Carte d'un produit de location — vignette du catalogue.
 *
 * ---------------------------------------------------------------------------
 * COMPOSANT SERVEUR (pas de `'use client'`)
 *
 * Elle n'a aucun état propre : photo, titre et prix sont du rendu statique. Le
 * seul morceau interactif est `BoutonAjouterLocation` (client), qu'un composant
 * serveur peut rendre sans problème. La garder serveur évite d'embarquer la
 * carte entière dans le bundle client — seul le bouton y part.
 *
 * Extraite de l'ancien `GrilleProduitsLocation` le 9 octobre 2026, quand
 * /location est passée au parcours à deux niveaux (catégories en photos, puis
 * page par catégorie). Source UNIQUE de la vignette, pour que les règles de
 * cadrage photo ci-dessous ne vivent qu'à un seul endroit.
 *
 * ---------------------------------------------------------------------------
 * `next/image` réoptimise la photo stockée (≈ 400 Ko après la synchro) en une
 * version WebP/AVIF à la taille réelle de la vignette. L'hôte du bucket est
 * autorisé dans `remotePatterns` (next.config.ts).
 */

const SIZES = '(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw'

export function CarteProduitLocation({
  produit,
  locale,
  prixSurDemande,
  libelleCategorie,
}: {
  produit: ProduitCarte
  locale: string
  prixSurDemande: string
  /** Nom TRADUIT de la catégorie — rangé tel quel dans la demande, pour que
   *  l'équipe lise « Mobilier » et non « mobilier ». */
  libelleCategorie: string
}) {
  const nom = (locale === 'en' ? produit.nom_en : produit.nom_fr) || produit.nom_fr
  const alt = (locale === 'en' ? produit.image_alt_en : produit.image_alt_fr) || nom

  return (
    <article className="group flex flex-col border border-ko-line bg-ko-white">
      {/* Photo ET titre dans UNE seule ancre vers la fiche produit : deux liens
          voisins vers la même page seraient annoncés deux fois par un lecteur
          d'écran. Le bouton d'ajout reste DEHORS — un <button> dans un <a> est
          du HTML invalide. */}
      <Link href={routeProduitLocation(produit.slug)} className="flex flex-col">
        {/* ⚠️ `object-contain` sur un cadre 3/4 — les photos n'ont pas toutes le
            même rapport (onze portraits 3/4, un 2/3, une paysage, une carrée au
            6 octobre 2026). `cover` rognait jusqu'à 40 % de la photo paysage et
            coupait le produit sur les autres ; `contain` montre TOUTE la photo.
            Le cadre suit le rapport dominant (3/4). */}
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
            <PhotoPlaceholder ratio="aspect-[3/4]" className="h-full w-full" />
          )}
        </div>

        <div className="p-4 pb-0 sm:p-5 sm:pb-0">
          <h3 className="text-base leading-snug text-ko-ink underline decoration-transparent underline-offset-4 transition-colors duration-200 group-hover:decoration-ko-blue">
            {nom}
          </h3>

          <p className="mt-1.5 font-mono text-sm text-ko-muted">
            {produit.prix != null ? `${produit.prix} $` : prixSurDemande}
          </p>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4 pt-0 sm:p-5 sm:pt-0">
        {/* `mt-auto` : le bouton reste collé en bas quelle que soit la hauteur
            du nom, pour que tous les boutons d'une rangée s'alignent. */}
        <div className="mt-auto pt-4">
          <BoutonAjouterLocation slug={produit.slug} nom={nom} categorie={libelleCategorie} />
        </div>
      </div>
    </article>
  )
}
