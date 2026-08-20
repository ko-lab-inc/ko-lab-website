import { createServerClient, type CookieMethodsServer } from '@supabase/ssr'
import createMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'

import { routing } from '@/i18n/routing'
import { ROLES_EQUIPE } from '@/types'

/**
 * Proxy unique du projet — routage de langue ET session Supabase.
 *
 * ⚠️ NOMMAGE : ce fichier s'appelait `middleware.ts` jusqu'à Next 15. Next 16 a
 * renommé la convention en `proxy.ts` et émet un avertissement de dépréciation
 * sur l'ancien nom. Les skills 21 et 24 parlent encore de `src/middleware.ts` —
 * c'est ce fichier-ci qu'ils désignent.
 *
 * ⚠️ Next n'exécute qu'UN SEUL proxy par projet. Les deux logiques sont donc
 * fusionnées ici, comme l'exige le skill 24, et pas dans deux fichiers.
 *
 * ---------------------------------------------------------------------------
 * ORDRE DES OPÉRATIONS
 *
 * 1. next-intl produit la réponse : c'est lui qui décide des redirections de
 *    langue et pose le cookie NEXT_LOCALE. Le faire en premier évite de
 *    contrôler une session sur une URL qui va être réécrite de toute façon.
 * 2. Supabase reçoit CETTE réponse pour y écrire ses propres cookies. Deux
 *    objets de réponse distincts feraient perdre l'un des deux jeux de cookies
 *    — au choix la langue ou la session.
 * 3. La garde de /admin s'applique en dernier, sur le chemin déjà résolu.
 *
 * Le proxy est le SEUL endroit capable d'écrire des cookies et de poser des
 * en-têtes de réponse : un Server Component ne peut faire ni l'un ni l'autre
 * (voir le catch silencieux de lib/supabase/server.ts).
 * ---------------------------------------------------------------------------
 */

const intl = createMiddleware(routing)

/** Retire le préfixe de langue : `/fr/admin/produits` -> `/admin/produits`. */
function cheminSansLocale(chemin: string): string {
  for (const locale of routing.locales) {
    if (chemin === `/${locale}`) return '/'
    if (chemin.startsWith(`/${locale}/`)) return chemin.slice(locale.length + 1)
  }
  return chemin
}

/** Langue de l'URL, pour renvoyer vers la connexion dans la bonne langue. */
function localeDeLUrl(chemin: string): string {
  const premier = chemin.split('/')[1]
  return routing.locales.find((l) => l === premier) ?? routing.defaultLocale
}

export default async function proxy(request: NextRequest) {
  // Phase 9 : /en est de nouveau une locale valide (routing.ts). Le renvoi
  // 308 vers /fr/... qui vivait ici pendant la période français-seul est
  // retiré — le laisser aurait empêché quiconque d'atteindre les pages
  // anglaises tout juste réactivées.
  const response = intl(request)

  // next-intl redirige (`/` -> `/fr`, langue manquante…) : inutile d'aller plus
  // loin, la requête suivante repassera ici avec l'URL définitive.
  if (response.status >= 300 && response.status < 400) return response

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Sans configuration Supabase, le site vitrine doit continuer de fonctionner :
  // seul l'espace admin devient inaccessible, ce qui est le bon comportement
  // par défaut (fermé, pas ouvert).
  if (!url || !anonKey) {
    if (cheminSansLocale(request.nextUrl.pathname).startsWith('/admin')) {
      return NextResponse.redirect(new URL(`/${localeDeLUrl(request.nextUrl.pathname)}`, request.url))
    }
    return response
  }

  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return request.cookies.getAll()
    },
    // MIGRATION @supabase/ssr 0.4 → 0.12 : setAll reçoit un 2ᵉ argument
    // `headers`, porteur des en-têtes anti-cache à appliquer quand un cookie
    // d'authentification est écrit (Cache-Control: private, no-store…).
    //
    // ⚠️ Les poser n'est pas optionnel ici : Cloudflare est devant (skill 07).
    // Sans eux, le CDN peut mettre en cache une réponse contenant un
    // Set-Cookie et servir la session d'un utilisateur à un autre.
    setAll(cookiesToSet, headers) {
      for (const { name, value, options } of cookiesToSet) {
        request.cookies.set(name, value)
        response.cookies.set(name, value, options)
      }
      for (const [cle, valeur] of Object.entries(headers ?? {})) {
        response.headers.set(cle, valeur)
      }
    },
  }

  const supabase = createServerClient(url, anonKey, { cookies: cookieMethods })

  // ⚠️ getUser() et JAMAIS getSession() pour une décision d'autorisation :
  // getSession() se contente de lire le cookie, que le client peut fabriquer.
  // getUser() fait valider le jeton par Supabase.
  //
  // Cet appel sert aussi, sur toutes les pages, à rafraîchir le jeton avant
  // expiration — c'est pour ça qu'il n'est pas enfermé dans le `if` ci-dessous.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (cheminSansLocale(request.nextUrl.pathname).startsWith('/admin')) {
    const locale = localeDeLUrl(request.nextUrl.pathname)

    if (!user) {
      const cible = new URL(`/${locale}/connexion`, request.url)
      // `suivant` : après connexion, on renvoie là où la personne allait plutôt
      // que sur un tableau de bord générique.
      cible.searchParams.set('suivant', request.nextUrl.pathname)
      return NextResponse.redirect(cible)
    }

    // Être authentifié ne suffit pas. Depuis 0004, un compte fraîchement créé
    // arrive en 'client' — il existe, il n'ouvre rien. Le rôle est donc relu à
    // chaque requête plutôt que déduit de la simple présence d'une session.
    const { data: profil } = await supabase
      .from('profils')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profil?.role
    if (!role || !ROLES_EQUIPE.some((r) => r === role)) {
      // Renvoi vers /connexion et non vers l'accueil : la personne EST
      // connectée, la renvoyer sur le site vitrine sans un mot lui ferait
      // croire à une panne. La page explique que le compte attend une
      // élévation.
      const cible = new URL(`/${locale}/connexion`, request.url)
      cible.searchParams.set('refus', 'role')
      return NextResponse.redirect(cible)
    }
  }

  return response
}

export const config = {
  // Exclut les routes d'API, les fichiers internes de Next et tout ce qui porte
  // une extension (images, robots.txt, sitemap.xml…) : ces requêtes ne doivent
  // jamais être réécrites avec un préfixe de langue.
  //
  // ⚠️ /api reste exclu VOLONTAIREMENT. Une route d'API protégée devra vérifier
  // la session elle-même, avec createClient() de lib/supabase/server.ts — la
  // faire passer par ici lui imposerait le routage de langue, qui n'a aucun
  // sens pour du JSON.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
