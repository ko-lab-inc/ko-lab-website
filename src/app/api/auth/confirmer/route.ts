import { NextResponse, type NextRequest } from 'next/server'

import { routing } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import { adresseDepuis } from '@/lib/utils/adresseClient'
import { rateLimit } from '@/lib/utils/rateLimit'

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
   * ⚠️ PLAFOND DE DÉBIT — AVANT TOUT TRAITEMENT.
   *
   * Cette route était la SEULE des trois routes d'API sans plafond. Mesuré
   * pendant l'audit du 2026-07-31 : une rafale de 30 appels passait 30 fois,
   * sans un seul 429, là où /api/contact et /api/session refusaient au-delà
   * de leur plafond.
   *
   * Ce qu'un plafond change ici : `exchangeCodeForSession()` consomme un code
   * à usage unique. Sans limite, rien n'empêche de marteler la route avec des
   * codes devinés — chaque essai étant une tentative de prise de session sur
   * le compte d'autrui. Le coût par essai était nul.
   *
   * 10 par minute et par IP : un lien de courriel se clique une fois, deux si
   * la personne s'y reprend. Le plafond est dix fois au-dessus de l'usage
   * légitime et divise par des ordres de grandeur ce qu'une boucle obtient.
   *
   * ⚠️ Compteur en mémoire de processus, et clé dérivée de l'adresse cliente :
   * voir la portée réelle en tête de rateLimit.ts, et la note sur
   * `x-forwarded-for` dans adresseClient.ts. C'est un ralentisseur, pas une
   * barrière — la barrière est le WAF en frontal.
   *
   * ⚠️ UN 429, PAS UNE REDIRECTION — ET C'EST DÉLIBÉRÉ.
   *
   * Première version de ce correctif : une redirection vers
   * `/connexion?lien=invalide`. Elle a été abandonnée après la sonde. Le rejet
   * NORMAL de cette route (code absent, code expiré) est déjà une redirection
   * 307 vers cette même page — refuser par redirection rendait donc le plafond
   * INDISTINGUABLE du cas nominal : la rafale de 30 renvoyait 30 × 307, avant
   * comme après le correctif. Un correctif qu'aucune sonde ne peut distinguer
   * d'une absence de correctif n'en est pas un.
   *
   * Le 429 est aussi le code juste : « trop de requêtes » n'est pas « lien
   * invalide », et c'est ce que /api/contact et /api/session renvoient déjà.
   *
   * Personne de légitime ne verra cette réponse : un lien de courriel se
   * clique une ou deux fois, le plafond est à dix par minute. Elle est
   * réservée à la boucle automatisée, à qui l'on ne doit ni une jolie page ni
   * une explication.
   *
   * `Cache-Control: no-store` : un 429 mis en cache par un intermédiaire
   * bloquerait la route pour d'autres personnes que celle qui l'a déclenché.
   */
  if (rateLimit(`confirmer:${adresseDepuis(request.headers)}`, { max: 10, windowMs: 60_000 })) {
    return NextResponse.json(
      { erreur: 'trop_de_requetes' },
      { status: 429, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }

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
