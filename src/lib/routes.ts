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
  installations: '/nos-capacites/installations',
  lab: '/nos-capacites/le-lab',
  equipements: '/nos-capacites/equipements',
  realisations: '/realisations',
  location: '/location',
  boutique: '/boutique',
  /** Demande de prix groupée — récapitulatif du panier. */
  boutiqueDemande: '/boutique/demande',
  apropos: '/a-propos',
  carrieres: '/carrieres',
  contact: '/contact',
  /**
   * Espace équipe KO-LAB — porte d'entrée de la partie administration.
   *
   * ⚠️ Ce n'est PAS un espace client. La boutique fonctionne en demande de
   * prix : le visiteur n'a rien à gérer, donc rien à quoi se connecter. Une
   * icône de profil qui promettrait un compte client serait un cul-de-sac.
   */
  connexion: '/connexion',
} as const

export type RouteKey = keyof typeof ROUTES

/** Fiche produit boutique — chemin construit, pas de segment dans ROUTES
 *  puisqu'il dépend d'un slug qui n'existe qu'au pluriel (SLUGS_PRODUITS). */
export const routeProduit = (slug: string) => `${ROUTES.boutique}/${slug}`

/** Les quatre pages de capacités, dans l'ordre du document de cadrage. */
export const ROUTES_CAPACITES = [
  { key: 'operations', href: ROUTES.operations },
  { key: 'installations', href: ROUTES.installations },
  { key: 'lab', href: ROUTES.lab },
  { key: 'equipements', href: ROUTES.equipements },
] as const
