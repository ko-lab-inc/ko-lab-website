/**
 * Validation des identifiants de ligne.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI VÉRIFIER UN `id` QUE LE RLS FILTRERA DE TOUTE FAÇON
 *
 * Pour une simple mise à jour, le RLS suffit : un `id` fantaisiste ne
 * correspond à aucune ligne, l'`UPDATE` n'affecte rien.
 *
 * Mais plusieurs actions d'administration se servent de l'`id` du formulaire
 * comme PRÉFIXE DE CHEMIN dans le stockage :
 *
 *     const chemin = `${identifiant}-${Date.now()}.${extension}`
 *
 * Là, une valeur libre ne se contente plus de ne rien trouver : elle fabrique
 * une clé d'objet. `id=../autre-prefixe/x` place le fichier hors du préfixe
 * attendu. L'impact reste confiné au bucket — Supabase Storage manipule des
 * clés, pas un système de fichiers, et le nom du bucket est écrit en dur —
 * mais des politiques de stockage écrites par préfixe s'en trouveraient
 * contournées, et le téléversement a lieu AVANT l'`UPDATE` : un identifiant
 * qui ne correspond à rien remplit quand même le bucket.
 *
 * Toutes les tables du projet ont une clé primaire `uuid` (0001). Un `id` qui
 * n'est pas un UUID ne peut donc désigner aucune ligne : le refuser d'entrée
 * ne retire aucun cas d'usage légitime.
 * ---------------------------------------------------------------------------
 */

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** `true` si la valeur est un UUID bien formé. */
export function estUuid(valeur: unknown): valeur is string {
  return typeof valeur === 'string' && UUID.test(valeur)
}
