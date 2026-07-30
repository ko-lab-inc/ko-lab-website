import type { Database } from './supabase'

/**
 * Types applicatifs KO-LAB.
 *
 * C'est ICI que vivent les raffinements du schéma — pas dans supabase.ts, qui
 * est régénéré et écrase tout ajout manuel (voir son en-tête).
 */

/* -----------------------------------------------------------------------------
 * Raccourcis vers les tables générées
 * -------------------------------------------------------------------------- */

type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update']

export type Realisation = Tables<'realisations'>
export type ProduitBoutique = Tables<'produits_boutique'>
export type DemandeContact = Tables<'demandes_contact'>
export type PosteCarriere = Tables<'postes_carrieres'>
export type Profil = Tables<'profils'>

/* -----------------------------------------------------------------------------
 * Unions métier
 *
 * Le schéma déclare ces colonnes en `text` avec la liste des valeurs en
 * commentaire SQL — le générateur produit donc `string`. On rétablit ici la
 * contrainte réelle, pour que TypeScript attrape une catégorie mal orthographiée.
 * -------------------------------------------------------------------------- */

/** realisations.categorie — skill 03 */
export const CATEGORIES_REALISATION = ['terrain', 'installation', 'lab', 'equipement'] as const
export type CategorieRealisation = (typeof CATEGORIES_REALISATION)[number]

/** demandes_contact.type — skills 03 et 05 */
export const TYPES_DEMANDE = ['mandat', 'location', 'boutique', 'carriere', 'autre'] as const
export type TypeDemande = (typeof TYPES_DEMANDE)[number]

/** demandes_contact.statut — skill 03 */
export const STATUTS_DEMANDE = ['nouveau', 'lu', 'traite'] as const
export type StatutDemande = (typeof STATUTS_DEMANDE)[number]

/** postes_carrieres.type — skill 03. `saisonnier`/`etudiant` ajoutés par 0015. */
export const TYPES_POSTE = ['temps-plein', 'temps-partiel', 'contrat', 'saisonnier', 'etudiant'] as const
export type TypePoste = (typeof TYPES_POSTE)[number]

/**
 * profils.role — skill 24 (RBAC).
 *
 * ⚠️ 'client' ajouté par la migration 0004, et c'est désormais la valeur PAR
 * DÉFAUT. Le skill 24 et la migration 0001 faisaient défaut à 'editor' : comme
 * un profil est créé automatiquement à chaque inscription (trigger
 * on_auth_user_created) et que l'inscription publique était ouverte, n'importe
 * qui pouvait devenir éditeur du site — donc lire tout demandes_contact.
 *
 * 'client' (nommé 'client' jusqu'à la migration 0009) ne correspond à AUCUNE
 * politique RLS de 0002 : le compte existe, il n'ouvre rien. Un admin l'élève
 * ensuite à la main.
 *
 * L'ordre compte : ROLES_EQUIPE liste les rôles qui donnent réellement accès,
 * à utiliser pour toute décision d'autorisation plutôt que `role !== 'client'`
 * — un futur quatrième rôle sans droits casserait la seconde forme en silence.
 */
export const ROLES = ['admin', 'editor', 'vendeur', 'livreur', 'client'] as const
export type Role = (typeof ROLES)[number]

/**
 * Rôles donnant accès à l'espace de gestion. Miroir EXACT des politiques
 * de 0002, qui nomment 'admin' et 'editor' et personne d'autre.
 *
 * ⚠️ 'vendeur' et 'livreur' sont du PERSONNEL (voir ROLES_PERSONNEL) mais ne
 * sont PAS ici, et ne doivent pas y être ajoutés tant que les politiques RLS
 * correspondantes n'existent pas. Cette constante gouverne l'accès à /admin : y verser un rôle
 * sans politique lui donnerait les droits complets d'un editor, y compris la
 * lecture de demandes_contact. Le détail de ce qui bloque est dans 0006.
 */
export const ROLES_EQUIPE = ['admin', 'editor'] as const satisfies readonly Role[]
export type RoleEquipe = (typeof ROLES_EQUIPE)[number]
