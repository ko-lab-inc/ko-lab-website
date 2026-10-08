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

/**
 * Période de remplacement quand le visiteur n'a pas donné ses dates.
 *
 * ⚠️ `planperiod_start` et `planperiod_end` sont OBLIGATOIRES chez Rentman :
 * sans eux la demande est refusée en 400 (mesuré le 8 octobre 2026). Or les
 * dates sont FACULTATIVES sur notre formulaire, parce qu'on peut demander un
 * prix avant d'avoir arrêté ses dates. Sans cette provision, toutes ces
 * demandes-là ne partiraient jamais dans Rentman.
 *
 * Une semaine devant, sur une journée. La valeur importe peu : ce qui compte,
 * c'est que la remarque de la demande dise en toutes lettres que ces dates
 * sont provisoires, pour que personne ne les prenne pour un engagement.
 */
function periodeProvisoire(finDeJournee: boolean): string {
  const d = new Date()
  d.setDate(d.getDate() + 7 + (finDeJournee ? 1 : 0))
  const p = (n: number) => String(n).padStart(2, '0')
  const jour = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  return instant(jour, finDeJournee ? '17:00:00' : '08:00:00')
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
 * Ce qu'on rattache à la demande quand on reconnaît le demandeur.
 *
 * ⚠️ `linked_contact` SEULEMENT. `linked_contact_person` existe en lecture mais
 * Rentman refuse qu'on l'écrive à la création : « You are not permitted to set
 * the following field: linked_contact_person » (mesuré le 8 octobre 2026).
 * Quand on reconnaît une personne, on rattache donc sa SOCIÉTÉ.
 */
type Rattachement = { linked_contact?: string }

/**
 * Reconnaît le demandeur parmi les contacts Rentman, par son courriel.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI, ET CE QUE ÇA ÉVITE
 *
 * Sans ce rattachement, Rentman ne sait pas que le demandeur est peut-être
 * déjà un de vos clients. À l'écran « Vérifier lieu et client », il ne propose
 * RIEN : il faut chercher à la main, à chaque demande, même pour un habitué.
 * Et si on crée un contact au lieu de retrouver l'existant, le carnet se
 * remplit de doublons.
 *
 * ---------------------------------------------------------------------------
 * ⚠️ UNE SEULE CORRESPONDANCE, SINON RIEN
 *
 * Un courriel n'identifie PAS un client de façon unique. Mesuré le 8 octobre
 * 2026 sur les 93 contacts de KO-LAB : 72 adresses distinctes, dont 70
 * rattachables sans ambiguïté, et 2 partagées par plusieurs sociétés
 * (trois concessions Dilawri sur une même adresse, deux entités Bluesfest).
 *
 * Quand plusieurs contacts partagent l'adresse, on ne rattache RIEN et on
 * laisse l'équipe choisir. Se tromper de société attacherait un devis au
 * mauvais client, ce qui coûte bien plus cher qu'une recherche manuelle.
 *
 * La personne de contact est essayée EN PREMIER : c'est l'identification la
 * plus précise, et elle donne aussi la société parente.
 *
 * Ne lève jamais : un échec de reconnaissance rend simplement un objet vide,
 * et la demande part sans rattachement, comme avant.
 * ---------------------------------------------------------------------------
 */
/** Exportée pour le test : la règle « une seule correspondance » doit être vérifiable sans toucher à Rentman. */
export async function trouverClient(email: string): Promise<Rattachement> {
  const lire = async (chemin: string): Promise<Array<Record<string, unknown>>> => {
    const r = await fetch(BASE + chemin, { headers: entetes(), cache: 'no-store' })
    if (!r.ok) return []
    const j = (await r.json()) as { data?: Array<Record<string, unknown>> }
    return j.data ?? []
  }

  try {
    const adresse = encodeURIComponent(email.trim().toLowerCase())

    // 1. Une personne de contact : l'identification la plus précise. On ne
    //    retient que sa SOCIÉTÉ, la seule que Rentman accepte en écriture.
    const personnes = await lire(`/contactpersons?email=${adresse}`)
    if (personnes.length === 1) {
      const p = personnes[0]!
      if (typeof p.contact === 'string') return { linked_contact: p.contact }
    }

    // 2. Sinon la société, sur l'une ou l'autre de ses deux adresses.
    for (const champ of ['email_1', 'email_2']) {
      const contacts = await lire(`/contacts?${champ}=${adresse}`)
      if (contacts.length === 1) return { linked_contact: `/contacts/${String(contacts[0]!.id)}` }
      // Plusieurs sociétés sur cette adresse : on s'abstient, voir l'en-tête.
      if (contacts.length > 1) return {}
    }

    return {}
  } catch {
    return {}
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
    const datesFournies = Boolean(d.dateDebut && d.dateFin)

    const remarque = [
      d.precisions?.trim() || null,
      // Dit en toutes lettres que la période affichée ne vient pas du client.
      // Sans cette phrase, Roxanne lirait des dates inventées par nous comme
      // si le client les avait demandées.
      datesFournies
        ? null
        : 'DATES NON PRÉCISÉES par le client. La période de ce projet est provisoire, à confirmer avec lui.',
      `Demande ${d.numero} reçue sur ko-lab-center.ca.`,
    ]
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
      // Rattachement au client déjà connu, s'il est reconnu sans ambiguïté.
      // Vide sinon : l'équipe choisira, comme avant.
      ...(await trouverClient(d.email)),
    }

    // La période de PLANIFICATION est toujours envoyée : Rentman la refuse
    // absente (voir periodeProvisoire). On ne pose la période d'UTILISATION que
    // si les dates viennent vraiment du client.
    //
    // ⚠️ Ça ne la laisse PAS vide pour autant : vérifié le 8 octobre 2026,
    // Rentman recopie la planification dans l'utilisation quand on l'omet. La
    // distinction ne se voit donc pas dans Rentman, et c'est la phrase
    // « DATES NON PRÉCISÉES » de la remarque qui porte seule l'information.
    // Ne pas supprimer cette phrase en croyant qu'un champ vide suffira.
    const debut = datesFournies ? instant(d.dateDebut!, '08:00:00') : periodeProvisoire(false)
    const fin = datesFournies ? instant(d.dateFin!, '17:00:00') : periodeProvisoire(true)
    Object.assign(corps, {
      planperiod_start: debut,
      planperiod_end: fin,
      ...(datesFournies ? { usageperiod_start: debut, usageperiod_end: fin } : {}),
    })

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
