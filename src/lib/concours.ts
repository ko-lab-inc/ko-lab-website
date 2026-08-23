import 'server-only'

import { unstable_cache } from 'next/cache'

import { createStaticClient } from '@/lib/supabase/static'

import type { AppLocale } from '@/i18n/routing'

/**
 * Concours publiés — lecture publique, mise en cache (migration 0040).
 *
 * Même architecture que lib/realisations.ts / lib/carrieres.ts : repli FR
 * champ par champ quand l'EN est vide, `createStaticClient()` (jamais le
 * client de session — cette lecture ne doit pas rendre le site dynamique),
 * étiquette de cache partagée avec les Server Actions d'administration.
 */

export const ETIQUETTE_CONCOURS = 'concours'

export type PhotoConcoursCarte = {
  id: string
  url: string
  alt: string
}

export type LienConcoursCarte = {
  id: string
  libelle: string
  url: string
}

export type ConcoursCarte = {
  id: string
  slug: string
  titre: string
  accroche: string | null
  description: string
  reglement: string | null
  dateDebut: string | null
  dateFin: string | null
  photos: PhotoConcoursCarte[]
  liens: LienConcoursCarte[]
}

async function lireDepuisBase(locale: AppLocale): Promise<ConcoursCarte[]> {
  try {
    const supabase = createStaticClient()
    const { data, error } = await supabase
      .from('concours')
      .select(
        'id, slug, titre_fr, titre_en, accroche_fr, accroche_en, description_fr, description_en, reglement_fr, reglement_en, date_debut, date_fin, concours_photos(id, url_stockage, alt_fr, alt_en, ordre), concours_liens(id, libelle_fr, libelle_en, url, ordre)',
      )
      .eq('publie', true)
      .order('ordre')
      .order('ordre', { referencedTable: 'concours_photos' })
      .order('ordre', { referencedTable: 'concours_liens' })

    if (error || !data) return []

    return data.map((c) => ({
      id: c.id,
      slug: c.slug,
      // Replie sur le français champ par champ, jamais ligne par ligne — même
      // discipline que lib/carrieres.ts : un concours peut avoir son titre
      // traduit sans que sa description le soit encore.
      titre: (locale === 'en' ? c.titre_en : null) ?? c.titre_fr,
      accroche: (locale === 'en' ? c.accroche_en : null) ?? c.accroche_fr,
      description: (locale === 'en' ? c.description_en : null) ?? c.description_fr,
      reglement: (locale === 'en' ? c.reglement_en : null) ?? c.reglement_fr,
      dateDebut: c.date_debut,
      dateFin: c.date_fin,
      photos: (c.concours_photos ?? []).map((p) => ({
        id: p.id,
        url: p.url_stockage,
        alt: (locale === 'en' ? p.alt_en : null) ?? p.alt_fr,
      })),
      liens: (c.concours_liens ?? []).map((l) => ({
        id: l.id,
        libelle: (locale === 'en' ? l.libelle_en : null) ?? l.libelle_fr,
        url: l.url,
      })),
    }))
  } catch {
    // Supabase injoignable au moment du rendu : liste vide plutôt qu'une
    // page qui casse — même repli que réalisations/carrières.
    return []
  }
}

/**
 * ⚠️ Ne JAMAIS appeler depuis un composant client — le module importe
 * `server-only`, l'erreur arrive à la compilation plutôt qu'en production.
 *
 * `locale` fait partie de la clé de cache : /fr et /en ont chacun leur
 * entrée, jamais le français figé dans le cache anglais ou l'inverse.
 */
export const lireConcoursPublies = unstable_cache(lireDepuisBase, ['concours-publies'], {
  tags: [ETIQUETTE_CONCOURS],
  revalidate: 3600,
})
