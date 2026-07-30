/**
 * Règles de stock du catalogue — migration 0013, skill 05.
 *
 * Un seul seuil, une seule fois : avant, « 5 » n'existait nulle part et
 * chaque écran (formulaire, tableau, tableau de bord) aurait dû
 * réinventer la même règle — avec le risque qu'un des trois dérive.
 */

/** Sous ce nombre d'unités, un produit « en stock » est signalé. */
export const SEUIL_STOCK_FAIBLE = 5

/**
 * `en_stock` et `rupture` suivent la quantité — ce sont littéralement des
 * comptes d'étagère. `en_commande` et `en_livraison` décrivent une situation
 * FOURNISSEUR choisie à la main par l'équipe (migration 0013 : « rien ne le
 * calcule à partir de la quantité, une rupture ANNONCÉE avant qu'elle
 * n'arrive à zéro a sa place elle aussi ») — la quantité ne doit jamais les
 * écraser.
 */
const STATUTS_SUIVIS_PAR_QUANTITE = new Set(['en_stock', 'rupture'])

/**
 * Statut suggéré après un changement de quantité.
 *
 * Une SUGGESTION, pas une contrainte : elle ne s'applique que si le statut
 * actuel est déjà l'un des deux suivis par la quantité. Un statut fournisseur
 * choisi à la main reste intact quelle que soit la quantité tapée ensuite.
 */
export function statutSuggere(statutActuel: string, quantite: number): string {
  if (!STATUTS_SUIVIS_PAR_QUANTITE.has(statutActuel)) return statutActuel
  return quantite < SEUIL_STOCK_FAIBLE ? 'rupture' : 'en_stock'
}

/** Ce produit appelle-t-il l'attention (badge, tableau de bord) ? */
export function stockEnAttention(statut: string, quantite: number): boolean {
  return statut === 'rupture' || (statut === 'en_stock' && quantite < SEUIL_STOCK_FAIBLE)
}
