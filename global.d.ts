import type { routing } from './src/i18n/routing'
import type messages from './messages/fr.json'

/**
 * Typage des clés de traduction — next-intl 4.
 *
 * Sans cette déclaration, `t('besoins.note')` accepte n'importe quelle chaîne :
 * une faute de frappe ou une clé renommée passe le typecheck et n'échoue qu'à
 * l'exécution, potentiellement en production sur une page peu visitée.
 *
 * Le français fait référence : c'est la seule langue du site (l'anglais a
 * été retiré — décision de Christian, « on garde en français pour
 * facilité »). `messages/en.json` a été supprimé ; ne pas le recréer sans
 * revoir aussi routing.ts, où `locales` ne contient plus que 'fr'.
 *
 * Fonctionne aussi avec les clés construites dynamiquement, tant que la source
 * est une union de littéraux :
 *
 *     const besoins = [{ cle: 'deployer' }, …] as const
 *     t(`${cle}_titre`)   →   TypeScript résout 'deployer_titre' | …
 */
declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number]
    Messages: typeof messages
  }
}
