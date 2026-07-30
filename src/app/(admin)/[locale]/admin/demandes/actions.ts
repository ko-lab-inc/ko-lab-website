'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { STATUTS_DEMANDE } from '@/types'

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
  if (!id || !STATUTS_DEMANDE.some((s) => s === statut)) return

  try {
    const supabase = await createClient()
    const { error } = await supabase.from('demandes_contact').update({ statut }).eq('id', id)
    if (error) console.error('[demandes] changement de statut refusé', error.message)
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
  if (!id) return

  try {
    const supabase = await createClient()
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
