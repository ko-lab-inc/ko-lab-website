/**
 * Fonctionnalités dérrière drapeau — source unique de vérité.
 *
 * Même motif que NEXT_PUBLIC_SOLUTIONS_MODULAIRES (skill 21) : une variable
 * d'environnement, comparée STRICTEMENT à 'true'. Une variable absente, vide
 * ou mal orthographiée désactive silencieusement la fonctionnalité plutôt que
 * de lever une exception.
 *
 * Regroupé ici plutôt que des `process.env` épars, pour qu'une seule ligne
 * documente chaque drapeau et ce qu'il gouverne.
 */

/**
 * Panier de demande de prix groupée.
 *
 * RÉACTIVÉ — décision de Christian, la boutique passe en prix visible +
 * ajout au panier (plus de « Demander un prix » isolé sur les cartes).
 * Le drapeau reste en place : NEXT_PUBLIC_FEATURE_PANIER=false le retire à
 * nouveau sans toucher au code si le système de gestion et la tarification
 * fournisseur ne sont finalement pas prêts.
 */
export const PANIER_ACTIF = process.env.NEXT_PUBLIC_FEATURE_PANIER === 'true'
