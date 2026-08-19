import { DOMAINE } from '@/lib/constantes'

import type { MetadataRoute } from 'next'

/** Même repli que sitemap.ts et le layout marketing — voir lib/constantes.ts. */
const siteUrl = DOMAINE

/**
 * robots.txt — n'existait pas du tout avant ce fichier.
 *
 * Sans lui, rien n'empêchait un robot d'indexer /admin ou /compte : aucune
 * donnée n'y fuirait (RLS + garde de rôle protègent déjà l'accès), mais des
 * pages de connexion et des tableaux vides indexés n'apportent rien et
 * diluent le budget de crawl des vraies pages de contenu.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/fr/admin',
        '/fr/compte',
        '/api',
        '/fr/connexion',
        '/fr/inscription',
        '/fr/mot-de-passe-oublie',
        '/fr/mot-de-passe',
        '/fr/boutique/commande',
        '/fr/boutique/demande',
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
