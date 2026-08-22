import 'server-only'

import { unstable_cache } from 'next/cache'

import { repliEmplacement } from '@/lib/medias-repli'
import { createStaticClient } from '@/lib/supabase/static'

/**
 * Lecture cachée d'un emplacement média — table `medias_emplacements`
 * (migration 0031). Détail d'implémentation, pas une API publique : les
 * composants serveur qui affichent une des neuf sections importent
 * `obtenirEmplacement` directement depuis ce fichier, il n'est ni ré-exporté
 * ailleurs ni pensé pour un usage générique en dehors de ce besoin précis.
 *
 * ⚠️ `createStaticClient()`, PAS le client de session. `unstable_cache`
 * interdit tout appel à `cookies()` dans la fonction qu'il enveloppe (ça fait
 * basculer la route en dynamique, ou lève une erreur selon le contexte) — le
 * client de session (`lib/supabase/server.ts`) appelle `cookies()` pour
 * lire/rafraîchir la session. C'est pour ça que `lib/carrieres.ts`,
 * `lib/realisations.ts`, `lib/produits.ts` etc. utilisent tous
 * `createStaticClient()` (clé anon, sans cookies) dès qu'ils passent par
 * `unstable_cache` — voir le tableau des trois clients dans
 * `lib/supabase/static.ts`. Sans conséquence ici pour la sécurité : la
 * politique `medias_lecture_cachee` (0031) est un SELECT public sans
 * condition, la clé anon voit exactement les mêmes lignes qu'une session.
 */

export const ETIQUETTE_EMPLACEMENTS_MEDIAS = 'emplacements-medias'

type Emplacement = {
  url: string
  alt_fr: string
  alt_en: string | null
}

async function lireEmplacement(cle: string): Promise<Emplacement | null> {
  const supabase = createStaticClient()
  const { data, error } = await supabase
    .from('medias_emplacements')
    .select('url_stockage, alt_text_fr, alt_text_en')
    .eq('cle', cle)
    .maybeSingle()

  if (error || !data) return null

  return {
    url: data.url_stockage,
    alt_fr: data.alt_text_fr,
    alt_en: data.alt_text_en,
  }
}

/**
 * `cle` fait partie de la clé de cache : `unstable_cache` incorpore les
 * arguments d'appel en plus de `keyParts` — même patron que `locale` dans
 * `lib/carrieres.ts`. Chacun des neuf emplacements a donc sa propre entrée de
 * cache, invalidée globalement par `updateTag(ETIQUETTE_EMPLACEMENTS_MEDIAS)`
 * (à appeler depuis les Server Actions du futur écran admin).
 */
export const obtenirEmplacement = unstable_cache(lireEmplacement, ['emplacement-media'], {
  tags: [ETIQUETTE_EMPLACEMENTS_MEDIAS],
  revalidate: 3600,
})

/**
 * `obtenirEmplacement` renvoie `{ url, alt_fr, alt_en }` ou `null` ;
 * `repliEmplacement` (medias-repli.ts) renvoie `{ url, alt }`, jamais `null`.
 * Deux formes différentes par conception (l'une reflète les trois colonnes
 * de la base, l'autre le format déjà attendu par `<Image alt>`) — sans ce
 * point de résolution unique, chacun des composants consommateurs aurait dû
 * réconcilier les deux formes à la main. `alt_fr` seulement pour l'instant :
 * la bascule vers `alt_en` est pour la Phase 9 (bilingue), pas Route A.
 */
export async function resoudreEmplacement(cle: string): Promise<{ url: string; alt: string }> {
  const emplacement = await obtenirEmplacement(cle)
  if (emplacement) return { url: emplacement.url, alt: emplacement.alt_fr }
  return repliEmplacement(cle)
}
