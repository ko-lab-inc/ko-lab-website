'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { z } from 'zod'

import { ETIQUETTE_CARRIERES } from '@/lib/carrieres'
import { exigerRole } from '@/lib/auth/garde'
import { estUuid } from '@/lib/utils/identifiant'
import { TYPES_POSTE, ROLES_EQUIPE } from '@/types'

/**
 * CRUD des offres d'emploi — table postes_carrieres.
 *
 * Même architecture que /admin/catalogue et /admin/realisations : RLS fait
 * foi (0002), Server Actions inline pour la publication et la suppression,
 * composant client pour l'édition (renvoie les erreurs de validation).
 *
 * ⚠️ Pas de slug — postes_carrieres n'a pas cette colonne. Une photo existe
 * depuis la migration 0032 (photo_url) : voir attribuerPhotoPoste plus bas,
 * une action à part du formulaire principal (FormulairePoste), au même titre
 * que la publication.
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
  // Trois champs anglais, tous optionnels — mêmes contraintes de longueur
  // que leur équivalent français, sans le `min(2)` de titre_fr (un titre EN
  // absent est un champ vide légitime, pas une saisie invalide). Chaîne
  // vide → null, jamais '' : c'est ce qui permet à lib/carrieres.ts de
  // retomber sur le FR champ par champ (repli déjà en place, voir sa
  // docstring — inchangé par ce chantier).
  titre_en: z
    .string()
    .trim()
    .max(150)
    .optional()
    .transform((v) => v || null),
  description_en: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => v || null),
  exigences_en: z
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
    titre_en: donnees.get('titre_en'),
    description_en: donnees.get('description_en'),
    exigences_en: donnees.get('exigences_en'),
  })
}

export async function creerPoste(_precedent: EtatPoste, donnees: FormData): Promise<EtatPoste> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const analyse = lire(donnees)
  if (!analyse.success) return { erreur: 'donnees' }

  try {
    const acces = await exigerRole(ROLES_EQUIPE)
    if (!acces) return { erreur: 'refuse' }
    const { supabase } = acces

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
      titre_en: analyse.data.titre_en,
      description_en: analyse.data.description_en,
      exigences_en: analyse.data.exigences_en,
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
  if (!estUuid(id)) return { erreur: 'donnees' }

  const analyse = lire(donnees)
  if (!analyse.success) return { erreur: 'donnees' }

  try {
    const acces = await exigerRole(ROLES_EQUIPE)
    if (!acces) return { erreur: 'refuse' }
    const { supabase } = acces
    const { error } = await supabase
      .from('postes_carrieres')
      .update({
        titre_fr: analyse.data.titre_fr,
        departement: analyse.data.departement,
        type: analyse.data.type,
        description_fr: analyse.data.description,
        exigences_fr: analyse.data.exigences,
        titre_en: analyse.data.titre_en,
        description_en: analyse.data.description_en,
        exigences_en: analyse.data.exigences_en,
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
  if (!estUuid(id)) return

  try {
    const acces = await exigerRole(ROLES_EQUIPE)
    if (!acces) return
    const { supabase } = acces
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
  if (!estUuid(id)) return

  try {
    const acces = await exigerRole(['admin'])
    if (!acces) return
    const { supabase } = acces
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

/**
 * Attribution (ou retrait) de la photo d'un poste — colonne photo_url,
 * migration 0032.
 *
 * ⚠️ `updateTag(ETIQUETTE_CARRIERES)` EST NÉCESSAIRE ICI depuis le 23 août
 * 2026 — ne pas le retirer. `lireOffresPubliees()` (lib/carrieres.ts) lit
 * maintenant `photo_url` (resoudrePhotoPoste, lib/carrieres-photo.ts) : cette
 * colonne a désormais un lecteur public, mis en cache 1h (`revalidate: 3600`)
 * derrière `ETIQUETTE_CARRIERES`. Avant cette date, cet appel était
 * délibérément absent — le commentaire disait alors que photo_url n'avait
 * aucun lecteur public, ce qui était vrai jusqu'à ce que la page publique
 * s'y branche. Sans cet appel, une photo assignée ici resterait invisible
 * sur /carrieres jusqu'à l'expiration naturelle du cache.
 *
 * Pas de revalidatePath : l'écran admin lit toujours en direct via le client
 * de session (jamais de cache côté page), et le composant met à jour son
 * état local dès la réponse — rafraîchir la page redemanderait la même
 * donnée pour rien.
 *
 * `exigerRole(ROLES_EQUIPE)`, pas `['admin']` : assigner une photo est un
 * geste d'édition courant, comme modifier le titre — même politique RLS
 * (postes_maj_equipe, 0002) que modifierPoste ci-dessus, pas
 * postes_suppression_admin.
 *
 * Signature en arguments positionnels, pas (prevState, FormData) : appelée
 * directement depuis le composant client (SelecteurPhotoPoste), même patron
 * que mettreAJourEmplacement (medias-emplacements/actions.ts).
 */
export async function attribuerPhotoPoste(
  posteId: string,
  urlStockage?: string | null,
): Promise<{ success: boolean; error?: string }> {
  if (!estUuid(posteId)) return { success: false, error: 'Poste introuvable.' }

  try {
    const acces = await exigerRole(ROLES_EQUIPE)
    if (!acces) {
      return { success: false, error: 'Cette action a été refusée. Réessayez, ou prévenez Moussa si ça persiste.' }
    }
    const { supabase } = acces

    const { error } = await supabase
      .from('postes_carrieres')
      .update({ photo_url: urlStockage ?? null })
      .eq('id', posteId)

    if (error) {
      console.error('[carrieres] attribution de photo refusée', error.message)
      return { success: false, error: "L'enregistrement a échoué. Réessayez, ou prévenez Moussa si ça persiste." }
    }

    updateTag(ETIQUETTE_CARRIERES)
  } catch (err) {
    console.error('[carrieres] échec attribution de photo', err)
    return { success: false, error: "L'enregistrement a échoué. Réessayez, ou prévenez Moussa si ça persiste." }
  }

  return { success: true }
}
