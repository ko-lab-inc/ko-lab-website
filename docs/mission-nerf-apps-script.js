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
 * sortantes) — l'envoi échouerait en silence, sans erreur visible nulle
 * part. Il faut un DÉCLENCHEUR INSTALLABLE, posé une fois à la main :
 *
 *   Éditeur Apps Script > icône ⏰ Déclencheurs (menu de gauche) >
 *   + Ajouter un déclencheur >
 *       Fonction à exécuter    : onFormSubmit
 *       Déploiement            : Head
 *       Source de l'événement  : À partir du formulaire
 *       Type d'événement       : Sur envoi du formulaire
 *   > Enregistrer.
 *
 *   Un écran d'autorisation Google apparaît la première fois (« Google n'a
 *   pas vérifié cette application ») — normal pour un script qui nous
 *   appartient : Avancé > Accéder à [nom du projet] (dangereux) > Autoriser.
 *
 * -----------------------------------------------------------------------------
 * TESTER SANS ATTENDRE UNE VRAIE SOUMISSION
 * -----------------------------------------------------------------------------
 * Dans l'éditeur : sélectionner `testerEnvoi` dans le menu déroulant de
 * fonctions (en haut), puis ▶ Exécuter. Ça déclenche aussi l'écran
 * d'autorisation ci-dessus si ce n'est pas déjà fait — à faire AVANT de
 * compter sur le déclencheur un soir d'événement. Voir la docstring de
 * `testerEnvoi` pour le nettoyage après coup.
 */

const URL_SITE = 'https://ko-lab-center.ca/api/mission-nerf/decharges'

/**
 * Titres EXACTS des questions du formulaire (vérifiés en direct sur le
 * formulaire cité plus haut, le 31 août 2026) — Apps Script indexe
 * `e.namedValues` par le TITRE de la question, jamais par sa position. Si un
 * titre est un jour reformulé dans le formulaire, cette liste doit être
 * corrigée EN MÊME TEMPS, sinon le participant correspondant cesse d'être
 * envoyé, sans le moindre message d'erreur.
 *
 * Volontairement ABSENTS de cette liste : « Autorisez-vous cet enfant à
 * participer? » et « Souhaitez-vous inscrire un autre enfant? » — ces deux
 * titres se RÉPÈTENT identiques pour chacun des 5 participants, ce qui rend
 * `e.namedValues` ambigu pour eux (une seule clé, plusieurs réponses
 * mélangées). Sans besoin de ces deux champs côté site, le problème ne se
 * pose jamais ici.
 */
const CHAMPS_PARTICIPANT = [1, 2, 3, 4, 5].map(function (n) {
  return {
    prenom: 'Prénom du participant ' + n,
    nom: 'Nom du participant ' + n,
    age: 'Âge du participant ' + n,
  }
})

/**
 * Une valeur de `e.namedValues` est TOUJOURS un tableau, même pour une
 * question à réponse unique — absente (pas juste vide) si la question n'a
 * pas été atteinte dans le parcours logique du formulaire.
 */
function champ(namedValues, titre) {
  const valeurs = namedValues[titre]
  return valeurs && valeurs[0] ? valeurs[0].trim() : ''
}

/**
 * Déclenchée automatiquement par le déclencheur INSTALLABLE (voir plus
 * haut) à chaque soumission du formulaire.
 */
function onFormSubmit(e) {
  const namedValues = e.namedValues

  const participants = CHAMPS_PARTICIPANT.map(function (champs) {
    return {
      prenom: champ(namedValues, champs.prenom),
      nom: champ(namedValues, champs.nom),
      age: champ(namedValues, champs.age),
    }
  }).filter(function (p) {
    // Bloc vide (participants 2 à 5, le plus souvent) : le prénom est le
    // seul champ garanti rempli pour un participant réel présent — un bloc
    // sans prénom n'est jamais une ligne à créer, ni à moitié remplie.
    return p.prenom !== ''
  })

  if (participants.length === 0) {
    Logger.log('Aucun participant avec un prénom rempli — rien envoyé.')
    return
  }

  envoyer(participants)
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
 * Test manuel — menu déroulant de fonctions > testerEnvoi > ▶ Exécuter,
 * DEPUIS L'ÉDITEUR APPS SCRIPT. Envoie un participant factice clairement
 * identifiable comme test, avec le MÊME chemin de code que le déclencheur
 * réel (donc une vraie preuve que jeton + URL + route fonctionnent).
 *
 * ⚠️ Crée une vraie ligne dans `inscriptions_nerf` côté site si le jeton et
 * l'URL sont corrects — à supprimer après vérification (prénom
 * 'TEST_APPS_SCRIPT', facile à retrouver et à effacer).
 */
function testerEnvoi() {
  envoyer([{ prenom: 'TEST_APPS_SCRIPT', nom: 'TEST', age: '10' }])
}
