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
 * ⚠️ DÉSACTIVÉ — décision de Christian. Le code, le Context, le localStorage
 * et les tests E2E restent en place : le système de gestion (admin, vendeur,
 * livreur) et la tarification réelle par produit viendront dans un chantier
 * séparé, pas encore démarré. Réactiver ce drapeau doit suffire à tout
 * remontrer sans reconstruction.
 *
 * Pour réactiver en local : NEXT_PUBLIC_FEATURE_PANIER=true dans .env.local,
 * puis redémarrer `npm run dev` (Next ne recharge pas l'environnement à chaud).
 */
export const PANIER_ACTIF = process.env.NEXT_PUBLIC_FEATURE_PANIER === 'true'
