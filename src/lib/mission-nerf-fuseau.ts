/**
 * Mission NERF — calculs de fuseau horaire (America/Toronto), PARTAGÉS entre
 * code serveur et code navigateur.
 *
 * Fichier séparé de lib/mission-nerf.ts, et SANS `import 'server-only'` —
 * volontaire. `lib/mission-nerf.ts` porte aussi l'authentification staff
 * (mot de passe, signature de session...), qui ne doit JAMAIS pouvoir
 * atterrir dans un bundle navigateur — c'est pour ça qu'il est marqué
 * `server-only`. Ce fichier-ci ne contient que des calculs de date PURS,
 * rien de secret : il peut être importé aussi bien par une route API que
 * par le décompte client de la carte « Prochain départ »
 * (dashboard/useDecompteDepart.ts).
 *
 * `lib/mission-nerf.ts` réexporte les trois premières fonctions pour ne
 * rien changer côté appelants déjà existants (routes API, Server Actions) —
 * un seul calcul de fuseau dans tout le projet, jamais une deuxième version
 * qui pourrait diverger de celle-ci.
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

/**
 * Heure `HH:mm` dans N minutes, calculée dans le fuseau de l'événement —
 * sert les raccourcis rapides du panneau staff (« +15 min »). Calculée ICI,
 * côté serveur (jamais avec l'horloge de l'appareil du staff) : un téléphone
 * mal réglé ne doit pas décaler l'heure écrite en base.
 */
export function dansNMinutesQuebec(minutes: number): string {
  return heureQuebec(new Date(Date.now() + minutes * 60_000).toISOString())
}

/** Heure actuelle dans le fuseau de l'événement, en secondes depuis minuit
 *  (Québec) — brique de base de `secondesRestantesQuebec` ci-dessous. */
function secondesDepuisMinuitQuebec(instant: Date): number {
  const parties = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant)

  const valeur = (type: string) => Number(parties.find((p) => p.type === type)?.value ?? 0)
  return valeur('hour') * 3600 + valeur('minute') * 60 + valeur('second')
}

/**
 * Délai de grâce (secondes) pendant lequel un départ passé reste affiché
 * comme « DÉPART IMMINENT » avant de basculer sur un état « session en
 * cours » — partagé entre le dashboard (bascule d'affichage,
 * dashboard/useDecompteDepart.ts) et le panneau staff (bandeau de rappel,
 * staff/page.tsx), pour que les deux écrans s'accordent sur LE MÊME seuil.
 * Choisi le 1er septembre 2026 : voir la docstring de useDecompteDepart.ts
 * pour la justification complète (assez long pour qu'un parent en retard
 * de quelques minutes comprenne encore qu'il vient de manquer le départ,
 * assez court pour ne jamais empiéter sur le départ suivant).
 */
export const DELAI_GRACE_DEPART_SECONDES = 5 * 60

/**
 * Écart, en secondes, entre MAINTENANT et la PROCHAINE occurrence de
 * `heureCible` (`HH:mm`) dans le fuseau de l'événement — POSITIF si le
 * départ est à venir, NÉGATIF s'il est déjà passé (ex. -180 = passé depuis
 * 3 minutes). Signée depuis la correction du 1er septembre 2026 : le
 * dashboard a besoin de savoir DEPUIS COMBIEN DE TEMPS un départ est passé
 * pour décider quand basculer « DÉPART IMMINENT » → « À VENIR » (voir
 * `dashboard/useDecompteDepart.ts`) — un simple clamp à 0 effaçait cette
 * information. Seul appelant à ce jour, donc rien d'autre à migrer.
 *
 * ⚠️ CALCULÉE EN COMPARANT DES SECONDES-DEPUIS-MINUIT (Québec), PAS DES
 * OBJETS Date CONSTRUITS AVEC L'HORLOGE DU NAVIGATEUR. Le téléphone/PC qui
 * affiche le dashboard peut être dans n'importe quel fuseau système ; toute
 * la conversion passe par `Intl.DateTimeFormat(..., { timeZone:
 * 'America/Toronto' })`, exactement la même primitive que le reste de ce
 * fichier — jamais une deuxième façon de raisonner sur l'heure.
 *
 * ⚠️ PASSAGE DE MINUIT — règle du seuil de 12 h, qui tranche entre les deux
 * seuls cas réels qui se présentent en pratique :
 *
 *   - Un départ réglé pour « il y a quelques minutes » (page rechargée un
 *     peu tard, ou l'heure réglée vient tout juste de passer) — l'écart
 *     entre « aujourd'hui à cette heure » et maintenant est PETIT (quelques
 *     minutes) → reste interprété comme aujourd'hui, déjà passé → une petite
 *     valeur négative, jamais un compte à rebours vers demain.
 *
 *   - Un départ réglé à 00:15 alors qu'il est 23:50 — « aujourd'hui à
 *     00:15 » est passé de 23 h 35, largement PLUS de 12 h → réinterprété
 *     comme DEMAIN à 00:15, soit 25 minutes plus tard (valeur positive).
 *
 * 12 h est le seuil naturel pour cette distinction : un vrai départ ne se
 * règle jamais des heures à l'avance dans le passé, donc tout écart de plus
 * de 12 h ne peut venir que d'un passage de minuit à réinterpréter. Le délai
 * de grâce « DÉPART IMMINENT » (quelques minutes, très inférieur à 12 h) ne
 * peut donc jamais chevaucher ce seuil.
 */
export function secondesRestantesQuebec(heureCible: string, maintenant: Date = new Date()): number {
  const [heures = 0, minutes = 0] = heureCible.split(':').map(Number)
  const cibleSecondes = heures * 3600 + minutes * 60
  const maintenantSecondes = secondesDepuisMinuitQuebec(maintenant)

  let diff = cibleSecondes - maintenantSecondes
  if (diff < -12 * 3600) diff += 24 * 3600

  return diff
}
