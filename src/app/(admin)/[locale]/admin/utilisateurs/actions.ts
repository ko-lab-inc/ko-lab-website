'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
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
