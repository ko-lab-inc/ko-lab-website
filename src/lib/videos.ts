import 'server-only'

import { unstable_cache } from 'next/cache'

import { createStaticClient } from '@/lib/supabase/static'
import { vignetteVideo } from '@/lib/utils/youtube'

import type { VignetteVideo } from '@/components/ui/BandeauVideos'

/**
 * Vidéos affichées en bande sur la page Le LAB — lecture publique, mise en
 * cache, invalidée par l'écran /admin/videos.
 *
 * ---------------------------------------------------------------------------
 * CE QUE CE MODULE REMPLACE
 *
 * Une constante en dur (`VIDEOS_LAB`), volontairement vide faute de contenu
 * réel. Décision de Christian : « je voudrais avoir un espace dans admin où
 * je pourrai ajouter des liens ». Même trajectoire que le catalogue, les
 * réalisations et les carrières.
 *
 * ---------------------------------------------------------------------------
 * TABLEAU VIDE PLUTÔT QUE `null`
 *
 * Contrairement à réalisations et carrières, pas de contenu de repli ici :
 * il n'y a rien à montrer à la place d'une vidéo. Un tableau vide fait
 * afficher les quatre emplacements « Vidéo à venir » de BandeauVideos —
 * c'est le comportement voulu tant que rien n'est publié, et c'est aussi ce
 * qu'on veut si Supabase est injoignable : la page reste debout, la section
 * garde sa place, rien n'est inventé.
 * ---------------------------------------------------------------------------
 */

/** Étiquette de cache — partagée avec les actions de /admin/videos. */
export const ETIQUETTE_VIDEOS = 'videos'

async function lireDepuisBase(): Promise<VignetteVideo[]> {
  try {
    const supabase = createStaticClient()
    const { data, error } = await supabase
      .from('videos')
      .select('titre, url, vignette')
      .eq('actif', true)
      .order('ordre')

    if (error || !data) return []

    return data
      .map((v) => ({
        url: v.url,
        titre: v.titre,
        vignette: vignetteVideo(v.url, v.vignette),
      }))
      // Une vidéo dont on ne sait pas fabriquer la vignette (hébergeur non
      // reconnu, sans image imposée) est écartée : la carte n'afficherait
      // qu'un cadre vide. L'écran d'administration prévient à la saisie.
      .filter((v): v is VignetteVideo => v.vignette !== null)
  } catch {
    // Supabase injoignable au moment du rendu : les emplacements réservés
    // s'affichent, la page reste debout.
    return []
  }
}

/**
 * ⚠️ Ne JAMAIS appeler depuis un composant client — le module importe
 * `server-only`, l'erreur arrive à la compilation plutôt qu'en production.
 */
export const lireVideosPubliees = unstable_cache(lireDepuisBase, ['videos-publiees'], {
  tags: [ETIQUETTE_VIDEOS],
  revalidate: 3600,
})
