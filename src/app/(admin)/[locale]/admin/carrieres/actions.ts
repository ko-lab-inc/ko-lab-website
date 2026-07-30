'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { z } from 'zod'

import { ETIQUETTE_CARRIERES } from '@/lib/carrieres'
import { createClient } from '@/lib/supabase/server'
import { TYPES_POSTE } from '@/types'

/**
 * CRUD des offres d'emploi — table postes_carrieres.
 *
 * Même architecture que /admin/catalogue et /admin/realisations : RLS fait
 * foi (0002), Server Actions inline pour la publication et la suppression,
 * composant client pour l'édition (renvoie les erreurs de validation).
 *
 * ⚠️ Pas de photo, pas de slug — postes_carrieres n'a ni l'une ni l'autre
 * colonne. Le formulaire le plus simple des trois construits cette session.
 */

export type EtatPoste = { erreur?: 'donnees' | 'refuse' | 'serveur'; succes?: boolean }

const schemaPoste = z.object({
  titre_fr: z.string().trim().min(2).max(150),
  departement: z.string().trim().min(2).max(100),
  type: z.enum(TYPES_POSTE),
  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => v || null),
  exigences: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => v || null),
})

function lire(donnees: FormData) {
  return schemaPoste.safeParse({
    titre_fr: String(donnees.get('titre_fr') ?? '').trim(),
    departement: String(donnees.get('departement') ?? '').trim(),
    type: donnees.get('type'),
    description: donnees.get('description'),
    exigences: donnees.get('exigences'),
  })
}

export async function creerPoste(_precedent: EtatPoste, donnees: FormData): Promise<EtatPoste> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const analyse = lire(donnees)
  if (!analyse.success) return { erreur: 'donnees' }

  try {
    const supabase = await createClient()

    // Le plus PETIT `ordre` existant, pas le plus grand : même règle que le
    // catalogue et les réalisations — le poste ajouté doit apparaître EN
    // PREMIER, pas à la fin d'une liste triée par ordre ascendant.
    const { data: premier } = await supabase
      .from('postes_carrieres')
      .select('ordre')
      .order('ordre', { ascending: true })
      .limit(1)
      .maybeSingle()
    const ordre = (premier?.ordre ?? 10) - 10

    const { error } = await supabase.from('postes_carrieres').insert({
      titre_fr: analyse.data.titre_fr,
      departement: analyse.data.departement,
      type: analyse.data.type,
      description_fr: analyse.data.description,
      exigences_fr: analyse.data.exigences,
      ordre,
      // `actif: true` dès la création — même décision que le catalogue
      // (publie: true) : un poste ajouté doit être visible immédiatement,
      // pas retrouvé masqué après coup. Le retirer reste un geste séparé.
      actif: true,
    })

    if (error) {
      console.error('[carrieres] création refusée', error.message)
      return { erreur: 'refuse' }
    }
  } catch (err) {
    console.error('[carrieres] échec création', err)
    return { erreur: 'serveur' }
  }

  updateTag(ETIQUETTE_CARRIERES)
  revalidatePath(`/${locale}/admin/carrieres`)
  return { succes: true }
}

export async function modifierPoste(_precedent: EtatPoste, donnees: FormData): Promise<EtatPoste> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const id = String(donnees.get('id') ?? '')
  if (!id) return { erreur: 'donnees' }

  const analyse = lire(donnees)
  if (!analyse.success) return { erreur: 'donnees' }

  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('postes_carrieres')
      .update({
        titre_fr: analyse.data.titre_fr,
        departement: analyse.data.departement,
        type: analyse.data.type,
        description_fr: analyse.data.description,
        exigences_fr: analyse.data.exigences,
      })
      .eq('id', id)

    if (error) {
      console.error('[carrieres] mise à jour refusée', error.message)
      return { erreur: 'refuse' }
    }
  } catch (err) {
    console.error('[carrieres] échec mise à jour', err)
    return { erreur: 'serveur' }
  }

  updateTag(ETIQUETTE_CARRIERES)
  revalidatePath(`/${locale}/admin/carrieres`)
  return { succes: true }
}

/**
 * Publication / retrait — geste le plus fréquent, séparé du formulaire
 * complet pour ne pas faire réenregistrer cinq champs pour en changer un.
 */
export async function basculerPublicationPoste(donnees: FormData): Promise<void> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const id = String(donnees.get('id') ?? '')
  const actif = donnees.get('actif') === 'true'
  if (!id) return

  try {
    const supabase = await createClient()
    const { error } = await supabase.from('postes_carrieres').update({ actif: !actif }).eq('id', id)
    if (error) console.error('[carrieres] bascule refusée', error.message)
  } catch (err) {
    console.error('[carrieres] échec bascule', err)
  }

  updateTag(ETIQUETTE_CARRIERES)
  revalidatePath(`/${locale}/admin/carrieres`)
}

/**
 * Suppression — réservée à l'admin par la politique postes_suppression_admin
 * (0002). Un editor qui tente verra la ligne rester en place : PostgREST ne
 * renvoie pas d'erreur quand le RLS filtre une suppression, il supprime
 * simplement zéro ligne — d'où le comptage du retour.
 */
export async function supprimerPoste(donnees: FormData): Promise<void> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const id = String(donnees.get('id') ?? '')
  if (!id) return

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('postes_carrieres')
      .delete()
      .eq('id', id)
      .select('id')

    if (error) console.error('[carrieres] suppression refusée', error.message)
    else if (!data || data.length === 0) {
      console.warn('[carrieres] suppression sans effet — RLS a filtré, rôle insuffisant ?')
    }
  } catch (err) {
    console.error('[carrieres] échec suppression', err)
  }

  updateTag(ETIQUETTE_CARRIERES)
  revalidatePath(`/${locale}/admin/carrieres`)
}
