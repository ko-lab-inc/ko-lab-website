/**
 * Mission NERF — envoi des décharges vers le site KO-LAB.
 *
 * Ce fichier n'est PAS exécuté par ce dépôt (aucun build, aucun `npm run`
 * ne le touche) — c'est du code Google Apps Script, à coller à la main dans
 * l'éditeur Apps Script du Google Form. Conservé ici comme unique source de
 * vérité, pour ne pas dépendre de ce qui vit uniquement chez Google.
 *
 * Formulaire :
 * https://docs.google.com/forms/d/e/1FAIpQLSe8w68uNWha870jIbbiSqnKf8OmueHPBks2GT-oQpvioAuk-w/viewform
 *
 * =============================================================================
 * ⚠️ POURQUOI CE FICHIER A ÉTÉ RÉÉCRIT LE 5 SEPTEMBRE 2026, EN SOIRÉE
 * =============================================================================
 *
 * Trois pannes en cinq jours, toutes de la MÊME famille : le script cherchait
 * les réponses par le TITRE EXACT de la question.
 *
 *   31 août     — `onFormSubmit` plantait sans laisser de trace.
 *   1er sept.   — le script lisait `e.namedValues`, absent d'un déclencheur
 *                 posé « à partir du formulaire » (qui envoie `e.response`).
 *   5 sept.     — les titres avaient changé : 320 lignes dans le tableur,
 *                 zéro en base pendant toute une journée d'événement.
 *
 * Le correctif du 5 septembre au matin a lui-même échoué, et c'est le plus
 * instructif. Les titres ont été recopiés à la main depuis un journal
 * d'exécution, et l'un d'eux a perdu un espace au passage :
 *
 *     titre réel du formulaire :  "Participant␣␣#1 - Prénom, Nom"   (DEUX espaces)
 *     constante écrite dans le code : "Participant␣#1 - Prénom, Nom"  (UN espace)
 *
 * Invisible à l'œil, fatal à une comparaison de chaînes. Le bloc du premier
 * enfant n'était plus trouvé. Pire : les enfants 3, 4 et 5 vivent sous
 * "PRÉNOM, NOM" en MAJUSCULES, un titre que le code ne cherchait pas non
 * plus. Résultat, une seule colonne était lue — la 13, celle du DEUXIÈME
 * enfant. L'aîné disparaissait, la fratrie disparaissait, et une famille à
 * un seul enfant ne produisait rien du tout. 136 décharges enregistrées,
 * 136 participants, moyenne de 1,0 enfant par famille contre 1,8 et 2,0 les
 * jours précédents : c'est ce chiffre impossible qui a mis la puce à
 * l'oreille.
 *
 * -----------------------------------------------------------------------------
 * CE QUI CHANGE, ET POURQUOI ÇA NE PEUT PLUS CASSER PAREIL
 * -----------------------------------------------------------------------------
 *
 * 1. PLUS AUCUNE LECTURE PAR TITRE EXACT. Le script se repère sur la colonne
 *    « Nom du participant N » — le seul titre unique et sans piège de
 *    ponctuation du formulaire — et lit le PRÉNOM juste à sa gauche, l'ÂGE
 *    juste à sa droite. La comparaison se fait sur un titre normalisé
 *    (minuscules, espaces multiples réduits) : un espace en trop, une
 *    majuscule, un accent de casse ne peuvent plus rien casser.
 *
 * 2. UN SEUL ANALYSEUR. L'ancienne version en avait deux — un pour
 *    l'événement de soumission (`e.response`), un pour le tableur — qui
 *    devaient rester d'accord entre eux. Ils ne l'étaient pas. Désormais
 *    `onFormSubmit` retrouve SA ligne dans le tableur et la fait passer par
 *    exactement le même code que le rattrapage. Une seule vérité, un seul
 *    chemin à tester.
 *
 * 3. L'ÂGE EST EXTRAIT, PAS EXIGÉ. « 8 ans », « 9 a », « 11  » donnent 8, 9,
 *    11. L'ancienne version rejetait tout ce qui n'était pas un nombre pur,
 *    et perdait ces enfants-là en silence.
 *
 * -----------------------------------------------------------------------------
 * STRUCTURE RÉELLE DU TABLEUR (relevée en direct le 5 septembre 2026)
 * -----------------------------------------------------------------------------
 * 41 colonnes de formulaire, plus la colonne de suivi ajoutée par ce script.
 * Les cinq blocs participants sont réguliers, espacés de 5 colonnes :
 *
 *    col  8  Participant  #1 - Prénom, Nom     <- prénom (deux espaces !)
 *    col  9  Nom du participant 1              <- ANCRE
 *    col 10  Participant #1 - ÂGE              <- âge (espace final)
 *    col 11  Autorisez-vous cet enfant à participer?
 *    col 12  Souhaitez-vous inscrire un autre enfant?
 *    col 13  Prénom, Nom                       <- enfant 2
 *    col 14  Nom du participant 2              <- ANCRE
 *    col 15  ÂGE
 *    ... et ainsi de suite jusqu'au bloc 5 (col 28/29/30).
 *
 * Le code ne code AUCUN de ces numéros en dur : il retrouve les ancres à
 * chaque exécution. Si le formulaire est réorganisé, ça continue de marcher.
 * Si une ancre disparaît vraiment, le journal le dit bruyamment au lieu de
 * filtrer les participants en silence — c'est ce silence qui a coûté une
 * journée entière.
 *
 * =============================================================================
 * INSTALLATION
 * =============================================================================
 *
 * OÙ COLLER : ouvrir le formulaire en édition > menu ⋮ > Éditeur de scripts
 * (ou Extensions > Apps Script) > remplacer tout le contenu de Code.gs.
 *
 * JETON : icône ⚙ Paramètres du projet > Propriétés du script > Ajouter :
 *     Propriété : MISSION_NERF_TOKEN
 *     Valeur    : la même que MISSION_NERF_WEBHOOK_TOKEN sur Vercel.
 * Ne JAMAIS écrire ce jeton en dur ici.
 *
 * DEUX DÉCLENCHEURS, tous deux posés à la main (icône ⏰ Déclencheurs) :
 *
 *   a) Fonction `onFormSubmit` — envoi immédiat
 *        Déploiement : Head
 *        Source      : À partir du formulaire
 *        Type        : Sur envoi du formulaire
 *
 *      ⚠️ Une fonction simplement NOMMÉE `onFormSubmit` serait reliée comme
 *      déclencheur SIMPLE, qui ne peut pas appeler UrlFetchApp — l'envoi
 *      échouerait en silence. Il FAUT le poser à la main.
 *
 *   b) Fonction `rattrapageAutomatique` — filet de sécurité
 *        Déploiement : Head
 *        Source      : Déclencheur horaire
 *        Type        : Intervalle en minutes > Toutes les 5 minutes
 *
 *      C'est lui qui rattrape tout ce que (a) aurait raté : bug, coupure
 *      réseau, quota Google. Sans lui, une panne de (a) se solde par des
 *      données perdues sans que personne ne le sache — exactement ce qui
 *      s'est produit le 5 septembre.
 *
 * OÙ LIRE LES JOURNAUX : icône ⏱ Exécutions (PAS « Déclencheurs »).
 */

const URL_SITE = 'https://ko-lab-center.ca/api/mission-nerf/decharges'

/* ===========================================================================
 * REPÉRAGE DES COLONNES
 * =========================================================================== */

/**
 * Titre de l'ANCRE, en forme normalisée. Le numéro du bloc est ajouté au
 * bout : « nom du participant 1 », « nom du participant 2 », etc.
 *
 * Cette colonne a été choisie parce qu'elle est la seule du formulaire à
 * porter un titre à la fois UNIQUE (les autres se répètent d'un bloc à
 * l'autre) et SANS PIÈGE de ponctuation — pas de « # », pas de virgule, pas
 * d'accent, pas d'espace double.
 */
const TITRE_ANCRE = 'nom du participant '

/** Nombre de blocs participants proposés par le formulaire. */
const NOMBRE_BLOCS = 5

/** Titre de la colonne de suivi, ajoutée au tableur si elle n'existe pas. */
const COLONNE_SUIVI = 'Envoi KO-LAB'

/** Pause entre deux envois — l'API plafonne à 30/min, on reste en dessous. */
const PAUSE_ENTRE_ENVOIS_MS = 2500

/** Marge avant la coupure à 6 minutes imposée par Apps Script. */
const DUREE_MAX_MS = 4 * 60 * 1000

/**
 * Délai de grâce avant qu'une ligne devienne éligible au rattrapage.
 *
 * Une soumission qui vient d'arriver est peut-être en train d'être traitée
 * par `onFormSubmit` à la seconde même où le rattrapage passe. Sans ce
 * délai, les deux chemins enverraient la même famille — un doublon dans la
 * liste du staff, au pire moment.
 */
const DELAI_GRACE_MS = 5 * 60 * 1000

/**
 * Normalise un titre de colonne avant comparaison : minuscules, espaces
 * multiples réduits à un seul, bords rognés.
 *
 * ⚠️ VOLONTAIREMENT SANS EXPRESSION RÉGULIÈRE. Une regex a déjà été cassée
 * dans ce fichier le 5 septembre 2026 par un antislash perdu à la réécriture
 * (`/\s+/` devenu `/s+/`), ce qui a écarté TOUS les participants sans que
 * rien ne le signale. Un découpage sur l'espace ne peut pas se casser de
 * cette façon.
 */
function normaliserTitre(brut) {
  const texte = String(brut === null || brut === undefined ? '' : brut).toLowerCase()
  const morceaux = texte.split(' ')
  const utiles = []
  for (let i = 0; i < morceaux.length; i += 1) {
    if (morceaux[i] !== '') utiles.push(morceaux[i])
  }
  return utiles.join(' ')
}

/**
 * Retrouve, pour chaque bloc participant, les indices (base 0) des colonnes
 * prénom / nom / âge, à partir de la ligne d'en-tête.
 *
 * L'ancre « Nom du participant N » donne la colonne du nom ; le prénom est
 * juste à sa gauche, l'âge juste à sa droite. Vérifié sur les cinq blocs du
 * formulaire réel le 5 septembre 2026.
 *
 * Un bloc dont l'ancre est introuvable est SIGNALÉ puis sauté — jamais
 * ignoré en silence.
 */
function reperesParticipants(entetes) {
  const normalises = []
  for (let i = 0; i < entetes.length; i += 1) normalises.push(normaliserTitre(entetes[i]))

  const reperes = []
  for (let n = 1; n <= NOMBRE_BLOCS; n += 1) {
    const index = normalises.indexOf(TITRE_ANCRE + n)
    if (index === -1) {
      Logger.log(
        'ANCRE INTROUVABLE : aucune colonne « Nom du participant ' + n + ' » dans ' +
          "le tableur. Le bloc " + n + ' est ignore. Si le formulaire a ete ' +
          'modifie, comparer avec la sortie de inspecterEntetes().',
      )
      continue
    }
    if (index === 0 || index + 1 >= entetes.length) {
      Logger.log(
        'ANCRE EN BORD DE TABLEUR (colonne ' + (index + 1) + ') pour le bloc ' + n +
          ' : impossible de lire le prenom a gauche ou l age a droite. Bloc ignore.',
      )
      continue
    }
    reperes.push({ numero: n, prenom: index - 1, nom: index, age: index + 1 })
  }

  return reperes
}

/* ===========================================================================
 * LECTURE D'UNE LIGNE
 * =========================================================================== */

/**
 * Sépare « Prénom Nom » en deux champs — utilisé UNIQUEMENT en repli, quand
 * la colonne « Nom du participant N » est vide et que le prénom contient
 * visiblement les deux.
 *
 * Accepte la virgule comme l'espace : un parent qui remplit à la main écrit
 * « Jean Dupont » aussi souvent que « Jean, Dupont ». Sans séparateur, tout
 * part dans le prénom et le nom reste vide — l'API l'accepte depuis le
 * 5 septembre 2026 plutôt que de rejeter toute la famille.
 */
function separerNomComplet(brut) {
  const texte = String(brut === null || brut === undefined ? '' : brut).trim()
  if (texte === '') return { prenom: '', nom: '' }

  const parVirgule = texte.split(',')
  if (parVirgule.length > 1) {
    return { prenom: parVirgule[0].trim(), nom: parVirgule.slice(1).join(',').trim() }
  }

  const morceaux = []
  const bruts = texte.split(' ')
  for (let i = 0; i < bruts.length; i += 1) {
    if (bruts[i] !== '') morceaux.push(bruts[i])
  }
  if (morceaux.length <= 1) return { prenom: texte, nom: '' }
  return { prenom: morceaux[0], nom: morceaux.slice(1).join(' ') }
}

/**
 * Extrait un âge exploitable d'une cellule. Renvoie une chaîne de chiffres,
 * ou '' si rien d'utilisable.
 *
 * Les parents écrivent « 8 », « 8 ans », « 9 a », « 11  ». L'ancienne
 * version exigeait un nombre pur et perdait tous les autres en silence : on
 * lit donc les chiffres de tête et on s'arrête au premier caractère qui n'en
 * est pas un.
 *
 * Sans expression régulière, pour la raison expliquée dans normaliserTitre.
 */
function ageDepuisTexte(brut) {
  const texte = String(brut === null || brut === undefined ? '' : brut).trim()
  if (texte === '') return ''

  let chiffres = ''
  for (let i = 0; i < texte.length; i += 1) {
    const c = texte.charAt(i)
    if (c >= '0' && c <= '9') chiffres += c
    else break
  }
  if (chiffres === '') return ''

  const n = Number(chiffres)
  if (!(n >= 1 && n <= 129)) return ''
  return String(n)
}

/**
 * Construit la liste des participants d'UNE ligne du tableur.
 *
 * C'est LE seul analyseur du fichier. `onFormSubmit` comme
 * `rattrapageAutomatique` passent tous les deux par ici — c'est ce qui
 * garantit qu'une ligne rattrapée produit exactement les mêmes données
 * qu'une ligne envoyée sur le moment.
 */
function participantsDeLigne(entetes, valeurs) {
  const participants = []
  const reperes = reperesParticipants(entetes)

  for (let i = 0; i < reperes.length; i += 1) {
    const r = reperes[i]
    const prenomBrut = String(valeurs[r.prenom] === null || valeurs[r.prenom] === undefined ? '' : valeurs[r.prenom]).trim()
    const nomBrut = String(valeurs[r.nom] === null || valeurs[r.nom] === undefined ? '' : valeurs[r.nom]).trim()
    const ageBrut = valeurs[r.age]

    // Bloc vide : NORMAL. La logique conditionnelle du formulaire ne montre
    // les blocs 2 a 5 qu'a ceux qui inscrivent plusieurs enfants.
    if (prenomBrut === '' && nomBrut === '') continue

    let prenom = prenomBrut
    let nom = nomBrut
    if (prenom === '') {
      // Seul le nom est rempli — on le prend comme identite.
      prenom = nomBrut
      nom = ''
    } else if (nom === '') {
      // Nom absent mais prenom contenant peut-etre les deux (« Jean Dupont »).
      const identite = separerNomComplet(prenomBrut)
      prenom = identite.prenom
      nom = identite.nom
    }

    const age = ageDepuisTexte(ageBrut)
    if (age === '') {
      // Un age illisible ecarte CE participant, pas toute la fratrie : l'API
      // valide le tableau entier, un seul age invalide ferait repondre 400 et
      // TOUTE la soumission serait perdue.
      Logger.log(
        'PARTICIPANT ECARTE (bloc ' + r.numero + ') : ' + prenom +
          ' a un age illisible (' + ageBrut + '). Les autres partent quand meme.',
      )
      continue
    }

    participants.push({ prenom: prenom, nom: nom, age: age })
    Logger.log(
      'Participant retenu (bloc ' + r.numero + ') : ' + prenom + ' / ' +
        (nom || '(sans nom)') + ' / age ' + age,
    )
  }

  return participants
}

/* ===========================================================================
 * ENVOI VERS L'API
 * =========================================================================== */

/**
 * Envoie une famille et renvoie le CODE HTTP.
 *
 * ⚠️ Le code est RENVOYÉ, pas seulement journalisé : c'est lui qui permet à
 * l'appelant de marquer la ligne « OK » ou de la laisser à retenter. Sans
 * cette valeur, impossible de distinguer un envoi réussi d'un rejet.
 */
function envoyer(participants) {
  const jeton = PropertiesService.getScriptProperties().getProperty('MISSION_NERF_TOKEN')

  if (!jeton) {
    Logger.log(
      'MISSION_NERF_TOKEN absent des proprietes du script — voir la section ' +
        'INSTALLATION en tete de fichier. Envoi annule.',
    )
    // 0 = « pas meme tente ». Traite comme un echec, donc la ligne reste a
    // retenter une fois le jeton configure.
    return 0
  }

  const reponse = UrlFetchApp.fetch(URL_SITE, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'X-Mission-Nerf-Token': jeton },
    payload: JSON.stringify({ participants: participants }),
    // Ne JAMAIS laisser une erreur HTTP lever une exception silencieuse : le
    // corps de la reponse (400/401/500 inclus) doit atterrir dans le journal.
    muteHttpExceptions: true,
  })

  const code = reponse.getResponseCode()
  Logger.log('Envoi Mission NERF — statut ' + code + ', reponse : ' + reponse.getContentText())
  return code
}

/* ===========================================================================
 * ACCÈS AU TABLEUR
 * =========================================================================== */

/**
 * Ouvre la feuille de réponses liée au formulaire.
 *
 * L'identifiant du tableur est demandé au formulaire lui-même : rien à
 * configurer à la main, rien à corriger si le tableur est un jour recréé.
 */
function feuilleReponses() {
  const idTableur = FormApp.getActiveForm().getDestinationId()
  if (!idTableur) {
    throw new Error(
      "Ce formulaire n'a pas de tableur de reponses lie. Dans le formulaire : " +
        'onglet Reponses > icone tableur > creer ou selectionner une feuille.',
    )
  }
  return SpreadsheetApp.openById(idTableur).getSheets()[0]
}

/**
 * Indice (base 1) de la colonne de suivi, créée au besoin. Renvoie aussi les
 * en-têtes, pour éviter une seconde lecture du tableur.
 */
function preparerSuivi(feuille) {
  const derniereColonne = feuille.getLastColumn()
  const entetes = feuille.getRange(1, 1, 1, derniereColonne).getValues()[0]

  let indice = -1
  for (let i = 0; i < entetes.length; i += 1) {
    if (String(entetes[i]) === COLONNE_SUIVI) {
      indice = i + 1
      break
    }
  }
  if (indice === -1) {
    indice = derniereColonne + 1
    feuille.getRange(1, indice).setValue(COLONNE_SUIVI)
    Logger.log('Colonne de suivi creee en position ' + indice)
  }

  return { indice: indice, entetes: entetes }
}

/**
 * Retrouve une ligne par son horodateur (colonne A), à la seconde près.
 * Renvoie `{ ligne, valeurs }` ou null.
 *
 * L'événement de soumission ne porte pas de numéro de ligne — il porte un
 * horodateur, et c'est exactement ce que Google Forms écrit en colonne A.
 * Recherche limitée aux 50 dernières lignes, du bas vers le haut : celle
 * qu'on cherche vient d'être ajoutée.
 *
 * Comparaison à la SECONDE : le tableur et l'événement portent la même
 * valeur, mais les millisecondes ne survivent pas toujours à l'écriture dans
 * une cellule.
 */
function ligneParHorodateur(feuille, horodateur) {
  if (!(horodateur instanceof Date)) return null

  const derniereLigne = feuille.getLastRow()
  if (derniereLigne < 2) return null

  const debut = Math.max(2, derniereLigne - 49)
  const largeur = feuille.getLastColumn()
  const donnees = feuille.getRange(debut, 1, derniereLigne - debut + 1, largeur).getValues()
  const cible = Math.floor(horodateur.getTime() / 1000)

  for (let i = donnees.length - 1; i >= 0; i -= 1) {
    const valeur = donnees[i][0]
    if (valeur instanceof Date && Math.floor(valeur.getTime() / 1000) === cible) {
      return { ligne: debut + i, valeurs: donnees[i] }
    }
  }

  return null
}

/* ===========================================================================
 * TRAITEMENT
 * =========================================================================== */

/**
 * Traite UNE ligne : analyse, envoi, marquage. Renvoie 'envoyee', 'vide' ou
 * 'echec'.
 *
 * Le marquage est ce qui empêche les doublons : le rattrapage ne touche que
 * les lignes dont la cellule de suivi est vide. Un envoi en échec reste donc
 * volontairement SANS marque quand il vient du direct (voir onFormSubmit) —
 * c'est ce qui permet au rattrapage de le reprendre.
 */
function traiterUneLigne(feuille, suivi, ligne, valeurs, marqueSiEchec) {
  const participants = participantsDeLigne(suivi.entetes, valeurs)

  if (participants.length === 0) {
    feuille.getRange(ligne, suivi.indice).setValue('VIDE — aucun participant lisible')
    Logger.log('Ligne ' + ligne + ' : aucun participant lisible, rien envoye.')
    return 'vide'
  }

  const code = envoyer(participants)

  if (code >= 200 && code < 300) {
    feuille.getRange(ligne, suivi.indice).setValue('OK ' + new Date().toISOString())
    return 'envoyee'
  }

  if (marqueSiEchec) {
    // Marque d'echec EXPLICITE : la ligne reste identifiable par un humain,
    // mais ne sera pas retentee en boucle a chaque passage si la cause est
    // permanente. Vider la cellule suffit a forcer un reessai.
    feuille.getRange(ligne, suivi.indice).setValue('ERREUR ' + code)
  }
  return 'echec'
}

/**
 * Moteur du rattrapage — un seul mode, volontairement.
 *
 * ⚠️ Un mode « forcer » (renvoyer une plage sans regarder les marques) a
 * existé ici et a été RETIRÉ : il ne survivait pas à la coupure des
 * 6 minutes d'Apps Script. Une plage de 229 lignes demande une dizaine de
 * minutes ; l'exécution s'arrêtait à mi-chemin, et la relancer renvoyait EN
 * DOUBLE tout ce qui était déjà parti.
 *
 * Le remplacement est `preparerRattrapage`, qui efface les marques d'une
 * plage. Ce moteur la draine ensuite passage après passage, en sautant ce
 * qui porte déjà une marque — reprenable par construction.
 */
function traiterLignes(ligneDebut, ligneFin) {
  // ⚠️ VERROU EXCLUSIF — ajouté le 5 septembre 2026 après 83 lignes envoyées
  // en double. Deux exécutions avaient tourné en parallèle (un passage lancé
  // à la main pendant que le déclencheur horaire tournait) : chacune a lu le
  // tableur AVANT que l'autre n'ait écrit ses marques, donc chacune a vu les
  // mêmes lignes comme non traitées.
  //
  // La colonne de suivi ne protège que d'un RE-passage, jamais d'un passage
  // SIMULTANÉ : entre la lecture d'une marque et son écriture, il s'écoule le
  // temps d'un appel réseau. C'est une fenêtre de plusieurs secondes, par
  // ligne. Seul un verrou ferme cette fenêtre.
  //
  // tryLock(2000) et non waitLock : si un rattrapage tourne déjà, il n'y a
  // rien à gagner à attendre son tour — il traite justement les lignes que
  // celui-ci allait traiter. On sort, et le passage suivant reprendra ce qui
  // reste.
  const verrou = LockService.getScriptLock()
  if (!verrou.tryLock(2000)) {
    Logger.log(
      'Un autre rattrapage est deja en cours — sortie immediate pour ne pas ' +
        'envoyer les memes lignes deux fois. Le reste partira au prochain passage.',
    )
    return
  }

  try {
    traiterLignesVerrouille(ligneDebut, ligneFin)
  } finally {
    verrou.releaseLock()
  }
}

/** Corps du rattrapage — appelé UNIQUEMENT sous verrou (voir traiterLignes). */
function traiterLignesVerrouille(ligneDebut, ligneFin) {
  const debutMs = Date.now()
  const feuille = feuilleReponses()
  const suivi = preparerSuivi(feuille)
  const derniereLigne = feuille.getLastRow()

  const fin = Math.min(ligneFin || derniereLigne, derniereLigne)
  const debut = Math.max(ligneDebut || 2, 2)
  if (fin < debut) {
    Logger.log('Aucune ligne a traiter.')
    return
  }

  const largeur = feuille.getLastColumn()
  const donnees = feuille.getRange(debut, 1, fin - debut + 1, largeur).getValues()

  let envoyees = 0
  let ignorees = 0
  let echecs = 0

  for (let i = 0; i < donnees.length; i += 1) {
    if (Date.now() - debutMs > DUREE_MAX_MS) {
      Logger.log(
        'Limite de temps atteinte — arret volontaire a la ligne ' + (debut + i) +
          '. Le reste partira au prochain passage.',
      )
      break
    }

    const ligne = debut + i

    // Trop recente pour etre jugee : l'envoi direct est peut-etre encore en
    // cours. Ignoree ce passage-ci, reprise au suivant.
    const horodateur = donnees[i][0]
    if (horodateur instanceof Date && Date.now() - horodateur.getTime() < DELAI_GRACE_MS) {
      ignorees += 1
      continue
    }

    const marque = donnees[i][suivi.indice - 1]
    if (marque !== '' && marque !== null && marque !== undefined) {
      ignorees += 1
      continue
    }

    const issue = traiterUneLigne(feuille, suivi, ligne, donnees[i], true)
    if (issue === 'envoyee') envoyees += 1
    else if (issue === 'vide') ignorees += 1
    else echecs += 1

    Utilities.sleep(PAUSE_ENTRE_ENVOIS_MS)
  }

  Logger.log(
    'Rattrapage termine — ' + envoyees + ' envoyee(s), ' + ignorees +
      ' ignoree(s), ' + echecs + ' en echec.',
  )
}

/** Point d'entrée du déclencheur horaire. */
function rattrapageAutomatique() {
  traiterLignes(2, null)
}

/* ===========================================================================
 * ENVOI IMMÉDIAT
 * =========================================================================== */

/**
 * Déclenchée par le déclencheur INSTALLABLE à chaque soumission.
 *
 * Ne lit PLUS l'événement lui-même : elle retrouve sa ligne dans le tableur
 * et la fait passer par `traiterUneLigne`, exactement comme le rattrapage.
 * C'est la leçon du 5 septembre — deux analyseurs qui doivent s'accorder
 * finissent toujours par diverger, et le désaccord ne se voit pas.
 *
 * Trois essais espacés : Google Forms écrit la ligne du tableur et déclenche
 * le script en parallèle, sans garantir l'ordre. Si la ligne reste
 * introuvable, on ne force rien — le rattrapage la prendra dans 5 minutes.
 * Tout le corps est dans un try/catch : une exception ici doit atterrir dans
 * les journaux, jamais disparaître comme le 31 août.
 */
function onFormSubmit(e) {
  try {
    Logger.log('=== Mission NERF — nouvelle soumission ===')

    if (!e || !e.response || typeof e.response.getTimestamp !== 'function') {
      Logger.log(
        "Evenement sans e.response : impossible de retrouver la ligne. Le " +
          'rattrapage la prendra dans 5 minutes. Verifier que le declencheur ' +
          "onFormSubmit a bien « A partir du formulaire » comme source.",
      )
      return
    }

    // Meme verrou que le rattrapage : sans lui, une soumission qui arrive
    // pendant un passage de rattrapage peut etre envoyee par les deux.
    // tryLock(20000) et non 2000 : ici on PREFERE attendre, l'envoi direct est
    // la seule voie rapide. Si le verrou ne vient pas, on ne force rien — la
    // ligne reste sans marque et le rattrapage la prendra.
    const verrou = LockService.getScriptLock()
    if (!verrou.tryLock(20000)) {
      Logger.log(
        'Rattrapage en cours — envoi direct abandonne pour ne pas doubler. ' +
          'La ligne reste sans marque, elle partira au prochain passage.',
      )
      return
    }

    try {
      envoyerLigneDeSoumission(e.response.getTimestamp())
    } finally {
      verrou.releaseLock()
    }
  } catch (err) {
    Logger.log('ERREUR NON ATTRAPEE dans onFormSubmit : ' + err + ' | ' + (err && err.stack))
  }
}

/** Corps de l'envoi direct — appelé UNIQUEMENT sous verrou (voir onFormSubmit). */
function envoyerLigneDeSoumission(horodateur) {
  {
    const feuille = feuilleReponses()
    const suivi = preparerSuivi(feuille)

    for (let essai = 1; essai <= 3; essai += 1) {
      const trouve = ligneParHorodateur(feuille, horodateur)
      if (trouve) {
        Logger.log('Ligne ' + trouve.ligne + ' retrouvee (essai ' + essai + ').')
        // marqueSiEchec = false : un echec doit rester SANS marque pour que
        // le rattrapage le reprenne tout seul.
        traiterUneLigne(feuille, suivi, trouve.ligne, trouve.valeurs, false)
        return
      }
      Utilities.sleep(2000)
    }

    Logger.log(
      'Ligne introuvable dans le tableur apres 3 essais — rien envoye ici. ' +
        'Le rattrapage automatique la prendra au prochain passage.',
    )
  }
}

/* ===========================================================================
 * OUTILS D'EXPLOITATION
 * =========================================================================== */

/**
 * ⚠️ À EXÉCUTER UNE SEULE FOIS, avant d'activer le déclencheur horaire.
 *
 * Marque toutes les lignes existantes comme déjà traitées SANS RIEN ENVOYER,
 * pour que le rattrapage ne renvoie pas en double ce qui est déjà en base.
 */
function initialiserSuivi() {
  const feuille = feuilleReponses()
  const suivi = preparerSuivi(feuille)
  const derniereLigne = feuille.getLastRow()
  if (derniereLigne < 2) {
    Logger.log('Tableur vide — rien a initialiser.')
    return
  }

  const nombre = derniereLigne - 1
  const marques = []
  for (let i = 0; i < nombre; i += 1) marques.push(['INITIALISE — non envoye'])
  feuille.getRange(2, suivi.indice, nombre, 1).setValues(marques)

  Logger.log(
    nombre + ' ligne(s) marquee(s) comme deja traitees. Utiliser ' +
      'preparerRattrapage(debut, fin) pour remettre en file celles qui ' +
      'manquent vraiment en base.',
  )
}

/**
 * Met une plage de lignes EN FILE pour le rattrapage, en effaçant leur
 * marque. N'envoie rien, ne prend qu'une seconde.
 *
 * C'est le déclencheur horaire qui enverra ensuite, par paquets d'environ
 * 100 lignes toutes les 5 minutes, en marquant chacune au passage. Une
 * exécution coupée par la limite des 6 minutes reprend exactement où elle
 * s'est arrêtée.
 *
 * ⚠️ À n'utiliser que sur une plage dont on a VÉRIFIÉ qu'elle manque en base
 * — voir `listerLignes`. Effacer la marque d'une ligne déjà enregistrée la
 * fait repartir en double.
 */
function preparerRattrapage(ligneDebut, ligneFin) {
  const feuille = feuilleReponses()
  const suivi = preparerSuivi(feuille)
  const derniereLigne = feuille.getLastRow()

  const debut = Math.max(2, ligneDebut)
  const fin = Math.min(ligneFin, derniereLigne)
  if (fin < debut) {
    Logger.log('Plage vide — rien a preparer.')
    return
  }

  const vides = []
  for (let ligne = debut; ligne <= fin; ligne += 1) vides.push([''])
  feuille.getRange(debut, suivi.indice, vides.length, 1).setValues(vides)

  Logger.log(
    vides.length + ' ligne(s) mises en file (lignes ' + debut + ' a ' + fin + '). ' +
      'Le declencheur horaire les enverra par paquets. Aucun envoi immediat.',
  )
}

/**
 * Diagnostic — n'écrit rien, n'envoie rien. Pour chaque ligne d'une plage :
 * heure, marque de suivi, et participants que le script en tirerait.
 *
 * C'est la fonction à lancer AVANT `preparerRattrapage` quand une plage est
 * partiellement en base : comparer ces noms à ceux de la base dit exactement
 * quelles lignes remettre en file. Se fier aux horodateurs seuls ne suffit
 * pas — l'écart entre l'heure du formulaire et l'heure d'insertion varie de
 * quelques secondes.
 */
function listerLignes(ligneDebut, ligneFin) {
  const feuille = feuilleReponses()
  const suivi = preparerSuivi(feuille)
  const derniereLigne = feuille.getLastRow()

  const debut = Math.max(2, ligneDebut)
  const fin = Math.min(ligneFin, derniereLigne)
  if (fin < debut) {
    Logger.log('Plage vide.')
    return
  }

  const largeur = feuille.getLastColumn()
  const donnees = feuille.getRange(debut, 1, fin - debut + 1, largeur).getValues()
  const fuseau = Session.getScriptTimeZone()

  for (let i = 0; i < donnees.length; i += 1) {
    const brut = donnees[i][0]
    const heure =
      brut instanceof Date ? Utilities.formatDate(brut, fuseau, 'HH:mm:ss') : String(brut)
    const participants = participantsDeLigne(suivi.entetes, donnees[i])
    const noms = []
    for (let p = 0; p < participants.length; p += 1) {
      noms.push(participants[p].prenom + ' ' + (participants[p].nom || '-') +
        ' (' + participants[p].age + ')')
    }
    Logger.log(
      'ligne ' + (debut + i) + ' | ' + heure + ' | ' +
        (noms.length ? noms.join(' + ') : 'AUCUN PARTICIPANT LISIBLE'),
    )
  }
}

/**
 * Diagnostic — n'écrit rien, n'envoie rien. Réponses par journée, avec la
 * première et la dernière ligne de chacune.
 *
 * Ce nombre se compare directement au nombre de DÉCHARGES en base pour la
 * même date (une ligne de tableur = une décharge = une famille), ce qui dit
 * sans ambiguïté quelle journée est complète et laquelle ne l'est pas.
 * Détaille ensuite les 25 dernières lignes avec leur heure.
 */
function resumerTableur() {
  const feuille = feuilleReponses()
  const derniereLigne = feuille.getLastRow()
  if (derniereLigne < 2) {
    Logger.log('Tableur vide.')
    return
  }

  // Colonne A — l'horodateur, pose par Google Forms sur toute feuille de
  // reponses. Lu par POSITION et non par titre : c'est la seule colonne dont
  // la place est garantie, quelle que soit la langue du compte.
  const horodateurs = feuille.getRange(2, 1, derniereLigne - 1, 1).getValues()
  const fuseau = Session.getScriptTimeZone()

  const jours = {}
  const ordre = []

  for (let i = 0; i < horodateurs.length; i += 1) {
    const ligne = i + 2
    const brut = horodateurs[i][0]
    const jour =
      brut instanceof Date ? Utilities.formatDate(brut, fuseau, 'yyyy-MM-dd') : '(sans date)'

    if (!jours[jour]) {
      jours[jour] = { premiere: ligne, derniere: ligne, nombre: 0 }
      ordre.push(jour)
    }
    jours[jour].derniere = ligne
    jours[jour].nombre += 1
  }

  Logger.log('=== Reponses par journee (fuseau du script : ' + fuseau + ') ===')
  for (let i = 0; i < ordre.length; i += 1) {
    const j = jours[ordre[i]]
    Logger.log(
      ordre[i] + ' : lignes ' + j.premiere + ' a ' + j.derniere +
        '  (' + j.nombre + ' reponse(s))',
    )
  }

  const debutDetail = Math.max(2, derniereLigne - 24)
  Logger.log('=== Detail des dernieres lignes (' + debutDetail + ' a ' + derniereLigne + ') ===')
  for (let ligne = debutDetail; ligne <= derniereLigne; ligne += 1) {
    const brut = horodateurs[ligne - 2][0]
    const affiche =
      brut instanceof Date
        ? Utilities.formatDate(brut, fuseau, 'yyyy-MM-dd HH:mm:ss')
        : String(brut)
    Logger.log('ligne ' + ligne + ' : ' + affiche)
  }
}

/**
 * Diagnostic — n'écrit rien, n'envoie rien. Ligne d'en-tête complète, puis
 * les cellules non vides des 3 dernières lignes.
 *
 * C'est cette fonction qui a révélé, le 5 septembre 2026, l'espace double
 * dans « Participant  #1 - Prénom, Nom » et les « PRÉNOM, NOM » en
 * majuscules des blocs 3 à 5. À relancer au moindre doute sur la structure
 * du formulaire : elle montre ce qui EST écrit, pas ce qu'on suppose.
 */
function inspecterEntetes() {
  const feuille = feuilleReponses()
  const largeur = feuille.getLastColumn()
  const derniereLigne = feuille.getLastRow()

  const entetes = feuille.getRange(1, 1, 1, largeur).getValues()[0]
  Logger.log('=== EN-TETES (' + largeur + ' colonnes) ===')
  for (let i = 0; i < entetes.length; i += 1) {
    Logger.log('col ' + (i + 1) + ' : [' + entetes[i] + ']')
  }

  Logger.log('=== REPERES TROUVES ===')
  const reperes = reperesParticipants(entetes)
  for (let i = 0; i < reperes.length; i += 1) {
    const r = reperes[i]
    Logger.log(
      'bloc ' + r.numero + ' : prenom col ' + (r.prenom + 1) +
        ', nom col ' + (r.nom + 1) + ', age col ' + (r.age + 1),
    )
  }

  const debut = Math.max(2, derniereLigne - 2)
  Logger.log('=== CELLULES NON VIDES, lignes ' + debut + ' a ' + derniereLigne + ' ===')
  const donnees = feuille.getRange(debut, 1, derniereLigne - debut + 1, largeur).getValues()
  for (let i = 0; i < donnees.length; i += 1) {
    Logger.log('--- ligne ' + (debut + i) + ' ---')
    for (let c = 0; c < largeur; c += 1) {
      const v = donnees[i][c]
      if (v !== '' && v !== null && v !== undefined) Logger.log('  col ' + (c + 1) + ' = ' + v)
    }
  }
}

/* ===========================================================================
 * TESTS MANUELS
 * =========================================================================== */

/**
 * Teste UNIQUEMENT jeton + URL + route. Crée une vraie ligne en base, à
 * supprimer après vérification (prénom 'TEST_APPS_SCRIPT').
 */
function testerEnvoi() {
  envoyer([{ prenom: 'TEST_APPS_SCRIPT', nom: 'TEST', age: '10' }])
}

/**
 * Teste UNIQUEMENT la lecture, SANS appel réseau et SANS écriture.
 *
 * Relit les 3 dernières lignes réelles du tableur et affiche ce que le
 * script en tirerait. C'est le test à lancer après toute modification du
 * formulaire : si une fratrie de 3 s'affiche comme 3 participants, la
 * lecture est bonne.
 */
function testerAnalyse() {
  const feuille = feuilleReponses()
  const derniereLigne = feuille.getLastRow()
  if (derniereLigne < 2) {
    Logger.log('Tableur vide.')
    return
  }
  listerLignes(Math.max(2, derniereLigne - 2), derniereLigne)
}

/* ===========================================================================
 * RACCOURCI DATÉ — 5 septembre 2026, à supprimer après usage
 * ===========================================================================
 *
 * ⚠️ Pourquoi ce raccourci existe alors qu'il ne fait qu'appeler
 * `preparerRattrapage` : le bouton ▶ Exécuter de l'éditeur Apps Script lance
 * la fonction choisie SANS AUCUN ARGUMENT. Impossible d'y taper des bornes.
 *
 * Remet en file TOUTE la journée du 5 septembre — de la ligne 130 (première
 * réponse du jour, relevée par `resumerTableur`) jusqu'à la dernière ligne
 * du tableur, quelle qu'elle soit au moment de l'exécution.
 *
 * ⚠️ ORDRE OBLIGATOIRE, sous peine de doublons :
 *
 *   1. Coller la nouvelle version du script et l'enregistrer. Sans ça, le
 *      rattrapage relirait le tableur avec l'analyseur cassé.
 *   2. Exécuter CETTE fonction. Elle efface les marques, n'envoie rien : le
 *      premier envoi n'aura lieu qu'au prochain passage du déclencheur.
 *   3. Supprimer les lignes du 5 septembre en base, dans la foulée. Toute
 *      inscription arrivée entre (2) et (3) est ainsi supprimée puis
 *      renvoyée proprement — c'est pour ça que (3) vient APRÈS (2).
 *   4. Ne plus rien toucher. Le déclencheur draine par paquets d'une
 *      centaine toutes les 5 minutes.
 *
 * Les inscriptions arrivant APRÈS (3) sont enregistrées et marquées par
 * `onFormSubmit` : le rattrapage les ignore, aucun doublon possible.
 */
function remettreEnFileToutLe5Septembre() {
  preparerRattrapage(130, feuilleReponses().getLastRow())
}
