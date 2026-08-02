'use server'

import { revalidatePath } from 'next/cache'

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
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
