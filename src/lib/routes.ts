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
   * Parcours de compte — connexion, création, récupération.
   *
   * Christian a tranché le 29 juillet 2026 : parcours normal, ouvert à tous,
   * plutôt qu'une porte d'équipe sur invitation. Ce qui est possible sans
   * risque depuis la migration 0004 — un compte créé arrive en 'client', sans
   * aucun droit. L'accès à /admin reste conditionné à une élévation manuelle.
   */
  connexion: '/connexion',
  inscription: '/inscription',
  motDePasseOublie: '/mot-de-passe-oublie',
  motDePasseNouveau: '/mot-de-passe/nouveau',
  /** Où atterrit un compte ordinaire : ni /admin, ni la page de connexion. */
  compte: '/compte',
} as const

export type RouteKey = keyof typeof ROUTES

/** Fiche produit boutique — chemin construit, pas de segment dans ROUTES
 *  puisqu'il dépend d'un slug qui n'existe qu'au pluriel (produits_boutique). */
export const routeProduit = (slug: string) => `${ROUTES.boutique}/${slug}`

/** Les quatre pages de capacités, dans l'ordre du document de cadrage. */
export const ROUTES_CAPACITES = [
  { key: 'operations', href: ROUTES.operations },
  { key: 'installations', href: ROUTES.installations },
  { key: 'lab', href: ROUTES.lab },
  { key: 'equipements', href: ROUTES.equipements },
] as const
