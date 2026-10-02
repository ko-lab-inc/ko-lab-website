'use server'

import { revalidatePath } from 'next/cache'

import { exigerRole } from '@/lib/auth/garde'
import { envoyerCourriel } from '@/lib/email/envoyer'
import { gabaritDemandeTraitee } from '@/lib/email/gabaritsNotifications'
import { estUuid } from '@/lib/utils/identifiant'
import { STATUTS_DEMANDE, ROLES_EQUIPE } from '@/types'

/**
 * Gestion des demandes — table demandes_contact.
 *
 * ---------------------------------------------------------------------------
 * QUI PEUT QUOI, ET OÙ C'EST DÉCIDÉ
 *
 * Les politiques de 0002 font foi :
 *   demandes_lecture_equipe       admin + editor (select)
 *   demandes_maj_equipe           admin + editor (update — donc le statut)
 *   demandes_suppression_admin    admin seul
 *
 * Ce fichier ne revérifie pas le rôle en TypeScript : le RLS est la seule
 * source de vérité, une seconde vérification ici finirait par diverger de la
 * première (skill 24). Le masquage du bouton Supprimer dans l'écran est du
 * confort d'affichage, pas une garantie.
 * ---------------------------------------------------------------------------
 */

/**
 * Changement de statut — nouveau / lu / traité.
 *
 * Action séparée du reste : c'est le geste le plus fréquent de cet écran, au
 * même titre que la publication d'un produit. Le menu déroulant se soumet
 * lui-même au changement (voir TableauDemandes.tsx) — aucun bouton
 * « Enregistrer » distinct à chercher.
 */
export async function changerStatutDemande(donnees: FormData): Promise<void> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const id = String(donnees.get('id') ?? '')
  const statut = String(donnees.get('statut') ?? '')
  if (!estUuid(id) || !STATUTS_DEMANDE.some((s) => s === statut)) return

  try {
    const acces = await exigerRole(ROLES_EQUIPE)
    if (!acces) return
    const { supabase } = acces

    // On relit AVANT d'écrire : il faut savoir si le courriel « traitée » est
    // déjà parti, et dans quelle langue le demandeur a écrit. `select` puis
    // `update` plutôt qu'un `update ... returning` : la ligne retournée
    // porterait déjà le nouveau statut, donc elle ne dirait plus si c'est
    // CE clic qui a fait la bascule.
    const { data: avant } = await supabase
      .from('demandes_contact')
      .select('nom, email, locale, statut, traite_notifie_le')
      .eq('id', id)
      .maybeSingle()

    // Migration 0051 — on enregistre QUI a changé le statut et QUAND. Le
    // statut passait à « traité » sans dire par qui : en cas de doute une
    // semaine plus tard, personne ne pouvait répondre.
    //
    // `traite_le` est distinct de `traite_notifie_le` (0049) : le premier date
    // le GESTE de l'équipe, le second le COURRIEL envoyé au demandeur. Les
    // deux peuvent diverger — un envoi qui échoue, un statut repassé à « lu »
    // puis remis à « traité ».
    const { error } = await supabase
      .from('demandes_contact')
      .update({ statut, traite_par: acces.userId, traite_le: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      console.error('[demandes] changement de statut refusé', error.message)
      return
    }

    // ------------------------------------------------- Courriel au demandeur
    //
    // Ajouté le 2 octobre 2026, à la demande de Joe.
    //
    // Trois conditions, toutes nécessaires :
    //   · le nouveau statut est « traité » — « lu » ne regarde que l'équipe,
    //     écrire « nous avons lu votre message » n'apprend rien à personne ;
    //   · la demande n'était pas DÉJÀ traitée — repasser de traité à lu puis
    //     de nouveau à traité ne doit pas renvoyer un second courriel ;
    //   · `traite_notifie_le` est vide — garde-fou qui survit même si le
    //     statut a fait l'aller-retour avant la migration 0049.
    //
    // La langue est celle que le DEMANDEUR avait sous les yeux (colonne
    // `locale`, migration 0049), jamais celle de la route admin : voir la
    // note de gabaritStatutCommande.ts, qui décrit précisément ce piège.
    const doitNotifier =
      statut === 'traite' &&
      avant !== null &&
      avant !== undefined &&
      avant.statut !== 'traite' &&
      avant.traite_notifie_le === null &&
      Boolean(avant.email)

    if (doitNotifier && avant) {
      const langue = avant.locale === 'en' ? 'en' : 'fr'
      const { sujet, texte } = gabaritDemandeTraitee({ nom: avant.nom, locale: langue })
      const envoi = await envoyerCourriel({ a: avant.email, sujet, texte })

      if (envoi.ok) {
        // L'horodatage n'est posé QU'APRÈS un envoi réussi : un échec doit
        // laisser la porte ouverte à une nouvelle tentative, pas marquer la
        // demande comme notifiée alors que personne n'a rien reçu.
        await supabase
          .from('demandes_contact')
          .update({ traite_notifie_le: new Date().toISOString() })
          .eq('id', id)
      } else {
        console.error('[demandes] courriel « traitée » non envoyé :', envoi.raison)
      }
    }
  } catch (err) {
    console.error('[demandes] échec changement de statut', err)
  }

  revalidatePath(`/${locale}/admin/demandes`)
}

/**
 * Suppression — réservée à l'admin par la politique demandes_suppression_admin.
 *
 * Un editor qui tente verra la ligne rester en place : PostgREST ne renvoie
 * pas d'erreur quand le RLS filtre une suppression, il supprime simplement
 * zéro ligne. D'où le comptage du retour, sans quoi l'échec serait muet —
 * même garde que supprimerProduit (admin/catalogue/actions.ts).
 */
export async function supprimerDemande(donnees: FormData): Promise<void> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const id = String(donnees.get('id') ?? '')
  if (!estUuid(id)) return

  try {
    const acces = await exigerRole(['admin'])
    if (!acces) return
    const { supabase } = acces
    const { data, error } = await supabase
      .from('demandes_contact')
      .delete()
      .eq('id', id)
      .select('id')

    if (error) console.error('[demandes] suppression refusée', error.message)
    else if (!data || data.length === 0) {
      console.warn('[demandes] suppression sans effet — RLS a filtré, rôle insuffisant ?')
    }
  } catch (err) {
    console.error('[demandes] échec suppression', err)
  }

  revalidatePath(`/${locale}/admin/demandes`)
}

/**
 * Note interne d'une demande — migration 0051.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI CETTE ACTION EXISTE
 *
 * Jusqu'au 2 octobre 2026, une demande n'acceptait qu'UNE seule action :
 * changer son statut. Rien ne pouvait y être attaché. Qui a appelé, ce qui a
 * été dit, le prix annoncé — tout ça vivait dans la tête de quelqu'un, dans
 * ses courriels ou son téléphone, et disparaissait dès que cette personne
 * était absente. L'écran était une boîte de réception, pas un outil de
 * travail.
 *
 * ⚠️ CETTE NOTE N'EST JAMAIS ENVOYÉE NI AFFICHÉE PUBLIQUEMENT. La politique
 * RLS de `demandes_contact` réserve déjà la lecture à l'équipe ; aucune des
 * pages publiques ne lit cette table. C'est la raison pour laquelle le champ
 * peut rester libre : il n'a pas à être rédigé pour un client.
 * ---------------------------------------------------------------------------
 */
export async function enregistrerNoteDemande(donnees: FormData): Promise<void> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const id = String(donnees.get('id') ?? '')
  // Borne haute : un champ de texte sans limite finit par recevoir un
  // copier-coller de fil de discussion entier, que l'écran affiche ensuite en
  // entier dans une modale.
  const note = String(donnees.get('note_interne') ?? '').trim().slice(0, 4000)
  if (!estUuid(id)) return

  try {
    const acces = await exigerRole(ROLES_EQUIPE)
    if (!acces) return
    const { supabase } = acces
    // Chaîne vide → NULL : « pas de note » est une absence, pas une note vide.
    const { error } = await supabase
      .from('demandes_contact')
      .update({ note_interne: note === '' ? null : note })
      .eq('id', id)
    if (error) console.error('[demandes] note refusée', error.message)
  } catch (err) {
    console.error('[demandes] échec enregistrement de la note', err)
  }

  revalidatePath(`/${locale}/admin/demandes`)
}
