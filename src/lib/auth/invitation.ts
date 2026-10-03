import 'server-only'

import { EMAILS } from '@/lib/constantes'
import { gabaritInvitation } from '@/lib/email/gabaritInvitation'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { origine } from '@/lib/utils/origine'
import { type Role } from '@/types'

/**
 * Invitation d'un compte — création, rôle, lien, envoi Resend.
 *
 * ---------------------------------------------------------------------------
 * ⚠ POURQUOI CE N'EST PAS UNE SERVER ACTION, ET POURQUOI ÇA COMPTE
 *
 * Cette fonction crée un compte avec la SERVICE ROLE KEY, hors RLS. Tant
 * qu'elle vivait dans `admin/utilisateurs/actions.ts` (un fichier
 * `'use server'`), le fait de l'EXPORTER en faisait un point d'entrée HTTP :
 * Next enregistre toute fonction exportée d'un module `'use server'` comme
 * Server Action joignable directement, sans repasser par l'écran qui la
 * déclenche. Son en-tête disait que la garde était « la responsabilité de
 * l'appelant » — vrai pour un helper interne, FAUX pour un endpoint. Un appel
 * direct sans session aurait pu créer des comptes non confirmés et déclencher
 * des courriels d'invitation vers des adresses arbitraires, depuis le domaine
 * vérifié de KO-LAB (abus d'envoi).
 *
 * Déplacée ici le 3 octobre 2026, dans un module `server-only` : elle reste
 * importable par ses deux appelants légitimes (`inviterUtilisateur` et
 * `inviterCandidatLivreur`, qui passent tous deux `exigerRole(['admin'])`
 * AVANT de l'appeler), mais n'est plus un endpoint. `server-only` fait échouer
 * la compilation si elle se retrouvait un jour dans un bundle client.
 *
 * ---------------------------------------------------------------------------
 * `acces` en paramètre plutôt que refait ici : l'appelant a déjà dû prouver
 * qu'il est admin pour ses PROPRES besoins (ex. mettre à jour une
 * candidature). Il sert au seul UPDATE du rôle, pour que cette écriture passe
 * par le client de SESSION et le RLS plutôt que par la service role key.
 *
 * Extrait à l'origine le 27 août 2026 (étape 3/3, migration 0045) pour être
 * réutilisé sans duplication — demande explicite.
 */
export type ResultatInvitationCompte =
  | { succes: true; idCree: string; courrielEnvoye: boolean; raisonEchecCourriel?: string; lien: string }
  | { succes: false; erreur: 'existe_deja' | 'serveur' }

export async function creerCompteEtInviter(
  acces: { supabase: Awaited<ReturnType<typeof createClient>> },
  email: string,
  role: Role,
): Promise<ResultatInvitationCompte> {
  let idCree: string | null = null
  let lienActivation: string | null = null
  let courrielEnvoye = false
  let raisonEchecCourriel: string | undefined

  try {
    const admin = getSupabaseAdmin()

    // Préflight lisible — voir la note d'en-tête sur le filet qui suit.
    const { data: profilExistant } = await admin
      .from('profils')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    if (profilExistant) return { succes: false, erreur: 'existe_deja' }

    const { data: cree, error: erreurCreation } = await admin.auth.admin.createUser({
      email,
      // Pas encore confirmé : c'est le clic sur le lien reçu par courriel
      // (verifyOtp, type=invite) qui confirmera l'adresse — pas cet appel.
      email_confirm: false,
    })
    if (erreurCreation || !cree?.user) {
      if (erreurCreation?.code === 'email_exists') return { succes: false, erreur: 'existe_deja' }
      console.error('[admin/utilisateurs] création du compte invité refusée', erreurCreation?.message)
      return { succes: false, erreur: 'serveur' }
    }
    idCree = cree.user.id

    if (role !== 'client') {
      const { error: erreurRole } = await acces.supabase.from('profils').update({ role }).eq('id', idCree)
      if (erreurRole) {
        console.error('[admin/utilisateurs] rôle choisi non enregistré', erreurRole.message)
        return { succes: false, erreur: 'serveur' }
      }
    }

    const { data: lien, error: erreurLien } = await admin.auth.admin.generateLink({ type: 'invite', email })
    const tokenHash = lien?.properties?.hashed_token
    if (erreurLien || !tokenHash) {
      console.error('[admin/utilisateurs] lien d’invitation refusé', erreurLien?.message)
      return { succes: false, erreur: 'serveur' }
    }

    // Un jeton, deux liens — seul `suivant` change entre les deux : la
    // personne invitée choisit sa langue en cliquant, voir gabaritInvitation.ts
    // pour pourquoi ce gabarit est bilingue alors que les autres ne le sont pas.
    const lienPour = (langue: 'fr' | 'en') =>
      `${origine()}/api/auth/confirmer?token_hash=${tokenHash}&type=invite&suivant=${encodeURIComponent(`/${langue}/mot-de-passe/nouveau`)}`

    // Capturé AVANT l'envoi, pas seulement en cas d'échec : point 1 de la
    // correction du 27 août 2026 — le lien accompagne aussi bien un envoi
    // réussi qu'un échec, l'admin peut toujours le transmettre à la main.
    // `fr` par défaut : la langue de l'admin qui invite, un point de départ
    // raisonnable si le lien est copié-collé tel quel plutôt que cliqué
    // depuis le courriel bilingue.
    lienActivation = lienPour('fr')

    const cleResend = process.env.RESEND_API_KEY
    if (!cleResend) {
      // Le compte existe déjà à ce stade, avec le bon rôle — un courriel non
      // envoyé n'annule pas la création (même choix que changerStatutCommande) :
      // le signaler comme un échec d'invitation mentirait sur ce qui s'est
      // réellement passé. L'admin devra transmettre le lien autrement.
      console.warn('[admin/utilisateurs] RESEND_API_KEY absente — invitation créée sans courriel envoyé')
      raisonEchecCourriel = 'RESEND_API_KEY absente'
    } else {
      const { Resend } = await import('resend')
      // `role` brut, pas un libellé pré-résolu : gabaritInvitation.ts résout
      // lui-même les deux langues — voir sa note sur pourquoi
      // getTranslations(locale:'en') aurait renvoyé le français.
      const { html, text } = gabaritInvitation({
        role,
        lienInvitationFr: lienPour('fr'),
        lienInvitationEn: lienPour('en'),
        origine: origine(),
      })

      const envoi = await new Resend(cleResend).emails.send({
        from: `KO-LAB <${EMAILS.envoiTransactionnel}>`,
        replyTo: EMAILS.info,
        to: email,
        subject: "Invitation à rejoindre KO-LAB / You've been invited to join KO-LAB",
        html,
        text,
      })
      if (envoi.error) {
        console.error('[admin/utilisateurs] envoi Resend refusé', envoi.error.message)
        raisonEchecCourriel = envoi.error.message
      } else {
        courrielEnvoye = true
      }
    }
  } catch (err) {
    // `idCree` tracé ici, pas utilisé pour un retrait automatique : le
    // compte a pu être créé avant l'exception (ex. échec du courriel) et
    // laissé en place plutôt que retiré à l'aveugle — un admin peut le
    // retrouver dans la liste et réessayer, un retrait silencieux pourrait
    // aussi bien effacer un compte déjà correctement configuré.
    console.error('[admin/utilisateurs] échec invitation', err, idCree ? `compte créé : ${idCree}` : '')
    // Un compte a pu être créé avant l'exception : le lien généré jusque-là
    // (s'il y en a un) reste utile plutôt que perdu — même logique que
    // `idCree`, ne pas mentir en annonçant un échec total si le compte existe.
    if (idCree && lienActivation) {
      return {
        succes: true,
        idCree,
        courrielEnvoye: false,
        raisonEchecCourriel: 'Erreur inattendue après la création du compte',
        lien: lienActivation,
      }
    }
    return { succes: false, erreur: 'serveur' }
  }

  if (!idCree || !lienActivation) return { succes: false, erreur: 'serveur' }
  return { succes: true, idCree, courrielEnvoye, raisonEchecCourriel, lien: lienActivation }
}
