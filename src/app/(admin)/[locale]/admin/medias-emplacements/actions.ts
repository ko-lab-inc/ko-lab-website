'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { getTranslations } from 'next-intl/server'

import { routing } from '@/i18n/routing'
import { exigerRole } from '@/lib/auth/garde'
import { ETIQUETTE_EMPLACEMENTS_MEDIAS } from '@/lib/medias-emplacements'

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

export async function mettreAJourEmplacement(
  cle: string,
  urlStockage: string,
  altFr: string,
  altEn?: string | null,
): Promise<ResultatEmplacement> {
  const t = await getTranslations('Admin')

  const url = urlStockage.trim()
  if (!url) return { success: false, error: t('erreur_url_requise') }

  // Vérification LÉGÈRE, volontairement — pas un validateur d'URL complet.
  // https:// couvre Supabase Storage et tout hôte externe ; / couvre un
  // asset local servi depuis public/. JAMAIS /public/ dans la valeur finale :
  // Next sert ces fichiers à la racine (IMAGES.hero = '/images/hero/...',
  // pas '/public/images/...') — un chemin commençant par /public/ échouerait
  // donc en 404 au lieu de servir l'image.
  if (!url.startsWith('https://') && !url.startsWith('/')) {
    return { success: false, error: t('erreur_url_requise') }
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
