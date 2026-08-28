'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { creerCompteEtInviter } from '@/app/(admin)/[locale]/admin/utilisateurs/actions'
import { exigerRole } from '@/lib/auth/garde'
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
    const { error } = await supabase.from('candidatures').update({ statut }).eq('id', id)
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
