import { NextResponse, type NextRequest } from 'next/server'

import { routing } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'

/**
 * Retour des liens envoyés par courriel — validation d'adresse et
 * réinitialisation de mot de passe.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI SOUS /api ET NON SOUS /[locale]
 *
 * Le proxy exclut /api de son `matcher`. Un chemin localisé serait réécrit par
 * next-intl, qui pourrait rediriger AVANT que le code d'échange soit consommé
 * — et un code à usage unique perdu dans une redirection ne se rejoue pas.
 * L'URL reste donc stable, indépendante de la langue, et la langue voyage
 * dans `suivant`.
 * ---------------------------------------------------------------------------
 *
 * Un Route Handler et non une page : c'est, avec les Server Actions, l'un des
 * deux seuls contextes où `cookies().set()` fonctionne. Or l'échange du code
 * POSE la session — dans une page, elle serait silencieusement perdue.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')

  /**
   * `suivant` vient d'une URL construite par nous, mais qui transite par le
   * courriel : elle peut être modifiée avant le clic. On la traite donc comme
   * hostile, exactement comme dans l'action de connexion — seul un chemin
   * interne préfixé d'une langue connue passe, et `//` est rejeté (chemin
   * relatif au protocole : il commence par « / » mais sort du site).
   */
  const brut = searchParams.get('suivant') ?? ''
  const premier = brut.split('/')[1]
  const suivant =
    brut.startsWith('/') && !brut.startsWith('//') && routing.locales.some((l) => l === premier)
      ? brut
      : `/${routing.defaultLocale}/compte`

  const langue = routing.locales.some((l) => l === premier) ? premier : routing.defaultLocale

  if (!code) {
    return NextResponse.redirect(`${origin}/${langue}/connexion?lien=invalide`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    // Lien déjà utilisé, expiré, ou ouvert dans un autre navigateur que celui
    // qui a lancé la demande (le vérificateur PKCE est stocké côté client).
    // Un seul message : détailler lequel des trois n'aide personne et
    // renseignerait un attaquant sur l'état du jeton.
    console.error('[auth/confirmer] échange refusé', error.message)
    return NextResponse.redirect(`${origin}/${langue}/connexion?lien=invalide`)
  }

  return NextResponse.redirect(`${origin}${suivant}`)
}
