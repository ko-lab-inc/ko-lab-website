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
          /** Migration 0041. NULL = ligne antérieure à l'ajout de la case de consentement. */
          consentement_le: string | null
          consentement_version: string | null
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
          consentement_le?: string | null
          consentement_version?: string | null
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
          consentement_le?: string | null
          consentement_version?: string | null
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
          /** Migration 0032. NULL = aucune photo assignée. */
          photo_url: string | null
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
          photo_url?: string | null
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
          photo_url?: string | null
        }
        Relationships: []
      }

      /** Migration 0017 — candidatures reçues depuis /carrieres/postuler. */
      candidatures: {
        Row: {
          id: string
          nom: string
          telephone: string
          email: string
          ville: string
          postes: string[]
          disponibilites: string
          travail_exterieur: boolean
          a_experience: boolean
          experience_texte: string | null
          /** Chemin dans le bucket PRIVÉ `cv`. NULL = aucun CV joint. */
          cv_chemin: string | null
          source: string | null
          /** Migration 0028. CHECK : 'interne' — seule valeur possible tant que
           *  le Google Form externe n'écrit pas dans cette table. */
          canal: string
          /** CHECK : 'nouveau' | 'lu' | 'traite' | 'retenue' | 'refusee' — les deux
           *  dernières ajoutées par la migration 0045 (étape 3/3). */
          statut: string
          created_at: string
          /** Migration 0041. NULL = ligne antérieure à l'ajout de la case de consentement. */
          consentement_le: string | null
          consentement_version: string | null
          /** Migration 0045. NULL = jamais invitée. */
          invitation_envoyee_le: string | null
          /** Migration 0045. references profils(id) on delete set null. */
          compte_id: string | null
          /** Migration 0045. references postes_carrieres(id) on delete set null —
           *  NULL si le rétroremplissage n'a rattaché aucun poste avec certitude. */
          poste_id: string | null
        }
        Insert: {
          id?: string
          nom: string
          telephone: string
          email: string
          ville: string
          postes?: string[]
          disponibilites: string
          travail_exterieur: boolean
          a_experience: boolean
          experience_texte?: string | null
          cv_chemin?: string | null
          source?: string | null
          canal?: string
          statut?: string
          created_at?: string
          consentement_le?: string | null
          consentement_version?: string | null
          invitation_envoyee_le?: string | null
          compte_id?: string | null
          poste_id?: string | null
        }
        Update: {
          id?: string
          nom?: string
          telephone?: string
          email?: string
          ville?: string
          postes?: string[]
          disponibilites?: string
          travail_exterieur?: boolean
          a_experience?: boolean
          experience_texte?: string | null
          cv_chemin?: string | null
          source?: string | null
          canal?: string
          statut?: string
          created_at?: string
          consentement_le?: string | null
          consentement_version?: string | null
          invitation_envoyee_le?: string | null
          compte_id?: string | null
          poste_id?: string | null
        }
        Relationships: []
      }

      /** Migration 0016 — bande de vidéos de la page Le LAB. */
      videos: {
        Row: {
          id: string
          titre: string
          url: string
          /** NULL = miniature déduite de l'URL (voir lib/utils/youtube.ts). */
          vignette: string | null
          actif: boolean
          ordre: number
          created_at: string
        }
        Insert: {
          id?: string
          titre: string
          url: string
          vignette?: string | null
          actif?: boolean
          ordre?: number
          created_at?: string
        }
        Update: {
          id?: string
          titre?: string
          url?: string
          vignette?: string | null
          actif?: boolean
          ordre?: number
          created_at?: string
        }
        Relationships: []
      }

      /** Migration 0021 — commande post-panier, fenêtre de modification par token. */
      commandes: {
        Row: {
          id: string
          /** Le compte auth.users qui a passé la commande. */
          client_id: string
          numero: string
          nom: string
          email: string
          telephone: string | null
          organisation: string | null
          /** CHECK : 'expedition' | 'ramassage' */
          mode_livraison: string
          adresse_livraison: string | null
          /** CHECK : 'nouvelle' | 'confirmee' | 'en_preparation' | 'prete' | 'expediee' | 'completee' | 'annulee' */
          statut: string
          fenetre_modification_expire_at: string
          created_at: string
          /** Migration 0041. NULL = ligne antérieure à l'ajout de la case de consentement. */
          consentement_le: string | null
          consentement_version: string | null
        }
        Insert: {
          id?: string
          client_id: string
          numero?: string
          nom: string
          email: string
          telephone?: string | null
          organisation?: string | null
          mode_livraison: string
          adresse_livraison?: string | null
          statut?: string
          fenetre_modification_expire_at?: string
          created_at?: string
          consentement_le?: string | null
          consentement_version?: string | null
        }
        Update: {
          id?: string
          client_id?: string
          numero?: string
          nom?: string
          email?: string
          telephone?: string | null
          organisation?: string | null
          mode_livraison?: string
          adresse_livraison?: string | null
          statut?: string
          fenetre_modification_expire_at?: string
          created_at?: string
          consentement_le?: string | null
          consentement_version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'commandes_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }

      /** Migration 0021 — lignes figées d'une commande, copiées au moment de l'écriture. */
      lignes_commande: {
        Row: {
          id: string
          commande_id: string
          /** NULL si le produit a été retiré du catalogue depuis. */
          produit_id: string | null
          nom_produit: string
          categorie: string
          quantite: number
          prix_indicatif: number | null
          created_at: string
        }
        Insert: {
          id?: string
          commande_id: string
          produit_id?: string | null
          nom_produit: string
          categorie: string
          quantite: number
          prix_indicatif?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          commande_id?: string
          produit_id?: string | null
          nom_produit?: string
          categorie?: string
          quantite?: number
          prix_indicatif?: number | null
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
          /** Migration 0041. NULL = compte créé avant l'ajout de la case de consentement. */
          consentement_le: string | null
          consentement_version: string | null
        }
        Insert: {
          id: string
          role?: string
          nom?: string | null
          email?: string | null
          consentement_le?: string | null
          consentement_version?: string | null
        }
        Update: {
          id?: string
          role?: string
          nom?: string | null
          email?: string | null
          consentement_le?: string | null
          consentement_version?: string | null
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

      /** Migration 0031 — neuf emplacements fixes, architecture média route A. */
      medias_emplacements: {
        Row: {
          id: string
          cle: string
          /** Nullable depuis la migration 0037 — retrait volontaire d'une photo. */
          url_stockage: string | null
          alt_text_fr: string
          /** NULL jusqu'à Phase 9 bilingue — repli sur alt_text_fr en lecture. */
          alt_text_en: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cle: string
          url_stockage?: string | null
          alt_text_fr: string
          alt_text_en?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cle?: string
          url_stockage?: string | null
          alt_text_fr?: string
          alt_text_en?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      concours: {
        Row: {
          id: string
          slug: string
          titre_fr: string
          titre_en: string | null
          accroche_fr: string | null
          accroche_en: string | null
          description_fr: string
          description_en: string | null
          reglement_fr: string | null
          reglement_en: string | null
          date_debut: string | null
          date_fin: string | null
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
          accroche_fr?: string | null
          accroche_en?: string | null
          description_fr: string
          description_en?: string | null
          reglement_fr?: string | null
          reglement_en?: string | null
          date_debut?: string | null
          date_fin?: string | null
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
          accroche_fr?: string | null
          accroche_en?: string | null
          description_fr?: string
          description_en?: string | null
          reglement_fr?: string | null
          reglement_en?: string | null
          date_debut?: string | null
          date_fin?: string | null
          publie?: boolean
          ordre?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      concours_photos: {
        Row: {
          id: string
          concours_id: string
          url_stockage: string
          alt_fr: string
          alt_en: string | null
          ordre: number
        }
        Insert: {
          id?: string
          concours_id: string
          url_stockage: string
          alt_fr: string
          alt_en?: string | null
          ordre?: number
        }
        Update: {
          id?: string
          concours_id?: string
          url_stockage?: string
          alt_fr?: string
          alt_en?: string | null
          ordre?: number
        }
        Relationships: [
          {
            foreignKeyName: "concours_photos_concours_id_fkey"
            columns: ["concours_id"]
            isOneToOne: false
            referencedRelation: "concours"
            referencedColumns: ["id"]
          },
        ]
      }
      concours_liens: {
        Row: {
          id: string
          concours_id: string
          libelle_fr: string
          libelle_en: string | null
          url: string
          ordre: number
        }
        Insert: {
          id?: string
          concours_id: string
          libelle_fr: string
          libelle_en?: string | null
          url: string
          ordre?: number
        }
        Update: {
          id?: string
          concours_id?: string
          libelle_fr?: string
          libelle_en?: string | null
          url?: string
          ordre?: number
        }
        Relationships: [
          {
            foreignKeyName: "concours_liens_concours_id_fkey"
            columns: ["concours_id"]
            isOneToOne: false
            referencedRelation: "concours"
            referencedColumns: ["id"]
          },
        ]
      }
      galeries_photos: {
        Row: {
          id: string
          page: string
          url_stockage: string
          alt_fr: string
          alt_en: string | null
          ordre: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          page: string
          url_stockage: string
          alt_fr: string
          alt_en?: string | null
          ordre?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          page?: string
          url_stockage?: string
          alt_fr?: string
          alt_en?: string | null
          ordre?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
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
