'use server'

import { hasLocale } from 'next-intl'
import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'

import { routing } from '@/i18n/routing'
import { EMAILS } from '@/lib/constantes'
import { gabaritChangementStatut } from '@/lib/email/gabaritStatutCommande'
import { lireProduitsPublies } from '@/lib/produits'
import { routeCommande } from '@/lib/routes'
import { exigerRole, type AccesAdmin } from '@/lib/auth/garde'
import { estUuid } from '@/lib/utils/identifiant'
import { origine } from '@/lib/utils/origine'
import { ROLES_EQUIPE, STATUTS_COMMANDE, STATUTS_PAR_MODE, type ModeLivraison, type StatutCommande } from '@/types'

/**
 * Gestion des commandes — table commandes, migration 0021.
 *
 * Mêmes règles que /admin/demandes : lecture et changement de statut pour
 * l'équipe (`commandes_lecture_equipe` / `commandes_maj_equipe`, 0021).
 * Aucune suppression n'existe pour cette table, y compris pour l'admin —
 * `annulee` est le statut qui en tient lieu.
 *
 * ---------------------------------------------------------------------------
 * NOTIFICATION AUTOMATIQUE AU CLIENT — demande de Christian
 *
 * Une fois la commande confirmée, c'est l'équipe qui la fait progresser
 * (préparation, expédition…) depuis cet écran — le client ne revient pas
 * vérifier par lui-même, il doit être notifié à CHAQUE changement, sans
 * exception (y compris une annulation décidée par l'équipe, la seule pour
 * laquelle un client a vraiment besoin de savoir sans délai). Même
 * dégradation propre que creerCommande : si RESEND_API_KEY est absente ou
 * l'envoi échoue, le changement de statut reste appliqué — seul le
 * courriel manque, jamais la mise à jour elle-même.
 */
export async function changerStatutCommande(donnees: FormData): Promise<void> {
  const localeBrute = String(donnees.get('locale') ?? 'fr')
  const id = String(donnees.get('id') ?? '')
  const statutBrut = String(donnees.get('statut') ?? '')
  if (!estUuid(id)) return
  if (!hasLocale(routing.locales, localeBrute)) return
  if (!STATUTS_COMMANDE.some((s) => s === statutBrut)) return

  const locale = localeBrute
  const statut = statutBrut as StatutCommande

  try {
    const acces = await exigerRole(ROLES_EQUIPE)
    if (!acces) return
    const { supabase } = acces
    const { data, error } = await supabase
      .from('commandes')
      .update({ statut })
      .eq('id', id)
      .select('numero, email, mode_livraison')
      .single()

    if (error || !data) {
      console.error('[admin/commandes] changement de statut refusé', error?.message)
    } else {
      await notifierClient({
        supabase,
        locale,
        id,
        numero: data.numero,
        email: data.email,
        statut,
        modeLivraison: data.mode_livraison as ModeLivraison,
      })
    }
  } catch (err) {
    console.error('[admin/commandes] échec changement de statut', err)
  }

  revalidatePath(`/${locale}/admin/commandes`)
}

async function notifierClient({
  supabase,
  locale,
  id,
  numero,
  email,
  statut,
  modeLivraison,
}: {
  supabase: AccesAdmin['supabase']
  locale: (typeof routing.locales)[number]
  id: string
  numero: string
  email: string
  statut: StatutCommande
  modeLivraison: ModeLivraison
}): Promise<void> {
  const cleResend = process.env.RESEND_API_KEY
  if (!cleResend) {
    console.warn('[admin/commandes] RESEND_API_KEY absente — notification de statut non envoyée')
    return
  }

  try {
    const t = await getTranslations({ locale, namespace: 'Commande' })
    const statutLabel = t(`statut_${statut}`)
    const lienCommande = `${origine()}/${locale}${routeCommande(id)}`

    const libellesStatuts: Record<string, string> = Object.fromEntries(
      STATUTS_COMMANDE.map((s) => [s, t(`statut_${s}`)]),
    )
    // Pas de parcours pour une annulation : ce n'est pas une progression,
    // c'est une sortie de route — même choix que StatutTimeline.tsx.
    const etapesTimeline = statut === 'annulee' ? [] : STATUTS_PAR_MODE[modeLivraison].filter((s) => s !== 'annulee')

    // Lignes + photo ACTUELLE du catalogue — même raisonnement que la page
    // /compte/commandes/[id] : lignes_commande n'a jamais stocké d'image.
    const [{ data: lignesCommande }, catalogue] = await Promise.all([
      supabase.from('lignes_commande').select('nom_produit, categorie, quantite, produit_id').eq('commande_id', id),
      // Admin reste francophone (hors périmètre Phase 9) — seule .src (image)
      // est lue plus bas, jamais nom/texte.
      lireProduitsPublies('fr'),
    ])
    const catalogueParId = new Map(catalogue.map((p) => [p.id, p]))
    const lignes = (lignesCommande ?? []).map((l) => ({
      nom: l.nom_produit,
      categorie: l.categorie,
      quantite: l.quantite,
      image: l.produit_id ? (catalogueParId.get(l.produit_id)?.src ?? null) : null,
    }))

    const { Resend } = await import('resend')
    const { html, text } = gabaritChangementStatut({
      numero,
      statutLabel,
      statutActuel: statut,
      etapesTimeline,
      libellesStatuts,
      lignes,
      lienCommande,
      origine: origine(),
    })

    await new Resend(cleResend).emails.send({
      from: `KO-LAB <${EMAILS.envoiTransactionnel}>`,
      // `from` reste sur le domaine vérifié Resend (ko-lab-center.ca) — le
      // client qui répond doit atterrir dans la vraie boîte de l'équipe
      // (ko-lab.ca), pas dans une adresse jamais consultée. Voir lib/constantes.ts.
      replyTo: EMAILS.info,
      to: email,
      subject: `Commande ${numero} — ${statutLabel}`,
      html,
      text,
    })
  } catch (err) {
    console.error('[admin/commandes] échec envoi notification de statut', err)
  }
}
