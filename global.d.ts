import type { routing } from './src/i18n/routing'
import type messages from './messages/fr.json'

/**
 * Typage des clés de traduction — next-intl 4.
 *
 * Sans cette déclaration, `t('besoins.note')` accepte n'importe quelle chaîne :
 * une faute de frappe ou une clé renommée passe le typecheck et n'échoue qu'à
 * l'exécution, potentiellement en production sur une page peu visitée.
 *
 * Le français fait référence : c'est la langue principale (CLAUDE.md), et
 * fr.json est toujours écrit en premier.
 *
 * Fonctionne aussi avec les clés construites dynamiquement, tant que la source
 * est une union de littéraux :
 *
 *     const besoins = [{ cle: 'deployer' }, …] as const
 *     t(`${cle}_titre`)   →   TypeScript résout 'deployer_titre' | …
 *
 * ⚠️ Ce typage ne compare PAS fr.json et en.json. Une clé présente en français
 * mais absente en anglais reste invisible ici — c'est le script de parité qui
 * couvre ce cas.
 */
declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number]
    Messages: typeof messages
  }
}
