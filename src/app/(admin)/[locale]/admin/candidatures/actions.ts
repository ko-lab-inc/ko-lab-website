'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { creerCompteEtInviter } from '@/lib/auth/invitation'
import { exigerRole } from '@/lib/auth/garde'
import { envoyerCourriel } from '@/lib/email/envoyer'
import { gabaritCandidatureRefusee } from '@/lib/email/gabaritsNotifications'
import { POSTE_LIVREUR } from '@/lib/constantes'
import { adresseDepuis } from '@/lib/utils/adresseClient'
import { estUuid } from '@/lib/utils/identifiant'
import { rateLimit } from '@/lib/utils/rateLimit'
import { STATUTS_CANDIDATURE, ROLES_EQUIPE } from '@/types'

/**
 * Gestion des candidatures — table candidatures, migration 0017.
 *
 * Mêmes règles que /admin/demandes : lecture et changement de statut pour
 * l'équipe, suppression pour l'admin seul.
 *
 * ⚠️ Le rôle est vérifié DEUX FOIS, et ce n'est pas une redondance inutile.
 * Le RLS reste l'autorité — c'est lui qui décide, en base. Mais une Server
 * Action s'invoque par un POST sur n'importe quel chemin du site : ni la garde
 * du proxy ni le layout admin ne la couvrent (voir lib/auth/garde.ts). Sans
 * `exigerRole()`, le RLS était le seul rempart sur la table la plus sensible
 * du projet.
 */

/**
 * Changement de statut — nouveau / lu / traité / retenue / refusee.
 *
 * ⚠️ Utilisait STATUTS_DEMANDE jusqu'au 27 août 2026 (étape 3/3, migration
 * 0045) : les deux tables partageaient les mêmes trois valeurs par
 * coïncidence, pas par contrat. `candidatures_statut_check` porte désormais
 * deux valeurs de plus que `demandes_contact.statut` — STATUTS_CANDIDATURE
 * reflète cette contrainte réelle, STATUTS_DEMANDE resterait figé aux trois
 * premières et refuserait silencieusement tout passage à `retenue`.
 */
export async function changerStatutCandidature(donnees: FormData): Promise<void> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const id = String(donnees.get('id') ?? '')
  const statut = String(donnees.get('statut') ?? '')
  if (!estUuid(id) || !STATUTS_CANDIDATURE.some((s) => s === statut)) return

  // Note honnête (étape 2/3) : compteur en mémoire de processus, remis à
  // zéro à chaque cold start Vercel — un ralentisseur, pas une défense.
  // Voir rateLimit.ts.
  if (rateLimit(`changer-statut-candidature:${adresseDepuis(await headers())}`, { max: 30, windowMs: 300_000 })) {
    return
  }

  try {
    const acces = await exigerRole(ROLES_EQUIPE)
    if (!acces) return
    const { supabase } = acces
    // Migration 0051 — QUI a change le statut, et QUAND. Sur une candidature
    // l'enjeu est plus fort que sur une demande : « retenue » puis « refusee »
    // engage une decision d'embauche, et personne ne pouvait dire qui l'avait
    // prise.
    const { error } = await supabase
      .from('candidatures')
      .update({ statut, statut_par: acces.userId, statut_le: new Date().toISOString() })
      .eq('id', id)
    if (error) console.error('[candidatures] changement de statut refusé', error.message)
  } catch (err) {
    console.error('[candidatures] échec changement de statut', err)
  }

  revalidatePath(`/${locale}/admin/candidatures`)
}

/**
 * Téléchargement d'un CV — URL SIGNÉE, valable cinq minutes.
 *
 * ⚠️ Le bucket `cv` est PRIVÉ (0017), seul de ce projet dans ce cas : un CV
 * porte nom, adresse, téléphone et parcours. Il n'existe donc pas d'URL
 * publique à afficher, contrairement aux photos de produits.
 *
 * L'URL est fabriquée à la demande, par le client de SESSION : c'est le RLS
 * qui autorise ou non la lecture. Un editor ou un admin l'obtient ; personne
 * d'autre ne peut appeler cette action utilement. Sa courte durée de vie
 * limite ce qu'un lien recopié permettrait.
 *
 * ---------------------------------------------------------------------------
 * ⚠️ ON NE SIGNE PAS LE CHEMIN ENVOYÉ PAR L'APPELANT
 *
 * Cette action recevait auparavant `chemin` directement depuis le formulaire
 * et le signait tel quel. Le RLS rattrapait (`cv_lecture_equipe` réserve la
 * lecture du bucket à admin/editor, vérifié pendant l'audit du 2026-07-30),
 * donc rien n'était exploitable — mais la signature portait sur une chaîne
 * arbitraire, et « arbitraire » et « données personnelles » ne vont pas
 * ensemble.
 *
 * On prend désormais l'IDENTIFIANT de la candidature et on relit `cv_chemin`
 * en base. La lecture passe par le RLS, donc on ne peut signer que le CV
 * d'une candidature qu'on a effectivement le droit de voir. Le chemin cesse
 * d'être une entrée utilisateur.
 * ---------------------------------------------------------------------------
 */
export async function telechargerCv(donnees: FormData): Promise<void> {
  const id = String(donnees.get('id') ?? '')
  const locale = String(donnees.get('locale') ?? 'fr')
  if (!estUuid(id)) return

  // Note honnête (étape 2/3) — voir changerStatutCandidature ci-dessus.
  if (rateLimit(`telecharger-cv:${adresseDepuis(await headers())}`, { max: 30, windowMs: 300_000 })) {
    redirect(`/${locale}/admin/candidatures`)
  }

  let url: string | null = null

  try {
    const acces = await exigerRole(ROLES_EQUIPE)
    if (!acces) return
    const { supabase } = acces

    const { data: candidature } = await supabase
      .from('candidatures')
      .select('cv_chemin')
      .eq('id', id)
      .maybeSingle()

    if (!candidature?.cv_chemin) return

    const { data, error } = await supabase.storage
      .from('cv')
      .createSignedUrl(candidature.cv_chemin, 300)

    if (error || !data) {
      console.error('[candidatures] URL signée refusée', error?.message)
    } else {
      url = data.signedUrl
    }
  } catch (err) {
    console.error('[candidatures] échec URL signée', err)
  }

  // ⚠️ redirect() HORS du try : il fonctionne en levant une exception que
  // Next intercepte — à l'intérieur, le catch l'attraperait (même piège que
  // dans l'action de connexion).
  redirect(url ?? `/${locale}/admin/candidatures`)
}

/**
 * Suppression — admin seul (politique candidatures_suppression_admin).
 *
 * Retire AUSSI le CV du stockage : garder le document personnel d'une
 * candidature effacée n'aurait aucun sens, et personne ne pourrait plus y
 * accéder de toute façon puisque le chemin vivait dans la ligne supprimée.
 *
 * ⚠️ Le chemin est relu EN BASE avant la suppression, jamais pris dans le
 * formulaire — même raison que `telechargerCv` : un chemin fourni par
 * l'appelant désignerait n'importe quel objet du bucket, donc le CV d'une
 * autre candidature. On le lit tant que la ligne existe encore.
 */
export async function supprimerCandidature(donnees: FormData): Promise<void> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const id = String(donnees.get('id') ?? '')
  if (!estUuid(id)) return

  // Note honnête (étape 2/3) — voir changerStatutCandidature ci-dessus.
  if (rateLimit(`supprimer-candidature:${adresseDepuis(await headers())}`, { max: 20, windowMs: 300_000 })) {
    return
  }

  try {
    const acces = await exigerRole(['admin'])
    if (!acces) return
    const { supabase } = acces

    const { data: candidature } = await supabase
      .from('candidatures')
      .select('cv_chemin')
      .eq('id', id)
      .maybeSingle()
    const chemin = candidature?.cv_chemin ?? ''

    const { data, error } = await supabase
      .from('candidatures')
      .delete()
      .eq('id', id)
      .select('id')

    if (error) console.error('[candidatures] suppression refusée', error.message)
    else if (!data || data.length === 0) {
      console.warn('[candidatures] suppression sans effet — RLS a filtré, rôle insuffisant ?')
    } else if (chemin) {
      // Seulement si la ligne a bien été supprimée : sinon on retirerait le
      // CV d'une candidature toujours en base.
      const { error: erreurCv } = await supabase.storage.from('cv').remove([chemin])
      if (erreurCv) console.error('[candidatures] CV orphelin non nettoyé', erreurCv.message)
    }
  } catch (err) {
    console.error('[candidatures] échec suppression', err)
  }

  revalidatePath(`/${locale}/admin/candidatures`)
}

/**
 * Invitation depuis une candidature retenue — étape 3/3 (migration 0045).
 *
 * ---------------------------------------------------------------------------
 * DÉCISION RENVERSÉE LE 27 AOÛT 2026 (Moussa)
 *
 * RepertoireLivreurs.tsx citait jusqu'ici une décision de Christian : « un
 * candidat retenu comme chauffeur-livreur doit apparaître dans Livreurs SANS
 * qu'on lui crée d'accès au site ». Cette action existe parce que cette
 * décision est renversée — un candidat retenu PEUT désormais recevoir une
 * invitation, mais jamais automatiquement : cette action ne s'exécute que sur
 * un clic explicite, après confirmation dans l'interface (voir
 * RepertoireLivreurs.tsx et TableauCandidatures.tsx).
 *
 * ---------------------------------------------------------------------------
 * POSTE_ID, JAMAIS LE TITRE — demande explicite
 *
 * `candidature.postes` (text[]) contient les libellés cochés sur le
 * formulaire public, jamais un identifiant fiable — un poste renommé depuis
 * /admin/carrieres casserait silencieusement toute comparaison de chaîne.
 * `poste_id` (migration 0045) est le lien fiable ; cette action refuse toute
 * candidature dont `poste_id` ne pointe pas EXACTEMENT vers le poste
 * `POSTE_LIVREUR` — y compris quand `postes` contient ce libellé mais que
 * `poste_id` est resté NULL (rétroremplissage n'ayant pas pu trancher, ou
 * candidature créée après coup sans jamais avoir été rattachée). Le
 * rattachement incertain se signale dans l'INTERFACE (voir
 * RepertoireLivreurs.tsx), jamais en autorisant l'action à sa place.
 *
 * ---------------------------------------------------------------------------
 * RÉUTILISE creerCompteEtInviter, NE LE DUPLIQUE PAS
 *
 * Même fonction que ModaleInvitation/inviterUtilisateur (utilisateurs/actions.ts)
 * — création du compte, rôle, lien, envoi Resend. Cette action-ci n'ajoute
 * que ce qui lui est propre : identifier la candidature éligible, puis
 * inscrire la trace de l'invitation sur LA CANDIDATURE (`invitation_envoyee_le`,
 * `compte_id`) une fois le compte créé.
 */

export type EtatInvitationCandidat = {
  erreur?: 'introuvable' | 'pas_eligible' | 'refuse' | 'existe_deja' | 'trop_de_tentatives' | 'serveur'
  succes?: boolean
  courrielEnvoye?: boolean
  raisonEchecCourriel?: string
  lien?: string
}

export async function inviterCandidatLivreur(
  _precedent: EtatInvitationCandidat,
  donnees: FormData,
): Promise<EtatInvitationCandidat> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const id = String(donnees.get('id') ?? '')
  if (!estUuid(id)) return { erreur: 'introuvable' }

  // Note honnête (étape 2/3) — voir changerStatutCandidature ci-dessus.
  if (rateLimit(`invitation-candidat:${adresseDepuis(await headers())}`, { max: 10, windowMs: 3_600_000 })) {
    return { erreur: 'trop_de_tentatives' }
  }

  const acces = await exigerRole(['admin'])
  if (!acces) return { erreur: 'refuse' }
  const { supabase } = acces

  const { data: candidature, error: erreurLecture } = await supabase
    .from('candidatures')
    .select('id, email, statut, poste_id, postes, invitation_envoyee_le')
    .eq('id', id)
    .maybeSingle()
  if (erreurLecture || !candidature) return { erreur: 'introuvable' }
  if (candidature.invitation_envoyee_le) return { erreur: 'pas_eligible' }
  if (candidature.statut !== 'retenue') return { erreur: 'pas_eligible' }

  // Un seul aller-retour, pas une constante en mémoire de processus : le
  // poste peut être renommé ou recréé, et cette action est trop rare pour
  // que le coût d'une lecture supplémentaire compte face au risque de
  // comparer contre un id périmé.
  const { data: posteLivreur } = await supabase
    .from('postes_carrieres')
    .select('id')
    .eq('titre_fr', POSTE_LIVREUR)
    .maybeSingle()
  if (!posteLivreur) return { erreur: 'pas_eligible' }

  // Match CERTAIN par poste_id, ou repli INCERTAIN par libellé texte quand
  // poste_id est resté NULL — même règle des DEUX côtés (voir aussi
  // TableauCandidatures.tsx et livreurs/page.tsx, qui affichent l'un ou
  // l'autre cas). Un poste_id qui pointe vers un AUTRE poste (ni null, ni
  // celui du livreur) reste toujours refusé : ce n'est pas une incertitude,
  // c'est une correspondance connue et différente.
  const certain = candidature.poste_id === posteLivreur.id
  const incertain = candidature.poste_id === null && candidature.postes.includes(POSTE_LIVREUR)
  if (!certain && !incertain) return { erreur: 'pas_eligible' }

  const resultat = await creerCompteEtInviter(acces, candidature.email, 'livreur')
  if (!resultat.succes) return { erreur: resultat.erreur }

  const { error: erreurMaj } = await supabase
    .from('candidatures')
    .update({ invitation_envoyee_le: new Date().toISOString(), compte_id: resultat.idCree })
    .eq('id', id)
  if (erreurMaj) {
    // Le compte existe et l'invitation est partie — ne pas mentir en
    // annonçant un échec. La candidature réapparaîtra simplement comme « pas
    // encore invitée » au prochain chargement ; un second clic échouerait
    // proprement sur `existe_deja` (préflight de creerCompteEtInviter) plutôt
    // que de créer un doublon.
    console.error('[candidatures] invitation envoyée mais colonnes non mises à jour', erreurMaj.message)
  }

  revalidatePath(`/${locale}/admin/candidatures`)
  revalidatePath(`/${locale}/admin/livreurs`)
  return {
    succes: true,
    courrielEnvoye: resultat.courrielEnvoye,
    raisonEchecCourriel: resultat.raisonEchecCourriel,
    lien: resultat.lien,
  }
}

/**
 * Note interne d'une candidature — migration 0051.
 *
 * ⚠️ JAMAIS envoyee au candidat. La migration 0019 revoque meme le GRANT
 * SELECT a `anon` sur cette table, precisement pour proteger ses
 * coordonnees : cette colonne en herite.
 *
 * Meme forme que `enregistrerNoteDemande` — un seul geste a apprendre pour
 * les deux ecrans.
 */
export async function enregistrerNoteCandidature(donnees: FormData): Promise<void> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const id = String(donnees.get('id') ?? '')
  const note = String(donnees.get('note_interne') ?? '').trim().slice(0, 4000)
  if (!estUuid(id)) return

  try {
    const acces = await exigerRole(ROLES_EQUIPE)
    if (!acces) return
    const { supabase } = acces
    const { error } = await supabase
      .from('candidatures')
      .update({ note_interne: note === '' ? null : note })
      .eq('id', id)
    if (error) console.error('[candidatures] note refusée', error.message)
  } catch (err) {
    console.error('[candidatures] échec enregistrement de la note', err)
  }

  revalidatePath(`/${locale}/admin/candidatures`)
}


/* ==========================================================================
 * Réponse au candidat — migration 0054
 * ========================================================================== */

export type EtatReponseCandidat = {
  erreur?: 'refuse' | 'introuvable' | 'pas_eligible' | 'deja_envoyee' | 'envoi' | 'trop_de_tentatives' | 'serveur'
  succes?: boolean
  /** Raison brute de l'échec Resend — affichée telle quelle à l'équipe. */
  raison?: string
}

/**
 * Prévenir un candidat que sa candidature n'est pas retenue.
 *
 * ---------------------------------------------------------------------------
 * ⚠️ POURQUOI UN BOUTON, ET PAS UN DÉCLENCHEMENT SUR LE CHANGEMENT DE STATUT
 *
 * Le courriel « demande traitée » part tout seul quand une demande passe à
 * `traite` (voir admin/demandes/actions.ts). Il aurait été cohérent de faire
 * pareil au passage à `refusee`. C'est délibérément refusé.
 *
 * Les deux messages ne pèsent pas le même poids. « Votre demande a été
 * traitée » envoyé par erreur est au pire inutile. « Votre candidature n'a pas
 * été retenue » met fin à la relation avec quelqu'un qui a confié son CV et
 * attend une réponse. Un clic de trop dans une liste déroulante — un mauvais
 * dossier, un classement de routine, un essai — et c'est parti, sans
 * rattrapage.
 *
 * Changer le statut et prévenir la personne sont donc deux gestes distincts.
 * On peut classer un dossier sans écrire à personne ; écrire demande un
 * second geste, volontaire, confirmé.
 *
 * ---------------------------------------------------------------------------
 * CE QUI EST VÉRIFIÉ, ET DANS QUEL ORDRE
 *
 * La ligne est lue AVANT tout envoi, et trois conditions doivent tenir :
 * le dossier est bien `refusee`, aucune réponse n'est encore partie, et
 * l'adresse existe. Aucune n'est déduite de ce que le client a envoyé — le
 * formulaire ne transmet qu'un identifiant.
 *
 * ⚠️ `reponse_envoyee_le` n'est écrit QU'APRÈS un envoi réussi. L'inverse —
 * marquer puis envoyer — laisserait un dossier marqué « répondu » alors que
 * le candidat n'a rien reçu, et le bouton aurait disparu pour toujours. Même
 * discipline que `traite_notifie_le` dans admin/demandes/actions.ts.
 */
export async function repondreCandidatRefus(
  _precedent: EtatReponseCandidat,
  donnees: FormData,
): Promise<EtatReponseCandidat> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const id = String(donnees.get('id') ?? '')
  if (!estUuid(id)) return { erreur: 'introuvable' }

  // Plus serré que le changement de statut (30/5 min) : celui-ci envoie du
  // courrier vers l'extérieur. Un script qui s'emballe ici écrit à de vraies
  // personnes.
  if (rateLimit(`reponse-candidat:${adresseDepuis(await headers())}`, { max: 10, windowMs: 600_000 })) {
    return { erreur: 'trop_de_tentatives' }
  }

  try {
    const acces = await exigerRole(ROLES_EQUIPE)
    if (!acces) return { erreur: 'refuse' }
    const { supabase } = acces

    const { data: candidature, error: erreurLecture } = await supabase
      .from('candidatures')
      .select('id, nom, email, locale, statut, reponse_envoyee_le')
      .eq('id', id)
      .maybeSingle()

    if (erreurLecture || !candidature) return { erreur: 'introuvable' }
    // Le statut décide, pas le bouton : masquer le bouton côté client est un
    // confort d'affichage, la garantie est ici.
    if (candidature.statut !== 'refusee') return { erreur: 'pas_eligible' }
    if (candidature.reponse_envoyee_le) return { erreur: 'deja_envoyee' }
    if (!candidature.email) return { erreur: 'pas_eligible' }

    // ⚠️ `candidature.locale`, et JAMAIS la locale de l'écran. Un membre de
    // l'équipe qui travaille sur /en/admin/ enverrait sinon un refus en
    // anglais à un candidat francophone — et c'est le seul message que cette
    // personne recevra de KO-LAB. Voir la migration 0054.
    const langue = candidature.locale === 'en' ? 'en' : 'fr'
    const { sujet, texte } = gabaritCandidatureRefusee({ nom: candidature.nom, locale: langue })

    const envoi = await envoyerCourriel({ a: candidature.email, sujet, texte })
    if (!envoi.ok) {
      console.error('[candidatures] réponse de refus non envoyée :', envoi.raison)
      return { erreur: 'envoi', raison: envoi.raison }
    }

    // Seulement maintenant — voir la note en tête.
    const { error } = await supabase
      .from('candidatures')
      .update({ reponse_envoyee_le: new Date().toISOString(), reponse_par: acces.userId })
      .eq('id', id)

    if (error) {
      // Le courriel EST parti. Le dire franchement plutôt que de prétendre
      // l'échec : le candidat l'a reçu, et un second envoi serait pire.
      console.error('[candidatures] réponse envoyée mais trace non écrite', error.message)
    }
  } catch (err) {
    console.error('[candidatures] échec réponse au candidat', err)
    return { erreur: 'serveur' }
  }

  revalidatePath(`/${locale}/admin/candidatures`)
  return { succes: true }
}
