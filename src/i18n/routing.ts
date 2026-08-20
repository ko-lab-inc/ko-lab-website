import { defineRouting } from 'next-intl/routing'

/**
 * Configuration de routage i18n — bilingue FR/EN.
 *
 * ---------------------------------------------------------------------------
 * HISTORIQUE — pourquoi l'anglais avait été retiré, et pourquoi ça ne bloque
 * plus rien aujourd'hui
 *
 * Le site avait été rendu français uniquement : pour tout contenu saisi par
 * l'équipe (produits, réalisations), le bilingue obligeait à écrire chaque
 * fiche deux fois — « l'insertion sera compliquée car on va saisir deux fois
 * pour tout ». Ce n'est plus un obstacle : le schéma de `realisations`,
 * `produits_boutique` et `postes_carrieres` prévoit depuis LA TOUTE PREMIÈRE
 * migration (0001) des colonnes `_en` à côté de chaque `_fr` — rien à ajouter
 * côté base pour la Phase 9, seulement du contenu à y saisir.
 *
 * Réactivé (Phase 9, confirmé par Christian) : FR reste la langue de
 * référence (`defaultLocale`), l'anglais s'ajoute à côté.
 *
 * `localePrefix: 'always'` reste en vigueur, inchangé depuis le retrait de
 * l'anglais : les URLs gardent leur préfixe (/fr/..., /en/...) plutôt que
 * d'en changer la forme.
 *
 * `localeDetection: false` — conservé DÉLIBÉRÉMENT malgré les deux locales :
 * FR reste la langue de référence, un choix explicite via le sélecteur de
 * langue de la nav est plus prévisible qu'une bascule automatique sur
 * Accept-Language. Effet de bord toujours bienvenu : `/` reste pleinement
 * cacheable (skill 12) — avec la détection activée, chaque visite de `/`
 * dépendrait de l'en-tête du visiteur et ne pourrait pas être mise en cache
 * par le CDN.
 * ---------------------------------------------------------------------------
 */
export const routing = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  localePrefix: 'always',
  localeDetection: false,
})

/**
 * Union des locales supportées : 'fr' | 'en'.
 * Dérivée de la config plutôt qu'écrite en dur, pour qu'un futur changement
 * n'ait qu'un seul endroit à toucher.
 */
export type AppLocale = (typeof routing.locales)[number]
