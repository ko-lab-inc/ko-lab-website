/**
 * Mission NERF — envoi des décharges vers le site KO-LAB.
 *
 * Ce fichier n'est PAS exécuté par ce dépôt (aucun build, aucun `npm run`
 * ne le touche) — c'est du code Google Apps Script, à coller à la main
 * dans l'éditeur Apps Script du Google Form. Conservé ici comme unique
 * source de vérité du script, pour ne pas dépendre de ce qui vit
 * uniquement dans l'éditeur en ligne de Google.
 *
 * Formulaire concerné :
 * https://docs.google.com/forms/d/e/1FAIpQLSe8w68uNWha870jIbbiSqnKf8OmueHPBks2GT-oQpvioAuk-w/viewform
 *
 * -----------------------------------------------------------------------------
 * ⚠️ HISTORIQUE — deux échecs successifs, cause réelle trouvée le 1er
 * septembre 2026 par lecture du journal d'une VRAIE exécution
 * -----------------------------------------------------------------------------
 * Premier échec (31 août) : `onFormSubmit` plantait en moins d'une seconde,
 * sans ligne créée. Corrigé en ajoutant un try/catch et une journalisation
 * complète AVANT tout traitement (voir plus bas) — pas une correction du
 * fond, un moyen de VOIR le fond au prochain essai.
 *
 * Ce prochain essai a donné la vraie cause, noir sur blanc dans les
 * journaux :
 *
 *     Clés de premier niveau de e : ["toString","authMode","response",
 *                                    "source","triggerUid"]
 *     e.namedValues présent : NON
 *
 * ⚠️ DEUX FORMES D'ÉVÉNEMENT « sur envoi du formulaire », selon l'endroit où
 * le déclencheur installable est créé — ce n'est PAS un détail cosmétique,
 * ce sont deux formes de données différentes :
 *   - Déclencheur posé DEPUIS LE FORMULAIRE (« Source de l'événement : à
 *     partir du formulaire ») → l'événement porte `e.response`, un objet
 *     FormResponse — PAS de `e.namedValues` du tout.
 *   - Déclencheur posé DEPUIS LE TABLEUR de réponses lié → l'événement porte
 *     `e.namedValues`, une map titre → réponse(s) — celle que ce script
 *     attendait jusqu'ici.
 *
 * Le déclencheur de ce projet a toujours été posé depuis le formulaire (la
 * bonne façon, seule capable d'appeler UrlFetchApp — voir INSTALLER LE
 * DÉCLENCHEUR) : le script attendait la mauvaise forme depuis le début, pas
 * un titre mal orthographié ni un déclencheur mal configuré.
 *
 * Ce fichier gère maintenant LES DEUX formes (voir
 * `construireNamedValuesDepuisReponse` plus bas) : `e.response` en priorité,
 * repli sur `e.namedValues` si un jour
 * quelqu'un recrée le déclencheur depuis le tableur, erreur journalisée
 * seulement si aucune des deux n'existe.
 *
 * Le try/catch et la journalisation complète AVANT tout traitement restent
 * en place — c'est ce qui a permis de VOIR cette cause plutôt que de la
 * deviner. Idem pour la distinction « titre de question introuvable » (une
 * vraie erreur) contre « bloc vide » (normal — logique conditionnelle du
 * formulaire : un parent qui inscrit 2 enfants ne voit jamais les questions
 * des participants 3 à 5).
 *
 * -----------------------------------------------------------------------------
 * OÙ COLLER CE FICHIER
 * -----------------------------------------------------------------------------
 * Ouvrir le Google Form ci-dessus (en édition) > menu ⋮ (trois points) >
 * Éditeur de scripts (ou Extensions > Apps Script selon la version).
 * Remplacer le contenu de Code.gs par ce fichier.
 *
 * -----------------------------------------------------------------------------
 * CONFIGURATION AVANT LE PREMIER ENVOI
 * -----------------------------------------------------------------------------
 * 1. Dans l'éditeur Apps Script : icône ⚙ Paramètres du projet > Propriétés
 *    du script > Ajouter une propriété script :
 *
 *        Propriété : MISSION_NERF_TOKEN
 *        Valeur    : EXACTEMENT la même valeur que MISSION_NERF_WEBHOOK_TOKEN
 *                    configurée sur Vercel (.env.example en documente la
 *                    génération — openssl rand -hex 32 ou équivalent).
 *
 *    Ne JAMAIS écrire ce jeton en dur dans ce fichier : PropertiesService
 *    existe précisément pour l'en garder à l'écart du code source.
 *
 * 2. Vérifier URL_SITE ci-dessous si le domaine change un jour (voir
 *    docs/bascule-domaine.md).
 *
 * -----------------------------------------------------------------------------
 * INSTALLER LE DÉCLENCHEUR — ÉTAPE MANUELLE OBLIGATOIRE
 * -----------------------------------------------------------------------------
 * Une fonction simplement NOMMÉE `onFormSubmit` ne suffit PAS : Apps Script
 * la relierait automatiquement comme DÉCLENCHEUR SIMPLE, qui tourne sans
 * autorisation complète et ne PEUT PAS appeler UrlFetchApp (requêtes HTTP
 * sortantes) — l'envoi échouerait en silence. Il faut un DÉCLENCHEUR
 * INSTALLABLE, posé une fois à la main :
 *
 *   Éditeur Apps Script > icône ⏰ Déclencheurs (menu de gauche) >
 *   + Ajouter un déclencheur >
 *       Fonction à exécuter    : onFormSubmit
 *       Déploiement            : Head
 *       Source de l'événement  : À partir du formulaire
 *       Type d'événement       : Sur envoi du formulaire
 *   > Enregistrer.
 *
 *   « À partir du formulaire » est CONFIRMÉ CORRECT pour ce projet (journal
 *   du 1er septembre) — c'est la seule source qui autorise UrlFetchApp. Elle
 *   envoie `e.response`, pas `e.namedValues` : voir HISTORIQUE en tête de
 *   fichier, ce n'était pas une erreur de configuration, ce script attendait
 *   simplement la mauvaise forme de données. Un déclencheur posé « à partir
 *   du tableur » fonctionnerait aussi désormais (repli automatique sur
 *   `e.namedValues`), mais rien ne justifie de changer une configuration qui
 *   marche.
 *
 *   Un écran d'autorisation Google apparaît la première fois (« Google n'a
 *   pas vérifié cette application ») — normal pour un script qui nous
 *   appartient : Avancé > Accéder à [nom du projet] (dangereux) > Autoriser.
 *
 * -----------------------------------------------------------------------------
 * TESTER SANS ATTENDRE UNE VRAIE SOUMISSION
 * -----------------------------------------------------------------------------
 * Deux fonctions de test, DEPUIS L'ÉDITEUR APPS SCRIPT (menu déroulant de
 * fonctions en haut, puis ▶ Exécuter) :
 *
 *   - `testerEnvoi()`      — teste UNIQUEMENT jeton + URL + route (déjà
 *                            confirmé bon). Crée une vraie ligne de test.
 *   - `testerAnalyse()`    — teste UNIQUEMENT la logique de lecture (chemin
 *                            de repli e.namedValues, le plus simple à
 *                            simuler sans vraie soumission), SANS appel
 *                            réseau : simule un événement avec un titre
 *                            volontairement faux, pour vérifier que le
 *                            signalement « TITRE INTROUVABLE » fonctionne
 *                            avant de compter dessus un soir d'événement.
 *
 * Après le premier vrai `onFormSubmit` réel qui suit ce correctif : ouvrir
 * Apps Script > Exécutions (icône horloge à gauche, PAS « Déclencheurs ») et
 * lire les journaux de CETTE exécution — c'est là que Logger.log() écrit,
 * pas nécessairement dans Google Cloud Logging.
 */

const URL_SITE = 'https://ko-lab-center.ca/api/mission-nerf/decharges'

/**
 * Titres EXACTS des questions du formulaire (revérifiés en direct sur le
 * formulaire cité plus haut, le 1er septembre 2026, deux extractions
 * indépendantes) — Apps Script indexe `e.namedValues` par le TITRE de la
 * question, jamais par sa position. Si un titre est un jour reformulé dans
 * le formulaire, cette liste doit être corrigée EN MÊME TEMPS — et si elle
 * ne l'est pas, la journalisation ajoutée plus bas le signale maintenant
 * bruyamment au lieu de filtrer le participant en silence.
 *
 * ⚠️ Le formulaire affiche « jusqu'à 4 enfants » dans son texte de
 * présentation, mais propose bien 5 blocs de questions réels (participants
 * 1 à 5, vérifié) — incohérence de contenu à signaler à Christian, sans
 * lien avec ce script : les 5 blocs sont réels, la liste ci-dessous reste à
 * 5 volontairement.
/**
 * Titres EXACTS des questions du formulaire — RÉÉCRITS le 5 septembre 2026,
 * en pleine journée d'événement, après lecture des journaux d'une vraie
 * exécution.
 *
 * ⚠️ LE FORMULAIRE A ÉTÉ REFAIT — l'ancienne liste ne correspondait plus à
 * RIEN. Le script trouvait 0 participant et sortait sans jamais appeler
 * l'API : exécutions « Terminée », aucune erreur, aucune donnée. 320 lignes
 * dans le tableur, zéro en base.
 *
 * Titres réellement reçus (ligne « Clés réelles » du journal) :
 *
 *   "Participant #1 - Prénom, Nom"   "Participant #1 - ÂGE "
 *   "Prénom, Nom"                    "ÂGE "
 *
 * Trois différences de fond avec l'ancien formulaire :
 *   1. Prénom et nom sont FUSIONNÉS dans un seul champ.
 *   2. Seul le participant 1 est numéroté. Les suivants réutilisent les
 *      MÊMES titres, sans numéro — ils arrivent donc empilés dans un
 *      tableau sous une seule clé (voir la boucle dans onFormSubmit).
 *   3. « ÂGE » porte un ESPACE FINAL. Invisible à l'œil, fatal à la
 *      comparaison : ne jamais retirer cet espace en « nettoyant » ce
 *      fichier sans revérifier le journal.
 */
const TITRE_P1_NOM = 'Participant #1 - Prénom, Nom'
const TITRE_P1_AGE = 'Participant #1 - ÂGE '
const TITRE_SUITE_NOM = 'Prénom, Nom'
const TITRE_SUITE_AGE = 'ÂGE '

/**
 * Sépare « Prénom, Nom » en deux champs — le formulaire ne les distingue
 * plus, la base et l'API si.
 *
 * Accepte la virgule (format annoncé par le titre) comme l'espace simple,
 * parce qu'un parent qui remplit à la main écrit « Jean Dupont » aussi
 * souvent que « Jean, Dupont ». Sans séparateur, tout part dans le prénom
 * et le nom reste vide — l'API l'accepte depuis le 5 septembre 2026, plutôt
 * que de rejeter TOUTE la famille pour un nom manquant.
 */
function separerNomComplet(brut) {
  const texte = (brut || '').trim()
  if (texte === '') return { prenom: '', nom: '' }

  const parVirgule = texte.split(',')
  if (parVirgule.length > 1) {
    return { prenom: parVirgule[0].trim(), nom: parVirgule.slice(1).join(',').trim() }
  }

  const morceaux = texte.split(/\s+/)
  if (morceaux.length === 1) return { prenom: morceaux[0], nom: '' }
  return { prenom: morceaux[0], nom: morceaux.slice(1).join(' ') }
}

/**
 * Lit UN champ de e.namedValues, en distinguant deux cas très différents :
 *
 *   - manquant: true  → le TITRE n'existe pas du tout comme clé. Une vraie
 *     erreur : accent/majuscule/espace différent, ou question renommée.
 *   - manquant: false, valeur: ''  → le titre existe, mais cette réponse
 *     est vide. NORMAL pour un bloc participant que la logique
 *     conditionnelle du formulaire n'a pas présenté à ce répondant.
 *
 * La version précédente de ce fichier traitait les deux cas identiquement
 * (chaîne vide), ce qui filtrait un vrai bug de titre exactement comme un
 * bloc vide légitime — invisible dans les journaux.
 */
function champ(namedValues, titre) {
  if (!Object.prototype.hasOwnProperty.call(namedValues, titre)) {
    return { manquant: true, valeur: '' }
  }
  const valeurs = namedValues[titre]
  return { manquant: false, valeur: valeurs && valeurs[0] ? valeurs[0].trim() : '' }
}

/** JSON.stringify qui ne plante jamais — utilisé uniquement pour journaliser
 *  un objet dont la forme n'est pas garantie (l'événement brut). */
function versJsonSur(valeur) {
  try {
    return JSON.stringify(valeur)
  } catch (err) {
    return '(impossible à sérialiser : ' + err + ')'
  }
}

/**
 * Reconstruit l'équivalent de `e.namedValues` (map titre → tableau de
 * réponses) à partir de `e.response`, la forme réellement envoyée par un
 * déclencheur posé « à partir du formulaire » — voir HISTORIQUE en tête de
 * fichier pour pourquoi les deux formes existent.
 *
 * `getResponse()` renvoie une chaîne pour une question à réponse unique
 * (nos 15 titres) et un tableau pour une question à cases à cocher —
 * toujours normalisé en tableau ici pour que `champ()` (identique pour les
 * deux chemins) n'ait pas à connaître la différence.
 *
 * Un titre RÉPÉTÉ (« Autorisez-vous cet enfant à participer? », dupliqué sur
 * les 5 blocs) empile ses réponses sous la même clé, dans l'ordre du
 * formulaire — même comportement que `e.namedValues` sur un déclencheur
 * tableur. Sans conséquence ici : CHAMPS_PARTICIPANT n'utilise jamais ces
 * titres dupliqués (voir sa docstring).
 */
function construireNamedValuesDepuisReponse(reponse) {
  const namedValues = {}

  reponse.getItemResponses().forEach(function (itemReponse) {
    const titre = itemReponse.getItem().getTitle()
    const brut = itemReponse.getResponse()
    const valeurs = Array.isArray(brut) ? brut : [brut]

    namedValues[titre] = namedValues[titre] ? namedValues[titre].concat(valeurs) : valeurs
  })

  return namedValues
}

/**
 * Age exploitable ? Test NUMERIQUE, volontairement SANS expression
 * reguliere.
 *
 * La version precedente utilisait une regex dont l'antislash a ete perdu
 * lors d'une reecriture (5 septembre 2026) : le motif cherchait alors la
 * lettre d au lieu d'un chiffre, et TOUS les participants etaient ecartes.
 * Un test arithmetique ne peut pas se casser de cette facon.
 */
function ageExploitable(texte) {
  if (texte === '') return false
  const n = Number(texte)
  return isFinite(n) && Math.floor(n) === n && n >= 1 && n <= 129
}

/**
 * Construit la liste des participants a envoyer, a partir d'une map
 * titre -> reponses.
 *
 * Au niveau superieur (et non plus imbriquee dans onFormSubmit) pour etre
 * partagee avec le rattrapage : les deux chemins doivent lire le formulaire
 * EXACTEMENT de la meme facon, sinon un rattrapage produirait des donnees
 * differentes d'un enregistrement en direct.
 */
function construireParticipants(namedValues) {
  const participants = []

  function ajouter(nomComplet, age, provenance) {
    const identite = separerNomComplet(nomComplet)
    if (identite.prenom === '') return

    // Un age inexploitable ecarte CE participant, pas toute la fratrie :
    // l'API valide le tableau entier, un seul age invalide la ferait
    // repondre 400 et TOUTE la soumission serait perdue.
    const ageTexte = (age || '').trim()
    if (!ageExploitable(ageTexte)) {
      Logger.log(
        'PARTICIPANT ECARTE (' + provenance + ') : ' + identite.prenom +
          ' a un age inexploitable (' + ageTexte + '). Les autres sont envoyes.',
      )
      return
    }

    participants.push({ prenom: identite.prenom, nom: identite.nom, age: ageTexte })
    Logger.log(
      'Participant retenu (' + provenance + ') : ' + identite.prenom +
        ' / ' + (identite.nom || '(sans nom)') + ' / age ' + ageTexte,
    )
  }

  const p1Nom = champ(namedValues, TITRE_P1_NOM)
  const p1Age = champ(namedValues, TITRE_P1_AGE)
  if (p1Nom.manquant) {
    Logger.log(
      'TITRE INTROUVABLE : ' + TITRE_P1_NOM + ' absent. Le formulaire a ' +
        'probablement ete modifie : comparer avec la ligne Cles reelles et ' +
        'corriger les constantes TITRE_* en tete de fichier.',
    )
  } else {
    ajouter(p1Nom.valeur, p1Age.valeur, 'participant #1')
  }

  // Participants 2 et suivants : MEMES titres repetes, donc reponses
  // empilees sous une seule cle. Tableaux paralleles, indice par indice.
  const nomsSuite = namedValues[TITRE_SUITE_NOM] || []
  const agesSuite = namedValues[TITRE_SUITE_AGE] || []
  for (let i = 0; i < nomsSuite.length; i += 1) {
    ajouter(nomsSuite[i], agesSuite[i], 'bloc suivant #' + (i + 2))
  }

  return participants
}
/**
 * Déclenchée automatiquement par le déclencheur INSTALLABLE (voir plus
 * haut) à chaque soumission du formulaire.
 *
 * Tout le corps est dans un try/catch : une exception ici doit atterrir
 * dans les journaux de l'exécution, jamais disparaître en silence comme le
 * 31 août.
 */
function onFormSubmit(e) {
  try {
    Logger.log('=== Mission NERF — nouvelle soumission ===')

    // Contenu brut de l'événement — AVANT tout traitement, pour diagnostiquer
    // même si tout le reste plante juste après cette ligne. C'est cette
    // ligne qui a révélé la vraie cause le 1er septembre (e.response présent,
    // e.namedValues absent) — la garder est ce qui rend un futur problème
    // similaire diagnosticable sans deviner.
    Logger.log('Clés de premier niveau de e : ' + versJsonSur(e ? Object.keys(e) : e))
    Logger.log('e.response présent : ' + (e && e.response ? 'oui' : 'NON'))
    Logger.log('e.namedValues présent : ' + (e && e.namedValues ? 'oui' : 'NON'))

    // e.response D'ABORD — c'est la forme du déclencheur posé « à partir du
    // formulaire », celle réellement utilisée par ce projet (voir
    // HISTORIQUE). e.namedValues en repli, pour ne pas casser le script si
    // quelqu'un recrée un jour le déclencheur depuis le tableur de réponses.
    let namedValues
    if (e && e.response) {
      namedValues = construireNamedValuesDepuisReponse(e.response)
      Logger.log('Source utilisée : e.response (déclencheur « formulaire »).')
    } else if (e && e.namedValues) {
      namedValues = e.namedValues
      Logger.log('Source utilisée : e.namedValues (déclencheur « tableur »).')
    } else {
      Logger.log(
        'ERREUR CRITIQUE : ni e.response ni e.namedValues ne sont présents — ' +
          'impossible de lire les réponses. Vérifier le déclencheur : ' +
          'Déclencheurs > onFormSubmit > Source de l\'événement doit être ' +
          '« À partir du formulaire », type « Sur envoi du formulaire ». ' +
          'Voir la section INSTALLER LE DÉCLENCHEUR en tête de ce fichier.',
      )
      return
    }

    const clesReelles = Object.keys(namedValues)
    Logger.log('Nombre de questions reçues dans cette soumission : ' + clesReelles.length)
    Logger.log('Clés réelles : ' + versJsonSur(clesReelles))

    const participants = construireParticipants(namedValues)

    Logger.log('Participants retenus pour l\'envoi : ' + participants.length)

    if (participants.length === 0) {
      Logger.log('Aucun participant avec un prénom rempli — rien envoyé.')
      return
    }

    const code = envoyer(participants)

    // Marquage de la ligne APRES un envoi direct reussi — voir
    // marquerApresEnvoiDirect : sans lui, le rattrapage automatique
    // reenverrait en double tout ce qui vient de partir en direct.
    if (code >= 200 && code < 300) {
      marquerApresEnvoiDirect(e, code)
    } else {
      Logger.log(
        'Envoi direct en echec (statut ' + code + ') — ligne volontairement ' +
          'LAISSEE SANS MARQUE, pour que le rattrapage la reprenne.',
      )
    }
  } catch (err) {
    Logger.log('ERREUR NON ATTRAPÉE dans onFormSubmit : ' + err + '\n' + (err && err.stack))
  }
}

/** Isolée de onFormSubmit pour pouvoir être rejouée depuis testerEnvoi(). */
function envoyer(participants) {
  const jeton = PropertiesService.getScriptProperties().getProperty('MISSION_NERF_TOKEN')

  if (!jeton) {
    Logger.log(
      'MISSION_NERF_TOKEN absent des propriétés du script — voir la ' +
        'section CONFIGURATION en tête de fichier. Envoi annulé.',
    )
    // 0 = « pas même tenté ». L'appelant le traite comme un échec, donc la
    // ligne reste à retenter une fois le jeton configuré.
    return 0
  }

  const reponse = UrlFetchApp.fetch(URL_SITE, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'X-Mission-Nerf-Token': jeton },
    payload: JSON.stringify({ participants: participants }),
    // Ne JAMAIS laisser une erreur HTTP lever une exception silencieuse :
    // le corps de la réponse (erreur 400/401/500 incluse) doit atterrir
    // dans les journaux pour pouvoir être diagnostiqué après coup.
    muteHttpExceptions: true,
  })

  const code = reponse.getResponseCode()

  Logger.log('Envoi Mission NERF — statut %s, réponse : %s', code, reponse.getContentText())

  // ⚠️ Le code HTTP est RENVOYÉ, pas seulement journalisé : c'est lui qui
  // permet au rattrapage automatique de marquer la ligne « OK » ou
  // « ERREUR » dans le tableur. Sans cette valeur de retour, il serait
  // incapable de distinguer un envoi réussi d'un rejet, et remarquerait
  // toutes les lignes comme traitées.
  return code
}

/**
 * Test manuel — menu déroulant de fonctions > testerEnvoi > ▶ Exécuter.
 * Envoie un participant factice clairement identifiable comme test, avec le
 * MÊME chemin de code que le déclencheur réel APRÈS l'analyse de
 * l'événement (donc une preuve que jeton + URL + route fonctionnent — déjà
 * confirmé le 31 août).
 *
 * ⚠️ Crée une vraie ligne dans `inscriptions_nerf` côté site — à supprimer
 * après vérification (prénom 'TEST_APPS_SCRIPT', facile à retrouver).
 */
function testerEnvoi() {
  envoyer([{ prenom: 'TEST_APPS_SCRIPT', nom: 'TEST', age: '10' }])
}

/**
 * Test manuel — menu déroulant de fonctions > testerAnalyse > ▶ Exécuter.
 * Simule un événement de soumission SANS AUCUN effet de bord — ni appel
 * réseau, ni ligne créée en base — pour vérifier que la lecture de
 * e.namedValues et le signalement des titres introuvables fonctionnent,
 * avant de compter dessus un soir d'événement.
 *
 * Le faux événement ci-dessous contient DÉLIBÉRÉMENT, et RIEN d'autre :
 *   - un participant 1 en état MIXTE : prénom et nom présents, mais le
 *     titre « Âge » est délibérément faux (mauvaise majuscule) — doit
 *     produire une ligne « TITRE INTROUVABLE » dans les journaux ;
 *   - aucune clé du tout pour les participants 2 à 5, simulant la logique
 *     conditionnelle réelle du formulaire — doit être traité comme normal,
 *     sans log d'erreur.
 *
 * Aucun bloc n'étant complet, `participants` reste vide : envoyer() n'est
 * JAMAIS appelée, donc AUCUNE ligne créée en base — ce test est
 * volontairement sans effet de bord.
 *
 * Lire les journaux après exécution (Apps Script > Exécutions) : on doit y
 * voir « Participants retenus pour l'envoi : 0 », exactement 1 ligne
 * « TITRE INTROUVABLE » citant "Âge du participant 1", et
 * « Aucun participant avec un prénom rempli — rien envoyé. ».
 */
function testerAnalyse() {
  onFormSubmit({
    namedValues: {
      // Participant 1 — titre numéroté, nom complet en un seul champ.
      'Participant #1 - Prénom, Nom': ['Test Analyse'],
      'Participant #1 - ÂGE ': ['9'],
      // Deux participants supplémentaires : MÊMES titres répétés, empilés
      // dans un tableau — c'est la forme réelle du formulaire depuis sa
      // refonte. Le second n'a qu'un prénom, pour vérifier que le nom vide
      // ne fait plus tomber toute la soumission.
      'Prénom, Nom': ['Alex, Tremblay', 'Sam'],
      'ÂGE ': ['7', '11'],
    },
  })
}

/* ===========================================================================
 * RATTRAPAGE AUTOMATIQUE
 * ===========================================================================
 *
 * Pourquoi ce mécanisme existe : le 5 septembre 2026, le formulaire a été
 * refait et le script ne reconnaissait plus aucun titre de question. Il
 * sortait sans rien envoyer et sans erreur. 320 lignes se sont accumulées
 * dans le tableur pendant qu'on croyait le système sain — et une fois le bug
 * corrigé, elles ne sont PAS remontées toutes seules : `onFormSubmit` ne se
 * déclenche qu'à une NOUVELLE soumission, jamais rétroactivement.
 *
 * Ce rattrapage supprime cette classe de panne : même si l'envoi en direct
 * échoue (bug, coupure réseau, quota Google), la ligne finit par partir.
 *
 * ---------------------------------------------------------------------------
 * COMMENT LES DOUBLONS SONT ÉVITÉS
 * ---------------------------------------------------------------------------
 * Une colonne de suivi est ajoutée à la FIN du tableur de réponses. Chaque
 * ligne y porte son état : « OK » avec la date, ou « ERREUR » avec le code
 * HTTP. Seules les lignes dont cette cellule est VIDE sont traitées.
 *
 * C'est la seule méthode fiable ici : un simple compteur de dernière ligne
 * traitée sauterait définitivement toute ligne ayant échoué une fois. Écrite
 * dans le tableur, la marque reste lisible par un humain, survit à une
 * réinstallation du script, et se corrige à la main (vider la cellule
 * suffit à forcer un réessai).
 *
 * ---------------------------------------------------------------------------
 * ⚠️ À FAIRE UNE SEULE FOIS, AVANT D'ACTIVER LE DÉCLENCHEUR HORAIRE
 * ---------------------------------------------------------------------------
 * Les lignes déjà envoyées en direct n'ont évidemment aucune marque. Sans
 * précaution, le premier rattrapage les renverrait TOUTES en double.
 *
 *   1. `initialiserSuivi()` — marque toutes les lignes existantes comme
 *      déjà traitées, SANS RIEN ENVOYER.
 *   2. `resumerTableur()` puis `listerLignes(debut, fin)` — diagnostics
 *      purs, pour identifier les lignes réellement absentes de la base.
 *   3. `preparerRattrapage(debut, fin)` — efface la marque de ces
 *      lignes-là. Instantané, n'envoie rien.
 *   4. Poser le déclencheur horaire, qui draine la file par paquets :
 *        Déclencheurs > + Ajouter un déclencheur
 *        Fonction : rattrapageAutomatique
 *        Source   : Horaire > Minuteur > Toutes les 5 minutes
 *
 * ---------------------------------------------------------------------------
 * LIMITES RESPECTÉES
 * ---------------------------------------------------------------------------
 * L'API plafonne à 30 requêtes par minute et par IP ; Apps Script coupe une
 * exécution à 6 minutes. Chaque envoi est donc suivi d'une pause, et la
 * boucle s'arrête d'elle-même avant la limite de temps. Ce qui n'a pas été
 * traité repart au passage suivant, cinq minutes plus tard.
 */

/** Titre de la colonne de suivi, ajoutée au tableur si elle n'existe pas. */
const COLONNE_SUIVI = 'Envoi KO-LAB'

/** Pause entre deux envois — l'API plafonne à 30/min, on reste très en dessous. */
const PAUSE_ENTRE_ENVOIS_MS = 2500

/** Marge avant la coupure à 6 minutes imposée par Apps Script. */
const DUREE_MAX_MS = 4 * 60 * 1000

/**
 * Delai de grace avant qu'une ligne devienne eligible au rattrapage.
 *
 * Une soumission qui vient d'arriver est peut-etre en train d'etre traitee
 * par onFormSubmit a la seconde meme ou le rattrapage passe. Sans ce delai,
 * les deux chemins enverraient la meme famille — un doublon dans la liste
 * du staff, au pire moment. Cinq minutes laissent tout le temps a l'envoi
 * direct de finir et d'ecrire sa marque.
 */
const DELAI_GRACE_MS = 5 * 60 * 1000

/**
 * Ouvre la feuille de réponses liée au formulaire.
 *
 * L'identifiant du tableur est demandé au formulaire lui-même : rien à
 * configurer à la main, et rien à corriger si le tableur est un jour recréé.
 */
function feuilleReponses() {
  const idTableur = FormApp.getActiveForm().getDestinationId()
  if (!idTableur) {
    throw new Error(
      "Ce formulaire n'a pas de tableur de réponses lié. Dans le formulaire : " +
        'onglet Réponses > icône tableur > créer ou sélectionner une feuille.',
    )
  }
  return SpreadsheetApp.openById(idTableur).getSheets()[0]
}

/**
 * Indice (base 1) de la colonne de suivi, créée au besoin.
 * Renvoie aussi les en-têtes, pour éviter une seconde lecture du tableur.
 */
function preparerSuivi(feuille) {
  const derniereColonne = feuille.getLastColumn()
  const entetes = feuille.getRange(1, 1, 1, derniereColonne).getValues()[0]

  let indice = entetes.indexOf(COLONNE_SUIVI) + 1
  if (indice === 0) {
    indice = derniereColonne + 1
    feuille.getRange(1, indice).setValue(COLONNE_SUIVI)
    Logger.log('Colonne de suivi créée en position ' + indice)
  }

  return { indice: indice, entetes: entetes }
}

/**
 * Reconstruit une map titre → tableau de réponses pour UNE ligne du tableur.
 *
 * Un titre répété (les blocs participants 2 à 5) occupe PLUSIEURS colonnes
 * portant le même en-tête. Elles sont empilées dans le même tableau, dans
 * l'ordre des colonnes — exactement la forme qu'attend
 * `construireParticipants`, identique à celle d'un envoi en direct. C'est ce
 * qui garantit qu'une ligne rattrapée produit les mêmes données qu'une ligne
 * envoyée sur le moment.
 */
function namedValuesDeLigne(entetes, valeurs) {
  const map = {}
  for (let i = 0; i < entetes.length; i += 1) {
    const titre = String(entetes[i])
    if (titre === '' || titre === COLONNE_SUIVI) continue
    const brut = valeurs[i]
    const valeur = brut === null || brut === undefined ? '' : String(brut)
    map[titre] = map[titre] ? map[titre].concat([valeur]) : [valeur]
  }
  return map
}

/**
 * Moteur unique du rattrapage — un seul mode, volontairement.
 *
 * ⚠️ Un mode « forcer » (renvoyer une plage sans regarder les marques) a
 * existé ici et a été RETIRÉ le 5 septembre 2026 : il ne survivait pas à la
 * coupure des 6 minutes d'Apps Script. Une plage de 229 lignes demande
 * environ 10 minutes ; l'exécution s'arrêtait donc à mi-chemin, et la
 * relancer renvoyait EN DOUBLE tout ce qui était déjà parti.
 *
 * Le remplacement est `preparerRattrapage`, qui se contente d'effacer les
 * marques d'une plage. Le moteur ci-dessous la draine ensuite passage après
 * passage, en sautant ce qui porte déjà « OK » — reprenable par
 * construction, sans jamais renvoyer deux fois la même ligne.
 */
function traiterLignes(ligneDebut, ligneFin) {
  const debutMs = Date.now()
  const feuille = feuilleReponses()
  const suivi = preparerSuivi(feuille)
  const derniereLigne = feuille.getLastRow()

  const fin = Math.min(ligneFin || derniereLigne, derniereLigne)
  const debut = Math.max(ligneDebut || 2, 2)
  if (fin < debut) {
    Logger.log('Aucune ligne à traiter.')
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
        'Limite de temps atteinte — arrêt volontaire à la ligne ' + (debut + i) +
          '. Le reste partira au prochain passage.',
      )
      break
    }

    const ligne = debut + i

    // Trop recente pour etre jugee : l'envoi direct est peut-etre encore en
    // cours. Ignoree ce passage-ci, reprise au suivant.
    const horodateur = donnees[i][0]
    if (
      horodateur instanceof Date &&
      Date.now() - horodateur.getTime() < DELAI_GRACE_MS
    ) {
      ignorees += 1
      continue
    }

    const marque = donnees[i][suivi.indice - 1]
    const dejaTraitee = marque !== '' && marque !== null && marque !== undefined
    if (dejaTraitee) {
      ignorees += 1
      continue
    }

    const participants = construireParticipants(namedValuesDeLigne(suivi.entetes, donnees[i]))
    if (participants.length === 0) {
      feuille.getRange(ligne, suivi.indice).setValue('VIDE — aucun participant lisible')
      ignorees += 1
      continue
    }

    const code = envoyer(participants)
    if (code >= 200 && code < 300) {
      feuille.getRange(ligne, suivi.indice).setValue('OK ' + new Date().toISOString())
      envoyees += 1
    } else {
      // Marque d'échec EXPLICITE : la ligne reste identifiable par un humain,
      // mais ne sera pas retentée en boucle à chaque passage si la cause est
      // permanente. Vider la cellule suffit à forcer un réessai.
      feuille.getRange(ligne, suivi.indice).setValue('ERREUR ' + code)
      echecs += 1
    }

    Utilities.sleep(PAUSE_ENTRE_ENVOIS_MS)
  }

  Logger.log(
    'Rattrapage terminé — ' + envoyees + ' envoyée(s), ' + ignorees +
      ' ignorée(s), ' + echecs + ' en échec.',
  )
}

/**
 * Point d'entrée du déclencheur horaire : traite tout ce qui n'est pas encore
 * marqué, du haut vers le bas du tableur.
 */
function rattrapageAutomatique() {
  traiterLignes(2, null)
}

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
    Logger.log('Tableur vide — rien à initialiser.')
    return
  }

  const nombre = derniereLigne - 1
  const marques = []
  for (let i = 0; i < nombre; i += 1) marques.push(['INITIALISÉ — non envoyé'])
  feuille.getRange(2, suivi.indice, nombre, 1).setValues(marques)

  Logger.log(
    nombre + ' ligne(s) marquée(s) comme déjà traitées. Utiliser ' +
      'preparerRattrapage(debut, fin) pour remettre en file celles qui ' +
      'manquent vraiment en base.',
  )
}

/**
 * Met une plage de lignes EN FILE pour le rattrapage — en effaçant leur
 * marque de suivi. N'envoie rien elle-même, ne prend qu'une seconde.
 *
 *   preparerRattrapage(130, 358)
 *
 * C'est le déclencheur horaire qui enverra ensuite, par paquets d'environ
 * 100 lignes toutes les 5 minutes, en marquant chacune au passage. Rien à
 * surveiller : une exécution coupée par la limite des 6 minutes reprend
 * exactement où elle s'est arrêtée.
 *
 * ⚠️ À n'utiliser que sur une plage dont on a VÉRIFIÉ qu'elle manque en
 * base — voir `listerLignes` pour l'inspecter avant. Effacer la marque
 * d'une ligne déjà enregistrée la fait repartir en double.
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
 * Diagnostic — n'écrit RIEN, n'envoie RIEN. Affiche, pour chaque ligne
 * d'une plage, son heure, sa marque de suivi et les participants que le
 * script en tirerait.
 *
 *   listerLignes(359, 383)
 *
 * Sert à trancher les cas ambigus : quand une partie seulement d'une plage
 * est déjà en base, comparer ces noms à ceux de la base dit exactement
 * quelles lignes mettre en file — se fier aux horodateurs seuls ne suffit
 * pas, l'écart entre l'heure du formulaire et l'heure d'insertion varie de
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
    const participants = construireParticipants(namedValuesDeLigne(suivi.entetes, donnees[i]))
    const noms = participants
      .map(function (p) {
        return p.prenom + ' ' + (p.nom || '-') + ' (' + p.age + ')'
      })
      .join(' + ')
    Logger.log(
      'ligne ' + (debut + i) + ' | ' + heure + ' | ' + (noms || 'AUCUN PARTICIPANT LISIBLE'),
    )
  }
}

/**
 * Diagnostic — n'écrit RIEN, n'envoie RIEN. À exécuter avant
 * `preparerRattrapage` pour savoir quels numéros de ligne lui donner.
 *
 * Pourquoi cette fonction existe : `preparerRattrapage` exige des numéros
 * de ligne, et un tableur de 383 réponses ne se lit pas à l'œil. Pire, se
 * tromper de borne coûte cher dans les deux sens — trop bas, on renvoie en
 * double ce qui est déjà en base ; trop haut, des familles restent
 * absentes le soir de l'événement.
 *
 * Journalise, pour chaque journée : la première et la dernière ligne, et
 * combien de réponses elle contient. Ce nombre se compare directement au
 * nombre de DÉCHARGES en base pour la même date (une ligne de tableur = une
 * décharge = une famille), ce qui dit sans ambiguïté quelle journée est
 * complète et laquelle ne l'est pas.
 *
 * Détaille ensuite les 25 dernières lignes avec leur heure : c'est là que
 * se trouve la frontière entre « perdu » et « déjà envoyé » le jour où le
 * script a été réparé en pleine journée.
 */
function resumerTableur() {
  const feuille = feuilleReponses()
  const derniereLigne = feuille.getLastRow()
  if (derniereLigne < 2) {
    Logger.log('Tableur vide.')
    return
  }

  // Colonne A — l'horodateur, posé par Google Forms lui-même sur toute
  // feuille de réponses. Lu par position et non par titre : c'est la seule
  // colonne dont la place est garantie par Google, quel que soit le nom que
  // porte l'en-tête dans la langue du compte.
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

  Logger.log('=== Réponses par journée (fuseau du script : ' + fuseau + ') ===')
  ordre.forEach(function (jour) {
    const j = jours[jour]
    Logger.log(
      jour + ' : lignes ' + j.premiere + ' a ' + j.derniere + '  (' + j.nombre + ' reponse(s))',
    )
  })

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

/* ===========================================================================
 * MARQUAGE DES ENVOIS DIRECTS
 * ===========================================================================
 *
 * ⚠️ Défaut trouvé le 5 septembre 2026, juste après avoir écrit le
 * rattrapage — avant qu'il ne fasse de dégâts, mais de justesse.
 *
 * `onFormSubmit` envoie la soumission tout de suite, mais n'écrivait AUCUNE
 * marque dans le tableur : la colonne de suivi restait vide sur la ligne
 * correspondante. Le rattrapage automatique, qui traite précisément les
 * lignes non marquées, aurait donc renvoyé en double CHAQUE inscription
 * arrivée en direct, cinq minutes après son arrivée. Le tableau du staff
 * aurait compté deux fois chaque famille, un soir d'événement.
 *
 * Les deux chemins doivent donc écrire la même marque. Reste à retrouver
 * QUELLE ligne : l'événement de soumission ne porte pas de numéro de ligne.
 * Il porte un horodateur, et c'est exactement ce que Google Forms écrit en
 * colonne A. La correspondance se fait donc à la seconde près, sur les 50
 * dernières lignes seulement — celle qu'on cherche vient d'être ajoutée.
 */

/**
 * Retrouve la ligne d'une soumission par son horodateur et y écrit `marque`.
 * Renvoie false si aucune correspondance — jamais d'exception.
 */
function marquerLigneParHorodateur(horodateur, marque) {
  if (!(horodateur instanceof Date)) return false

  const feuille = feuilleReponses()
  const suivi = preparerSuivi(feuille)
  const derniereLigne = feuille.getLastRow()
  if (derniereLigne < 2) return false

  const debut = Math.max(2, derniereLigne - 49)
  const colonneA = feuille.getRange(debut, 1, derniereLigne - debut + 1, 1).getValues()

  // Comparaison à la SECONDE : le tableur et l'événement portent la même
  // valeur, mais les millisecondes ne survivent pas toujours à l'écriture
  // dans une cellule.
  const cible = Math.floor(horodateur.getTime() / 1000)

  // Du bas vers le haut — la ligne cherchée vient d'être ajoutée.
  for (let i = colonneA.length - 1; i >= 0; i -= 1) {
    const valeur = colonneA[i][0]
    if (valeur instanceof Date && Math.floor(valeur.getTime() / 1000) === cible) {
      feuille.getRange(debut + i, suivi.indice).setValue(marque)
      return true
    }
  }

  return false
}

/**
 * Marque la ligne d'un envoi direct réussi. Appelée par `onFormSubmit`
 * UNIQUEMENT après un 2xx — un échec reste sans marque exprès, pour que le
 * rattrapage le reprenne.
 *
 * Trois essais espacés : Google Forms écrit la ligne du tableur et déclenche
 * le script en parallèle, sans garantir l'ordre. La ligne peut donc ne pas
 * encore exister à la première recherche.
 *
 * Ne lève JAMAIS : l'envoi a déjà réussi à ce stade, un problème de marquage
 * ne doit pas transformer une soumission enregistrée en exception. Le pire
 * cas est un doublon, journalisé bruyamment pour être retrouvable.
 */
function marquerApresEnvoiDirect(e, code) {
  if (!e || !e.response || typeof e.response.getTimestamp !== 'function') {
    Logger.log(
      'AVERTISSEMENT : pas d\'horodateur dans l\'evenement (declencheur ' +
        '« tableur » ?) — ligne non marquee, le rattrapage risque un doublon.',
    )
    return
  }

  const marque = 'OK direct ' + new Date().toISOString() + ' (' + code + ')'

  for (let essai = 1; essai <= 3; essai += 1) {
    try {
      if (marquerLigneParHorodateur(e.response.getTimestamp(), marque)) {
        Logger.log('Ligne du tableur marquee : ' + marque + ' (essai ' + essai + ').')
        return
      }
    } catch (err) {
      Logger.log('Marquage — echec de l\'essai ' + essai + ' : ' + err)
    }
    Utilities.sleep(2000)
  }

  Logger.log(
    'AVERTISSEMENT : ligne introuvable dans le tableur apres 3 essais. ' +
      'L\'inscription EST enregistree en base, mais le rattrapage pourrait ' +
      'la renvoyer en double dans 5 minutes — surveiller la liste du staff.',
  )
}
