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

/** postes_carrieres.type — skill 03 */
export const TYPES_POSTE = ['temps-plein', 'temps-partiel', 'contrat'] as const
export type TypePoste = (typeof TYPES_POSTE)[number]

/** profils.role — skill 24 (RBAC) */
export const ROLES = ['admin', 'editor'] as const
export type Role = (typeof ROLES)[number]

/* -----------------------------------------------------------------------------
 * Colonnes jsonb
 *
 * `realisations.images` et `produits_boutique.images` sont typées `Json | null`
 * par le générateur — donc inexploitables sans forme déclarée. Ces types
 * décrivent le contenu attendu ; à valider avec Zod à la frontière (skill 09)
 * plutôt qu'à coup de cast, la base ne garantissant pas la forme d'un jsonb.
 * -------------------------------------------------------------------------- */

/** Une image dans realisations.images / produits_boutique.images — skill 03 */
export type ImageMedia = {
  url: string
  alt_fr: string
  alt_en: string
  ordre: number
}

/** produits_boutique.specs — paires libres, affichées telles quelles */
export type SpecsProduit = Record<string, string>

/* -----------------------------------------------------------------------------
 * Vues enrichies
 * -------------------------------------------------------------------------- */

/** Réalisation dont le jsonb `images` a été validé et typé. */
export type RealisationAvecImages = Omit<Realisation, 'categorie' | 'images'> & {
  categorie: CategorieRealisation
  images: ImageMedia[]
}

/** Produit dont les jsonb ont été validés et typés. */
export type ProduitAvecMedias = Omit<ProduitBoutique, 'images' | 'specs'> & {
  images: ImageMedia[]
  specs: SpecsProduit
}
