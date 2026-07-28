/**
 * Globales posées par le script Crisp.
 *
 * Déclarées ici plutôt que castées en `any` dans le composant : la règle
 * « zéro any » vaut aussi pour les scripts tiers, et une faute de frappe sur
 * `CRISP_WEBSITE_ID` ne se manifesterait autrement que par un widget muet.
 */
declare global {
  interface Window {
    /** File d'attente des commandes Crisp, consommée au chargement du script. */
    $crisp?: unknown[]
    /** Identifiant du site, lu par l.js au démarrage. */
    CRISP_WEBSITE_ID?: string
  }
}

export {}
