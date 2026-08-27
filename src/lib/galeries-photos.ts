import 'server-only'

/**
 * Constantes partagées pour les galeries « En photos » des pages capacités
 * et Location — table `galeries_photos` (migration 0043).
 *
 * `server-only` : un composant client ne peut pas importer ce module — il
 * reçoit `PAGES_GALERIE` en prop depuis la page serveur, même patron que
 * `DOSSIERS_MEDIAS` (lib/medias-disponibles.ts).
 *
 * ⚠️ Étape 2/3 de la migration des galeries : cet écran gère
 * `galeries_photos` en écriture, mais aucune page publique ne la lit encore
 * — les 4 galeries en dur et `lab_1..lab_7` (medias_emplacements) restent
 * la source réelle du site public jusqu'à l'étape 3. `ETIQUETTE_GALERIES`
 * existe déjà pour que cette étape-là n'ait qu'à l'importer, pas à la créer.
 */

export const ETIQUETTE_GALERIES = 'galeries-photos'

/**
 * Les cinq pages, dans l'ORDRE D'AFFICHAGE imposé — jamais l'ordre
 * alphabétique (qui donnerait equipements, installations, le-lab, location,
 * operations-terrain, différent de ce que demande l'écran admin et, plus
 * tard, la page /nos-capacites elle-même).
 */
export const PAGES_GALERIE = [
  'operations-terrain',
  'installations',
  'le-lab',
  'equipements',
  'location',
] as const

export type PageGalerie = (typeof PAGES_GALERIE)[number]
