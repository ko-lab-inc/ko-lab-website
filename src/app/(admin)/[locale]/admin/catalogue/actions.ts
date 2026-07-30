'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'

/**
 * CRUD du catalogue — table produits_boutique.
 *
 * ---------------------------------------------------------------------------
 * QUI PEUT QUOI, ET OÙ C'EST DÉCIDÉ
 *
 * Les politiques de 0002 font foi :
 *   produits_insertion_equipe   admin + editor
 *   produits_maj_equipe         admin + editor
 *   produits_suppression_admin  admin SEUL
 *
 * Ces actions ne re-vérifient donc pas le rôle : elles passent par le client
 * de SESSION, et le RLS refuse ce qui doit l'être. Ajouter un contrôle en
 * TypeScript par-dessus donnerait deux endroits à tenir d'accord, et c'est
 * toujours celui du code qui finit par diverger de la politique.
 *
 * ⚠️ Ce qui est vérifié ici, en revanche, c'est la FORME des données. Le RLS
 * dit qui écrit, pas ce qui est écrit : sans Zod, un prix négatif ou un slug
 * de 3 000 caractères passerait sans broncher.
 * ---------------------------------------------------------------------------
 */

export type EtatProduit = { erreur?: 'donnees' | 'refuse' | 'slug_pris' | 'serveur'; succes?: boolean }

const CATEGORIES = ['impression', 'laser', 'conteneurs', 'equipements'] as const

const schemaProduit = z.object({
  slug: z
    .string()
    .trim()
    .min(3)
    .max(80)
    // Minuscules, chiffres et tirets : le slug part dans une URL publique
    // (/boutique/<slug>) et sert de clé d'unicité.
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  marque: z.string().trim().min(1).max(80),
  categorie: z.enum(CATEGORIES),
  nom_fr: z.string().trim().min(2).max(120),
  nom_en: z.string().trim().min(2).max(120),
  description_fr: z.string().trim().max(600).optional(),
  description_en: z.string().trim().max(600).optional(),
  // Le prix est FACULTATIF : `null` signifie « sur demande », ce que la
  // boutique sait déjà afficher. Une chaîne vide devient donc null, pas 0 —
  // un produit à 0 $ et un produit sans prix ne disent pas la même chose.
  prix: z
    .union([z.coerce.number().min(0).max(1_000_000), z.literal('')])
    .transform((v) => (v === '' ? null : v)),
  cadrage: z.enum(['contain', 'cover']),
  ordre: z.coerce.number().int().min(0).max(9999),
})

function lire(donnees: FormData) {
  return schemaProduit.safeParse({
    slug: donnees.get('slug'),
    marque: donnees.get('marque'),
    categorie: donnees.get('categorie'),
    nom_fr: donnees.get('nom_fr'),
    nom_en: donnees.get('nom_en'),
    description_fr: donnees.get('description_fr') || undefined,
    description_en: donnees.get('description_en') || undefined,
    prix: donnees.get('prix') ?? '',
    cadrage: donnees.get('cadrage'),
    ordre: donnees.get('ordre') ?? 0,
  })
}

/** 23505 = violation d'unicité. Le seul index unique ici porte sur `slug`. */
const slugDejaPris = (code?: string) => code === '23505'

export async function creerProduit(
  _precedent: EtatProduit,
  donnees: FormData,
): Promise<EtatProduit> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const analyse = lire(donnees)
  if (!analyse.success) return { erreur: 'donnees' }

  try {
    const supabase = await createClient()
    // `publie: false` à la création, toujours. Un produit incomplet — sans
    // photo, sans prix confirmé — ne doit pas apparaître en boutique parce
    // qu'on a cliqué « Créer ». La publication est un geste séparé.
    const { error } = await supabase
      .from('produits_boutique')
      .insert({ ...analyse.data, publie: false })

    if (error) {
      if (slugDejaPris(error.code)) return { erreur: 'slug_pris' }
      console.error('[catalogue] création refusée', error.message)
      return { erreur: 'refuse' }
    }
  } catch (err) {
    console.error('[catalogue] échec création', err)
    return { erreur: 'serveur' }
  }

  revalidatePath(`/${locale}/admin/catalogue`)
  return { succes: true }
}

export async function modifierProduit(
  _precedent: EtatProduit,
  donnees: FormData,
): Promise<EtatProduit> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const id = String(donnees.get('id') ?? '')
  if (!id) return { erreur: 'donnees' }

  const analyse = lire(donnees)
  if (!analyse.success) return { erreur: 'donnees' }

  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('produits_boutique')
      .update(analyse.data)
      .eq('id', id)

    if (error) {
      if (slugDejaPris(error.code)) return { erreur: 'slug_pris' }
      console.error('[catalogue] mise à jour refusée', error.message)
      return { erreur: 'refuse' }
    }
  } catch (err) {
    console.error('[catalogue] échec mise à jour', err)
    return { erreur: 'serveur' }
  }

  revalidatePath(`/${locale}/admin/catalogue`)
  return { succes: true }
}

/**
 * Publication / retrait.
 *
 * Action séparée du formulaire d'édition : c'est le geste le plus fréquent et
 * le plus conséquent — il décide de ce que voit le public. Le passer par le
 * formulaire complet obligerait à rouvrir une fiche entière pour cocher une
 * case, et ferait réenregistrer huit champs pour en changer un.
 */
export async function basculerPublication(donnees: FormData): Promise<void> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const id = String(donnees.get('id') ?? '')
  const publie = donnees.get('publie') === 'true'
  if (!id) return

  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('produits_boutique')
      .update({ publie: !publie })
      .eq('id', id)
    if (error) console.error('[catalogue] bascule refusée', error.message)
  } catch (err) {
    console.error('[catalogue] échec bascule', err)
  }

  revalidatePath(`/${locale}/admin/catalogue`)
}

/**
 * Suppression — réservée à l'admin par la politique produits_suppression_admin.
 *
 * Un editor qui tente verra la ligne rester en place : PostgREST ne renvoie
 * pas d'erreur quand le RLS filtre une suppression, il supprime simplement
 * zéro ligne. D'où le comptage du retour, sans quoi l'échec serait muet.
 */
export async function supprimerProduit(donnees: FormData): Promise<void> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const id = String(donnees.get('id') ?? '')
  if (!id) return

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('produits_boutique')
      .delete()
      .eq('id', id)
      .select('id')

    if (error) console.error('[catalogue] suppression refusée', error.message)
    else if (!data || data.length === 0) {
      console.warn('[catalogue] suppression sans effet — RLS a filtré, rôle insuffisant ?')
    }
  } catch (err) {
    console.error('[catalogue] échec suppression', err)
  }

  revalidatePath(`/${locale}/admin/catalogue`)
}
