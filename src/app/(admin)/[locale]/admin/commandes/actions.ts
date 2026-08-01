'use server'

import { revalidatePath } from 'next/cache'

import { exigerRole } from '@/lib/auth/garde'
import { estUuid } from '@/lib/utils/identifiant'
import { ROLES_EQUIPE, STATUTS_COMMANDE } from '@/types'

/**
 * Gestion des commandes — table commandes, migration 0021.
 *
 * Mêmes règles que /admin/demandes : lecture et changement de statut pour
 * l'équipe (`commandes_lecture_equipe` / `commandes_maj_equipe`, 0021).
 * Aucune suppression n'existe pour cette table, y compris pour l'admin —
 * `annulee` est le statut qui en tient lieu.
 */
export async function changerStatutCommande(donnees: FormData): Promise<void> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const id = String(donnees.get('id') ?? '')
  const statut = String(donnees.get('statut') ?? '')
  if (!estUuid(id) || !STATUTS_COMMANDE.some((s) => s === statut)) return

  try {
    const acces = await exigerRole(ROLES_EQUIPE)
    if (!acces) return
    const { supabase } = acces
    const { error } = await supabase.from('commandes').update({ statut }).eq('id', id)
    if (error) console.error('[admin/commandes] changement de statut refusé', error.message)
  } catch (err) {
    console.error('[admin/commandes] échec changement de statut', err)
  }

  revalidatePath(`/${locale}/admin/commandes`)
}
