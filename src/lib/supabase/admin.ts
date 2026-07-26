// Fait ÉCHOUER LE BUILD si ce module est importé depuis un composant client.
// Doit rester en première position : c'est la garde de compilation, celle du
// corps de getSupabaseAdmin() ne couvre que l'exécution.
import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/supabase'

/**
 * Client Supabase avec la SERVICE ROLE KEY — skill 03.
 *
 * ⚠️ Cette clé CONTOURNE toutes les politiques RLS. Elle voit et modifie
 * l'intégralité des tables, y compris les brouillons et les demandes de contact.
 *
 * Usage strict : API routes serveur uniquement (skill 05).
 *   - jamais dans un composant, client ou serveur
 *   - jamais dans un fichier importé par un composant
 *   - jamais loggée (skill 14)
 *
 * Pour toute lecture publique, utiliser createStaticClient() de static.ts :
 * le RLS y fait son travail. La service role key ne sert qu'à ce que le RLS
 * interdit volontairement au public — insérer une demande de contact,
 * lire les demandes reçues, écrire du contenu depuis l'admin.
 */

let cached: SupabaseClient<Database> | null = null

export function getSupabaseAdmin(): SupabaseClient<Database> {
  // Garde-fou d'exécution : si ce module se retrouve dans un bundle navigateur,
  // on échoue immédiatement avec un message explicite. La clé elle-même ne fuit
  // pas (Next n'inline que les variables NEXT_PUBLIC_), mais le client serait
  // silencieusement inutilisable — mieux vaut un arrêt net et lisible.
  if (typeof window !== 'undefined') {
    throw new Error(
      'admin.ts a été importé côté navigateur. La service role key est réservée ' +
        'aux API routes serveur — utiliser createStaticClient() pour lire des données publiques.',
    )
  }

  if (cached) return cached

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Supabase admin : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requises. ' +
        'En local, les renseigner dans .env.local ; sur Vercel, dans les variables ' +
        "d'environnement production et preview (skill 07).",
    )
  }

  cached = createClient<Database>(url, serviceRoleKey, {
    auth: {
      // Aucune session : la service role key est une autorisation permanente.
      // autoRefreshToken lancerait une minuterie qui empêcherait la fonction
      // serverless de se figer après la réponse.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  return cached
}
