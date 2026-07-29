'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { schemaInscription, schemaMotDePasse } from '@/lib/validation'
import { rateLimit } from '@/lib/utils/rateLimit'

/**
 * Création de compte, réinitialisation et changement de mot de passe.
 *
 * Séparé de actions.ts (connexion) pour que le fichier le plus sensible du
 * parcours reste court et relisible d'un coup d'œil.
 *
 * ---------------------------------------------------------------------------
 * CE QU'UN COMPTE DONNE : RIEN, AU DÉPART
 *
 * Le trigger on_auth_user_created crée le profil avec le rôle par défaut, qui
 * vaut 'invite' depuis la migration 0004 — aucune politique RLS ne lui
 * correspond. N'importe qui peut donc s'inscrire sans qu'aucune donnée ne
 * s'ouvre. C'est ce qui rend l'inscription publique acceptable ici.
 *
 * ⚠️ Ne JAMAIS remettre 'editor' en valeur par défaut. C'était le cas avant
 * 0004, et combiné à l'inscription ouverte, ça donnait à n'importe quel
 * visiteur la lecture complète de demandes_contact.
 * ---------------------------------------------------------------------------
 */

export type EtatInscription = {
  erreur?: 'donnees' | 'confirmation' | 'trop_de_tentatives' | 'refuse' | 'courriel' | 'serveur'
  succes?: boolean
}
export type EtatMotDePasse = { erreur?: 'donnees' | 'trop_de_tentatives' | 'serveur'; succes?: boolean }

async function adresse(): Promise<string> {
  const e = await headers()
  return (
    e.get('cf-connecting-ip') ?? e.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'inconnue'
  )
}

/** URL de base pour les liens envoyés par courriel. */
function origine(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}

export async function inscrire(
  _precedent: EtatInscription,
  donnees: FormData,
): Promise<EtatInscription> {
  const locale = String(donnees.get('locale') ?? 'fr')

  if (rateLimit(`inscription:${await adresse()}`, { max: 5, windowMs: 3_600_000 })) {
    return { erreur: 'trop_de_tentatives' }
  }

  const analyse = schemaInscription.safeParse({
    email: donnees.get('email'),
    motDePasse: donnees.get('motDePasse'),
    confirmation: donnees.get('confirmation'),
  })

  if (!analyse.success) {
    // Deux messages distincts ici, contrairement à la connexion : à
    // l'inscription, la personne saisit SES propres données. Lui dire que les
    // deux mots de passe diffèrent ne révèle rien sur qui d'autre a un compte.
    const surConfirmation = analyse.error.issues.some((i) => i.path[0] === 'confirmation')
    return { erreur: surConfirmation ? 'confirmation' : 'donnees' }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signUp({
      email: analyse.data.email,
      password: analyse.data.motDePasse,
      options: {
        // Où Supabase renvoie après le clic sur le lien de validation. Cette
        // URL doit figurer dans Authentication -> URL Configuration ->
        // Redirect URLs, sinon Supabase refuse la redirection.
        emailRedirectTo: `${origine()}/api/auth/confirmer?suivant=/${locale}/compte`,
      },
    })

    if (error) {
      // 422 « Signups not allowed » quand l'inscription est fermée côté
      // Supabase : cas de configuration, pas une faute de la personne.
      if (/not allowed|disabled/i.test(error.message)) return { erreur: 'refuse' }

      /**
       * 429 over_email_send_rate_limit — panne d'infrastructure, PAS une
       * saisie fautive.
       *
       * Le mailer intégré de Supabase plafonne à quelques courriels par heure
       * et n'est pas prévu pour la production. Tant qu'aucun SMTP n'est
       * configuré, ce cas se produit tous les jours. Le ranger avec « données
       * invalides » ferait relire son adresse à quelqu'un qui l'a écrite
       * correctement, indéfiniment. Constaté en vérifiant : le quota était
       * déjà épuisé.
       */
      if (error.status === 429 || /rate limit/i.test(error.message)) {
        console.error('[inscription] quota de courriels Supabase épuisé —', error.message)
        return { erreur: 'courriel' }
      }

      return { erreur: 'donnees' }
    }
  } catch (err) {
    console.error('[inscription] échec', err)
    return { erreur: 'serveur' }
  }

  /**
   * Toujours le même écran, que l'adresse soit déjà prise ou non.
   *
   * Supabase répond volontairement sans erreur si le courriel existe déjà
   * (il renvoie alors un message de « confirmation » à l'adresse existante).
   * Afficher « cette adresse a déjà un compte » transformerait ce formulaire
   * en outil de vérification d'annuaire : on saurait qui travaille chez
   * KO-LAB en essayant des adresses.
   */
  return { succes: true }
}

export async function demanderReinitialisation(
  _precedent: EtatMotDePasse,
  donnees: FormData,
): Promise<EtatMotDePasse> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const email = String(donnees.get('email') ?? '').trim()

  if (rateLimit(`reinit:${await adresse()}`, { max: 5, windowMs: 900_000 })) {
    return { erreur: 'trop_de_tentatives' }
  }

  try {
    const supabase = await createClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origine()}/api/auth/confirmer?suivant=/${locale}/mot-de-passe/nouveau`,
    })
  } catch (err) {
    console.error('[reinitialisation] échec', err)
    return { erreur: 'serveur' }
  }

  // Succès affiché quoi qu'il arrive, y compris pour une adresse inconnue :
  // le contraire dirait quelles adresses ont un compte. Supabase applique
  // déjà la même règle côté API.
  return { succes: true }
}

export async function changerMotDePasse(
  _precedent: EtatMotDePasse,
  donnees: FormData,
): Promise<EtatMotDePasse> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const analyse = schemaMotDePasse.safeParse(donnees.get('motDePasse'))
  if (!analyse.success) return { erreur: 'donnees' }

  if (String(donnees.get('confirmation') ?? '') !== analyse.data) return { erreur: 'donnees' }

  try {
    const supabase = await createClient()

    // ⚠️ updateUser n'agit que sur la session EN COURS. Cette page n'est
    // atteignable qu'après le lien reçu par courriel, qui a ouvert une session
    // temporaire : sans elle, l'appel échoue — et c'est exactement la garantie
    // recherchée. Personne ne change un mot de passe sans avoir prouvé qu'il
    // relève la boîte.
    const { error } = await supabase.auth.updateUser({ password: analyse.data })
    if (error) return { erreur: 'serveur' }
  } catch (err) {
    console.error('[changement mot de passe] échec', err)
    return { erreur: 'serveur' }
  }

  redirect(`/${locale}/connexion?motdepasse=change`)
}
