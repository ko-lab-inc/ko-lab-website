import { defineRouting } from 'next-intl/routing'

/**
 * Configuration de routage i18n — FR principal, EN secondaire (CLAUDE.md).
 *
 * `localePrefix: 'always'` : les deux langues portent leur préfixe (/fr, /en).
 * C'est ce que supposent le sitemap et les hreflang du skill 10, qui listent
 * `ko-lab.ca/fr` et `ko-lab.ca/en` sans URL sans préfixe.
 *
 * Options laissées à leur valeur par défaut, à connaître :
 * - `localeDetection: true` — un visiteur arrivant sur `/` est redirigé selon
 *   son en-tête Accept-Language. Cohérent pour un site bilingue, mais rend `/`
 *   non cacheable. Passer à `false` pour envoyer tout le monde vers /fr.
 * - `alternateLinks: true` — next-intl pose l'en-tête `Link` avec les versions
 *   alternées, en complément des balises hreflang du skill 10.
 */
export const routing = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  localePrefix: 'always',
})

/**
 * Union des locales supportées : 'fr' | 'en'.
 * Dérivée de la config — ajouter une langue à `locales` la propage partout.
 */
export type AppLocale = (typeof routing.locales)[number]
