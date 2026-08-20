import 'server-only'

import { unstable_cache } from 'next/cache'

import { createStaticClient } from '@/lib/supabase/static'
import { CATEGORIES_REALISATION, type CategorieRealisation, type Realisation } from '@/types'

import type { AppLocale } from '@/i18n/routing'

/**
 * Réalisations publiées — lecture publique, mise en cache, avec repli.
 *
 * ---------------------------------------------------------------------------
 * CE QUE CE MODULE REMPLACE
 *
 * La page /realisations affichait trois entrées codées en dur, avec des
 * photos de banque en attendant les vraies. La table `public.realisations`
 * existe depuis le tout premier schéma, `images` déjà en jsonb pensé pour
 * PLUSIEURS photos — mais rien ne l'alimentait ni ne la lisait. C'est ce que
 * ce module et l'écran /admin/realisations viennent combler.
 *
 * ---------------------------------------------------------------------------
 * ⚠️ LE REPLI N'EST PAS UNE PRÉCAUTION DÉCORATIVE
 *
 * Contrairement à `reglages.ts`, où le repli couvre une table absente, ici la
 * table EXISTE et ses politiques sont en vigueur depuis 0002 — mais elle est
 * VIDE de contenu réel : les trois lignes de démonstration ont été dépubliées
 * par 0008, précisément parce qu'elles étaient inventées. Tant que Christian
 * n'a rien publié depuis /admin/realisations, une lecture stricte de la table
 * viderait la galerie publique du jour au lendemain.
 *
 * `lireRealisationsPubliees()` renvoie donc `null` — pas un tableau vide —
 * quand la table ne contient AUCUNE réalisation publiée avec au moins une
 * image. La page appelante retombe alors sur son contenu provisoire actuel.
 * Dès qu'une vraie réalisation est publiée avec une photo, cette fonction
 * cesse de renvoyer `null` et le contenu provisoire disparaît de lui-même —
 * aucun redéploiement, aucun changement de code.
 * ---------------------------------------------------------------------------
 */

export type ImageRealisation = { url: string; alt: string; ordre: number }

export type RealisationPubliee = Omit<
  Realisation,
  'categorie' | 'images' | 'titre_fr' | 'titre_en' | 'description_fr' | 'description_en'
> & {
  categorie: CategorieRealisation
  images: ImageRealisation[]
  /** Déjà résolu dans la langue demandée — replie sur le français si
   *  titre_en/description_en sont vides pour cette réalisation (Phase 9,
   *  même principe que postes_carrieres et produits_boutique). Jamais
   *  suffixé _fr : contrairement à la colonne source, ce champ peut porter
   *  de l'anglais. */
  titre: string
  description: string | null
}

/** Étiquette de cache — partagée avec les actions d'administration. */
export const ETIQUETTE_REALISATIONS = 'realisations'

/**
 * Valide ce qui sort de la colonne jsonb.
 *
 * Postgres garantit que c'est du JSON valide, pas que c'est un TABLEAU
 * d'OBJETS avec les bonnes clés — un `update` malencontreux depuis le SQL
 * editor pourrait y mettre n'importe quoi. Même principe que la validation du
 * panier en localStorage (PanierContext) : on filtre plutôt que de faire
 * confiance à une source qu'on ne contrôle pas entièrement au moment de la
 * lecture.
 */
export function validerImages(brut: unknown): ImageRealisation[] {
  if (!Array.isArray(brut)) return []

  return brut
    .filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
    .map((x) => ({
      url: typeof x.url === 'string' ? x.url : '',
      // `alt_fr` en repli : d'éventuelles lignes écrites avant le retrait de
      // l'anglais (0014) portent encore cette clé dans leur jsonb — Postgres
      // ne migre pas le contenu d'une colonne jsonb, seule sa contrainte.
      alt: typeof x.alt === 'string' ? x.alt : typeof x.alt_fr === 'string' ? x.alt_fr : '',
      ordre: typeof x.ordre === 'number' ? x.ordre : 0,
    }))
    // Une entrée sans URL ne montre rien : autant l'écarter ici qu'obliger
    // chaque appelant à revérifier.
    .filter((image) => image.url !== '')
    .sort((a, b) => a.ordre - b.ordre)
}

async function lireDepuisBase(locale: AppLocale): Promise<RealisationPubliee[] | null> {
  try {
    const supabase = createStaticClient()
    const { data, error } = await supabase
      .from('realisations')
      .select(
        'id, slug, titre_fr, titre_en, description_fr, description_en, categorie, tags, images, publie, ordre, created_at, updated_at',
      )
      .eq('publie', true)
      .order('ordre')

    if (error || !data) return null

    const valides = data
      .filter((r) => CATEGORIES_REALISATION.some((c) => c === r.categorie))
      .map((r) => {
        const { titre_fr, titre_en, description_fr, description_en, ...reste } = r
        return {
          ...reste,
          categorie: r.categorie as CategorieRealisation,
          images: validerImages(r.images),
          titre: (locale === 'en' ? titre_en : null) ?? titre_fr,
          description: (locale === 'en' ? description_en : null) ?? description_fr,
        }
      })
      // Une réalisation sans la moindre photo n'a rien à montrer — elle
      // n'apparaîtrait sur la carte qu'en rectangle vide.
      .filter((r) => r.images.length > 0)

    return valides.length > 0 ? valides : null
  } catch {
    // Supabase injoignable au moment du rendu : `null` déclenche le même
    // repli qu'une table vide, le site reste debout.
    return null
  }
}

/**
 * `locale` fait partie de la clé de cache — même principe que
 * lireOffresPubliees et lireProduitsPublies.
 *
 * ⚠️ Ne JAMAIS appeler depuis un composant client — le module importe
 * `server-only`, l'erreur arrive à la compilation plutôt qu'en production.
 */
export const lireRealisationsPubliees = unstable_cache(lireDepuisBase, ['realisations-publiees'], {
  tags: [ETIQUETTE_REALISATIONS],
  revalidate: 3600,
})
