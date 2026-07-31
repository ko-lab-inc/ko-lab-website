'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { STATUTS_DEMANDE } from '@/types'

/**
 * Gestion des candidatures — table candidatures, migration 0017.
 *
 * Mêmes règles que /admin/demandes : RLS fait foi (lecture et changement de
 * statut pour l'équipe, suppression pour l'admin seul), aucune vérification
 * de rôle rejouée en TypeScript.
 */

/**
 * Changement de statut — nouveau / lu / traité.
 *
 * Réutilise STATUTS_DEMANDE : la table `candidatures` a exactement la même
 * contrainte CHECK que `demandes_contact` (0017 reprend 0001), et un second
 * jeu de constantes finirait par diverger du premier.
 */
export async function changerStatutCandidature(donnees: FormData): Promise<void> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const id = String(donnees.get('id') ?? '')
  const statut = String(donnees.get('statut') ?? '')
  if (!id || !STATUTS_DEMANDE.some((s) => s === statut)) return

  try {
    const supabase = await createClient()
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
 */
export async function telechargerCv(donnees: FormData): Promise<void> {
  const chemin = String(donnees.get('chemin') ?? '')
  const locale = String(donnees.get('locale') ?? 'fr')
  if (!chemin) return

  let url: string | null = null

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.storage.from('cv').createSignedUrl(chemin, 300)

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
 */
export async function supprimerCandidature(donnees: FormData): Promise<void> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const id = String(donnees.get('id') ?? '')
  const chemin = String(donnees.get('chemin') ?? '')
  if (!id) return

  try {
    const supabase = await createClient()
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
