'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { headers } from 'next/headers'
import { z } from 'zod'

import { ETIQUETTE_REALISATIONS, type ImageRealisation } from '@/lib/realisations'
import { createClient } from '@/lib/supabase/server'
import { adresseDepuis } from '@/lib/utils/adresseClient'
import { rateLimit } from '@/lib/utils/rateLimit'
import { slugifier } from '@/lib/utils/slug'
import { CATEGORIES_REALISATION } from '@/types'

/**
 * CRUD des réalisations — table `realisations`.
 *
 * ---------------------------------------------------------------------------
 * QUI PEUT QUOI, ET OÙ C'EST DÉCIDÉ
 *
 * Les politiques de 0002 font foi, et sont un décalque exact de celles du
 * catalogue :
 *   realisations_insertion_equipe   admin + editor
 *   realisations_maj_equipe         admin + editor
 *   realisations_suppression_admin  admin SEUL
 *
 * Ces actions ne re-vérifient donc pas le rôle : elles passent par le client
 * de SESSION, et le RLS refuse ce qui doit l'être.
 *
 * ---------------------------------------------------------------------------
 * DEUX LANGUES OBLIGATOIRES, À LA DIFFÉRENCE DU CATALOGUE
 *
 * Le catalogue a été simplifié à une seule langue de saisie (0010). Rien
 * d'équivalent n'a été décidé pour les réalisations, et le schéma le confirme :
 * `titre_en` est resté NOT NULL. Ce formulaire garde donc deux champs de titre
 * et deux champs de description — fidèle à la contrainte réelle, sans
 * supposer une décision qui n'a pas été prise pour cet écran.
 * ---------------------------------------------------------------------------
 */

export type EtatRealisation = {
  erreur?: 'donnees' | 'refuse' | 'photo' | 'serveur'
  succes?: boolean
}

const schemaRealisation = z.object({
  titre_fr: z.string().trim().min(2).max(120),
  titre_en: z.string().trim().min(2).max(120),
  description_fr: z.string().trim().max(600).nullable(),
  description_en: z.string().trim().max(600).nullable(),
  categorie: z.enum(CATEGORIES_REALISATION),
  ordre: z.coerce.number().int().min(0).max(9999),
})

function lireChamps(donnees: FormData) {
  return schemaRealisation.safeParse({
    titre_fr: donnees.get('titre_fr'),
    titre_en: donnees.get('titre_en'),
    description_fr: String(donnees.get('description_fr') ?? '').trim() || null,
    description_en: String(donnees.get('description_en') ?? '').trim() || null,
    categorie: donnees.get('categorie'),
    ordre: donnees.get('ordre') ?? 0,
  })
}

/** 23505 = violation d'unicité. Le seul index unique ici porte sur `slug`. */
const slugDejaPris = (code?: string) => code === '23505'

const TAILLE_MAX = 5 * 1024 * 1024
const TYPES_IMAGE = ['image/webp', 'image/jpeg', 'image/png', 'image/avif']

/**
 * Chemin de stockage à partir d'une URL publique, pour pouvoir supprimer le
 * fichier quand une photo est retirée de la série.
 *
 * `images` ne conserve que l'URL — jamais le chemin brut, qui n'a aucun sens
 * pour l'affichage. Le chemin se retrouve en retirant le préfixe fixe que
 * Supabase Storage ajoute à toute URL publique.
 */
function cheminDepuisUrl(url: string): string | null {
  const marqueur = '/storage/v1/object/public/realisations/'
  const i = url.indexOf(marqueur)
  return i === -1 ? null : url.slice(i + marqueur.length)
}

/**
 * Reconstruit la série d'images à partir du formulaire : ce qui est conservé,
 * ce qui est retiré, ce qui est nouvellement téléversé.
 *
 * ---------------------------------------------------------------------------
 * FORME ATTENDUE DU FORMULAIRE
 *
 * `image_count` donne le nombre de photos CONSERVÉES — celles que le client a
 * déjà retirées de sa liste avant l'envoi ne comptent plus dedans. Pour
 * chaque indice i < image_count :
 *   image_url_i     (hidden)  URL publique actuelle
 *   image_alt_fr_i  (text)    texte alternatif français
 *   image_alt_en_i  (text)    texte alternatif anglais
 *   image_ordre_i   (number)  position dans la série
 *
 * `image_supprimee` (répété, un par photo retirée) porte l'URL de chaque
 * photo à effacer du STOCKAGE — une info que son absence de la liste
 * précédente ne donnerait pas : sans elle, le fichier resterait dans le
 * bucket, invisible et jamais nettoyé.
 *
 * `photos` (multiple) porte les NOUVEAUX fichiers, ajoutés sans texte
 * alternatif — il se saisit à la réouverture du formulaire, une fois la photo
 * visible dans la liste. Demander l'alt AVANT l'aperçu reviendrait à décrire
 * une image qu'on n'a pas encore vue s'afficher.
 * ---------------------------------------------------------------------------
 */
async function construireImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  donnees: FormData,
  slug: string,
): Promise<{ images: ImageRealisation[] } | { erreur: true }> {
  const compte = Number(donnees.get('image_count') ?? 0)
  const conservees: ImageRealisation[] = []

  for (let i = 0; i < compte; i += 1) {
    const url = String(donnees.get(`image_url_${i}`) ?? '')
    if (!url) continue

    conservees.push({
      url,
      alt_fr: String(donnees.get(`image_alt_fr_${i}`) ?? '').trim(),
      alt_en: String(donnees.get(`image_alt_en_${i}`) ?? '').trim(),
      ordre: Number(donnees.get(`image_ordre_${i}`) ?? i * 10),
    })
  }

  const aSupprimer = donnees
    .getAll('image_supprimee')
    .map((v) => cheminDepuisUrl(String(v)))
    .filter((c): c is string => c !== null)

  const fichiers = donnees.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0)

  if (fichiers.length > 0) {
    // Même plafond que le catalogue (0 photo, 30 par 10 min), sous une clé
    // séparée : les deux écrans ne doivent pas partager le même budget.
    if (rateLimit(`photo-realisation:${adresseDepuis(await headers())}`, { max: 30, windowMs: 600_000 })) {
      return { erreur: true }
    }
  }

  let ordreSuivant = conservees.length > 0 ? Math.max(...conservees.map((im) => im.ordre)) + 10 : 0
  const nouvelles: ImageRealisation[] = []

  for (const fichier of fichiers) {
    if (fichier.size > TAILLE_MAX || !TYPES_IMAGE.includes(fichier.type)) {
      console.error('[realisations] photo refusée —', fichier.type, fichier.size)
      return { erreur: true }
    }

    const extension = fichier.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'webp'
    // Index dans le NOM du fichier : deux photos du même lot téléversées à la
    // même milliseconde ne doivent pas s'écraser l'une l'autre.
    const chemin = `${slug}-${Date.now()}-${nouvelles.length}.${extension}`

    const { error } = await supabase.storage
      .from('realisations')
      .upload(chemin, fichier, { contentType: fichier.type, upsert: false })

    if (error) {
      console.error('[realisations] téléversement refusé', error.message)
      return { erreur: true }
    }

    const { data } = supabase.storage.from('realisations').getPublicUrl(chemin)
    nouvelles.push({ url: data.publicUrl, alt_fr: '', alt_en: '', ordre: ordreSuivant })
    ordreSuivant += 10
  }

  if (aSupprimer.length > 0) {
    const { error } = await supabase.storage.from('realisations').remove(aSupprimer)
    // Un fichier orphelin est un désagrément (espace de stockage), pas une
    // panne : l'enregistrement continue même si le nettoyage échoue.
    if (error) console.error('[realisations] orphelin non nettoyé', error.message)
  }

  return { images: [...conservees, ...nouvelles] }
}

/** Plafond de tentatives sur un slug déjà pris — au-delà, quelque chose d'anormal se passe. */
const TENTATIVES_SLUG_MAX = 20

export async function creerRealisation(
  _precedent: EtatRealisation,
  donnees: FormData,
): Promise<EtatRealisation> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const analyse = lireChamps(donnees)
  if (!analyse.success) return { erreur: 'donnees' }

  // ⚠️ Slug automatique — décision de Christian : « le slug doit être
  // automatique ». Dérivé du titre français, avec repli -2/-3/... en cas de
  // collision, même mécanisme que le catalogue (voir cette action pour le
  // détail) : l'admin ne voit plus ce champ, il ne peut donc plus choisir
  // lui-même une variante.
  const baseSlug = slugifier(analyse.data.titre_fr)
  if (!baseSlug) return { erreur: 'donnees' }

  try {
    const supabase = await createClient()

    const resultatImages = await construireImages(supabase, donnees, baseSlug)
    if ('erreur' in resultatImages) return { erreur: 'photo' }

    let creation: { erreur: true } | { erreur: false } = { erreur: true }

    for (let tentative = 0; tentative < TENTATIVES_SLUG_MAX; tentative += 1) {
      const slug = tentative === 0 ? baseSlug : `${baseSlug}-${tentative + 1}`

      // `publie: false` à la création, toujours — même raison que le
      // catalogue : une réalisation sans photo confirmée ne doit pas
      // apparaître parce qu'on a cliqué « Créer ».
      const { error } = await supabase
        .from('realisations')
        .insert({ ...analyse.data, slug, images: resultatImages.images, publie: false })

      if (!error) {
        creation = { erreur: false }
        break
      }
      if (!slugDejaPris(error.code)) {
        console.error('[realisations] création refusée', error.message)
        return { erreur: 'refuse' }
      }
      // Slug pris : la boucle réessaie avec le suffixe suivant.
    }

    if (creation.erreur) {
      console.error(
        `[realisations] création refusée — slug « ${baseSlug} » saturé après ${TENTATIVES_SLUG_MAX} tentatives`,
      )
      return { erreur: 'refuse' }
    }
  } catch (err) {
    console.error('[realisations] échec création', err)
    return { erreur: 'serveur' }
  }

  updateTag(ETIQUETTE_REALISATIONS)
  revalidatePath(`/${locale}/admin/realisations`)
  return { succes: true }
}

export async function modifierRealisation(
  _precedent: EtatRealisation,
  donnees: FormData,
): Promise<EtatRealisation> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const id = String(donnees.get('id') ?? '')
  if (!id) return { erreur: 'donnees' }

  const analyse = lireChamps(donnees)
  if (!analyse.success) return { erreur: 'donnees' }

  try {
    const supabase = await createClient()

    // Le slug n'est PAS recalculé à partir du titre : il vit dans une URL
    // publique déjà partagée, et une correction de faute de frappe ne doit
    // jamais la casser. `id` nomme les nouvelles photos à la place.
    const resultatImages = await construireImages(supabase, donnees, id)
    if ('erreur' in resultatImages) return { erreur: 'photo' }

    const { error } = await supabase
      .from('realisations')
      .update({ ...analyse.data, images: resultatImages.images })
      .eq('id', id)

    if (error) {
      console.error('[realisations] mise à jour refusée', error.message)
      return { erreur: 'refuse' }
    }
  } catch (err) {
    console.error('[realisations] échec mise à jour', err)
    return { erreur: 'serveur' }
  }

  updateTag(ETIQUETTE_REALISATIONS)
  revalidatePath(`/${locale}/admin/realisations`)
  return { succes: true }
}

/**
 * Publication / retrait — geste séparé du formulaire complet, même raison que
 * pour le catalogue : c'est l'action la plus fréquente, elle ne doit pas
 * coûter la réouverture d'une fiche entière.
 */
export async function basculerPublicationRealisation(donnees: FormData): Promise<void> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const id = String(donnees.get('id') ?? '')
  const publie = donnees.get('publie') === 'true'
  if (!id) return

  try {
    const supabase = await createClient()
    const { error } = await supabase.from('realisations').update({ publie: !publie }).eq('id', id)
    if (error) console.error('[realisations] bascule refusée', error.message)
  } catch (err) {
    console.error('[realisations] échec bascule', err)
  }

  updateTag(ETIQUETTE_REALISATIONS)
  revalidatePath(`/${locale}/admin/realisations`)
}

/**
 * Suppression — réservée à l'admin (politique realisations_suppression_admin).
 *
 * Ne nettoie pas les fichiers de la série dans le stockage : même choix que
 * `supprimerProduit`, pour la même raison — un fichier orphelin coûte de
 * l'espace, une suppression qui échoue à mi-chemin entre la base et le
 * stockage laisserait une réalisation fantôme sans aucune photo.
 */
export async function supprimerRealisation(donnees: FormData): Promise<void> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const id = String(donnees.get('id') ?? '')
  if (!id) return

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('realisations').delete().eq('id', id).select('id')

    if (error) console.error('[realisations] suppression refusée', error.message)
    else if (!data || data.length === 0) {
      console.warn('[realisations] suppression sans effet — RLS a filtré, rôle insuffisant ?')
    }
  } catch (err) {
    console.error('[realisations] échec suppression', err)
  }

  updateTag(ETIQUETTE_REALISATIONS)
  revalidatePath(`/${locale}/admin/realisations`)
}
