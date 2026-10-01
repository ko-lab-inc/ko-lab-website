/**
 * Rentman → KO-LAB : traduction d'une fiche d'équipement en article de
 * catalogue.
 *
 * Fonctions PURES, sans accès réseau ni base : c'est ici que vivent les règles
 * qui décident ce qui est publiable, et elles doivent être testables sans
 * toucher au compte Rentman du client (il n'existe pas d'environnement de
 * test séparé — voir CLAUDE.md).
 *
 * ---------------------------------------------------------------------------
 * CE QUI NE SORT JAMAIS D'ICI
 *
 * `internal_remark` — note d'entrepôt présente sur 497 des 584 articles
 * (« Stock principal : 3D SHOP. À valider lors de… »). Aucune fonction de ce
 * fichier ne la lit. Le type `ArticleRentman` ne la déclare même pas : ce
 * qu'on ne modélise pas ne peut pas fuir par distraction.
 * ---------------------------------------------------------------------------
 */

import {
  DOSSIER_VERS_CATEGORIE,
  DOSSIERS_EXCLUS,
  identifiantDossier,
  type CategorieLocation,
} from './categories'

/**
 * Le sous-ensemble des champs Rentman que le site lit. Volontairement étroit :
 * la fiche réelle en compte une cinquantaine.
 */
export type ArticleRentman = {
  id: number
  displayname: string
  name?: string
  folder: string | null
  /** Texte public, déjà bilingue « français / anglais » chez KO-LAB. */
  external_remark?: string | null
  /** Case « visible en boutique en ligne » de Rentman. Seul feu vert. */
  in_shop?: boolean
  in_archive?: boolean
  temporary?: boolean
  rental_sales?: string | null
  price?: number | null
  tags?: string | null
  /** Référence de fichier, ex. `/files/479`. */
  image?: string | null
  modified?: string | null
}

export type ArticleNormalise = {
  rentman_id: number
  slug: string
  nom_fr: string
  nom_en: string
  description_fr: string | null
  description_en: string | null
  categorie: CategorieLocation
  dossier_rentman: string | null
  prix: number | null
  tags: string[]
  reference_image: string | null
  rentman_modifie_le: string | null
}

/** Pourquoi un article n'a pas été retenu — sert au rapport de synchronisation. */
export type Rejet = {
  rentman_id: number
  nom: string
  raison:
    | 'non_coche_in_shop'
    | 'archive'
    | 'temporaire'
    | 'vente_seule'
    | 'dossier_exclu'
    | 'dossier_inconnu'
    | 'sans_nom'
  detail?: string
}

/**
 * Coupe un texte « français / anglais » en deux.
 *
 * Format observé sur la base réelle le 1er octobre 2026 : 499 des 538 textes
 * publics contiennent « / », dont 498 un seul. Sur ces 498, 497 se coupent
 * proprement (partie gauche en français, partie droite en anglais) et aucune
 * n'est douteuse — vérifié par mots-outils (`pour`, `avec`, `idéale` à gauche ;
 * `for`, `with`, `ideal` à droite), pas par accents : « décor » est un mot
 * anglais accentué et faussait la mesure.
 *
 * Sans séparateur, le même texte sert aux deux langues plutôt que de laisser
 * l'anglais vide — un visiteur anglophone préfère une description française à
 * pas de description du tout.
 *
 * Le séparateur est « espace barre espace » et non « / » seul : des noms
 * comme « remorque flatbed ou remorque fermée de 24 pi » contiennent des
 * barres collées qu'il ne faut pas couper.
 */
export function couperBilingue(texte: string | null | undefined): {
  fr: string | null
  en: string | null
} {
  const t = (texte ?? '').trim()
  if (!t) return { fr: null, en: null }

  const morceaux = t.split(' / ')
  if (morceaux.length !== 2) return { fr: t, en: t }

  const fr = morceaux[0]?.trim() ?? ''
  const en = morceaux[1]?.trim() ?? ''
  // Une moitié vide (« Texte / ») n'est pas une traduction : on garde le tout.
  if (!fr || !en) return { fr: t, en: t }
  return { fr, en }
}

/**
 * Slug d'URL — `/location/<categorie>/<slug>`.
 *
 * Préfixé de l'identifiant Rentman : deux articles peuvent légitimement
 * porter le même nom (« Sapin 6 pieds » existe en plusieurs exemplaires dans
 * l'inventaire), et un slug en collision ferait échouer l'insertion ou, pire,
 * écraserait la mauvaise ligne. Le préfixe garantit l'unicité sans dépendre
 * d'une retouche humaine.
 */
export function slugArticle(nom: string, rentmanId: number): string {
  const base = nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '')
  return base ? `${base}-${rentmanId}` : `article-${rentmanId}`
}

/** « bistro, mobilier, signature » → ['bistro', 'mobilier', 'signature'] */
export function listerTags(tags: string | null | undefined): string[] {
  return (tags ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

/**
 * Décide si un article rejoint le catalogue, et sous quelle forme.
 *
 * L'ordre des refus est celui du coût de correction : `in_shop` d'abord parce
 * que c'est le geste attendu de KO-LAB, le dossier ensuite parce que c'est un
 * problème de rangement, et seulement après les cas rares.
 */
export function normaliser(a: ArticleRentman): ArticleNormalise | Rejet {
  const nom = (a.displayname || a.name || '').trim()
  if (!nom) return { rentman_id: a.id, nom: '(sans nom)', raison: 'sans_nom' }

  if (a.in_shop !== true) return { rentman_id: a.id, nom, raison: 'non_coche_in_shop' }
  if (a.in_archive === true) return { rentman_id: a.id, nom, raison: 'archive' }
  if (a.temporary === true) return { rentman_id: a.id, nom, raison: 'temporaire' }
  if (a.rental_sales === 'Sales') return { rentman_id: a.id, nom, raison: 'vente_seule' }

  const dossier = identifiantDossier(a.folder)
  if (dossier !== null && DOSSIERS_EXCLUS[dossier]) {
    return { rentman_id: a.id, nom, raison: 'dossier_exclu', detail: DOSSIERS_EXCLUS[dossier] }
  }

  const categorie = dossier === null ? undefined : DOSSIER_VERS_CATEGORIE[dossier]
  if (!categorie) {
    return {
      rentman_id: a.id,
      nom,
      raison: 'dossier_inconnu',
      detail: a.folder ?? '(aucun dossier)',
    }
  }

  const { fr, en } = couperBilingue(a.external_remark)

  return {
    rentman_id: a.id,
    slug: slugArticle(nom, a.id),
    nom_fr: nom,
    nom_en: nom,
    description_fr: fr,
    description_en: en,
    categorie,
    dossier_rentman: a.folder ?? null,
    // 0 n'est pas un prix : Rentman met 0 sur ce qui n'est pas tarifé à
    // l'unité, et « 0 $ » sur une page publique se lit « gratuit ».
    prix: typeof a.price === 'number' && a.price > 0 ? a.price : null,
    tags: listerTags(a.tags),
    reference_image: (a.image ?? '').trim() || null,
    rentman_modifie_le: a.modified ?? null,
  }
}

/** Distingue un article retenu d'un rejet, pour `Array.filter`. */
export function estRetenu(r: ArticleNormalise | Rejet): r is ArticleNormalise {
  return !('raison' in r)
}
