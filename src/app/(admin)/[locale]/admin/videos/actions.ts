'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { z } from 'zod'

import { exigerRole } from '@/lib/auth/garde'
import { ROLES_EQUIPE } from '@/types'
import { estUuid } from '@/lib/utils/identifiant'
import { vignetteVideo } from '@/lib/utils/youtube'
import { ETIQUETTE_VIDEOS } from '@/lib/videos'

/**
 * CRUD des vidéos — table videos (migration 0016).
 *
 * Même architecture que les trois autres écrans de gestion : RLS fait foi
 * (0016), Server Actions inline pour la publication et la suppression,
 * composant client pour le formulaire (il doit renvoyer les erreurs de
 * validation).
 */

export type EtatVideo = {
  erreur?: 'donnees' | 'lien' | 'refuse' | 'serveur'
  succes?: boolean
}

/**
 * `z.string().url()` NE SUFFIT PAS À FAIRE UNE URL SÛRE.
 *
 * Vérifié à l'exécution contre la version installée de Zod : `url()` accepte
 * `javascript:alert(1)` et `data:text/html,…`. Or cette valeur est rendue
 * telle quelle en `href` sur la page publique Le LAB quand ce n'est pas un
 * lien YouTube reconnu (BandeauVideos, branche « lien sortant »).
 *
 * Aujourd'hui React neutralise les `javascript:` — il les remplace par une
 * URL qui lève une erreur — et les navigateurs bloquent la navigation de
 * premier niveau vers `data:`. Ce n'était donc pas exploitable. Mais faire
 * reposer une garantie de sécurité sur un comportement non documenté d'une
 * bibliothèque tierce, c'est l'exposer à sa prochaine version. On refuse
 * explicitement tout ce qui n'est pas http(s).
 */
const schemaUrl = z
  .string()
  .trim()
  .url()
  .max(500)
  .refine((v) => {
    try {
      return /^https?:$/.test(new URL(v).protocol)
    } catch {
      return false
    }
  }, { message: 'schema-non-http' })

const schemaVideo = z.object({
  titre: z.string().trim().min(2).max(200),
  url: schemaUrl,
  // Facultative, mais soumise au même filtre quand elle est fournie : elle
  // sert de `src` d'image sur une page publique.
  vignette: z
    .union([schemaUrl, z.literal('')])
    .optional()
    .transform((v) => v || null),
})

function lire(donnees: FormData) {
  return schemaVideo.safeParse({
    titre: String(donnees.get('titre') ?? '').trim(),
    url: String(donnees.get('url') ?? '').trim(),
    vignette: donnees.get('vignette'),
  })
}

/**
 * Refuse un lien dont on ne saura pas tirer de vignette.
 *
 * ⚠️ Vérifié À LA SAISIE, pas seulement à l'affichage. `lireVideosPubliees()`
 * écarte déjà ces lignes pour ne pas rendre un cadre vide — mais si le refus
 * n'arrivait qu'à ce moment-là, l'équipe enregistrerait une vidéo, verrait
 * « Enregistré », et ne la trouverait jamais sur le site. Le message
 * `erreur: 'lien'` dit précisément quoi corriger.
 */
function vignetteManquante(url: string, vignette: string | null): boolean {
  return vignetteVideo(url, vignette) === null
}

export async function creerVideo(_precedent: EtatVideo, donnees: FormData): Promise<EtatVideo> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const analyse = lire(donnees)
  if (!analyse.success) return { erreur: 'donnees' }
  if (vignetteManquante(analyse.data.url, analyse.data.vignette)) return { erreur: 'lien' }

  try {
    const acces = await exigerRole(ROLES_EQUIPE)
    if (!acces) return { erreur: 'refuse' }
    const { supabase } = acces

    // Le plus PETIT `ordre`, comme le catalogue, les réalisations et les
    // postes : la vidéo ajoutée apparaît EN TÊTE de la bande.
    const { data: premier } = await supabase
      .from('videos')
      .select('ordre')
      .order('ordre', { ascending: true })
      .limit(1)
      .maybeSingle()
    const ordre = (premier?.ordre ?? 10) - 10

    const { error } = await supabase.from('videos').insert({
      titre: analyse.data.titre,
      url: analyse.data.url,
      vignette: analyse.data.vignette,
      ordre,
      // En ligne dès la création — même décision que le catalogue et les
      // postes : ce qu'on ajoute doit se voir tout de suite.
      actif: true,
    })

    if (error) {
      console.error('[videos] création refusée', error.message)
      return { erreur: 'refuse' }
    }
  } catch (err) {
    console.error('[videos] échec création', err)
    return { erreur: 'serveur' }
  }

  updateTag(ETIQUETTE_VIDEOS)
  revalidatePath(`/${locale}/admin/videos`)
  return { succes: true }
}

export async function modifierVideo(_precedent: EtatVideo, donnees: FormData): Promise<EtatVideo> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const id = String(donnees.get('id') ?? '')
  if (!estUuid(id)) return { erreur: 'donnees' }

  const analyse = lire(donnees)
  if (!analyse.success) return { erreur: 'donnees' }
  if (vignetteManquante(analyse.data.url, analyse.data.vignette)) return { erreur: 'lien' }

  try {
    const acces = await exigerRole(ROLES_EQUIPE)
    if (!acces) return { erreur: 'refuse' }
    const { supabase } = acces
    const { error } = await supabase
      .from('videos')
      .update({
        titre: analyse.data.titre,
        url: analyse.data.url,
        vignette: analyse.data.vignette,
      })
      .eq('id', id)

    if (error) {
      console.error('[videos] mise à jour refusée', error.message)
      return { erreur: 'refuse' }
    }
  } catch (err) {
    console.error('[videos] échec mise à jour', err)
    return { erreur: 'serveur' }
  }

  updateTag(ETIQUETTE_VIDEOS)
  revalidatePath(`/${locale}/admin/videos`)
  return { succes: true }
}

/** Publication / retrait — le geste le plus fréquent, hors du formulaire. */
export async function basculerPublicationVideo(donnees: FormData): Promise<void> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const id = String(donnees.get('id') ?? '')
  const actif = donnees.get('actif') === 'true'
  if (!estUuid(id)) return

  try {
    const acces = await exigerRole(ROLES_EQUIPE)
    if (!acces) return
    const { supabase } = acces
    const { error } = await supabase.from('videos').update({ actif: !actif }).eq('id', id)
    if (error) console.error('[videos] bascule refusée', error.message)
  } catch (err) {
    console.error('[videos] échec bascule', err)
  }

  updateTag(ETIQUETTE_VIDEOS)
  revalidatePath(`/${locale}/admin/videos`)
}

/**
 * Déplacement dans la bande.
 *
 * ⚠️ Un écran de vidéos « en slide » a besoin d'un ORDRE choisi : c'est une
 * playlist, pas une liste triée par date. Plutôt qu'un champ « ordre » à
 * saisir à la main (retiré du catalogue pour cette raison, Christian le
 * trouvait obscur), deux flèches échangent la position de deux voisines.
 */
export async function deplacerVideo(donnees: FormData): Promise<void> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const id = String(donnees.get('id') ?? '')
  const sens = String(donnees.get('sens') ?? '')
  if (!estUuid(id) || (sens !== 'haut' && sens !== 'bas')) return

  try {
    const acces = await exigerRole(ROLES_EQUIPE)
    if (!acces) return
    const { supabase } = acces

    const { data: courante } = await supabase
      .from('videos')
      .select('id, ordre')
      .eq('id', id)
      .maybeSingle()
    if (!courante) return

    // La voisine immédiate dans le sens demandé. `limit(1)` après tri :
    // c'est la plus proche, pas n'importe laquelle au-delà.
    const { data: voisine } = await supabase
      .from('videos')
      .select('id, ordre')
      .order('ordre', { ascending: sens === 'bas' })
      [sens === 'bas' ? 'gt' : 'lt']('ordre', courante.ordre)
      .limit(1)
      .maybeSingle()

    // Déjà à l'extrémité : rien à faire, et surtout pas d'erreur.
    if (!voisine) return

    // Échange des deux positions, en deux mises à jour. Pas de transaction :
    // au pire une reprise partielle laisse deux vidéos au même `ordre`, ce
    // que le tri gère sans casser (ordre stable par `id` derrière).
    await supabase.from('videos').update({ ordre: voisine.ordre }).eq('id', courante.id)
    await supabase.from('videos').update({ ordre: courante.ordre }).eq('id', voisine.id)
  } catch (err) {
    console.error('[videos] échec déplacement', err)
  }

  updateTag(ETIQUETTE_VIDEOS)
  revalidatePath(`/${locale}/admin/videos`)
}

/**
 * Suppression — réservée à l'admin (politique videos_suppression_admin).
 * Le comptage du retour détecte le cas « RLS a filtré », que PostgREST ne
 * signale pas comme une erreur.
 */
export async function supprimerVideo(donnees: FormData): Promise<void> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const id = String(donnees.get('id') ?? '')
  if (!estUuid(id)) return

  try {
    const acces = await exigerRole(['admin'])
    if (!acces) return
    const { supabase } = acces
    const { data, error } = await supabase.from('videos').delete().eq('id', id).select('id')

    if (error) console.error('[videos] suppression refusée', error.message)
    else if (!data || data.length === 0) {
      console.warn('[videos] suppression sans effet — RLS a filtré, rôle insuffisant ?')
    }
  } catch (err) {
    console.error('[videos] échec suppression', err)
  }

  updateTag(ETIQUETTE_VIDEOS)
  revalidatePath(`/${locale}/admin/videos`)
}
