import 'server-only'

/**
 * Mission NERF — utilitaires partagés par les routes API du chantier.
 *
 * Fichier séparé plutôt qu'inliné dans la route POST : la future route de
 * lecture du dashboard (compteurs « aujourd'hui ») aura besoin exactement du
 * même calcul de date, et une divergence entre les deux serait invisible
 * jusqu'au soir de l'événement.
 */

/**
 * Date du jour dans le fuseau de l'événement (Outaouais, Québec — Eastern),
 * au format `YYYY-MM-DD` attendu par la colonne `date_evenement`.
 *
 * ⚠️ PAS `new Date().toISOString().slice(0, 10)` — ça donne la date UTC, pas
 * la date locale. L'Expérience Mobile tourne en soirée : passé ~20 h (HAE),
 * UTC a déjà basculé au jour suivant alors qu'il fait encore « aujourd'hui »
 * à Gatineau. Voir la note d'en-tête de la migration 0046 pour le détail —
 * c'est exactement le bug que `date_evenement` sans défaut base est conçue
 * pour rendre impossible à manquer.
 *
 * `en-CA` : seule la locale qui suffit à obtenir un format YYYY-MM-DD direct
 * depuis Intl.DateTimeFormat sans reconstruire la chaîne à la main.
 */
export function dateEvenementQuebec(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/**
 * Heure d'un horodatage, dans le fuseau de l'événement — `HH:mm`, 24 h.
 *
 * Formatée ICI plutôt que dans le navigateur du dashboard : la TV affiche
 * l'heure de Gatineau quel que soit le fuseau système réel de l'appareil qui
 * l'exécute (un lecteur/PC mal configuré ne doit pas décaler l'affichage).
 */
export function heureQuebec(horodatage: string): string {
  // 'en-CA', pas 'fr-CA' : les deux donnent bien 24 h (hour12: false), mais
  // 'fr-CA' rend « 23 h 34 » (convention d'écriture canadienne-française)
  // alors que la maquette attend « 23:34 » — vérifié en direct, pas supposé.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(horodatage))
}
