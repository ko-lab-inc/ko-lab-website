import { defineRouting } from 'next-intl/routing'

/**
 * Configuration de routage i18n — site francophone uniquement.
 *
 * ---------------------------------------------------------------------------
 * ⚠️ L'ANGLAIS A ÉTÉ RETIRÉ — décision de Christian
 *
 * Le site était bilingue FR/EN. Pour tout contenu saisi par l'équipe
 * (produits, réalisations), ça obligeait à écrire chaque fiche deux fois —
 * « l'insertion sera compliquée car on va saisir deux fois pour tout ». Le
 * site est désormais entièrement en français ; un visiteur anglophone se
 * traduit la page avec son navigateur.
 *
 * `localePrefix: 'always'` reste en vigueur : les URLs gardent leur préfixe
 * (/fr/...) plutôt que d'en changer la forme, un chantier de migration d'URL
 * à part entière et sans rapport avec le retrait de l'anglais. `/en/...`
 * n'est plus une locale valide ; le proxy (src/proxy.ts) redirige ces chemins
 * vers leur équivalent /fr/... en 308, pour ne pas perdre le référencement
 * d'éventuels liens déjà indexés.
 *
 * `localeDetection: false` — une seule locale existe : rien à détecter depuis
 * Accept-Language. Ça a aussi un effet de bord bienvenu : `/` redevient
 * pleinement cacheable (skill 12), alors qu'avec la détection activée chaque
 * visite de `/` dépendait de l'en-tête du visiteur et ne pouvait pas être
 * mise en cache par le CDN.
 * ---------------------------------------------------------------------------
 */
export const routing = defineRouting({
  locales: ['fr'],
  defaultLocale: 'fr',
  localePrefix: 'always',
  localeDetection: false,
})

/**
 * Union des locales supportées : 'fr' — seule.
 * Dérivée de la config plutôt qu'écrite en dur, pour qu'une réintroduction
 * future de l'anglais n'ait qu'un seul endroit à changer.
 */
export type AppLocale = (typeof routing.locales)[number]
