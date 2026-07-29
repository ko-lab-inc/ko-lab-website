'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { routing } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/utils/rateLimit'

/**
 * Connexion à l'espace équipe — Server Action.
 *
 * Une Server Action et non une route d'API : c'est le seul contexte serveur,
 * avec les Route Handlers, où `cookies().set()` fonctionne réellement. Un
 * Server Component ne peut pas écrire de cookie (voir le catch silencieux de
 * lib/supabase/server.ts), la session ne serait donc jamais posée.
 */

export type EtatConnexion = { erreur?: 'identifiants' | 'trop_de_tentatives' | 'serveur' }

const schema = z.object({
  email: z.string().trim().email().max(200),
  motDePasse: z.string().min(1).max(200),
})

/**
 * Valide la destination post-connexion.
 *
 * ⚠️ `suivant` vient de l'URL, donc de n'importe qui. Sans ce filtre, un lien
 * `/connexion?suivant=https://exemple.test` transformerait notre page de
 * connexion en tremplin de redirection — le visiteur se connecte sur un
 * domaine qu'il reconnaît, puis atterrit ailleurs. On n'accepte donc qu'un
 * chemin interne commençant par une langue connue, jamais une URL absolue.
 */
function destination(suivant: string | undefined, locale: string): string {
  const defaut = `/${locale}/admin`
  if (!suivant) return defaut

  // `//exemple.test` est un chemin relatif au protocole : il sort du site tout
  // en commençant par « / ». D'où le double test.
  if (!suivant.startsWith('/') || suivant.startsWith('//')) return defaut

  const premier = suivant.split('/')[1]
  if (!routing.locales.some((l) => l === premier)) return defaut

  return suivant
}

export async function connecter(
  _precedent: EtatConnexion,
  donnees: FormData,
): Promise<EtatConnexion> {
  const locale = String(donnees.get('locale') ?? routing.defaultLocale)

  // Une page de connexion est la cible classique du bourrage d'identifiants.
  // Supabase applique ses propres limites, mais elles sont globales au projet :
  // celle-ci coupe par adresse, avant même d'atteindre le réseau.
  const entetes = await headers()
  const ip =
    entetes.get('cf-connecting-ip') ??
    entetes.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'inconnue'

  if (rateLimit(`connexion:${ip}`, { max: 8, windowMs: 300_000 })) {
    return { erreur: 'trop_de_tentatives' }
  }

  const analyse = schema.safeParse({
    email: donnees.get('email'),
    motDePasse: donnees.get('motDePasse'),
  })

  // Même retour que pour un mot de passe faux : distinguer « courriel mal formé »
  // de « identifiants invalides » indiquerait déjà quelles adresses existent.
  if (!analyse.success) return { erreur: 'identifiants' }

  let succes = false

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: analyse.data.email,
      password: analyse.data.motDePasse,
    })

    // Message volontairement indifférencié. Supabase renvoie déjà un
    // « Invalid login credentials » générique ; le relayer tel quel ferait
    // fuiter la langue et la formulation d'un service tiers dans notre
    // interface, sans rien apporter.
    if (error) return { erreur: 'identifiants' }
    succes = true
  } catch (err) {
    console.error('[connexion] échec', err)
    return { erreur: 'serveur' }
  }

  // ⚠️ redirect() HORS du try : il fonctionne en levant une exception que Next
  // intercepte. À l'intérieur, le catch l'attraperait et la connexion réussie
  // s'afficherait comme une erreur serveur.
  if (succes) redirect(destination(String(donnees.get('suivant') ?? ''), locale))

  return {}
}

export async function deconnecter(locale: string) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect(`/${locale}/connexion`)
}
