/**
 * Saison de Noël — fenêtre d'affichage de la mise en avant saisonnière.
 *
 * La PAGE /noel reste accessible toute l'année (son URL ne doit jamais casser,
 * pour un lien de campagne direct). Ce qui est borné, c'est sa MISE EN AVANT :
 * le popup du site et le lien dans le pied de page n'apparaissent que pendant
 * la saison. Hors saison, ni l'un ni l'autre n'est rendu — donc aucun JS ni
 * aucun lien « mort de saison » n'est servi.
 *
 * Fenêtre : du 15 octobre au 6 janvier (Rois). Le 15 octobre et non novembre :
 * la déco corporative des Fêtes se réserve tôt (la page le dit elle-même, « les
 * meilleures dates partent tôt »), et le boss a lancé la demande à la mi-octobre
 * justement pour pousser dès maintenant. Calcul volontairement simple et sans
 * dépendance horaire : on se base sur la date du serveur au rendu.
 *
 * ⚠️ Ce n'est PAS un interrupteur d'administration. Si le boss veut pouvoir
 * l'allumer/l'éteindre à la main hors de cette fenêtre, il faudra un réglage
 * (table reglages, même mécanique que `concoursActif`) — noté comme suite
 * possible, pas fait ici.
 */
export function estSaisonNoel(maintenant: Date = new Date()): boolean {
  const mois = maintenant.getMonth() // 0 = janvier
  const jour = maintenant.getDate()

  // Octobre (9) à partir du 15.
  if (mois === 9 && jour >= 15) return true
  // Novembre (10) et décembre (11) : toujours.
  if (mois === 10 || mois === 11) return true
  // Janvier (0) jusqu'au 6 inclus.
  if (mois === 0 && jour <= 6) return true
  return false
}

/**
 * Rabais « 20 % avant le 1er novembre » (demande du boss, 16 octobre 2026) —
 * accroche affichée SUR LE POPUP uniquement.
 *
 * ⚠️ CONDITIONNEL EXPRÈS : une offre datée doit disparaître à l'échéance,
 * sinon le popup promet dès le 1er novembre un rabais qui n'existe plus (faux,
 * et mauvais pour l'image). Vrai pendant tout octobre (tout octobre est avant
 * le 1er novembre), faux ensuite. Combiné à estSaisonNoel (popup visible dès le
 * 15 octobre), la fenêtre réelle de l'accroche est donc le 15-31 octobre.
 */
export function estAvant1erNovembre(maintenant: Date = new Date()): boolean {
  return maintenant.getMonth() === 9 // octobre
}
