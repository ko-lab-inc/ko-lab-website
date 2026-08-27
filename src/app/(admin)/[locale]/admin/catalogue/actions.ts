'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { headers } from 'next/headers'
import { z } from 'zod'

import { ETIQUETTE_PRODUITS } from '@/lib/produits'
import { exigerRole } from '@/lib/auth/garde'
import { ROLES_EQUIPE } from '@/types'
import { createClient } from '@/lib/supabase/server'
import { estUuid } from '@/lib/utils/identifiant'
import { adresseDepuis } from '@/lib/utils/adresseClient'
import { rateLimit } from '@/lib/utils/rateLimit'
import { slugifier } from '@/lib/utils/slug'

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
 * dit qui écrit, pas ce qui est écrit : sans Zod, un prix négatif ou une
 * quantité de -5 passerait sans broncher.
 *
 * ---------------------------------------------------------------------------
 * TROIS CHAMPS QUE LE FORMULAIRE NE DEMANDE PLUS — décision de Christian
 *
 * Slug, cadrage et ordre d'affichage sont sortis du formulaire : « le slug
 * doit être automatique », « le cadrage doit être pareil pour chaque
 * produit », et l'ordre suit la même logique. Cette action les calcule donc
 * elle-même :
 *   - slug   : dérivé du nom, avec repli sur -2/-3/... en cas de collision
 *              (l'admin ne voit plus le champ, donc ne peut plus l'ajuster
 *              à la main comme avant)
 *   - cadrage: toujours 'contain' à la création — c'est déjà la valeur de
 *              9 des 12 produits existants, la photo détourée sur blanc est
 *              la norme du catalogue
 *   - ordre  : (ordre maximum existant) + 10 à la création, jamais retouché
 *              en édition — aucune réorganisation manuelle n'est demandée
 * ---------------------------------------------------------------------------
 */

export type EtatProduit = {
  erreur?: 'donnees' | 'refuse' | 'photo' | 'serveur'
  succes?: boolean
}

const CATEGORIES = ['impression', 'laser', 'conteneurs', 'equipements'] as const

/**
 * Statuts de suivi — migration 0013.
 *
 * Indépendant de `quantite` : un statut est une décision de l'équipe
 * (« le fournisseur nous prévient d'une rupture »), pas un calcul automatique
 * sur le nombre en stock.
 */
const STATUTS_STOCK = ['en_stock', 'rupture', 'en_commande', 'en_livraison'] as const

const schemaProduit = z.object({
  marque: z.string().trim().min(1).max(80),
  categorie: z.enum(CATEGORIES),
  /**
   * Nom et description en FRANÇAIS SEULEMENT — décision de Christian : « on
   * retire tout ce qui est traduit [...] on garde en français pour
   * facilité ». Les colonnes `_en` restent en base (une réintroduction
   * future de l'anglais les retrouverait) mais ce formulaire ne les écrit
   * plus jamais — elles ne figurent donc pas dans ce schéma.
   */
  nom_fr: z.string().trim().min(2).max(120),
  description_fr: z.string().trim().max(600).nullable(),
  /**
   * Prix OBLIGATOIRE — décision de Christian : « le prix n'est pas sur
   * demande, on va le mettre ». La colonne reste nullable en base pour ne pas
   * bloquer un import ; c'est ici que la règle s'applique, là où on la corrige
   * en une ligne.
   */
  prix: z.coerce.number().min(0).max(1_000_000),
  quantite: z.coerce.number().int().min(0).max(100_000),
  statut_stock: z.enum(STATUTS_STOCK),
})

function lire(donnees: FormData) {
  return schemaProduit.safeParse({
    marque: donnees.get('marque'),
    categorie: donnees.get('categorie'),
    nom_fr: String(donnees.get('nom') ?? '').trim(),
    description_fr: String(donnees.get('description') ?? '').trim() || null,
    prix: donnees.get('prix'),
    quantite: donnees.get('quantite') ?? 0,
    statut_stock: donnees.get('statut_stock'),
  })
}

/** 23505 = violation d'unicité. Le seul index unique ici porte sur `slug`. */
const slugDejaPris = (code?: string) => code === '23505'

// 4 Mo, pas 5 — voir next.config.ts (plafond Vercel de 4,5 Mo par requête).
const TAILLE_MAX = 4 * 1024 * 1024
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
 * `identifiant` nomme le fichier — le slug à la création (encore lisible et
 * stable à cet instant), l'id du produit en édition (le slug n'est plus
 * transmis par le formulaire). Jamais le nom d'origine du fichier : il peut
 * s'appeler `../../etc/passwd` ou porter des caractères que l'URL n'accepte
 * pas. L'horodatage évite que le CDN serve l'ancienne image après un
 * remplacement — même problème que les visuels renommés en `-v2`.
 */
async function televerserPhoto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fichier: FormDataEntryValue | null,
  identifiant: string,
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
  const chemin = `${identifiant}-${Date.now()}.${extension}`

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
 * Si l'enregistrement échoue APRÈS le téléversement, le fichier reste dans le
 * bucket sans qu'aucune ligne n'y renvoie. On corrige et on renvoie le
 * formulaire, et un orphelin s'accumule à chaque essai. Personne ne les voit,
 * ils ne se nettoient jamais.
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

/** Plafond de tentatives sur un slug déjà pris — au-delà, quelque chose d'anormal se passe. */
const TENTATIVES_SLUG_MAX = 20

export async function creerProduit(
  _precedent: EtatProduit,
  donnees: FormData,
): Promise<EtatProduit> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const analyse = lire(donnees)
  if (!analyse.success) return { erreur: 'donnees' }

  const baseSlug = slugifier(analyse.data.nom_fr)
  // Un nom composé UNIQUEMENT de caractères que le slugifier retire (des
  // symboles, par exemple) donnerait une chaîne vide : rien de valide à
  // enregistrer, mieux vaut le dire maintenant qu'échouer à l'insertion.
  if (!baseSlug) return { erreur: 'donnees' }

  try {
    const acces = await exigerRole(ROLES_EQUIPE)
    if (!acces) return { erreur: 'refuse' }
    const { supabase } = acces

    const photo = await televerserPhoto(supabase, donnees.get('photo'), baseSlug)
    if (photo === undefined) return { erreur: 'photo' }

    // Le plus PETIT `ordre` existant, pas le plus grand : le tri d'affichage
    // (admin/catalogue/page.tsx, boutique publique) est ascendant, donc un
    // nouveau produit doit recevoir une valeur plus petite que tout le reste
    // pour apparaître EN PREMIER — demande de Christian, « en fonction du
    // plus récent au plus ancien ». `- 10` et non `- 1` : même marge que
    // l'ancien `+ 10`, pour laisser de la place à un réordonnancement manuel
    // futur sans devoir tout renuméroter.
    const { data: premier } = await supabase
      .from('produits_boutique')
      .select('ordre')
      .order('ordre', { ascending: true })
      .limit(1)
      .maybeSingle()
    const ordre = (premier?.ordre ?? 10) - 10

    let creation: { erreur: true } | { erreur: false } = { erreur: true }

    for (let tentative = 0; tentative < TENTATIVES_SLUG_MAX; tentative += 1) {
      // Premier essai : le slug tel quel. Ensuite, -2, -3... — l'admin ne
      // voit plus ce champ, il ne peut donc plus choisir lui-même une
      // variante en cas de collision.
      const slug = tentative === 0 ? baseSlug : `${baseSlug}-${tentative + 1}`

      const { error } = await supabase.from('produits_boutique').insert({
        ...analyse.data,
        slug,
        cadrage: 'contain',
        ordre,
        images: photo ? [photo.url] : [],
        // `publie: true` dès la création — demande explicite de Christian :
        // un produit ajouté doit être en ligne immédiatement, pas retrouvé
        // « hors ligne » après coup. Le prix est déjà obligatoire à la
        // saisie (schéma Zod ci-dessus) ; l'absence de photo, elle, retombe
        // sur l'emplacement réservé de CatalogueBoutique.tsx plutôt que de
        // bloquer l'affichage. Retirer de la vitrine reste un geste séparé
        // (bouton Publier/Retirer), dans l'autre sens.
        publie: true,
      })

      if (!error) {
        creation = { erreur: false }
        break
      }
      if (!slugDejaPris(error.code)) {
        await retirerPhoto(supabase, photo)
        console.error('[catalogue] création refusée', error.message)
        return { erreur: 'refuse' }
      }
      // Slug pris : la boucle réessaie avec le suffixe suivant.
    }

    if (creation.erreur) {
      await retirerPhoto(supabase, photo)
      console.error(
        `[catalogue] création refusée — slug « ${baseSlug} » saturé après ${TENTATIVES_SLUG_MAX} tentatives`,
      )
      return { erreur: 'refuse' }
    }
  } catch (err) {
    console.error('[catalogue] échec création', err)
    return { erreur: 'serveur' }
  }

  updateTag(ETIQUETTE_PRODUITS)
  revalidatePath(`/${locale}/admin/catalogue`)
  return { succes: true }
}

export async function modifierProduit(
  _precedent: EtatProduit,
  donnees: FormData,
): Promise<EtatProduit> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const id = String(donnees.get('id') ?? '')
  if (!estUuid(id)) return { erreur: 'donnees' }

  const analyse = lire(donnees)
  if (!analyse.success) return { erreur: 'donnees' }

  try {
    const acces = await exigerRole(ROLES_EQUIPE)
    if (!acces) return { erreur: 'refuse' }
    const { supabase } = acces

    // Ni le slug ni le cadrage ni l'ordre ne sont dans `analyse.data` : ils ne
    // sont plus des champs du formulaire, donc pas dans cette mise à jour non
    // plus. Le slug en particulier vit dans une URL déjà partagée — une
    // correction de faute de frappe dans le nom ne doit jamais la casser.
    const photo = await televerserPhoto(supabase, donnees.get('photo'), id)
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
      console.error('[catalogue] mise à jour refusée', error.message)
      return { erreur: 'refuse' }
    }
  } catch (err) {
    console.error('[catalogue] échec mise à jour', err)
    return { erreur: 'serveur' }
  }

  updateTag(ETIQUETTE_PRODUITS)
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
  if (!estUuid(id)) return

  try {
    const acces = await exigerRole(ROLES_EQUIPE)
    if (!acces) return
    const { supabase } = acces
    const { error } = await supabase
      .from('produits_boutique')
      .update({ publie: !publie })
      .eq('id', id)
    if (error) console.error('[catalogue] bascule refusée', error.message)
  } catch (err) {
    console.error('[catalogue] échec bascule', err)
  }

  updateTag(ETIQUETTE_PRODUITS)
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
  if (!estUuid(id)) return

  try {
    const acces = await exigerRole(['admin'])
    if (!acces) return
    const { supabase } = acces
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

  updateTag(ETIQUETTE_PRODUITS)
  revalidatePath(`/${locale}/admin/catalogue`)
}
