import 'server-only'

import { unstable_cache } from 'next/cache'

import { ETIQUETTE_GALERIES, type PageGalerie } from '@/lib/galeries-photos'
import { createStaticClient } from '@/lib/supabase/static'

import type { AppLocale } from '@/i18n/routing'

/**
 * Galeries « En photos » publiées — lecture publique, mise en cache
 * (migration 0043, étape 3/3 — branchement des 5 pages sur `galeries_photos`).
 *
 * Même architecture que lib/concours.ts pour le repli FR champ par champ, et
 * `createStaticClient()` (jamais le client de session — cette lecture ne
 * doit pas rendre les pages capacités/location dynamiques). `ETIQUETTE_GALERIES`
 * déjà créée à l'étape 2 (écran admin), invalidée par ses Server Actions.
 *
 * ---------------------------------------------------------------------------
 * ⚠️ `locale` HORS de la clé de cache — bug constaté et corrigé le 27 août
 * 2026, pendant la mise au point de cette étape.
 *
 * Une première version passait `locale` en second argument à la fonction
 * enveloppée par `unstable_cache` (comme `lib/concours.ts`) : `page` ET
 * `locale` faisaient alors partie de la clé de cache, créant DEUX entrées
 * par page (une par langue), toutes deux taguées `ETIQUETTE_GALERIES`.
 * Preuve par test (compte editor jetable, écriture réelle, mesure des
 * en-têtes `x-nextjs-cache` sur ce build en production) : après
 * `updateTag(ETIQUETTE_GALERIES)`, l'entrée FR redevenait fraîche dès la
 * requête suivante (`x-nextjs-cache: MISS`), l'entrée EN restait bloquée sur
 * `HIT` avec le contenu périmé — reproduit sur plusieurs redémarrages de
 * serveur, dans les deux ordres (FR d'abord, EN d'abord), jamais un hasard
 * de séquence. `medias-emplacements.ts` documente déjà pourquoi
 * `obtenirEmplacement` exclut `locale` de sa clé de cache pour cette raison
 * précise ; cette lecture-ci suit maintenant le même patron, plutôt que
 * celui de `lib/concours.ts` (qui n'a jamais été vérifié de cette façon et
 * pourrait porter le même défaut — hors du périmètre de cette étape).
 * ---------------------------------------------------------------------------
 */

export type PhotoGalerie = { src: string; alt: string }

type LignePhotoGalerie = { src: string; altFr: string; altEn: string | null }

async function lireDepuisBase(page: PageGalerie): Promise<LignePhotoGalerie[]> {
  try {
    const supabase = createStaticClient()
    const { data, error } = await supabase
      .from('galeries_photos')
      .select('url_stockage, alt_fr, alt_en')
      .eq('page', page)
      .order('ordre')

    if (error || !data) return []

    return data.map((p) => ({ src: p.url_stockage, altFr: p.alt_fr, altEn: p.alt_en }))
  } catch {
    // Supabase injoignable au moment du rendu : galerie vide plutôt qu'une
    // page qui casse — même repli que concours/réalisations/carrières.
    return []
  }
}

/**
 * Enveloppée par `unstable_cache` sans `locale` : une seule entrée de cache
 * par page, portant déjà les deux langues (`alt_fr`/`alt_en`) — la
 * résolution par langue n'a lieu qu'APRÈS le cache, dans `lireGaleriePage`
 * ci-dessous. Ne pas appeler directement depuis un composant : passer par
 * `lireGaleriePage`, qui applique le repli FR.
 */
const lireLignesGaleriePage = unstable_cache(lireDepuisBase, ['galerie-page'], {
  tags: [ETIQUETTE_GALERIES],
  revalidate: 3600,
})

/**
 * ⚠️ Ne JAMAIS appeler depuis un composant client — le module importe
 * `server-only`, l'erreur arrive à la compilation plutôt qu'en production.
 */
export async function lireGaleriePage(page: PageGalerie, locale: AppLocale): Promise<PhotoGalerie[]> {
  const lignes = await lireLignesGaleriePage(page)
  return lignes.map((l) => ({
    src: l.src,
    // Repli FR si alt_en est vide — 14 des 21 photos n'ont pas encore leur
    // traduction (comportement attendu, pas un bug : voir le rapport de
    // l'étape 2). Jamais de chaîne inventée.
    alt: (locale === 'en' ? l.altEn : null) ?? l.altFr,
  }))
}
