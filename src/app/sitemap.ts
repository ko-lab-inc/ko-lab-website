import { lireProduitsPublies } from '@/lib/produits'
import { ROUTES, ROUTES_CAPACITES } from '@/lib/routes'

import type { MetadataRoute } from 'next'

/**
 * Sitemap XML — n'existait pas du tout avant ce fichier.
 *
 * Même repli que `metadataBase` dans le layout marketing
 * (`(marketing)/[locale]/layout.tsx`) : `NEXT_PUBLIC_SITE_URL` en priorité,
 * `ko-lab-center.ca` sinon. Un sitemap qui pointerait vers `localhost:3000`
 * en production serait pire que son absence.
 */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ko-lab-center.ca'

/**
 * Site francophone uniquement (routing.ts) : toutes les URL publiques
 * partagent le préfixe `/fr`. `/` n'a pas de forme locale-préfixée séparée à
 * lister — `ROUTES.accueil` ('/') devient simplement `/fr`.
 */
function url(chemin: string): string {
  return `${siteUrl}/fr${chemin === ROUTES.accueil ? '' : chemin}`
}

/**
 * Pages de contenu public, exclusion volontaire des pages utilitaires
 * (connexion, inscription, panier, étapes de commande) : aucune valeur de
 * référencement propre, et certaines dépendent d'une session — les mêmes
 * chemins sont bloqués dans `robots.ts`.
 */
const ROUTES_STATIQUES = [
  ROUTES.accueil,
  ROUTES.capacites,
  ...ROUTES_CAPACITES.map((r) => r.href),
  ROUTES.realisations,
  ROUTES.location,
  ROUTES.boutique,
  ROUTES.apropos,
  ROUTES.carrieres,
  ROUTES.contact,
  ROUTES.politiqueConfidentialite,
  ROUTES.conditionsUtilisation,
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Une fiche produit par produit PUBLIÉ — un produit incomplet ou hors
  // ligne ne doit pas apparaître dans le sitemap, même règle que sur la page
  // boutique elle-même (lireProduitsPublies filtre déjà `publie = true`).
  const produits = await lireProduitsPublies()

  return [
    ...ROUTES_STATIQUES.map((chemin) => ({
      url: url(chemin),
      lastModified: new Date(),
    })),
    ...produits.map((p) => ({
      url: url(`${ROUTES.boutique}/${p.slug}`),
      lastModified: new Date(),
    })),
  ]
}
