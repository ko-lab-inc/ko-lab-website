/**
 * Numéro de téléphone tel qu'on l'AFFICHE à l'écran.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI RETIRER « +1 » À L'AFFICHAGE, MAIS PAS DU STOCKAGE
 *
 * Demande de Chris le 8 octobre 2026 : le numéro ne doit plus montrer « +1 »
 * sur le site. Mais la valeur stockée (`reglages.contact_telephone`) garde le
 * « +1 » pour deux usages où il est utile, voire nécessaire :
 *
 *   · le lien `tel:` — composer « +1 819… » joint correctement depuis un
 *     mobile, y compris de l'étranger ;
 *   · le JSON-LD `telephone` — schema.org attend le format international.
 *
 * On ne touche donc PAS à la donnée. Ce formateur ne sert qu'au TEXTE visible,
 * et comme il s'applique à la lecture, il reste juste même si quelqu'un re-saisit
 * « +1 » dans l'admin un jour.
 *
 * Retire uniquement un « +1 » EN TÊTE (avec l'espace ou le tiret qui suit).
 * Un « +1 » au milieu du numéro n'existe pas ; on ne touche à rien d'autre.
 */
export function telephoneAffiche(numero: string): string {
  return numero.replace(/^\+1[\s-]*/, '').trim()
}
