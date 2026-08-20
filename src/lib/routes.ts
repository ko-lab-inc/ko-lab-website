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
  /**
   * Étape 2 de la commande — téléphone, organisation, mode de livraison,
   * adresse si expédition. Route protégée par session (voir son page.tsx) ;
   * nom et courriel ne s'y demandent plus, lus depuis auth.getUser().
   */
  boutiqueCommandeDetails: '/boutique/commande/details',
  apropos: '/a-propos',
  carrieres: '/carrieres',
  /** Formulaire de candidature — le MÊME pour les neuf postes (0017). */
  carrieresPostuler: '/carrieres/postuler',
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
  /** Commandes du client connecté — migration 0021. Accès par session, jamais par un token dans l'URL. */
  compteCommandes: '/compte/commandes',
  /**
   * Pages légales — accueil, pied de page, et courriels transactionnels.
   *
   * `mentionsLegales` et `politiqueRetour` restent à créer : la première a
   * besoin de l'adresse d'affaires réelle et du NEQ, la seconde d'une vraie
   * décision sur une politique de retour (aujourd'hui inexistante — voir
   * gabaritCommande.ts). Les ajouter ici avant que ces pages existent
   * romprait tous les liens qui les utiliseraient.
   */
  politiqueConfidentialite: '/politique-confidentialite',
  conditionsUtilisation: '/conditions-utilisation',
} as const

export type RouteKey = keyof typeof ROUTES

/** Fiche produit boutique — chemin construit, pas de segment dans ROUTES
 *  puisqu'il dépend d'un slug qui n'existe qu'au pluriel (produits_boutique). */
export const routeProduit = (slug: string) => `${ROUTES.boutique}/${slug}`

/** Détail d'une commande — migration 0021. */
export const routeCommande = (id: string) => `${ROUTES.compteCommandes}/${id}`

/** Les quatre pages de capacités, dans l'ordre du document de cadrage. */
export const ROUTES_CAPACITES = [
  { key: 'operations', href: ROUTES.operations },
  { key: 'installations', href: ROUTES.installations },
  { key: 'lab', href: ROUTES.lab },
  { key: 'equipements', href: ROUTES.equipements },
] as const

/**
 * hreflang pour une page RÉELLEMENT bilingue — Phase 9.
 *
 * ⚠️ Ne pas appeler sur une page dont le contenu anglais n'existe pas encore
 * (copie du français en attendant sa traduction) : ça déclarerait à Google
 * un « alternate » qui n'en est pas un. Voir sitemap.ts, ROUTES_BILINGUES,
 * pour la liste à jour des pages concernées — les deux doivent rester en
 * phase.
 *
 * `x-default` pointe sur le français : c'est la langue de référence du site
 * (routing.ts, defaultLocale).
 */
export function alternatesLangues(chemin: string): Record<string, string> {
  const suffixe = chemin === ROUTES.accueil ? '' : chemin
  return {
    fr: `/fr${suffixe}`,
    en: `/en${suffixe}`,
    'x-default': `/fr${suffixe}`,
  }
}
