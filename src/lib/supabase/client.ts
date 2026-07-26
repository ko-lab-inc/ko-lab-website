import { createBrowserClient } from '@supabase/ssr'

import type { Database } from '@/types/supabase'

/**
 * Client Supabase côté navigateur — skill 03.
 *
 * À n'utiliser que dans les Client Components. Par défaut, les données se
 * lisent côté serveur (skill 01) ; ce client sert aux cas réellement
 * interactifs : filtrage de galerie, formulaires, session utilisateur.
 *
 * Seules la clé anon et l'URL transitent ici — ce sont des valeurs publiques.
 * La protection réelle des données vient du RLS (skill 03).
 */
export function createClient() {
  // Accès littéral à process.env obligatoire : Next remplace ces expressions
  // au build par leur valeur. Un accès dynamique (process.env[nom]) n'est pas
  // substitué dans le bundle client et vaudrait undefined dans le navigateur.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Supabase : NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont requises. ' +
        'Copier .env.example vers .env.local et les renseigner.',
    )
  }

  return createBrowserClient<Database>(url, anonKey)
}
