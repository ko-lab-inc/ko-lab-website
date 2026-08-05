'use server'

import { hasLocale } from 'next-intl'
import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'

import { routing } from '@/i18n/routing'
import { gabaritChangementStatut } from '@/lib/email/gabaritStatutCommande'
import { routeCommande } from '@/lib/routes'
import { exigerRole } from '@/lib/auth/garde'
import { estUuid } from '@/lib/utils/identifiant'
import { origine } from '@/lib/utils/origine'
import { ROLES_EQUIPE, STATUTS_COMMANDE, type StatutCommande } from '@/types'

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
      .select('numero, email')
      .single()

    if (error || !data) {
      console.error('[admin/commandes] changement de statut refusé', error?.message)
    } else {
      await notifierClient({ locale, id, numero: data.numero, email: data.email, statut })
    }
  } catch (err) {
    console.error('[admin/commandes] échec changement de statut', err)
  }

  revalidatePath(`/${locale}/admin/commandes`)
}

async function notifierClient({
  locale,
  id,
  numero,
  email,
  statut,
}: {
  locale: (typeof routing.locales)[number]
  id: string
  numero: string
  email: string
  statut: StatutCommande
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

    const { Resend } = await import('resend')
    const { html, text } = gabaritChangementStatut({ numero, statutLabel, lienCommande, origine: origine() })

    await new Resend(cleResend).emails.send({
      from: 'KO-LAB <site@ko-lab-center.ca>',
      to: email,
      subject: `Commande ${numero} — ${statutLabel}`,
      html,
      text,
    })
  } catch (err) {
    console.error('[admin/commandes] échec envoi notification de statut', err)
  }
}
