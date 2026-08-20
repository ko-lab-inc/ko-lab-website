import { DOMAINE } from '@/lib/constantes'
import { lireProduitsPublies } from '@/lib/produits'
import { ROUTES, ROUTES_CAPACITES } from '@/lib/routes'

import type { MetadataRoute } from 'next'

/**
 * Sitemap XML — n'existait pas du tout avant ce fichier.
 *
 * Même repli que `metadataBase` dans le layout marketing
 * (`(marketing)/[locale]/layout.tsx`) : `NEXT_PUBLIC_SITE_URL` en priorité,
 * `ko-lab-center.ca` sinon (voir lib/constantes.ts). Un sitemap qui
 * pointerait vers `localhost:3000` en production serait pire que son
 * absence.
 */
const siteUrl = DOMAINE

/** `ROUTES.accueil` ('/') devient `/fr` ou `/en` sans segment de chemin en plus. */
function url(chemin: string, locale: 'fr' | 'en'): string {
  return `${siteUrl}/${locale}${chemin === ROUTES.accueil ? '' : chemin}`
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

/**
 * Phase 9 : SEULES ces routes ont un contenu anglais réel aujourd'hui. Leur
 * donner un hreflang vers /en/... est vrai. En donner un à une page dont
 * /en/... sert encore le texte français serait un mensonge de référencement
 * — Google indexerait un « alternate » qui n'en est pas un. Cette liste
 * s'allonge au fur et à mesure que chaque page est réellement traduite —
 * restent hors de cette liste (checkpoint 2, pas encore fait) : pages
 * légales, Panier, Commande, Compte, Inscription, Connexion, Mot de passe,
 * Aide.
 */
const ROUTES_BILINGUES = new Set<string>([
  ROUTES.accueil,
  ROUTES.capacites,
  ...ROUTES_CAPACITES.map((r) => r.href),
  // Phase 9, checkpoint 2 — priorité a) et b).
  ROUTES.carrieres,
  ROUTES.apropos,
  ROUTES.contact,
  ROUTES.location,
  // Priorité c).
  ROUTES.realisations,
  ROUTES.boutique,
  // Priorité d).
  ROUTES.politiqueConfidentialite,
  ROUTES.conditionsUtilisation,
])

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Une fiche produit par produit PUBLIÉ — un produit incomplet ou hors
  // ligne ne doit pas apparaître dans le sitemap, même règle que sur la page
  // boutique elle-même (lireProduitsPublies filtre déjà `publie = true`).
  // Locale arbitraire : seul p.slug est utilisé plus bas, jamais nom/texte.
  const produits = await lireProduitsPublies('fr')

  const pagesStatiques: MetadataRoute.Sitemap = ROUTES_STATIQUES.map((chemin) => {
    if (ROUTES_BILINGUES.has(chemin)) {
      return {
        url: url(chemin, 'fr'),
        lastModified: new Date(),
        alternates: {
          languages: {
            fr: url(chemin, 'fr'),
            en: url(chemin, 'en'),
          },
        },
      }
    }
    // Pas encore traduite : une seule entrée FR, pas de variante /en tant
    // que son contenu réel n'existe pas.
    return { url: url(chemin, 'fr'), lastModified: new Date() }
  })

  // Fiches produit : les treize produits publiés ont tous nom_en/description_en
  // remplis (vérifié en direct, un seul manquait et a été traduit pendant
  // cette phase) — hreflang vrai pour chacune.
  const pagesProduits: MetadataRoute.Sitemap = produits.map((p) => ({
    url: url(`${ROUTES.boutique}/${p.slug}`, 'fr'),
    lastModified: new Date(),
    alternates: {
      languages: {
        fr: url(`${ROUTES.boutique}/${p.slug}`, 'fr'),
        en: url(`${ROUTES.boutique}/${p.slug}`, 'en'),
      },
    },
  }))

  return [...pagesStatiques, ...pagesProduits]
}
