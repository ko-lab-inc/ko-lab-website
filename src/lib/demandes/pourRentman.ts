/**
 * Met une demande de location en forme pour Rentman.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI CE FICHIER EXISTE
 *
 * Tant que le site n'a pas le droit d'écrire dans Rentman, quelqu'un recopie
 * la demande à la main. Le champ `message` contient déjà la liste en clair,
 * mais il lui manque LA donnée qui coûte du temps : le numéro de l'article
 * dans l'inventaire. Sans lui, il faut retrouver « Barrel Cocktail Table »
 * parmi 590 pièces ; avec lui, on le saisit directement.
 *
 * Fonction PURE, sans React ni presse-papiers : c'est ce qui la rend testable.
 * Le composant qui l'appelle ne fait que copier son résultat.
 *
 * ⚠️ Pas de tiret cadratin dans la sortie : ce texte est lu par un humain, et
 * la règle vaut ici comme partout ailleurs.
 * ---------------------------------------------------------------------------
 */

export type LignePourRentman = {
  rentman_id: number
  nom_fr: string
  quantite: number
}

export type DemandePourRentman = {
  nom: string
  email: string
  telephone: string | null
  organisation: string | null
  /** Langue du DEMANDEUR ('fr' | 'en'), pas celle de l'écran d'administration. */
  langue: string
  /** Dates déjà formatées pour un lecteur humain, ou null si non précisées. */
  dateDebut: string | null
  dateFin: string | null
  lignes: readonly LignePourRentman[]
}

/** Aligne les étiquettes pour que les valeurs forment une colonne lisible. */
function ligne(etiquette: string, valeur: string): string {
  return `${etiquette.padEnd(13)}: ${valeur}`
}

export function texteRentman(d: DemandePourRentman): string {
  const periode =
    d.dateDebut && d.dateFin
      ? `${d.dateDebut} au ${d.dateFin}`
      : (d.dateDebut ?? d.dateFin ?? 'non précisée')

  const entete = [
    'DEMANDE DE LOCATION (site web)',
    '',
    ligne('Client', d.nom),
    // Les champs vides sont OMIS, pas affichés avec un tiret : une ligne
    // « Organisation : - » est du bruit à recopier.
    ...(d.organisation ? [ligne('Organisation', d.organisation)] : []),
    ligne('Courriel', d.email),
    ...(d.telephone ? [ligne('Téléphone', d.telephone)] : []),
    ligne('Langue', d.langue.toUpperCase()),
    '',
    ligne('Période', periode),
  ]

  if (d.lignes.length === 0) return entete.join('\n')

  // Largeur du plus long numéro, pour que les quantités s'alignent quelle que
  // soit la longueur des identifiants.
  const largeur = Math.max(...d.lignes.map((l) => String(l.rentman_id).length))
  const articles = d.lignes.map(
    (l) => `  #${String(l.rentman_id).padEnd(largeur)}  x${String(l.quantite).padEnd(3)} ${l.nom_fr}`,
  )

  return [...entete, '', 'Équipements (numéro Rentman) :', ...articles].join('\n')
}
