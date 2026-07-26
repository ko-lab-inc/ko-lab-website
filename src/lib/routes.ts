/**
 * Chemins internes du site — source unique de vérité.
 *
 * Nav et Footer pointent vers les mêmes pages ; les dupliquer garantissait
 * qu'un renommage de route en casse un des deux silencieusement.
 *
 * Les chemins sont écrits SANS préfixe de langue : le <Link> de
 * @/i18n/navigation l'ajoute selon la locale courante.
 *
 * ⚠️ Phase 3 : quand les chemins localisés (`pathnames` dans routing.ts) seront
 * configurés, ces valeurs deviendront les clés de la table de correspondance
 * — /fr/solutions-modulaires ↔ /en/modular-solutions (skill 21).
 */
export const ROUTES = {
  accueil: '/',
  capacites: '/nos-capacites',
  operations: '/nos-capacites/operations-terrain',
  installations: '/nos-capacites/installations-saisonnieres',
  lab: '/nos-capacites/le-lab',
  equipements: '/nos-capacites/equipements-deploiement',
  realisations: '/realisations',
  location: '/location',
  boutique: '/boutique',
  apropos: '/a-propos',
  carrieres: '/carrieres',
  contact: '/contact',
} as const

export type RouteKey = keyof typeof ROUTES

/** Les quatre pages de capacités, dans l'ordre du document de cadrage. */
export const ROUTES_CAPACITES = [
  { key: 'operations', href: ROUTES.operations },
  { key: 'installations', href: ROUTES.installations },
  { key: 'lab', href: ROUTES.lab },
  { key: 'equipements', href: ROUTES.equipements },
] as const
