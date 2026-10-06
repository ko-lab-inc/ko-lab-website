import 'server-only'

import { createStaticClient } from '@/lib/supabase/static'

/**
 * Lecture des produits de location publiés — table `articles_location`,
 * alimentée par la synchronisation Rentman (migration 0048).
 *
 * ---------------------------------------------------------------------------
 * LECTURE PUBLIQUE, PAS D'ÉCRITURE
 *
 * `createStaticClient()` (clé anon, sans cookie) : la page /location est
 * pré-rendue avec ISR, lire avec le client de session la basculerait en
 * dynamique. La politique RLS de 0048 (`using (publie)`) fait que l'anon ne
 * voit QUE les articles publiés — un article dépublié par la synchro
 * disparaît du site sans qu'on ait à filtrer ici. On ajoute quand même
 * `.eq('publie', true)` : une défense explicite ne coûte rien et documente
 * l'intention.
 *
 * ⚠️ TYPE DÉFINI ET CASTÉ ICI, comme dans `synchroniser.ts` (LigneExistante).
 * Les colonnes réelles de la table sont celles qu'écrit la synchro
 * (`nom_fr`, `image_url`, `prix`…), vérifiées en base le 5 octobre 2026. On ne
 * dépend pas de la forme exacte du type généré, qui a divergé.
 */

export type ProduitLocation = {
  id: string
  slug: string
  nom_fr: string
  nom_en: string | null
  description_fr: string | null
  description_en: string | null
  categorie: string
  prix: number | null
  tags: string[]
  image_url: string | null
  image_alt_fr: string | null
  image_alt_en: string | null
}

/**
 * Ce qu'une CARTE du catalogue a besoin de connaître — rien de plus.
 *
 * ⚠️ La grille est un composant CLIENT depuis l'ajout du filtre par catégorie :
 * tout ce qu'on lui passe est sérialisé dans le HTML de la page. Les
 * descriptions n'y servent à rien (elles ne s'affichent que sur la fiche
 * produit, qui les relit elle-même) — les transmettre alourdirait chaque
 * chargement de /location pour rien.
 */
export type ProduitCarte = Pick<
  ProduitLocation,
  'id' | 'slug' | 'nom_fr' | 'nom_en' | 'categorie' | 'prix' | 'image_url' | 'image_alt_fr' | 'image_alt_en'
>

export function pourCarte(p: ProduitLocation): ProduitCarte {
  return {
    id: p.id,
    slug: p.slug,
    nom_fr: p.nom_fr,
    nom_en: p.nom_en,
    categorie: p.categorie,
    prix: p.prix,
    image_url: p.image_url,
    image_alt_fr: p.image_alt_fr,
    image_alt_en: p.image_alt_en,
  }
}

export async function lireProduitsLocation(): Promise<ProduitLocation[]> {
  try {
    const supabase = createStaticClient()
    const { data, error } = await supabase
      .from('articles_location')
      .select(
        'id, slug, nom_fr, nom_en, description_fr, description_en, categorie, prix, tags, image_url, image_alt_fr, image_alt_en',
      )
      .eq('publie', true)
      // `ordre` puis le nom : un ordre d'affichage pourra être posé plus tard
      // depuis l'admin ; à défaut (tout à 0), l'ordre alphabétique est stable.
      .order('categorie', { ascending: true })
      .order('ordre', { ascending: true })
      .order('nom_fr', { ascending: true })

    if (error || !data) return []
    return data as unknown as ProduitLocation[]
  } catch {
    // Table absente (0048 non jouée) ou Supabase injoignable : la page retombe
    // sur son message « arrive bientôt » plutôt que de tomber en erreur.
    return []
  }
}

/**
 * Un seul produit publié, par son slug — fiche produit /location/[slug].
 *
 * `null` si le slug n'existe pas OU si l'article n'est plus publié : la fiche
 * répond alors 404. Un article dépublié par la synchro (case `in_shop`
 * décochée dans Rentman) doit disparaître du site, pas rester accessible à
 * qui connaît son URL.
 */
export async function lireProduitLocation(slug: string): Promise<ProduitLocation | null> {
  try {
    const supabase = createStaticClient()
    const { data, error } = await supabase
      .from('articles_location')
      .select(
        'id, slug, nom_fr, nom_en, description_fr, description_en, categorie, prix, tags, image_url, image_alt_fr, image_alt_en',
      )
      .eq('slug', slug)
      .eq('publie', true)
      .maybeSingle()

    if (error || !data) return null
    return data as unknown as ProduitLocation
  } catch {
    return null
  }
}

/** Regroupe les produits par catégorie, dans l'ordre des catégories reçu. */
export function grouperParCategorie(
  produits: readonly ProduitLocation[],
  ordreCategories: readonly string[],
): Array<{ categorie: string; produits: ProduitLocation[] }> {
  const parCat = new Map<string, ProduitLocation[]>()
  for (const p of produits) {
    const liste = parCat.get(p.categorie) ?? []
    liste.push(p)
    parCat.set(p.categorie, liste)
  }
  // On suit l'ordre déclaré des catégories, puis d'éventuelles catégories
  // inattendues à la fin (ne devrait pas arriver : la synchro les contraint).
  const connues = ordreCategories.filter((c) => parCat.has(c))
  const autres = [...parCat.keys()].filter((c) => !ordreCategories.includes(c))
  return [...connues, ...autres].map((categorie) => ({
    categorie,
    produits: parCat.get(categorie) ?? [],
  }))
}
