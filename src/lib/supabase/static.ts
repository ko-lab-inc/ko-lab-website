import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/supabase'

/**
 * Client Supabase pour les LECTURES PUBLIQUES uniquement.
 *
 * Ne jamais utiliser dans /admin ni pour des données de session.
 * Ce client ignore complètement les cookies : il ne sait pas qui est connecté
 * et voit exactement ce que voit un visiteur anonyme.
 *
 * ---------------------------------------------------------------------------
 * Répartition des trois clients Supabase du projet
 * ---------------------------------------------------------------------------
 *   createClient()        server.ts   /admin, middleware, session utilisateur
 *                                     → appelle cookies(), rend la route dynamique
 *
 *   createStaticClient()  static.ts   accueil, réalisations, boutique, carrières
 *                                     → sans cookies, compatible ISR + unstable_cache
 *
 *   supabaseAdmin         admin.ts    API routes serveur uniquement
 *                                     → service role, contourne le RLS
 * ---------------------------------------------------------------------------
 *
 * Pourquoi un client distinct : cookies() bascule une route en rendu dynamique
 * et est interdit dans unstable_cache. Sans ce client, le `export const
 * revalidate = 3600` du skill 12 n'aurait aucun effet sur les pages publiques.
 *
 * Sécurité : clé anon uniquement. Le RLS (skill 03) reste la seule barrière —
 * ce client ne voit que les lignes `publie = true` / `actif = true`.
 *
 * Fraîcheur des données : gouvernée par le `revalidate` de la page ou par
 * unstable_cache (skill 12). Ne pas forcer `cache: 'no-store'` sur les requêtes,
 * cela basculerait la route en dynamique et annulerait l'ISR.
 */
export function createStaticClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Supabase : NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont requises. ' +
        'Copier .env.example vers .env.local et les renseigner.',
    )
  }

  return createSupabaseClient<Database>(url, anonKey, {
    auth: {
      // Aucune session à conserver côté serveur : pas de stockage, et surtout
      // pas de minuterie de rafraîchissement — elle maintiendrait la fonction
      // serverless éveillée après la réponse.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
