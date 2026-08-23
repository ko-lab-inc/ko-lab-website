import 'server-only'

import { unstable_cache } from 'next/cache'

import { repliEmplacement } from '@/lib/medias-repli'
import { createStaticClient } from '@/lib/supabase/static'

/**
 * Lecture cachée d'un emplacement média — table `medias_emplacements`
 * (migration 0031). Détail d'implémentation, pas une API publique : les
 * composants serveur qui affichent une des sections importent
 * `resoudreEmplacement` directement depuis ce fichier, il n'est ni ré-exporté
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

/**
 * `url` nullable depuis la migration 0037 : un emplacement peut exister sans
 * photo, choix délibéré depuis /admin/medias-emplacements (bouton « Retirer
 * la photo »). Cette forme reflète les trois colonnes telles quelles ; voir
 * `resoudreEmplacement` pour la distinction « vide assumé » vs « introuvable ».
 */
type LigneEmplacement = {
  url: string | null
  alt_fr: string
  alt_en: string | null
}

async function lireEmplacement(cle: string): Promise<LigneEmplacement | null> {
  const supabase = createStaticClient()
  const { data, error } = await supabase
    .from('medias_emplacements')
    .select('url_stockage, alt_text_fr, alt_text_en')
    .eq('cle', cle)
    .maybeSingle()

  // `null` ici veut dire UNIQUEMENT « ligne introuvable ou lecture en
  // échec » — jamais « photo retirée ». Une ligne dont `url_stockage` est
  // NULL est un résultat VALIDE, retourné tel quel ci-dessous, pas cette
  // branche.
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
 * `lib/carrieres.ts`. Chaque emplacement a donc sa propre entrée de cache,
 * invalidée globalement par `updateTag(ETIQUETTE_EMPLACEMENTS_MEDIAS)`
 * (appelé depuis les Server Actions de /admin/medias-emplacements).
 */
export const obtenirEmplacement = unstable_cache(lireEmplacement, ['emplacement-media'], {
  tags: [ETIQUETTE_EMPLACEMENTS_MEDIAS],
  revalidate: 3600,
})

/**
 * Résolution d'un emplacement média — trois issues distinctes, pas deux.
 *
 * ---------------------------------------------------------------------------
 * ⚠️ « VIDE ASSUMÉ » ≠ « INTROUVABLE » — le point qui a changé avec la
 * migration 0037.
 *
 * Avant, `url_stockage` était NOT NULL : une ligne sans photo n'existait pas,
 * donc `obtenirEmplacement` renvoyant `null` (ligne absente, erreur réseau)
 * était le SEUL cas où retomber sur `medias-repli.ts` avait un sens. Depuis
 * que la colonne accepte NULL (retrait volontaire d'une photo depuis
 * l'admin), il faut distinguer :
 *
 *   - Ligne ABSENTE en base (clé inconnue, lecture en échec)
 *     → `obtenirEmplacement` renvoie `null` → repli sur `medias-repli.ts`,
 *       comme avant : jamais de blanc pour une clé qui n'a simplement pas
 *       encore été migrée ou pour une panne Supabase.
 *   - Ligne PRÉSENTE avec `url_stockage` NULL
 *     → `obtenirEmplacement` renvoie `{ url: null, ... }` → cette fonction
 *       renvoie `null` SANS repli. C'est un choix éditorial délibéré
 *       (quelqu'un a cliqué « Retirer la photo ») : le composant appelant
 *       doit afficher `PhotoPlaceholder`, pas ressusciter l'ancienne image.
 *
 * Sans cette distinction, vider un emplacement depuis l'admin n'aurait eu
 * AUCUN effet visible sur le site public — le repli aurait simplement repris
 * la même photo qu'avant, silencieusement.
 * ---------------------------------------------------------------------------
 *
 * `null` en retour = « affiche PhotoPlaceholder ». Tout le reste (repli
 * inclus) renvoie `{ url, alt }`, jamais un objet à moitié rempli.
 */
export async function resoudreEmplacement(cle: string): Promise<{ url: string; alt: string } | null> {
  const ligne = await obtenirEmplacement(cle)

  if (ligne === null) return repliEmplacement(cle)
  if (ligne.url === null) return null

  return { url: ligne.url, alt: ligne.alt_fr }
}
