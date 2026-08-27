'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { z } from 'zod'

import { exigerRole } from '@/lib/auth/garde'
import { EMAILS } from '@/lib/constantes'
import { gabaritInvitation } from '@/lib/email/gabaritInvitation'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { adresseDepuis } from '@/lib/utils/adresseClient'
import { origine } from '@/lib/utils/origine'
import { rateLimit } from '@/lib/utils/rateLimit'
import { estUuid } from '@/lib/utils/identifiant'
import { ROLES } from '@/types'

/**
 * Changement de rôle d'un compte.
 *
 * ---------------------------------------------------------------------------
 * TROIS VERROUS, ET AUCUN N'EST DE TROP
 *
 * 1. La politique RLS `profils_maj_admin` (0002) : seul un rôle 'admin' peut
 *    mettre à jour la table. C'est le verrou qui compte, il tient même si tout
 *    le reste est contourné.
 * 2. Le contrôle explicite ci-dessous, pour renvoyer une erreur lisible plutôt
 *    qu'un échec muet de la base.
 * 3. L'interdiction de se rétrograder soi-même : le dernier administrateur qui
 *    se passe en 'client' verrouille l'espace pour tout le monde, et plus
 *    personne ne peut le rouvrir sans repasser par le SQL Editor.
 *
 * ⚠️ Le client de session est utilisé, PAS la service role key. Passer par
 * cette dernière contournerait le RLS : le contrôle ne tiendrait plus qu'au
 * point 2, c'est-à-dire à quelques lignes de TypeScript.
 * ---------------------------------------------------------------------------
 */

export type EtatRole = { erreur?: 'refuse' | 'soi_meme' | 'donnees' | 'serveur'; succes?: boolean }

export async function changerRole(_precedent: EtatRole, donnees: FormData): Promise<EtatRole> {
  const id = String(donnees.get('id') ?? '')
  const role = String(donnees.get('role') ?? '')
  const locale = String(donnees.get('locale') ?? 'fr')

  if (!id || !ROLES.some((r) => r === role)) return { erreur: 'donnees' }

  // ⚠️ Note honnête (étape 2/3) : compteur EN MÉMOIRE DE PROCESSUS, remis à
  // zéro à chaque cold start Vercel — N instances actives = N fois cette
  // limite, pas une limite globale. Un ralentisseur contre l'abus
  // opportuniste, pas une défense — rateLimit.ts le documente déjà, voir son
  // en-tête. La vraie barrière reste RLS (profils_maj_admin) et les triggers
  // (interdire_auto_promotion, profils_pas_auto_retrogradation).
  if (rateLimit(`changer-role:${adresseDepuis(await headers())}`, { max: 20, windowMs: 300_000 })) {
    return { erreur: 'serveur' }
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { erreur: 'refuse' }

    if (user.id === id) return { erreur: 'soi_meme' }

    const { data: moi } = await supabase
      .from('profils')
      .select('role')
      .eq('id', user.id)
      .single()
    if (moi?.role !== 'admin') return { erreur: 'refuse' }

    const { error } = await supabase.from('profils').update({ role }).eq('id', id)
    if (error) {
      console.error('[admin/utilisateurs] mise à jour refusée', error.message)
      return { erreur: 'refuse' }
    }
  } catch (err) {
    console.error('[admin/utilisateurs] échec', err)
    return { erreur: 'serveur' }
  }

  // La liste est rendue côté serveur : sans invalidation, l'ancien rôle
  // resterait affiché jusqu'au prochain rechargement complet.
  revalidatePath(`/${locale}/admin/utilisateurs`)
  return { succes: true }
}

/**
 * Suppression d'un compte — la seule action de cette page qui a besoin de la
 * service role key.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI LA SERVICE ROLE KEY ICI, ET NULLE PART AILLEURS DANS CE FICHIER
 *
 * `changerRole` écrit dans `profils`, une table Postgres normale : le client
 * de session suffit, RLS (`profils_maj_admin`) décide. Mais supprimer un
 * COMPTE, c'est supprimer une ligne d'`auth.users` — gérée par Supabase Auth,
 * jamais par PostgREST ni par une politique RLS. Aucun rôle ne donne ce
 * pouvoir par une simple requête de table : seule l'API Admin
 * (`auth.admin.deleteUser`) le peut, et elle exige la service role key.
 *
 * L'AUTORISATION reste vérifiée avec le client de SESSION, exactement comme
 * changerRole — admin seul, jamais soi-même — AVANT le moindre appel à la
 * service role : c'est ce contrôle qui décide si la suppression a lieu, la
 * clé ne sert qu'à l'EXÉCUTER une fois la décision prise. Contourner ce
 * contrôle reviendrait à ouvrir la suppression de comptes à qui appellerait
 * l'action directement — le RLS ne protège plus rien une fois la service
 * role key en jeu, la vérification explicite est donc le SEUL verrou ici.
 *
 * ---------------------------------------------------------------------------
 * CE QUE LA SUPPRESSION EMPORTE AVEC ELLE
 *
 * `profils.id` référence `auth.users` en `on delete cascade` (0001), et
 * `commandes.client_id` fait de même (0021) — donc `lignes_commande` par
 * ricochet (`commande_id ... on delete cascade`). Supprimer un compte
 * supprime donc AUSSI tout son historique de commandes, sans corbeille ni
 * confirmation en base : c'est irréversible. LigneUtilisateur.tsx le dit
 * explicitement dans sa boîte de confirmation — ce n'est pas une surprise
 * qu'on découvre après coup.
 * ---------------------------------------------------------------------------
 */
export async function supprimerUtilisateur(donnees: FormData): Promise<void> {
  const id = String(donnees.get('id') ?? '')
  const locale = String(donnees.get('locale') ?? 'fr')
  if (!estUuid(id)) return

  // Même note qu'au-dessus (changerRole) : ralentisseur en mémoire de
  // processus, pas une défense — voir rateLimit.ts.
  if (rateLimit(`supprimer-utilisateur:${adresseDepuis(await headers())}`, { max: 20, windowMs: 300_000 })) {
    return
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    if (user.id === id) return

    const { data: moi } = await supabase.from('profils').select('role').eq('id', user.id).single()
    if (moi?.role !== 'admin') return

    const { error } = await getSupabaseAdmin().auth.admin.deleteUser(id)
    if (error) {
      console.error('[admin/utilisateurs] suppression refusée', error.message)
    }
  } catch (err) {
    console.error('[admin/utilisateurs] échec suppression', err)
  }

  revalidatePath(`/${locale}/admin/utilisateurs`)
}

/**
 * Invitation par courriel — création d'un compte avec le rôle choisi par
 * l'admin, étape 2/3 (migration 0045).
 *
 * ---------------------------------------------------------------------------
 * PAS inviteUserByEmail — createUser + generateLink, envoi par Resend
 *
 * `inviteUserByEmail` enverrait par le mailer INTÉGRÉ de Supabase, dont le
 * quota a déjà été épuisé une fois sur ce projet (voir la note de
 * `inscrire()`, connexion/actions-compte.ts : « quota de courriels Supabase
 * épuisé »). Resend est déjà configuré et vérifié sur ko-lab-center.ca pour
 * tout le reste des courriels transactionnels — deux appels Admin API
 * séparés (`createUser` puis `generateLink`) donnent le jeton `token_hash`
 * nécessaire pour construire le MÊME genre de lien que ceux déjà envoyés par
 * Resend (voir gabaritInvitation.ts), sans jamais passer par le mailer
 * Supabase.
 *
 * ---------------------------------------------------------------------------
 * RÔLE ÉCRIT APRÈS COUP, PAR LE CLIENT DE SESSION
 *
 * `handle_new_user` (trigger, 0001) pose `role = 'client'` par défaut sur
 * TOUTE nouvelle ligne `profils` — ce n'est jamais le rôle voulu pour un
 * vendeur, un livreur ou un admin invité. Le rôle choisi est donc écrit
 * ENSUITE, par une mise à jour distincte.
 *
 * Client de SESSION pour cette mise à jour, pas la clé de service :
 * `exigerRole(['admin'])` a déjà prouvé que l'appelant est admin, donc RLS
 * (`profils_maj_admin`) laisse passer l'écriture — la ligne ciblée n'est
 * JAMAIS celle de l'appelant (on ne s'invite pas soi-même), donc ni
 * `interdire_auto_promotion` ni `profils_pas_auto_retrogradation` (0045) ne
 * s'y opposent non plus. Même philosophie que `changerRole()` : RLS reste
 * l'autorité qui décide, la clé de service ne sert qu'à ce que PostgREST/RLS
 * ne peuvent structurellement pas faire (créer la ligne `auth.users`,
 * générer le jeton).
 *
 * ---------------------------------------------------------------------------
 * GARDE-FOUS
 *
 *   - exigerRole(['admin']) — pas ROLES_EQUIPE : inviter quelqu'un avec un
 *     rôle de son choix (y compris 'admin') est un geste plus lourd qu'un
 *     changement de rôle sur un compte déjà borné par l'inscription publique
 *     ('client' par défaut, jamais 'editor' — voir la note d'en-tête
 *     d'actions-compte.ts).
 *   - Préflight sur `profils.email` PUIS le code d'erreur `email_exists` de
 *     `createUser` en filet — le préflight donne un message immédiat et
 *     lisible, le filet couvre la fenêtre entre les deux appels (une adresse
 *     invitée deux fois à quelques millisecondes d'écart, improbable pour un
 *     geste d'admin mais pas impossible).
 *   - Rate limit — note honnête en tête de fichier (voir changerRole
 *     ci-dessus) : ralentisseur en mémoire de processus, pas une défense.
 * ---------------------------------------------------------------------------
 */

const schemaInvitation = z.object({
  email: z.string().trim().email().max(200),
  role: z.enum(ROLES),
})

export type EtatInvitation = {
  erreur?: 'donnees' | 'existe_deja' | 'refuse' | 'trop_de_tentatives' | 'serveur'
  succes?: boolean
}

export async function inviterUtilisateur(
  _precedent: EtatInvitation,
  donnees: FormData,
): Promise<EtatInvitation> {
  // `locale` ne sert plus qu'à revalidatePath (chemin de la page ADMIN) —
  // le courriel d'invitation est désormais bilingue par construction, voir
  // gabaritInvitation.ts : plus besoin de narrower ce type ici comme le
  // faisait getTranslations() avant ce changement.
  const locale = String(donnees.get('locale') ?? 'fr')
  const analyse = schemaInvitation.safeParse({
    email: donnees.get('email'),
    role: donnees.get('role'),
  })
  if (!analyse.success) return { erreur: 'donnees' }

  if (rateLimit(`invitation:${adresseDepuis(await headers())}`, { max: 10, windowMs: 3_600_000 })) {
    return { erreur: 'trop_de_tentatives' }
  }

  const { email, role } = analyse.data
  let idCree: string | null = null

  try {
    const acces = await exigerRole(['admin'])
    if (!acces) return { erreur: 'refuse' }

    const admin = getSupabaseAdmin()

    // Préflight lisible — voir la note d'en-tête sur le filet qui suit.
    const { data: profilExistant } = await admin
      .from('profils')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    if (profilExistant) return { erreur: 'existe_deja' }

    const { data: cree, error: erreurCreation } = await admin.auth.admin.createUser({
      email,
      // Pas encore confirmé : c'est le clic sur le lien reçu par courriel
      // (verifyOtp, type=invite) qui confirmera l'adresse — pas cet appel.
      email_confirm: false,
    })
    if (erreurCreation || !cree?.user) {
      if (erreurCreation?.code === 'email_exists') return { erreur: 'existe_deja' }
      console.error('[admin/utilisateurs] création du compte invité refusée', erreurCreation?.message)
      return { erreur: 'serveur' }
    }
    idCree = cree.user.id

    if (role !== 'client') {
      const { error: erreurRole } = await acces.supabase.from('profils').update({ role }).eq('id', idCree)
      if (erreurRole) {
        console.error('[admin/utilisateurs] rôle choisi non enregistré', erreurRole.message)
        return { erreur: 'serveur' }
      }
    }

    const { data: lien, error: erreurLien } = await admin.auth.admin.generateLink({ type: 'invite', email })
    const tokenHash = lien?.properties?.hashed_token
    if (erreurLien || !tokenHash) {
      console.error('[admin/utilisateurs] lien d’invitation refusé', erreurLien?.message)
      return { erreur: 'serveur' }
    }

    // Un jeton, deux liens — seul `suivant` change entre les deux : la
    // personne invitée choisit sa langue en cliquant, voir gabaritInvitation.ts
    // pour pourquoi ce gabarit est bilingue alors que les autres ne le sont pas.
    const lienPour = (langue: 'fr' | 'en') =>
      `${origine()}/api/auth/confirmer?token_hash=${tokenHash}&type=invite&suivant=${encodeURIComponent(`/${langue}/mot-de-passe/nouveau`)}`

    const cleResend = process.env.RESEND_API_KEY
    if (!cleResend) {
      // Le compte existe déjà à ce stade, avec le bon rôle — un courriel non
      // envoyé n'annule pas la création (même choix que changerStatutCommande) :
      // le signaler comme un échec d'invitation mentirait sur ce qui s'est
      // réellement passé. L'admin devra transmettre le lien autrement.
      console.warn('[admin/utilisateurs] RESEND_API_KEY absente — invitation créée sans courriel envoyé')
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
        subject: "Invitation à rejoindre KO-LAB — You've been invited to join KO-LAB",
        html,
        text,
      })
      if (envoi.error) {
        console.error('[admin/utilisateurs] envoi Resend refusé', envoi.error.message)
      }
    }
  } catch (err) {
    // `idCree` tracé ici, pas utilisé pour un retrait automatique : le
    // compte a pu être créé avant l'exception (ex. échec du courriel) et
    // laissé en place plutôt que retiré à l'aveugle — un admin peut le
    // retrouver dans la liste et réessayer, un retrait silencieux pourrait
    // aussi bien effacer un compte déjà correctement configuré.
    console.error('[admin/utilisateurs] échec invitation', err, idCree ? `compte créé : ${idCree}` : '')
    return { erreur: 'serveur' }
  }

  revalidatePath(`/${locale}/admin/utilisateurs`)
  return { succes: true }
}
