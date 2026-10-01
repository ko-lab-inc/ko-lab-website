/**
 * Correspondance dossier Rentman → catégorie du site.
 *
 * Rentman range son matériel dans 50 dossiers ; /location en affiche 7
 * (voir le tableau `categories` de `(marketing)/[locale]/location/page.tsx`).
 * Ce fichier est le seul endroit où les deux vocabulaires se rencontrent.
 *
 * ⚠️ PAS DE DÉFAUT. Un dossier inconnu ne tombe pas dans « décor » parce que
 * c'est la catégorie la plus grosse : l'article est écarté et signalé par la
 * synchronisation. Un défaut silencieux rangerait un jour un groupe
 * électrogène dans les guirlandes sans que personne le voie.
 *
 * Relevé fait le 1er octobre 2026 sur la base réelle (590 articles,
 * 50 dossiers). Si Rentman gagne un dossier, la synchronisation le dira.
 */

/** Les sept catégories de /location, dans l'ordre d'affichage de la page. */
export const CATEGORIES_LOCATION = [
  'mobilier',
  'scenes',
  'clotures',
  'eclairage',
  'decor',
  'equipements_terrain',
  'infrastructures',
] as const

export type CategorieLocation = (typeof CATEGORIES_LOCATION)[number]

/**
 * Dossiers volontairement EXCLUS du catalogue public, avec la raison.
 *
 * Ce ne sont pas des oublis : les lister ici évite qu'ils ressortent à chaque
 * passe dans le rapport « dossier inconnu » et noient les vrais écarts.
 */
export const DOSSIERS_EXCLUS: Record<number, string> = {
  113: 'Services — prestations de service (transport avec équipe, main-d’œuvre), pas du matériel qu’on loue à l’unité.',
  112: 'Import-20260825-141717 — lot d’import non trié : 9 des 20 articles n’ont même pas de description publique.',
  114: 'Import-20260922-151549 — second lot d’import, vide au 1er octobre 2026.',
}

/**
 * Dossier Rentman (par identifiant) → catégorie du site.
 *
 * L'identifiant plutôt que le nom : renommer un dossier dans Rentman est un
 * geste courant, le renuméroter non.
 *
 * Les entrées « Équipement > X » (93 à 110) sont les dossiers d'une
 * réorganisation en cours côté Rentman — vides au 1er octobre 2026, mais
 * doublons exacts des dossiers à plat. Elles sont rapprochées des mêmes
 * catégories pour que la synchronisation continue de fonctionner le jour où
 * KO-LAB y déplace son matériel, sans intervention de développeur.
 */
export const DOSSIER_VERS_CATEGORIE: Record<number, CategorieLocation> = {
  // --- Mobilier et réception
  75: 'mobilier', //  70 · Mobilier
  76: 'mobilier', //  11 · Bars
  82: 'mobilier', //   8 · Hospitalité
  93: 'mobilier', //       Équipement > Mobilier
  94: 'mobilier', //       Équipement > Bars
  100: 'mobilier', //      Équipement > Hospitalité

  // --- Scènes, structures et panneaux
  88: 'scenes', //  22 · Structures & panneaux
  79: 'scenes', //   3 · Tentes & Structures
  106: 'scenes', //      Équipement > Structures & panneaux
  97: 'scenes', //       Équipement > Tentes & Structures

  // --- Éclairage
  77: 'eclairage', //  15 · Éclairage
  95: 'eclairage', //       Équipement > Éclairage

  // --- Décor (57 % de l'inventaire)
  86: 'decor', // 202 · Décor - Thématique
  85: 'decor', //  99 · Décor - Noël
  87: 'decor', //  29 · Décor - Floral & verdure
  89: 'decor', //  13 · Textiles
  80: 'decor', //   3 · Décor
  78: 'decor', //   2 · Pipe & Drape
  104: 'decor', //      Équipement > Décor - Thématique
  103: 'decor', //      Équipement > Décor - Noël
  105: 'decor', //      Équipement > Décor - Floral & verdure
  107: 'decor', //      Équipement > Textiles
  98: 'decor', //       Équipement > Décor
  96: 'decor', //       Équipement > Pipe & Drape

  // --- Équipements terrain
  83: 'equipements_terrain', //  4 · Gestion des matières résiduelles
  92: 'equipements_terrain', //  1 · Entreposage & transport
  101: 'equipements_terrain', //     Équipement > Gestion des matières résiduelles
  110: 'equipements_terrain', //     Équipement > Entreposage & transport

  // --- Infrastructures
  81: 'infrastructures', //  9 · Réseau & Technologie
  91: 'infrastructures', //  4 · Audio
  84: 'infrastructures', //  1 · Infrastructure événementielle
  90: 'infrastructures', //  1 · Chauffage
  99: 'infrastructures', //      Équipement > Réseau & Technologie
  109: 'infrastructures', //     Équipement > Audio
  102: 'infrastructures', //     Équipement > Infrastructure événementielle
  108: 'infrastructures', //     Équipement > Chauffage

  // --- `clotures` : AUCUN dossier Rentman ne lui correspond.
  //     La page /location annonce pourtant « Clôtures & barrières ». Soit le
  //     matériel n'est pas inventorié dans Rentman, soit la page promet plus
  //     large que ce que KO-LAB loue. Question posée à Joe le 1er octobre
  //     2026 ; tant qu'elle n'est pas tranchée, cette catégorie restera
  //     simplement vide sur le site, ce qui est honnête.
}

/** `/folders/75` → 75. `null` si la référence n'a pas la forme attendue. */
export function identifiantDossier(reference: string | null | undefined): number | null {
  const m = /^\/folders\/(\d+)$/.exec((reference ?? '').trim())
  return m ? Number(m[1]) : null
}
