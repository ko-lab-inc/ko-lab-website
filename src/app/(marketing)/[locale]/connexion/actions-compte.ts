'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { routing } from '@/i18n/routing'
import { VERSION_POLITIQUES } from '@/lib/constantes'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { schemaInscription, schemaMotDePasse } from '@/lib/validation'
import { adresseDepuis } from '@/lib/utils/adresseClient'
import { origine } from '@/lib/utils/origine'
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
 * vaut 'client' depuis 0004, renommé par 0009 — aucune politique RLS ne lui
 * correspond. N'importe qui peut donc s'inscrire sans qu'aucune donnée ne
 * s'ouvre. C'est ce qui rend l'inscription publique acceptable ici.
 *
 * ⚠️ Ne JAMAIS remettre 'editor' en valeur par défaut. C'était le cas avant
 * 0004, et combiné à l'inscription ouverte, ça donnait à n'importe quel
 * visiteur la lecture complète de demandes_contact.
 * ---------------------------------------------------------------------------
 */

export type EtatInscription = {
  erreur?:
    | 'donnees'
    | 'confirmation'
    | 'faible'
    | 'consentement'
    | 'trop_de_tentatives'
    | 'refuse'
    | 'courriel'
    | 'serveur'
  succes?: boolean
}
export type EtatMotDePasse = { erreur?: 'donnees' | 'trop_de_tentatives' | 'serveur'; succes?: boolean }

async function adresse(): Promise<string> {
  return adresseDepuis(await headers())
}

/**
 * Où renvoyer une fois le compte confirmé — la commande boutique en a besoin
 * pour reprendre exactement là où la création de compte l'a interrompue.
 *
 * ⚠️ MÊME GARDE que `destination()` dans connexion/actions.ts et que la
 * validation de /api/auth/confirmer, dupliquée plutôt qu'importée : `suivant`
 * vient de l'URL, donc de n'importe qui, et ce fichier reste volontairement
 * indépendant de connexion/actions.ts (voir l'en-tête de ce fichier). Un
 * `suivant` invalide ne doit jamais transformer l'inscription en tremplin de
 * redirection.
 */
function suivantValide(suivant: string): string | null {
  if (!suivant || !suivant.startsWith('/') || suivant.startsWith('//')) return null
  const premier = suivant.split('/')[1]
  return routing.locales.some((l) => l === premier) ? suivant : null
}

export async function inscrire(
  _precedent: EtatInscription,
  donnees: FormData,
): Promise<EtatInscription> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const suivant = suivantValide(String(donnees.get('suivant') ?? ''))

  if (rateLimit(`inscription:${await adresse()}`, { max: 5, windowMs: 3_600_000 })) {
    return { erreur: 'trop_de_tentatives' }
  }

  const analyse = schemaInscription.safeParse({
    nom: donnees.get('nom'),
    email: donnees.get('email'),
    motDePasse: donnees.get('motDePasse'),
    confirmation: donnees.get('confirmation'),
    consentement: donnees.get('consentement'),
  })

  if (!analyse.success) {
    // Messages distincts ici, contrairement à la connexion : à l'inscription
    // la personne saisit SES propres données. Lui dire ce qui cloche ne révèle
    // rien sur qui d'autre a un compte — et sans ça, un mot de passe rejeté
    // pour cause de faiblesse se lit comme un bug.
    const codes = analyse.error.issues.map((i) => i.message)
    if (analyse.error.issues.some((i) => i.path[0] === 'confirmation')) {
      return { erreur: 'confirmation' }
    }
    if (codes.includes('courant') || codes.includes('reprend_courriel')) {
      return { erreur: 'faible' }
    }
    // Testé AVANT le générique 'donnees' : la case de consentement (Loi 25,
    // migration 0041) mérite un message qui dit precisément quoi cocher,
    // pas « vérifiez les champs » — la seule autre cause possible ici serait
    // un contournement du `required` côté client, donc un cas anormal à
    // nommer clairement, pas à noyer dans un message générique.
    if (analyse.error.issues.some((i) => i.path[0] === 'consentement')) {
      return { erreur: 'consentement' }
    }
    return { erreur: 'donnees' }
  }

  let idNouveauCompte: string | null = null

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signUp({
      email: analyse.data.email,
      password: analyse.data.motDePasse,
      options: {
        // Nom complet — capturé UNE SEULE FOIS, ici, à l'inscription. Voir
        // schemaInscription (lib/validation.ts) : creerCommande le relit
        // depuis `auth.getUser().user_metadata.nom`, jamais depuis un
        // formulaire de commande, qui ne le demande plus.
        data: { nom: analyse.data.nom },
        /**
         * ⚠️ CHEMIN PLAT — PAS /api/auth/confirmer ICI.
         *
         * Depuis le passage au gabarit token_hash (Supabase → Authentication
         * → Emails → Templates → « Confirm signup »), c'est CE GABARIT qui
         * construit l'URL vers /api/auth/confirmer avec token_hash, type=signup
         * et suivant={{ .RedirectTo }} — cette valeur-ci EST le {{ .RedirectTo }}
         * du gabarit, donc la destination finale, telle quelle, sans rien
         * emballer autour. C'est /api/auth/confirmer lui-même qui décide
         * d'imbriquer un passage par /connexion pour `type=signup` — voir sa
         * note d'en-tête.
         *
         * Cette URL doit figurer dans Authentication -> URL Configuration ->
         * Redirect URLs, sinon Supabase refuse la redirection.
         */
        emailRedirectTo: `${origine()}${suivant ?? `/${locale}/compte`}`,
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

    idNouveauCompte = data.user?.id ?? null
  } catch (err) {
    console.error('[inscription] échec', err)
    return { erreur: 'serveur' }
  }

  /**
   * Loi 25 (audit du 23 août 2026, migration 0041) — enregistré ici, avec le
   * client SERVICE ROLE, pas avec la session courante :
   *
   * - Le compte vient d'être créé sans confirmation de courriel : il n'existe
   *   encore AUCUNE session à ce stade pour porter un `.update()` normal.
   * - Même une fois confirmé, `profils_maj_admin` (RLS) interdit à un compte
   *   non-admin de modifier sa PROPRE ligne — vérifié en détail (4 cas réels,
   *   session par session) lors de la justification du GRANT profils
   *   (migration 0039). Le contournement RLS du service role est donc la
   *   seule voie possible ici, pas un raccourci de commodité.
   *
   * Un échec ici n'annule pas l'inscription : le compte existe déjà côté
   * Supabase Auth (signUp a réussi juste avant) — le signaler comme un échec
   * d'inscription mentirait sur ce qui s'est réellement passé.
   */
  if (idNouveauCompte) {
    try {
      await getSupabaseAdmin()
        .from('profils')
        .update({
          consentement_le: new Date().toISOString(),
          consentement_version: VERSION_POLITIQUES,
        })
        .eq('id', idNouveauCompte)
    } catch (err) {
      console.error('[inscription] échec enregistrement consentement', err)
    }
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
    // Chemin plat — même raison que emailRedirectTo dans inscrire() : le
    // gabarit Supabase « Reset Password » construit désormais l'URL vers
    // /api/auth/confirmer (token_hash, type=recovery, suivant={{ .RedirectTo }}),
    // cette valeur-ci EST ce {{ .RedirectTo }}.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origine()}/${locale}/mot-de-passe/nouveau`,
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

  // Manquait ici alors que les trois autres actions du parcours l'avaient —
  // relevé en passant la checklist du skill sécurité production (§ 4). Cette
  // action exige déjà une session valide obtenue par le lien reçu par
  // courriel, donc elle n'est pas brute-forçable ; mais elle écrit, et une
  // action d'écriture sans plafond finit toujours par servir à autre chose.
  if (rateLimit(`nouveau-mdp:${await adresse()}`, { max: 10, windowMs: 900_000 })) {
    return { erreur: 'trop_de_tentatives' }
  }

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
