'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { headers } from 'next/headers'
import { getTranslations } from 'next-intl/server'

import { routing } from '@/i18n/routing'
import { exigerRole } from '@/lib/auth/garde'
import { DOSSIERS_MEDIAS } from '@/lib/medias-disponibles'
import { ETIQUETTE_EMPLACEMENTS_MEDIAS } from '@/lib/medias-emplacements'
import { adresseDepuis } from '@/lib/utils/adresseClient'
import { rateLimit } from '@/lib/utils/rateLimit'

/**
 * Mise à jour d'un emplacement média — table medias_emplacements
 * (migration 0031, route A de l'architecture média).
 *
 * Pas de création ni de suppression : les neuf clés sont posées une fois par
 * la migration, cette action ne fait que REMPLACER url_stockage/alt_text_fr/
 * alt_text_en pour une clé existante. `cle` n'est jamais écrite — c'est la
 * clé primaire logique de la ligne, elle sert uniquement au WHERE.
 *
 * ⚠️ `exigerRole(['admin'])`, pas ROLES_EQUIPE. La politique medias_maj_admin
 * (0031) réserve l'UPDATE à l'admin, contrairement à la plupart des autres
 * tables de l'admin où admin et editor écrivent tous les deux — même
 * raisonnement que reglages/actions.ts : un emplacement gouverne une section
 * entière du site public, pas une seule fiche.
 *
 * Signature en arguments positionnels plutôt que (prevState, FormData) :
 * appelée directement depuis le composant client (TableauEmplacements),
 * pas via <form action={...}>/useActionState — l'édition inline n'a pas
 * besoin de ce détour, voir le composant pour le patron d'appel
 * (useTransition + await direct).
 */

export type ResultatEmplacement = { success: boolean; error?: string }

/**
 * Préfixe des fichiers publics du bucket `medias` — seule origine acceptée
 * depuis la refonte en grille de sélection (plus de saisie libre d'URL).
 *
 * ⚠️ Le client envoie une URL choisie dans une grille déjà filtrée par
 * `listerFichiersDisponibles`, mais une Server Action ne peut pas supposer
 * que la requête vient forcément de ce composant — n'importe quel appelant
 * peut poster n'importe quelle chaîne. Vérifier le PRÉFIXE ici, pas
 * seulement `https://`/`/` comme avant : accepter une URL externe
 * arbitraire aurait permis d'afficher, sous une clé du site KO-LAB,
 * n'importe quelle image hébergée ailleurs.
 */
function prefixeBucketMedias(): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  return `${base}/storage/v1/object/public/medias/`
}

/**
 * `urlStockage` accepte `null` depuis la migration 0037 (colonne devenue
 * nullable) — c'est le bouton « Retirer la photo » de SelecteurPhotoEmplacement
 * qui l'envoie. Chaîne vide traitée comme `null` : un champ vidé à la main
 * ne doit jamais finir en `''` dans une colonne qui distingue maintenant
 * « vide assumé » (NULL) d'une vraie valeur — voir resoudreEmplacement.
 */
export async function mettreAJourEmplacement(
  cle: string,
  urlStockage: string | null,
  altFr: string,
  altEn?: string | null,
): Promise<ResultatEmplacement> {
  const t = await getTranslations('Admin')

  const url = urlStockage?.trim() || null

  if (url !== null && !url.startsWith(prefixeBucketMedias())) {
    return { success: false, error: t('erreur_photo_invalide') }
  }

  try {
    const acces = await exigerRole(['admin'])
    if (!acces) return { success: false, error: t('erreur_refuse_emplacement') }
    const { supabase } = acces

    const { data: existe } = await supabase
      .from('medias_emplacements')
      .select('cle')
      .eq('cle', cle)
      .maybeSingle()

    if (!existe) return { success: false, error: t('erreur_emplacement_introuvable') }

    const { error } = await supabase
      .from('medias_emplacements')
      .update({
        url_stockage: url,
        alt_text_fr: altFr.trim(),
        alt_text_en: altEn?.trim() || null,
      })
      .eq('cle', cle)

    if (error) {
      console.error('[medias-emplacements] mise à jour refusée', error.message)
      return { success: false, error: t('erreur_serveur_emplacement') }
    }
  } catch (err) {
    console.error('[medias-emplacements] échec mise à jour', err)
    return { success: false, error: t('erreur_serveur_emplacement') }
  }

  updateTag(ETIQUETTE_EMPLACEMENTS_MEDIAS)

  // Pas de paramètre `locale` dans cette signature (demandée en 4 arguments
  // positionnels) : les deux locales admin sont revalidées explicitement
  // plutôt que d'ajouter un cinquième argument pour un besoin purement
  // technique que l'appelant n'a pas à connaître.
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/admin/medias-emplacements`)
  }

  return { success: true }
}

/**
 * Téléversement d'une nouvelle photo dans le bucket `medias`, pour
 * SelecteurPhotoEmplacement — geste distinct de `mettreAJourEmplacement` :
 * celui-ci dépose un FICHIER dans le Storage et renvoie son URL publique,
 * l'enregistrement de cette URL sur la ligne `medias_emplacements` reste le
 * rôle de `mettreAJourEmplacement` (bouton Enregistrer de la modale). Ne
 * touche donc ni la table ni son cache — pas de `updateTag`/`revalidatePath`
 * ici, rien n'a encore changé côté lecture publique tant que la ligne n'est
 * pas enregistrée.
 *
 * ---------------------------------------------------------------------------
 * MÊMES CONTRAINTES QUE /admin/realisations (construireImages, actions.ts),
 * PAS RÉINVENTÉES
 *
 * Taille et types acceptés identiques au bucket `realisations` — le bucket
 * `medias`, lui, les impose en plus au niveau de storage.buckets depuis la
 * migration 0030 (`file_size_limit`, `allowed_mime_types`) : cette
 * vérification applicative est un second filet, lisible pour l'utilisateur
 * AVANT l'aller-retour Storage, pas une redite inutile.
 *
 * Même nommage que `construireImages` : `<descriptif>-<Date.now()>.<ext>`,
 * pas un horodatage brut SEUL — `descriptif` vient ici de la clé
 * d'emplacement (`besoin-1`, `lab-3`, ...), qui joue le même rôle que `slug`
 * côté réalisations.
 *
 * ---------------------------------------------------------------------------
 * `dossier` : LISTE BLANCHE, JAMAIS LE CHEMIN LIBRE ENVOYÉ PAR LE CLIENT
 *
 * Le sélecteur de dossier côté client n'offre que les entrées de
 * `DOSSIERS_MEDIAS` — mais une Server Action reste appelable directement,
 * avec n'importe quelle chaîne. Sans cette revérification, un `dossier`
 * arbitraire (`../`, ou un nom hors liste) déposerait hors de l'arborescence
 * connue du bucket, exactement ce que le point 3 de la demande interdit
 * (« Ne dépose pas à la racine »).
 * ---------------------------------------------------------------------------
 */
export type ResultatTeleversementEmplacement =
  | { success: true; fichier: { chemin: string; url: string } }
  | { success: false; error: string }

const TAILLE_MAX_PHOTO_EMPLACEMENT = 5 * 1024 * 1024
const TYPES_IMAGE_EMPLACEMENT = ['image/webp', 'image/jpeg', 'image/png', 'image/avif']

export async function televerserPhotoEmplacement(
  donnees: FormData,
): Promise<ResultatTeleversementEmplacement> {
  const t = await getTranslations('Admin')

  const cle = String(donnees.get('cle') ?? '').trim()
  const dossier = String(donnees.get('dossier') ?? '')
  const fichier = donnees.get('fichier')

  if (
    !cle ||
    !(DOSSIERS_MEDIAS as readonly string[]).includes(dossier) ||
    !(fichier instanceof File) ||
    fichier.size === 0
  ) {
    return { success: false, error: t('erreur_photo') }
  }

  if (fichier.size > TAILLE_MAX_PHOTO_EMPLACEMENT || !TYPES_IMAGE_EMPLACEMENT.includes(fichier.type)) {
    return { success: false, error: t('erreur_photo') }
  }

  try {
    // ⚠️ `exigerRole(['admin'])`, même garde-fou que `mettreAJourEmplacement`
    // ci-dessus, pour la même raison documentée sur cette action : un
    // emplacement gouverne une section entière du site public. Le bucket
    // `medias` autorise `editor` à téléverser en général (migration 0030,
    // policy `medias_televersement_equipe`) — mais CE geste précis choisit la
    // photo d'un emplacement public, réservé à l'admin de bout en bout dans
    // cet écran, comme le reste de la fonctionnalité.
    const acces = await exigerRole(['admin'])
    if (!acces) return { success: false, error: t('erreur_refuse_emplacement') }
    const { supabase } = acces

    if (rateLimit(`photo-emplacement:${adresseDepuis(await headers())}`, { max: 30, windowMs: 600_000 })) {
      return { success: false, error: t('erreur_photo') }
    }

    const extension = fichier.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'webp'
    // `Date.now()` : même technique que `construireImages` (realisations) —
    // deux téléversements sur le même emplacement à la même milliseconde ne
    // doivent pas s'écraser l'un l'autre.
    const chemin = `${dossier}/${cle.replace(/_/g, '-')}-${Date.now()}.${extension}`

    const { error } = await supabase.storage
      .from('medias')
      .upload(chemin, fichier, { contentType: fichier.type, upsert: false })

    if (error) {
      console.error('[medias-emplacements] téléversement refusé', error.message)
      return { success: false, error: t('erreur_serveur_emplacement') }
    }

    const base = process.env.NEXT_PUBLIC_SUPABASE_URL
    return { success: true, fichier: { chemin, url: `${base}/storage/v1/object/public/medias/${chemin}` } }
  } catch (err) {
    console.error('[medias-emplacements] échec téléversement', err)
    return { success: false, error: t('erreur_serveur_emplacement') }
  }
}
