import 'server-only'

/**
 * Dépôt d'une demande de location dans Rentman.
 *
 * =============================================================================
 * CE QU'ON DÉPOSE, ET POURQUOI CE N'EST PAS UN PROJET
 * =============================================================================
 * Une DEMANDE DE PROJET (`/projectrequests`), pas un projet. Elle arrive dans
 * l'écran « Projets > Demandes de location » au statut « En attente », et c'est
 * Roxanne qui l'accepte ou la refuse. Rien n'entre en production sans ce geste :
 * aucun numéro de projet consommé, aucun contact créé, aucune réservation posée.
 *
 * Rentman marque lui-même ces demandes `source: "api"`, ce qui les distingue
 * pour toujours d'une saisie manuelle. Rien à faire de notre côté.
 *
 * =============================================================================
 * LES TROIS PIÈGES DE L'API, TROUVÉS À TÂTONS LE 7 OCTOBRE 2026
 * =============================================================================
 * Ils ne sont documentés nulle part, et chacun a coûté un aller-retour.
 *
 * 1. Les lignes de matériel ne s'écrivent QUE sur la forme sous-ressource
 *    `/projectrequests/{id}/projectrequestequipment`. Un POST sur la forme
 *    plate `/projectrequestequipment` répond 403 « chemin inexistant », alors
 *    que cette même forme plate se LIT parfaitement.
 *
 * 2. Les types sont mélangés dans une même ligne : `quantity` exige un ENTIER,
 *    `order` exige une CHAÎNE. Envoyer les deux du même type échoue toujours,
 *    dans un sens ou dans l'autre.
 *
 * 3. Omettre `quantity` ne lève AUCUNE erreur : la ligne est créée avec une
 *    quantité de 0. Un silence bien plus coûteux qu'un refus.
 *
 * Bonus : `external_reference` n'accepte qu'un entier, et Rentman n'en attribue
 * aucun tout seul (il reste à 0). D'où le compteur `numero` de la migration 0056.
 *
 * ⚠️ UN 403 CHEZ RENTMAN VEUT DIRE « CHEMIN INEXISTANT », PAS « INTERDIT ».
 * Le corps parle d'un en-tête Authorization mal formé : c'est une erreur de
 * passerelle AWS renvoyée quand la route ne correspond à rien. Ne pas en
 * conclure à un problème de droits.
 * =============================================================================
 */

const BASE = 'https://api.rentman.net'

export type ArticleADeposer = {
  /** Identifiant de l'article dans l'inventaire Rentman. */
  rentman_id: number
  nom: string
  quantite: number
}

export type DemandeADeposer = {
  /** Notre numéro lisible (0056). Devient la colonne « Numéro » chez Rentman. */
  numero: number
  nom: string
  email: string
  telephone: string | null
  organisation: string | null
  langue: 'fr' | 'en'
  /** Format AAAA-MM-JJ, ou null si le visiteur n'a pas précisé ses dates. */
  dateDebut: string | null
  dateFin: string | null
  precisions: string | null
  articles: readonly ArticleADeposer[]
}

export type ResultatDepot = { ok: true; id: number; lignes: number } | { ok: false; raison: string }

function jeton(): string {
  const t = process.env.RENTMAN_API_TOKEN
  if (!t) throw new Error('RENTMAN_API_TOKEN absent')
  return t
}

function entetes(): HeadersInit {
  return {
    Authorization: `Bearer ${jeton()}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

/**
 * Décalage horaire du Québec POUR CETTE DATE, pas celui d'aujourd'hui.
 *
 * Écrire « -04:00 » en dur donnerait une heure fausse d'une heure pour toute
 * location hivernale, et Rentman afficherait un horaire décalé dans le
 * planning. `longOffset` rend « GMT-04:00 » ou « GMT-05:00 » selon l'heure
 * avancée en vigueur ce jour-là.
 */
function decalageQuebec(jour: string): string {
  try {
    const d = new Date(`${jour}T12:00:00Z`)
    const partie = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Toronto',
      timeZoneName: 'longOffset',
    })
      .formatToParts(d)
      .find((p) => p.type === 'timeZoneName')?.value
    const decalage = partie?.replace('GMT', '')
    return decalage && /^[+-]\d{2}:\d{2}$/.test(decalage) ? decalage : '-05:00'
  } catch {
    return '-05:00'
  }
}

/** « 2026-10-13 » + 8 h → « 2026-10-13T08:00:00-04:00 ». */
function instant(jour: string, heure: '08:00:00' | '17:00:00'): string {
  return `${jour}T${heure}${decalageQuebec(jour)}`
}

async function poster(
  chemin: string,
  corps: unknown,
): Promise<{ ok: boolean; data?: { id: number }; erreur?: string }> {
  const r = await fetch(BASE + chemin, {
    method: 'POST',
    headers: entetes(),
    body: JSON.stringify(corps),
    cache: 'no-store',
  })
  const texte = await r.text()
  if (!r.ok) return { ok: false, erreur: `HTTP ${r.status} ${texte.slice(0, 160)}` }
  try {
    return { ok: true, data: (JSON.parse(texte) as { data: { id: number } }).data }
  } catch {
    return { ok: false, erreur: 'réponse illisible' }
  }
}

/**
 * Dépose la demande et ses articles.
 *
 * Ne lève JAMAIS : rend toujours un résultat, parce que l'appelant doit pouvoir
 * enregistrer l'échec et continuer. Une demande de location ne doit jamais être
 * perdue parce que Rentman est injoignable.
 */
export async function deposerDemande(d: DemandeADeposer): Promise<ResultatDepot> {
  try {
    // ⚠️ SEULEMENT les précisions écrites par le visiteur, jamais le message
    // composé. Les dates et la liste d'équipements sont déjà des champs
    // STRUCTURÉS de la demande, affichés juste à côté dans l'écran de Rentman :
    // les répéter ici noyait la seule phrase que le client avait vraiment
    // écrite au milieu d'un pavé redondant (constaté le 7 octobre 2026).
    const remarque = [d.precisions?.trim() || null, `Demande ${d.numero} reçue sur ko-lab-center.ca.`]
      .filter(Boolean)
      .join('\n\n')

    const corps: Record<string, unknown> = {
      name: `Demande ${d.numero} (site web)`,
      contact_name: d.organisation?.trim() || d.nom,
      // Rentman sépare prénom et nom. Notre formulaire n'a qu'un seul champ :
      // on coupe au premier espace plutôt que d'alourdir le formulaire public
      // d'une saisie en deux temps pour le confort de l'ERP.
      contact_person_first_name: d.nom.split(' ')[0] ?? d.nom,
      contact_person_lastname: d.nom.split(' ').slice(1).join(' ') || '.',
      contact_person_email: d.email,
      ...(d.telephone ? { contact_phone: d.telephone } : {}),
      language: d.langue,
      remark: remarque,
      // ENTIER obligatoire — voir la note d'en-tête.
      external_reference: d.numero,
    }

    // Périodes seulement si le visiteur a donné ses dates : elles restent
    // facultatives sur le formulaire, et une date inventée serait pire que pas
    // de date du tout.
    if (d.dateDebut && d.dateFin) {
      const debut = instant(d.dateDebut, '08:00:00')
      const fin = instant(d.dateFin, '17:00:00')
      Object.assign(corps, {
        usageperiod_start: debut,
        usageperiod_end: fin,
        planperiod_start: debut,
        planperiod_end: fin,
      })
    }

    const demande = await poster('/projectrequests', corps)
    if (!demande.ok || !demande.data) {
      return { ok: false, raison: demande.erreur ?? 'création refusée' }
    }
    const id = demande.data.id

    // Les lignes une par une : l'API n'accepte pas de lot. Un échec de ligne ne
    // perd pas la demande, qui existe déjà et porte déjà le client et les dates.
    // On le signale, Roxanne complétera.
    let posees = 0
    const echecs: string[] = []
    for (const [i, a] of d.articles.entries()) {
      const ligne = await poster(`/projectrequests/${id}/projectrequestequipment`, {
        linked_equipment: `/equipment/${a.rentman_id}`,
        name: a.nom,
        // ENTIER ici, CHAÎNE juste en dessous. Oui, vraiment.
        quantity: a.quantite,
        // ⚠️ OBLIGATOIRE, ET C'EST LE PIÈGE LE PLUS COÛTEUX DES QUATRE.
        // L'écran d'acceptation de Rentman lit `quantity_total`, pas
        // `quantity`. Ne renseigner que le second ne lève aucune erreur, et
        // l'aperçu latéral affiche même la bonne quantité : tout paraît
        // correct. Mais au moment d'accepter, Roxanne voit 0 partout, et
        // valider créerait un projet vide avec un devis à zéro.
        // Constaté le 7 octobre 2026 sur la demande 1008, avant acceptation.
        // Les données de démonstration de Rentman portent toujours les deux
        // champs à la même valeur.
        quantity_total: a.quantite,
        order: String((i + 1) * 10),
      })
      if (ligne.ok) posees += 1
      else echecs.push(`#${a.rentman_id} : ${ligne.erreur ?? 'refus'}`)
    }

    if (echecs.length > 0) {
      return {
        ok: false,
        raison: `demande ${id} créée, mais ${echecs.length} ligne(s) en échec : ${echecs[0]}`,
      }
    }

    return { ok: true, id, lignes: posees }
  } catch (e) {
    return { ok: false, raison: e instanceof Error ? e.message : String(e) }
  }
}
