/* =============================================================================
 * FICHIER PROVISOIRE — sera écrasé par :
 *
 *     npx supabase gen types typescript --local > src/types/supabase.ts
 *
 * À lancer après supabase/migrations/0001 appliqué (Prompt 7).
 * =============================================================================
 *
 * Squelette calqué sur le schéma des skills 03 et 24, pour que le typage des
 * requêtes soit cohérent avec la base prévue au lieu d'un `Database = {}` qui
 * accepterait n'importe quel nom de table ou de colonne.
 *
 * NE RIEN AJOUTER ICI qui ne soit pas produit par le générateur : tout ajout
 * disparaîtra à la régénération. Les types applicatifs (unions de catégories,
 * alias Tables<'realisations'>, etc.) vont dans src/types/index.ts.
 *
 * Nullabilité : reprise telle quelle du SQL des skills. Une colonne déclarée
 * `boolean DEFAULT false` sans NOT NULL reste nullable — d'où les `| null`.
 * ============================================================================= */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      realisations: {
        Row: {
          id: string
          slug: string
          titre_fr: string
          titre_en: string
          description_fr: string | null
          description_en: string | null
          categorie: string
          tags: string[] | null
          images: Json | null
          publie: boolean | null
          ordre: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          slug: string
          titre_fr: string
          titre_en: string
          description_fr?: string | null
          description_en?: string | null
          categorie: string
          tags?: string[] | null
          images?: Json | null
          publie?: boolean | null
          ordre?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          slug?: string
          titre_fr?: string
          titre_en?: string
          description_fr?: string | null
          description_en?: string | null
          categorie?: string
          tags?: string[] | null
          images?: Json | null
          publie?: boolean | null
          ordre?: number | null
          created_at?: string | null
          updated_at?: string | null
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
          nom_en: string
          description_fr: string | null
          description_en: string | null
          prix: number | null
          images: Json | null
          specs: Json | null
          url_externe: string | null
          publie: boolean | null
          ordre: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          slug: string
          marque: string
          categorie: string
          nom_fr: string
          nom_en: string
          description_fr?: string | null
          description_en?: string | null
          prix?: number | null
          images?: Json | null
          specs?: Json | null
          url_externe?: string | null
          publie?: boolean | null
          ordre?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          slug?: string
          marque?: string
          categorie?: string
          nom_fr?: string
          nom_en?: string
          description_fr?: string | null
          description_en?: string | null
          prix?: number | null
          images?: Json | null
          specs?: Json | null
          url_externe?: string | null
          publie?: boolean | null
          ordre?: number | null
          created_at?: string | null
        }
        Relationships: []
      }

      demandes_contact: {
        Row: {
          id: string
          type: string
          nom: string
          email: string
          telephone: string | null
          organisation: string | null
          message: string
          statut: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          type: string
          nom: string
          email: string
          telephone?: string | null
          organisation?: string | null
          message: string
          statut?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          type?: string
          nom?: string
          email?: string
          telephone?: string | null
          organisation?: string | null
          message?: string
          statut?: string | null
          created_at?: string | null
        }
        Relationships: []
      }

      postes_carrieres: {
        Row: {
          id: string
          titre_fr: string
          titre_en: string
          departement: string
          type: string
          description_fr: string | null
          description_en: string | null
          exigences_fr: string | null
          exigences_en: string | null
          actif: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          titre_fr: string
          titre_en: string
          departement: string
          type: string
          description_fr?: string | null
          description_en?: string | null
          exigences_fr?: string | null
          exigences_en?: string | null
          actif?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          titre_fr?: string
          titre_en?: string
          departement?: string
          type?: string
          description_fr?: string | null
          description_en?: string | null
          exigences_fr?: string | null
          exigences_en?: string | null
          actif?: boolean | null
          created_at?: string | null
        }
        Relationships: []
      }

      // Skill 24 — RBAC. `role` est NOT NULL DEFAULT 'editor',
      // contraint par CHECK (role IN ('admin', 'editor')).
      profils: {
        Row: {
          id: string
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
        Relationships: []
      }
    }

    Views: {
      [_ in never]: never
    }

    Functions: {
      // Skill 24 — helper utilisé par les politiques RLS.
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
