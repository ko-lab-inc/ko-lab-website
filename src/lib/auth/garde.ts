import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { ROLES_EQUIPE, type Role } from '@/types'

/**
 * Contrôle d'autorisation pour les Server Actions d'administration.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI CE FICHIER EXISTE — UNE SERVER ACTION N'EST PAS UNE PAGE
 *
 * L'espace d'administration est protégé deux fois : une garde dans
 * `src/proxy.ts` et une relecture du rôle dans le layout admin. Les deux
 * s'appuient sur le CHEMIN de l'URL (`startsWith('/admin')`, ou le simple
 * fait que le layout soit rendu).
 *
 * Or une Server Action n'est pas attachée à l'URL du fichier qui la déclare.
 * Elle s'invoque par un POST sur N'IMPORTE QUEL chemin du site, avec l'en-tête
 * `Next-Action: <identifiant>` :
 *
 *     POST /fr/            ← chemin public, la garde du proxy ne se déclenche pas
 *     Next-Action: <id de supprimerVideo>
 *     Cookie: <session d'un compte quelconque>
 *
 * Le layout admin n'est jamais instancié : rien ne le rend. Les DEUX couches
 * de protection du projet sont donc hors-jeu, et il ne reste que le RLS.
 *
 * ---------------------------------------------------------------------------
 * CE N'EST PAS UN CORRECTIF DE FAILLE — C'EST LA SECONDE BARRIÈRE QUI MANQUAIT
 *
 * Vérifié pendant l'audit du 2026-07-30 : les politiques d'écriture de TOUTES
 * les tables (videos, produits_boutique, realisations, postes_carrieres,
 * demandes_contact, candidatures, reglages, profils) sont bien filtrées par
 * `get_user_role() in ('admin','editor')`, et la lecture du bucket privé `cv`
 * l'est aussi. Une écriture anonyme est refusée par la base — testé, 401 sur
 * les sept tables. Aucune de ces actions n'était donc exploitable.
 *
 * Le défaut est ailleurs : l'unique rempart était le RLS. Une seule politique
 * oubliée sur une future table, et l'écriture devenait ouverte à tout compte
 * connecté — l'inscription publique étant ouverte, à n'importe qui. Le projet
 * applique la défense en profondeur pour l'accès aux PAGES et l'abandonnait
 * pour l'accès aux ACTIONS, alors que ce sont elles qui écrivent.
 *
 * ---------------------------------------------------------------------------
 * COMMENT L'UTILISER
 *
 *     const acces = await exigerRole()            // admin ou editor
 *     if (!acces) return { erreur: 'refuse' }
 *     const { supabase } = acces
 *
 * On renvoie le client Supabase déjà construit : l'appelant en a besoin juste
 * après, et le reconstruire relirait les cookies pour rien.
 * ---------------------------------------------------------------------------
 */

export type AccesAdmin = {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  role: Role
}

/**
 * Vérifie que l'appelant est connecté ET porte l'un des rôles attendus.
 *
 * Renvoie `null` en cas de refus — jamais d'exception : les actions du projet
 * renvoient un état d'erreur typé, pas une page d'erreur. À l'appelant de
 * traduire ce `null` en `{ erreur: 'refuse' }` ou en retour silencieux selon
 * sa signature.
 *
 * @param roles Rôles acceptés. Par défaut l'équipe (admin + editor) ;
 *              passer `['admin']` pour les suppressions et les réglages.
 */
export async function exigerRole(
  roles: readonly Role[] = ROLES_EQUIPE,
): Promise<AccesAdmin | null> {
  try {
    const supabase = await createClient()

    // getUser() valide le jeton auprès de Supabase. getSession() se
    // contenterait de lire un cookie que le client peut fabriquer — même
    // raison que dans le layout admin.
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return null

    const { data: profil } = await supabase
      .from('profils')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profil) return null

    const role = profil.role as Role
    if (!roles.some((r) => r === role)) return null

    return { supabase, userId: user.id, role }
  } catch (err) {
    // Supabase injoignable : on refuse. Un contrôle d'accès qui échoue doit
    // échouer fermé.
    console.error('[garde] contrôle de rôle impossible', err)
    return null
  }
}
