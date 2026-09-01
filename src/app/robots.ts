import { DOMAINE } from '@/lib/constantes'
import { lireReglages } from '@/lib/reglages'

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
// Phase 9 : chaque chemin utilitaire existe aussi sous /en/... (routing.ts) —
// même raison de le bloquer dans les deux langues, les URLs anglaises ne sont
// pas traduites (routes.ts reste dans sa forme française, seul le préfixe de
// locale change).
const CHEMINS_UTILITAIRES = [
  '/admin',
  '/compte',
  '/connexion',
  '/inscription',
  '/mot-de-passe-oublie',
  '/mot-de-passe',
  '/boutique/commande',
  '/boutique/demande',
]

export default async function robots(): Promise<MetadataRoute.Robots> {
  const reglages = await lireReglages()

  // Boutique et concours désactivés (0029, 0040) : leurs routes répondent
  // déjà 404 (layout.tsx respectif), mais un robot qui les avait déjà
  // indexées avant la bascule doit être explicitement informé de ne plus
  // les explorer — /boutique/commande et /boutique/demande restent listés
  // séparément, sans conséquence à les redire.
  const chemins = [
    ...CHEMINS_UTILITAIRES,
    ...(reglages.boutiqueActive ? [] : ['/boutique']),
    ...(reglages.concoursActif ? [] : ['/concours']),
  ]

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // /mission-nerf : nu, comme /api — cette route vit hors du système de
      // locale (Mission NERF, Prompt 1), un préfixe /fr ou /en ne
      // s'appliquerait à rien de réel ici.
      disallow: [
        '/api',
        '/mission-nerf',
        ...chemins.flatMap((chemin) => [`/fr${chemin}`, `/en${chemin}`]),
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
