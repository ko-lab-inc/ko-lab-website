import 'server-only'

import { unstable_cache } from 'next/cache'

import { createStaticClient } from '@/lib/supabase/static'
import { statutSuggere } from '@/lib/stock'
import { premiereImage } from '@/lib/utils/premiereImage'

import type { IconeProps } from '@/components/ui/Icones'
import type { ComponentType } from 'react'

/**
 * Catalogue boutique — lecture publique depuis `produits_boutique`.
 *
 * ---------------------------------------------------------------------------
 * CE QUE CE MODULE REMPLACE
 *
 * Les douze produits ont vécu ici en dur pendant toute la phase de maquette,
 * pendant que /admin/catalogue écrivait déjà dans `produits_boutique` (migration
 * 0007 : « le catalogue passe en base »). Les deux catalogues ont coexisté sans
 * jamais se parler — un produit ajouté ou publié depuis l'espace équipe restait
 * invisible en boutique, puisque la page publique lisait encore ce fichier.
 * Repéré par Christian : un conteneur ajouté et publié depuis /admin/catalogue
 * n'apparaissait nulle part sur le site.
 *
 * ---------------------------------------------------------------------------
 * ⚠️ PAS DE REPLI SUR UN CONTENU CODÉ EN DUR
 *
 * Contrairement à réalisations (table restée vide jusqu'à ce que Christian y
 * publie du contenu réel), `produits_boutique` est peuplée depuis la migration
 * 0007 — les douze produits d'origine, plus tout ce qu'ajoute l'espace équipe
 * depuis. Une panne Supabase ici touche déjà la connexion, l'admin et le
 * formulaire de contact ; maintenir un second catalogue en dur comme filet ne
 * ferait que faire dériver silencieusement deux sources de vérité. En cas
 * d'erreur, `lireProduitsPublies()` renvoie un tableau vide — la grille affiche
 * son message « aucun résultat », le site reste debout sans mentir sur son
 * contenu.
 * ---------------------------------------------------------------------------
 */

/**
 * Un coloris d'un même produit — une pastille et la photo correspondante.
 */
export type VarianteCouleur = {
  /** Libellé lisible du coloris (« Noir », « Vert »…), annoncé au survol
   *  et aux lecteurs d'écran. */
  nom: string
  /**
   * Couleur de la pastille, en hexadécimal.
   *
   * SEULE exception à la règle « aucune couleur en dur hors globals.css » :
   * c'est une DONNÉE sur le produit, pas une décision de design. Le vert d'un
   * xTool ne peut pas sortir de la palette KO-LAB — il appartient à l'appareil.
   */
  echantillon: string
  /** Photo de ce coloris précis. Même traitement que `src` : détourée sur
   *  blanc pur, produit centré au même gabarit que les autres. */
  src: string
}

export type ProduitCarte = {
  slug: string
  categorie: string
  nom: string
  texte: string
  /** URL d'image, ou null pour un emplacement réservé. */
  src: string | null
  /**
   * Comment l'image occupe son cadre carré.
   *
   * `contain` (défaut) — visuel détouré sur fond blanc : la machine reste
   * entière et centrée, le blanc du fichier se confond avec celui du cadre.
   *
   * `cover` — photo de scène, impossible à détourer (un conteneur est
   * photographié dans une cour, avec ciel et sol). En `contain` elle
   * s'afficherait en bandes blanches au-dessus et en dessous ; elle remplit
   * donc le cadre bord à bord.
   */
  cadrage?: 'contain' | 'cover'
  /**
   * Coloris disponibles pour CE produit, affichés en pastilles sous la photo
   * de la fiche produit. Absent ou vide = pas de sélecteur.
   *
   * Format attendu (colonne `couleurs` de `produits_boutique`) :
   *
   *     [{ nom: 'Noir', echantillon: '#111210', src: '/images/produits/x-noir.webp' }]
   */
  couleurs?: VarianteCouleur[]
  /**
   * Prix indicatif CAD, avant taxes. `null` = pas de prix indicatif
   * disponible (la carte retombe sur `prixSurDemande`).
   */
  prixIndicatif: number | null
  /**
   * Ruban coin supérieur gauche. Jamais rempli depuis la base aujourd'hui —
   * aucun écran d'administration ne l'expose encore. Le champ reste câblé
   * (CatalogueBoutique.tsx et la fiche produit le rendent déjà) pour le jour
   * où Christian confirme un texte vrai et vérifiable par produit.
   */
  badgeRibbon?: string
  badgeRibbonIcone?: ComponentType<IconeProps>
  badgeSecondaire?: string
  badgeSecondaireIcone?: ComponentType<IconeProps>
  /**
   * Rupture de stock — calculé depuis `quantite`/`statut_stock` (migration
   * 0013) via `statutSuggere` de lib/stock.ts, même règle que /admin/catalogue :
   * un produit à quantité 0 compte comme rupture même si `statut_stock` est
   * resté à sa valeur par défaut. Demande de Christian : avertir le visiteur,
   * pas seulement l'équipe.
   */
  enRupture: boolean
}

/**
 * Ce que le récapitulatif de sélection a besoin de savoir d'un produit, en
 * plus de ce que le panier stocke lui-même (slug, nom, catégorie, quantité).
 */
export type FichePanier = {
  prix: number | null
  src: string | null
  cadrage?: 'contain' | 'cover'
}

/** Étiquette de cache — partagée avec les actions d'administration du catalogue. */
export const ETIQUETTE_PRODUITS = 'produits'

/** Catégories reconnues — une categorie mal orthographiée en base est écartée
 *  plutôt que de produire une carte que aucun filtre ne retrouve jamais. */
const CATEGORIES_VALIDES = ['impression', 'laser', 'conteneurs', 'equipements']

/**
 * Valide ce qui sort de la colonne jsonb `couleurs`.
 *
 * Postgres garantit que c'est du JSON valide, pas que c'est un TABLEAU
 * d'OBJETS avec les bonnes clés — même principe que `validerImages` de
 * lib/realisations.ts.
 */
function validerCouleurs(brut: unknown): VarianteCouleur[] {
  if (!Array.isArray(brut)) return []

  return brut
    .filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
    .map((x) => ({
      nom: typeof x.nom === 'string' ? x.nom : '',
      echantillon: typeof x.echantillon === 'string' ? x.echantillon : '',
      src: typeof x.src === 'string' ? x.src : '',
    }))
    // Un coloris sans nom, sans couleur ou sans photo ne peut rien afficher.
    .filter((c) => c.nom !== '' && c.echantillon !== '' && c.src !== '')
}

async function lireDepuisBase(): Promise<ProduitCarte[]> {
  // Lu une fois par appel plutôt que par carte : NEXT_PUBLIC_* est figé au
  // build, le refaire pour chaque ligne n'apporterait rien.
  const hoteStockage = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '')

  try {
    const supabase = createStaticClient()
    const { data, error } = await supabase
      .from('produits_boutique')
      .select(
        'slug, categorie, nom_fr, description_fr, prix, images, cadrage, couleurs, quantite, statut_stock',
      )
      .eq('publie', true)
      .order('ordre')

    if (error || !data) return []

    return data
      .filter((p) => CATEGORIES_VALIDES.some((c) => c === p.categorie))
      .map((p) => ({
        slug: p.slug,
        categorie: p.categorie,
        nom: p.nom_fr,
        texte: p.description_fr ?? '',
        src: premiereImage(p.images, hoteStockage),
        cadrage: p.cadrage === 'cover' ? ('cover' as const) : ('contain' as const),
        couleurs: validerCouleurs(p.couleurs),
        prixIndicatif: p.prix,
        enRupture: statutSuggere(p.statut_stock, p.quantite) === 'rupture',
      }))
  } catch {
    // Supabase injoignable au moment du rendu : tableau vide, le site reste
    // debout — voir la note en tête de fichier sur l'absence de repli en dur.
    return []
  }
}

/**
 * Produits publiés, triés par `ordre`. Mis en cache, invalidé par les actions
 * de /admin/catalogue (création, édition, publication, suppression).
 *
 * ⚠️ Ne JAMAIS appeler depuis un composant client — le module importe
 * `server-only`, l'erreur arrive à la compilation plutôt qu'en production.
 */
export const lireProduitsPublies = unstable_cache(lireDepuisBase, ['produits-publies'], {
  tags: [ETIQUETTE_PRODUITS],
  revalidate: 3600,
})

/**
 * Indexe le catalogue par slug pour le récapitulatif de sélection.
 *
 * Le panier ne mémorise NI le prix NI l'image : il ne garde que le slug, et
 * ces champs sont relus ici à chaque affichage. Une sélection vieille de trois
 * semaines montre donc le prix et le visuel d'aujourd'hui, pas ceux figés au
 * moment de l'ajout.
 */
export async function lireFichesPanier(): Promise<Record<string, FichePanier>> {
  const produits = await lireProduitsPublies()
  return Object.fromEntries(
    produits.map((p) => [p.slug, { prix: p.prixIndicatif, src: p.src, cadrage: p.cadrage }]),
  )
}
