'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { adresseDepuis } from '@/lib/utils/adresseClient'
import { rateLimit } from '@/lib/utils/rateLimit'

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

export type EtatProduit = {
  erreur?: 'donnees' | 'refuse' | 'slug_pris' | 'photo' | 'serveur'
  succes?: boolean
}

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
  /**
   * Nom et description dans UNE SEULE langue — décision de Christian.
   *
   * Le formulaire envoie la langue choisie dans `langue`, et remplit la paire
   * correspondante. L'autre reste vide ; l'affichage retombe dessus (voir
   * `texteLocalise` dans lib/produits.ts). Ce n'est pas de la traduction :
   * un anglophone verra le texte français plutôt qu'un blanc, ce qui est
   * préférable mais reste un pis-aller tant qu'aucun service de traduction
   * n'est branché.
   */
  nom_fr: z.string().trim().min(2).max(120),
  nom_en: z.string().trim().max(120).nullable(),
  description_fr: z.string().trim().max(600).nullable(),
  description_en: z.string().trim().max(600).nullable(),
  /**
   * Prix OBLIGATOIRE — décision de Christian : « le prix n'est pas sur
   * demande, on va le mettre ». La colonne reste nullable en base pour ne pas
   * bloquer un import ; c'est ici que la règle s'applique, là où on la corrige
   * en une ligne.
   */
  prix: z.coerce.number().min(0).max(1_000_000),
  cadrage: z.enum(['contain', 'cover']),
  ordre: z.coerce.number().int().min(0).max(9999),
})

function lire(donnees: FormData) {
  // Une seule paire de champs à l'écran ; c'est `langue` qui décide dans
  // quelles colonnes elle atterrit.
  const anglais = donnees.get('langue') === 'en'
  const nom = String(donnees.get('nom') ?? '').trim()
  const description = String(donnees.get('description') ?? '').trim()

  /**
   * `nom_fr` reçoit TOUJOURS le texte saisi, quelle que soit la langue.
   *
   * Deux raisons. La colonne est NOT NULL depuis 0001 — c'est la seule langue
   * garantie, et le français est la langue première du site. Et c'est elle qui
   * sert de repli : un visiteur anglophone verra le texte français plutôt
   * qu'un blanc, et inversement si la saisie s'est faite en anglais.
   *
   * `nom_en` n'est rempli que si l'anglais a été choisi. Sinon il reste null,
   * et l'affichage retombe sur `nom_fr`.
   */
  return schemaProduit.safeParse({
    slug: donnees.get('slug'),
    marque: donnees.get('marque'),
    categorie: donnees.get('categorie'),
    nom_fr: nom,
    nom_en: anglais ? nom : null,
    description_fr: description || null,
    description_en: anglais ? description || null : null,
    prix: donnees.get('prix'),
    cadrage: donnees.get('cadrage'),
    ordre: donnees.get('ordre') ?? 0,
  })
}

/** 23505 = violation d'unicité. Le seul index unique ici porte sur `slug`. */
const slugDejaPris = (code?: string) => code === '23505'

const TAILLE_MAX = 5 * 1024 * 1024
const TYPES_IMAGE = ['image/webp', 'image/jpeg', 'image/png', 'image/avif']

/**
 * Téléverse la photo dans le bucket `produits` et renvoie son URL publique.
 *
 * `null` si aucun fichier n'a été fourni — cas normal d'une modification qui
 * ne touche pas à l'image. `undefined` en cas d'échec, pour que l'appelant
 * distingue « pas de nouvelle photo » de « la photo a échoué ».
 *
 * ⚠️ Type et taille sont revérifiés ICI. L'attribut `accept` du champ de
 * fichier ne filtre que le sélecteur du système : n'importe quelle requête
 * fabriquée à la main l'ignore. Le bucket applique la même règle en dernier
 * recours (allowed_mime_types, 0010), mais un refus à ce niveau remonterait
 * une erreur illisible.
 *
 * Le nom du fichier vient du SLUG, jamais du nom d'origine : un fichier
 * téléversé peut s'appeler `../../etc/passwd` ou porter des caractères que
 * l'URL n'accepte pas. L'horodatage évite que le CDN serve l'ancienne image
 * après un remplacement — même problème que les visuels renommés en `-v2`.
 */
async function televerserPhoto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fichier: FormDataEntryValue | null,
  slug: string,
): Promise<Photo | null | undefined> {
  if (!(fichier instanceof File) || fichier.size === 0) return null

  if (fichier.size > TAILLE_MAX || !TYPES_IMAGE.includes(fichier.type)) {
    console.error('[catalogue] photo refusée —', fichier.type, fichier.size)
    return undefined
  }

  /**
   * Plafond sur les téléversements.
   *
   * L'écriture dans le bucket est déjà réservée à l'équipe (politiques de
   * 0010), le risque n'est donc pas l'inconnu qui remplit le stockage. C'est
   * la boucle involontaire — un script de reprise mal réglé, un double clic
   * répété — et le compte d'équipe compromis, qui aurait sinon un stockage
   * sans fond à disposition.
   *
   * Trente fichiers par dix minutes : très au-delà d'une saisie manuelle, où
   * l'on téléverse une photo à la fois.
   */
  if (rateLimit(`photo:${adresseDepuis(await headers())}`, { max: 30, windowMs: 600_000 })) {
    console.warn('[catalogue] téléversement limité — trop de fichiers en peu de temps')
    return undefined
  }

  const extension = fichier.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'webp'
  const chemin = `${slug}-${Date.now()}.${extension}`

  const { error } = await supabase.storage
    .from('produits')
    .upload(chemin, fichier, { contentType: fichier.type, upsert: false })

  if (error) {
    console.error('[catalogue] téléversement refusé', error.message)
    return undefined
  }

  const { data } = supabase.storage.from('produits').getPublicUrl(chemin)
  return { url: data.publicUrl, chemin }
}

/**
 * Le chemin accompagne l'URL parce qu'il faut pouvoir revenir en arrière.
 *
 * Si l'enregistrement échoue APRÈS le téléversement — slug déjà pris, c'est le
 * cas courant — le fichier reste dans le bucket sans qu'aucune ligne n'y
 * renvoie. On corrige le slug, on renvoie le formulaire, et un orphelin
 * s'accumule à chaque essai. Personne ne les voit, ils ne se nettoient jamais.
 */
type Photo = { url: string; chemin: string }

/** Retire un fichier téléversé dont l'enregistrement a échoué. */
async function retirerPhoto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  photo: Photo | null,
): Promise<void> {
  if (!photo) return
  const { error } = await supabase.storage.from('produits').remove([photo.chemin])
  // Un orphelin est un désagrément, pas une panne : on le signale et on laisse
  // l'erreur d'origine remonter à l'utilisateur.
  if (error) console.error('[catalogue] orphelin non nettoyé', photo.chemin, error.message)
}

export async function creerProduit(
  _precedent: EtatProduit,
  donnees: FormData,
): Promise<EtatProduit> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const analyse = lire(donnees)
  if (!analyse.success) return { erreur: 'donnees' }

  try {
    const supabase = await createClient()

    const photo = await televerserPhoto(supabase, donnees.get('photo'), analyse.data.slug)
    if (photo === undefined) return { erreur: 'photo' }

    // `publie: false` à la création, toujours. Un produit incomplet — sans
    // photo, sans prix confirmé — ne doit pas apparaître en boutique parce
    // qu'on a cliqué « Créer ». La publication est un geste séparé.
    const { error } = await supabase
      .from('produits_boutique')
      .insert({ ...analyse.data, images: photo ? [photo.url] : [], publie: false })

    if (error) {
      // Le fichier est déjà dans le bucket : sans ce retrait, chaque tentative
      // sur un slug déjà pris y laisserait une image que plus rien ne
      // référence.
      await retirerPhoto(supabase, photo)
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

    const photo = await televerserPhoto(supabase, donnees.get('photo'), analyse.data.slug)
    if (photo === undefined) return { erreur: 'photo' }

    // `images` n'est touché QUE si une nouvelle photo a été fournie. Sans
    // cette condition, enregistrer une correction de prix effacerait l'image
    // du produit — le champ de fichier est vide à chaque réouverture.
    const { error } = await supabase
      .from('produits_boutique')
      .update(photo ? { ...analyse.data, images: [photo.url] } : analyse.data)
      .eq('id', id)

    if (error) {
      await retirerPhoto(supabase, photo)
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
