import { createServerClient, type CookieMethodsServer } from '@supabase/ssr'
import { cookies } from 'next/headers'

import type { Database } from '@/types/supabase'

/**
 * Client Supabase côté serveur, conscient de la session — skill 03.
 *
 * À utiliser dans les Server Components, Route Handlers et Server Actions qui
 * dépendent de l'utilisateur connecté (espace admin, RBAC du skill 24).
 *
 * ⚠️ Ce client appelle cookies(), ce qui bascule la route en rendu dynamique.
 * Pour le contenu public du site vitrine mis en cache par ISR (skill 12),
 * utiliser createStaticClient() de static.ts.
 *
 * ---------------------------------------------------------------------------
 * MIGRATION Next 14 → 16 : la fonction est devenue ASYNCHRONE.
 *
 * Depuis Next 15, cookies() renvoie une Promise. Le code du skill 03
 * (`const cookieStore = cookies()`) ne compile plus. Conséquence en cascade :
 * createClient() est async, et tous ses appelants doivent l'attendre :
 *
 *     const supabase = await createClient()
 *
 * Même remarque pour headers() et draftMode(), ainsi que pour `params` et
 * `searchParams` des pages et layouts, eux aussi devenus des Promises.
 * ---------------------------------------------------------------------------
 */
export async function createClient() {
  const cookieStore = await cookies()

  // Accès littéral à process.env : cohérent avec client.ts, et ces mêmes
  // constantes sont inlinées au build par Next.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Supabase : NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont requises. ' +
        'Copier .env.example vers .env.local et les renseigner.',
    )
  }

  // Annotation explicite obligatoire : createServerClient accepte une union
  // entre l'API cookies moderne et l'API dépréciée, ce qui empêche TypeScript
  // d'inférer contextuellement le paramètre de setAll (il tomberait en `any`).
  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return cookieStore.getAll()
    },
    // MIGRATION @supabase/ssr 0.4 → 0.12 : setAll reçoit désormais un second
    // argument `headers`, contenant les en-têtes anti-cache à poser sur la
    // réponse quand un cookie d'auth est écrit (Cache-Control: private,
    // no-store…). Sans eux, un CDN peut mettre en cache une réponse porteuse
    // d'un Set-Cookie et servir la session d'un utilisateur à un autre —
    // risque réel ici, Cloudflare étant devant (skill 07).
    //
    // On ne le déclare pas : un Server Component ne peut poser aucun en-tête
    // de réponse. C'est au middleware (skill 24) de le faire, là où l'objet
    // NextResponse est accessible.
    setAll(cookiesToSet) {
      try {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options)
        }
      } catch {
        // Next interdit d'écrire un cookie depuis un Server Component.
        // Sans danger : le middleware (skill 24) rafraîchit déjà la session.
        // Le catch doit rester silencieux, sinon toute lecture de données
        // dans une page échouerait dès que Supabase veut renouveler un token.
      }
    },
  }

  return createServerClient<Database>(url, anonKey, { cookies: cookieMethods })
}
