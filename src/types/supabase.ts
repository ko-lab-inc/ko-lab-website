/* =============================================================================
 * Types de la base — calqués sur supabase/migrations/0001_initial_schema.sql
 * =============================================================================
 *
 * Écrits à la main, faute d'un jeton d'accès Supabase. Pour régénérer depuis
 * la base réelle :
 *
 *     SUPABASE_ACCESS_TOKEN=<jeton> npx supabase gen types typescript \
 *       --project-id faagcojkghpbzndgnfoi --schema public > src/types/supabase.ts
 *
 * Le jeton se crée sur supabase.com/dashboard/account/tokens.
 *
 * ---------------------------------------------------------------------------
 * Ce fichier reflète le schéma APPLIQUÉ, pas celui du skill 03
 *
 * Les migrations déclarent NOT NULL sur toutes les colonnes à valeur par
 * défaut — `publie`, `ordre`, `created_at`, `updated_at`, `actif`, `statut`,
 * `tags`, `images`, `specs`. Elles ne sont donc PLUS nullables ici, ce qui
 * évite de gérer trois états là où deux suffisent dans toute la couche
 * affichage.
 *
 * `prix` reste nullable VOLONTAIREMENT : NULL signifie « sur demande ».
 *
 * NE RIEN AJOUTER ICI qui ne soit pas produit par le générateur : tout ajout
 * disparaîtrait à la régénération. Les types applicatifs vont dans
 * src/types/index.ts.
 * ========================================================================== */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      realisations: {
        Row: {
          id: string
          slug: string
          titre_fr: string
          /** Nullable depuis 0014 : le site est désormais francophone uniquement. */
          titre_en: string | null
          description_fr: string | null
          description_en: string | null
          /** CHECK : 'terrain' | 'installation' | 'lab' | 'equipement' */
          categorie: string
          tags: string[]
          images: Json
          publie: boolean
          ordre: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          titre_fr: string
          titre_en?: string | null
          description_fr?: string | null
          description_en?: string | null
          categorie: string
          tags?: string[]
          images?: Json
          publie?: boolean
          ordre?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          titre_fr?: string
          titre_en?: string | null
          description_fr?: string | null
          description_en?: string | null
          categorie?: string
          tags?: string[]
          images?: Json
          publie?: boolean
          ordre?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      produits_boutique: {
        Row: {
          id: string
          slug: string
          marque: string
          categorie: string
          nom_fr: string
          /** Nullable depuis 0010 : la saisie se fait dans UNE langue, l'autre
           *  colonne reste vide et l'affichage retombe sur celle qui est
           *  remplie. */
          nom_en: string | null
          description_fr: string | null
          description_en: string | null
          /** NULL = « sur demande » — voir skills 03 et 21. */
          prix: number | null
          /**
           * Ajoutées par la migration 0007.
           *
           * ⚠️ Ce fichier est GÉNÉRÉ par la CLI Supabase. Ces deux champs ont
           * été ajoutés à la main faute de CLI installée sur ce poste — les
           * types ignoraient `cadrage`, et TypeScript refusait toute lecture
           * du catalogue avec un message trompeur sur la requête. À la
           * prochaine régénération, vérifier qu'ils y sont toujours.
           *
           * cadrage  — 'contain' (visuel détouré) ou 'cover' (photo de scène)
           * couleurs — coloris disponibles, une photo par coloris
           */
          cadrage: string
          couleurs: Json
          images: Json
          specs: Json
          url_externe: string | null
          publie: boolean
          ordre: number
          created_at: string
          /** Migration 0013. Mise à jour manuelle depuis /admin/catalogue. */
          quantite: number
          /** Migration 0013. CHECK : 'en_stock' | 'rupture' | 'en_commande' | 'en_livraison' */
          statut_stock: string
        }
        Insert: {
          id?: string
          slug: string
          marque: string
          categorie: string
          nom_fr: string
          nom_en?: string | null
          description_fr?: string | null
          description_en?: string | null
          prix?: number | null
          cadrage?: string
          couleurs?: Json
          images?: Json
          specs?: Json
          url_externe?: string | null
          publie?: boolean
          ordre?: number
          created_at?: string
          quantite?: number
          statut_stock?: string
        }
        Update: {
          id?: string
          slug?: string
          marque?: string
          categorie?: string
          nom_fr?: string
          nom_en?: string | null
          description_fr?: string | null
          description_en?: string | null
          prix?: number | null
          cadrage?: string
          couleurs?: Json
          images?: Json
          specs?: Json
          url_externe?: string | null
          publie?: boolean
          ordre?: number
          created_at?: string
          quantite?: number
          statut_stock?: string
        }
        Relationships: []
      }

      demandes_contact: {
        Row: {
          id: string
          /** CHECK : 'mandat' | 'location' | 'boutique' | 'carriere' | 'autre' */
          type: string
          nom: string
          email: string
          telephone: string | null
          organisation: string | null
          message: string
          /** CHECK : 'nouveau' | 'lu' | 'traite' */
          statut: string
          created_at: string
        }
        Insert: {
          id?: string
          type: string
          nom: string
          email: string
          telephone?: string | null
          organisation?: string | null
          message: string
          statut?: string
          created_at?: string
        }
        Update: {
          id?: string
          type?: string
          nom?: string
          email?: string
          telephone?: string | null
          organisation?: string | null
          message?: string
          statut?: string
          created_at?: string
        }
        Relationships: []
      }

      postes_carrieres: {
        Row: {
          id: string
          titre_fr: string
          /** Nullable depuis 0014 : le site est désormais francophone uniquement. */
          titre_en: string | null
          departement: string
          /** CHECK : 'temps-plein' | 'temps-partiel' | 'contrat' | 'saisonnier' | 'etudiant' (migration 0015) */
          type: string
          description_fr: string | null
          description_en: string | null
          exigences_fr: string | null
          exigences_en: string | null
          actif: boolean
          ordre: number
          created_at: string
        }
        Insert: {
          id?: string
          titre_fr: string
          titre_en?: string | null
          departement: string
          type: string
          description_fr?: string | null
          description_en?: string | null
          exigences_fr?: string | null
          exigences_en?: string | null
          actif?: boolean
          ordre?: number
          created_at?: string
        }
        Update: {
          id?: string
          titre_fr?: string
          titre_en?: string | null
          departement?: string
          type?: string
          description_fr?: string | null
          description_en?: string | null
          exigences_fr?: string | null
          exigences_en?: string | null
          actif?: boolean
          ordre?: number
          created_at?: string
        }
        Relationships: []
      }

      reglages: {
        Row: {
          cle: string
          valeur: string
          description: string | null
          publique: boolean
          modifie_le: string
        }
        Insert: {
          cle: string
          valeur?: string
          description?: string | null
          publique?: boolean
          modifie_le?: string
        }
        Update: {
          cle?: string
          valeur?: string
          description?: string | null
          publique?: boolean
          modifie_le?: string
        }
        Relationships: []
      }

      profils: {
        Row: {
          id: string
          /** CHECK : 'admin' | 'editor' */
          role: string
          nom: string | null
          email: string | null
        }
        Insert: {
          id: string
          role?: string
          nom?: string | null
          email?: string | null
        }
        Update: {
          id?: string
          role?: string
          nom?: string | null
          email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'profils_id_fkey'
            columns: ['id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
    }

    Views: {
      [_ in never]: never
    }

    Functions: {
      /** Rôle de l'utilisateur connecté — utilisé par les politiques RLS. */
      get_user_role: {
        Args: Record<string, never>
        Returns: string
      }
    }

    Enums: {
      [_ in never]: never
    }

    CompositeTypes: {
      [_ in never]: never
    }
  }
}
