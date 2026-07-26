import { hasLocale, type AbstractIntlMessages } from 'next-intl'
import { getRequestConfig } from 'next-intl/server'

import { routing, type AppLocale } from './routing'

/**
 * Catalogues de traduction, un import dynamique par langue.
 *
 * Table statique plutôt qu'un chemin construit par template literal :
 * - TypeScript résout réellement les modules, donc plus besoin de caster
 *   (un `import(`…/${locale}.json`)` retourne `any` et ferait passer tout le
 *   catalogue non typé à travers l'application) ;
 * - le `satisfies Record<AppLocale, …>` transforme en ERREUR DE COMPILATION
 *   l'ajout d'une langue à routing.ts sans catalogue correspondant ;
 * - le bundler produit un chunk par langue, identifiable statiquement.
 */
const messagesByLocale = {
  fr: () => import('../../messages/fr.json'),
  en: () => import('../../messages/en.json'),
} satisfies Record<AppLocale, () => Promise<{ default: AbstractIntlMessages }>>

/**
 * Configuration par requête consommée par next-intl — référencée depuis
 * next.config.ts via createNextIntlPlugin('./src/i18n/request.ts').
 *
 * Ce fichier n'existe pas dans le skill 10, écrit pour next-intl 3 où la
 * configuration tenait dans un seul `i18n.ts`. La v4 sépare les responsabilités :
 * routing.ts décrit les langues et les préfixes, request.ts charge les messages.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  // `requestLocale` est une Promise — cohérent avec les API asynchrones de
  // Next 15+ (cookies, headers, params).
  const requested = await requestLocale

  // Le segment [locale] se comporte comme un catch-all : il capture aussi
  // /unknown.txt ou /favicon.ico. On ne fait donc jamais confiance à sa valeur.
  //
  // hasLocale est un type guard : après ce ternaire, `locale` vaut 'fr' | 'en',
  // jamais string. On retombe sur la langue par défaut plutôt que de lever une
  // erreur — c'est au layout [locale] de renvoyer un 404 sur une langue
  // invalide, pour ne pas servir la page d'accueil sous une URL inexistante.
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale

  const { default: messages } = await messagesByLocale[locale]()

  return { locale, messages }
})
