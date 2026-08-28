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
import { ROLES, type Role } from '@/types'

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
  /**
   * Trois issues distinctes après un `succes: true` — corrigé le 27 août
   * 2026 (constat : Resend a livré un courriel jamais arrivé, DMARC absent,
   * corrigé côté DNS ensuite — mais l'interface affichait le même message
   * de succès qu'un envoi réellement accepté par Resend, invérifiable).
   *
   *   1. `courrielEnvoye: true`                     → compte créé, Resend a accepté l'envoi
   *   2. `courrielEnvoye: false` + `raisonEchecCourriel` → compte créé, l'appel Resend a échoué
   *   3. `succes` absent (voir `erreur` ci-dessus)   → échec complet, aucun compte créé
   *
   * `lien` accompagne les DEUX premiers cas : un lien à usage unique montré
   * à un admin déjà authentifié, qui vient lui-même de créer le compte,
   * n'ouvre aucun accès qu'il n'avait pas déjà — mais permet de transmettre
   * l'activation à la main si le courriel n'arrive jamais, accepté par
   * Resend ou non (« livré » ne veut pas dire « reçu »).
   */
  courrielEnvoye?: boolean
  raisonEchecCourriel?: string
  lien?: string
}

/**
 * Cœur de l'invitation — création du compte, rôle, lien, envoi Resend.
 *
 * Extrait le 27 août 2026 (étape 3/3, migration 0045) pour être réutilisé par
 * `inviterCandidatLivreur` (candidatures/actions.ts) : « réutilise le code
 * d'invitation existant, ne le duplique pas » — demande explicite. Auparavant
 * ce bloc vivait entièrement dans `inviterUtilisateur` ci-dessous ; le
 * comportement n'a pas changé, seule la frontière a bougé.
 *
 * `acces` en paramètre plutôt que refait ici : l'appelant a déjà dû prouver
 * qu'il est admin pour ses PROPRES besoins (ex. mettre à jour une
 * candidature) — refaire `exigerRole` ici doublerait un contrôle déjà passé
 * sans rien vérifier de plus.
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
        subject: "Invitation à rejoindre KO-LAB — You've been invited to join KO-LAB",
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

  const acces = await exigerRole(['admin'])
  if (!acces) return { erreur: 'refuse' }

  const resultat = await creerCompteEtInviter(acces, email, role)
  if (!resultat.succes) return { erreur: resultat.erreur }

  revalidatePath(`/${locale}/admin/utilisateurs`)
  return {
    succes: true,
    courrielEnvoye: resultat.courrielEnvoye,
    raisonEchecCourriel: resultat.raisonEchecCourriel,
    lien: resultat.lien,
  }
}

/**
 * Renvoi d'une invitation — point 3 de la correction du 27 août 2026.
 *
 * Un compte « En attente d'activation » (invité, jamais confirmé) n'avait
 * jusqu'ici aucun moyen de recevoir une deuxième invitation sans passer par
 * une suppression puis une recréation complète (nouveau `createUser`, donc
 * un nouvel identifiant, une nouvelle ligne `profils`, un rôle à ressaisir).
 * Cette action réutilise le compte EXISTANT — même mécanique que
 * `inviterUtilisateur` à partir de `generateLink` (même appel, même
 * gabarit bilingue), sans jamais retoucher `createUser` ni le rôle déjà en
 * place.
 *
 * `generateLink({ type: 'invite', email })` accepte un utilisateur déjà
 * créé et non confirmé — c'est exactement l'appel qu'`inviterUtilisateur`
 * fait quelques lignes après SON PROPRE `createUser`, sur le même genre de
 * compte fraîchement créé, donc déjà « existant » à ce moment-là. Rien ne
 * distingue structurellement un compte créé il y a trois secondes d'un
 * compte créé il y a trois jours, tant que `email_confirmed_at` reste nul.
 *
 * GARDE-FOUS, EN PLUS DE exigerRole(['admin']) :
 *   - `invited_at` doit être posé : un compte issu de l'inscription
 *     publique (jamais invité) ne doit jamais recevoir un courriel
 *     d'INVITATION — la personne se serait inscrite elle-même, un tel
 *     envoi n'aurait aucun sens et pourrait semer la confusion.
 *   - `email_confirmed_at` doit être nul : renvoyer un lien d'activation à
 *     un compte déjà actif n'ouvre rien de plus, seulement de la confusion.
 */
export type EtatRenvoiInvitation = {
  erreur?: 'refuse' | 'introuvable' | 'pas_invite' | 'deja_actif' | 'trop_de_tentatives' | 'serveur'
  succes?: boolean
  courrielEnvoye?: boolean
  raisonEchecCourriel?: string
  lien?: string
}

export async function renvoyerInvitation(
  _precedent: EtatRenvoiInvitation,
  donnees: FormData,
): Promise<EtatRenvoiInvitation> {
  const id = String(donnees.get('id') ?? '')
  const locale = String(donnees.get('locale') ?? 'fr')
  if (!estUuid(id)) return { erreur: 'introuvable' }

  if (rateLimit(`renvoi-invitation:${adresseDepuis(await headers())}`, { max: 10, windowMs: 3_600_000 })) {
    return { erreur: 'trop_de_tentatives' }
  }

  let lienActivation: string | null = null
  let courrielEnvoye = false
  let raisonEchecCourriel: string | undefined

  try {
    const acces = await exigerRole(['admin'])
    if (!acces) return { erreur: 'refuse' }

    const admin = getSupabaseAdmin()

    const { data: cible, error: erreurLecture } = await admin.auth.admin.getUserById(id)
    if (erreurLecture || !cible?.user?.email) return { erreur: 'introuvable' }
    if (!cible.user.invited_at) return { erreur: 'pas_invite' }
    if (cible.user.email_confirmed_at) return { erreur: 'deja_actif' }

    const email = cible.user.email

    // Rôle déjà en place, jamais retouché ici — seulement lu pour le
    // gabarit du courriel (« vous avez été invité comme … »).
    const { data: profil } = await acces.supabase.from('profils').select('role').eq('id', id).maybeSingle()
    const role = (profil?.role as Role) ?? 'client'

    const { data: lien, error: erreurLien } = await admin.auth.admin.generateLink({ type: 'invite', email })
    const tokenHash = lien?.properties?.hashed_token
    if (erreurLien || !tokenHash) {
      console.error('[admin/utilisateurs] lien de renvoi refusé', erreurLien?.message)
      return { erreur: 'serveur' }
    }

    const lienPour = (langue: 'fr' | 'en') =>
      `${origine()}/api/auth/confirmer?token_hash=${tokenHash}&type=invite&suivant=${encodeURIComponent(`/${langue}/mot-de-passe/nouveau`)}`
    lienActivation = lienPour('fr')

    const cleResend = process.env.RESEND_API_KEY
    if (!cleResend) {
      console.warn('[admin/utilisateurs] RESEND_API_KEY absente — renvoi sans courriel envoyé')
      raisonEchecCourriel = 'RESEND_API_KEY absente'
    } else {
      const { Resend } = await import('resend')
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
        console.error('[admin/utilisateurs] renvoi Resend refusé', envoi.error.message)
        raisonEchecCourriel = envoi.error.message
      } else {
        courrielEnvoye = true
      }
    }
  } catch (err) {
    console.error('[admin/utilisateurs] échec renvoi invitation', err)
    return { erreur: 'serveur' }
  }

  revalidatePath(`/${locale}/admin/utilisateurs`)
  return { succes: true, courrielEnvoye, raisonEchecCourriel, lien: lienActivation ?? undefined }
}
