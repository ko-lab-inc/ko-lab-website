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

  const morceaux = texte.split(/s+/)
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

    const participants = []

    /**
     * Empile un participant si son identité est exploitable.
     * Un âge vide ou non numérique est envoyé tel quel : c'est l'API qui
     * tranche (elle convertit et borne), pas ce script.
     */
    function ajouterParticipant(nomComplet, age, provenance) {
      const identite = separerNomComplet(nomComplet)
      if (identite.prenom === '') return

      // ⚠️ Un âge inexploitable écarte CE participant, pas toute la fratrie.
      // L'API valide le tableau entier : un seul âge vide ou non numérique la
      // fait répondre 400 et TOUTE la soumission est perdue. Mieux vaut
      // enregistrer les frères et sœurs valides et signaler celui-ci dans le
      // journal, que tout perdre en silence.
      const ageTexte = (age || '').trim()
      if (!/^d{1,3}$/.test(ageTexte) || Number(ageTexte) < 1) {
        Logger.log(
          'PARTICIPANT ÉCARTÉ (' + provenance + ') : « ' + identite.prenom +
            ' » a un âge inexploitable (« ' + ageTexte + '  »). Les autres ' +
            'participants de cette soumission sont envoyés normalement.',
        )
        return
      }

      participants.push({ prenom: identite.prenom, nom: identite.nom, age: ageTexte })
      Logger.log(
        'Participant retenu (' + provenance + ') : ' + identite.prenom +
          ' / ' + (identite.nom || '(sans nom)') + ' / âge ' + ageTexte,
      )
    }

    // Participant 1 — seul à porter un titre numéroté.
    const p1Nom = champ(namedValues, TITRE_P1_NOM)
    const p1Age = champ(namedValues, TITRE_P1_AGE)
    if (p1Nom.manquant) {
      Logger.log(
        'TITRE INTROUVABLE : "' + TITRE_P1_NOM + '" absent de cette soumission. ' +
          'Le formulaire a probablement été modifié — comparer avec la ligne ' +
          '« Clés réelles » ci-dessus et corriger les constantes TITRE_* en tête ' +
          'de ce fichier.',
      )
    } else {
      ajouterParticipant(p1Nom.valeur, p1Age.valeur, 'participant #1')
    }

    // Participants 2 et suivants — MÊMES titres répétés, donc plusieurs
    // réponses empilées sous une seule clé, dans l'ordre du formulaire.
    // Les deux tableaux sont parallèles : le nom d'indice i va avec l'âge
    // d'indice i.
    const nomsSuite = namedValues[TITRE_SUITE_NOM] || []
    const agesSuite = namedValues[TITRE_SUITE_AGE] || []
    if (nomsSuite.length !== agesSuite.length) {
      Logger.log(
        'ATTENTION : ' + nomsSuite.length + ' nom(s) pour ' + agesSuite.length +
          ' âge(s) dans les blocs suivants — appariement par indice quand même, ' +
          'les âges manquants partiront vides.',
      )
    }
    for (let i = 0; i < nomsSuite.length; i += 1) {
      ajouterParticipant(nomsSuite[i], agesSuite[i], 'bloc suivant #' + (i + 2))
    }

    Logger.log('Participants retenus pour l\'envoi : ' + participants.length)

    if (participants.length === 0) {
      Logger.log('Aucun participant avec un prénom rempli — rien envoyé.')
      return
    }

    envoyer(participants)
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
    return
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

  Logger.log(
    'Envoi Mission NERF — statut %s, réponse : %s',
    reponse.getResponseCode(),
    reponse.getContentText(),
  )
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
