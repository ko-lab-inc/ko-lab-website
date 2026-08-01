/**
 * Audit de la posture Supabase — ce qu'un visiteur peut RÉELLEMENT faire.
 *
 *     node scripts/audit-supabase.mjs
 *
 * -----------------------------------------------------------------------------
 * POURQUOI SONDER PLUTÔT QUE LIRE LES MIGRATIONS
 *
 * Un fichier .sql dans le dépôt ne prouve rien : il prouve qu'on a écrit la
 * règle, pas qu'elle est en vigueur. Deux migrations de ce projet sont
 * justement dans ce cas — écrites, jamais exécutées. Et une s'est annulée en
 * cours de route sur une erreur de colonne, laissant la base dans un état que
 * le dépôt ne décrit plus.
 *
 * Ce script interroge donc la base telle qu'elle est, avec la clé PUBLIQUE —
 * la même que celle embarquée dans le JavaScript du site, à la portée de
 * n'importe qui.
 *
 * -----------------------------------------------------------------------------
 * COMMENT LES ÉCRITURES SONT TESTÉES SANS RIEN ÉCRIRE
 *
 * Envoyer une vraie ligne polluerait la production. On envoie donc un corps
 * VOLONTAIREMENT INVALIDE et on lit le code d'erreur PostgreSQL :
 *
 *   42501  privilège insuffisant  → l'écriture est BLOQUÉE (RLS ou GRANT)
 *   23502  violation NOT NULL     → l'écriture est AUTORISÉE, seul le schéma
 *   23514  violation CHECK          a refusé cette ligne-là
 *   23503  violation clé étrangère
 *
 * Autrement dit : tout code d'erreur AUTRE que 42501 signifie que la requête
 * est passée par la sécurité et n'a été arrêtée que par la validation des
 * données. C'est ce qu'on cherche à savoir.
 * -----------------------------------------------------------------------------
 */

import { readFileSync } from 'node:fs'

/* -- configuration ---------------------------------------------------------- */

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .map((l) => l.match(/^\s*([A-Z_0-9]+)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim()]),
)

const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL
const CLE_PUBLIQUE = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const CLE_SERVICE = env.SUPABASE_SERVICE_ROLE_KEY

if (!URL_BASE || !CLE_PUBLIQUE) {
  console.error('NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY manquante')
  process.exit(1)
}

/* -- outils ----------------------------------------------------------------- */

const VERT = '\x1b[32m'
const ROUGE = '\x1b[31m'
const JAUNE = '\x1b[33m'
const GRIS = '\x1b[90m'
const RAZ = '\x1b[0m'

let alertes = 0

function verdict(attenduOk, texte, detail) {
  if (attenduOk) console.log(`  ${VERT}ok${RAZ}    ${texte} ${GRIS}${detail ?? ''}${RAZ}`)
  else {
    alertes += 1
    console.log(`  ${ROUGE}ALERTE${RAZ} ${texte} ${GRIS}${detail ?? ''}${RAZ}`)
  }
}

function note(texte, detail) {
  console.log(`  ${JAUNE}note${RAZ}  ${texte} ${GRIS}${detail ?? ''}${RAZ}`)
}

async function rest(chemin, { cle = CLE_PUBLIQUE, methode = 'GET', corps } = {}) {
  const r = await fetch(`${URL_BASE}/rest/v1/${chemin}`, {
    method: methode,
    headers: {
      apikey: cle,
      Authorization: `Bearer ${cle}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: corps ? JSON.stringify(corps) : undefined,
  })

  let charge = null
  const texte = await r.text()
  if (texte) {
    try {
      charge = JSON.parse(texte)
    } catch {
      charge = texte
    }
  }
  return { statut: r.status, code: charge?.code, message: charge?.message, charge }
}

/* -- 1. lecture publique ----------------------------------------------------- */

/**
 * Ce que la clé publique doit pouvoir lire, et surtout ce qu'elle ne doit pas.
 *
 * `demandes_contact` est le cas critique : le formulaire y écrit, donc la table
 * est ouverte en INSERT. Si le SELECT l'était aussi, n'importe qui lirait les
 * coordonnées et les messages de tous les prospects avec une seule requête.
 */
const LECTURES = [
  ['realisations', true, 'galerie publique'],
  ['produits_boutique', true, 'catalogue public'],
  ['postes_carrieres', true, 'offres publiques'],
  ['demandes_contact', false, 'DONNÉES DE PROSPECTS'],
  ['profils', false, 'comptes et rôles'],
]

async function lectures() {
  console.log('\n1 · Lecture avec la clé publique')
  for (const [table, autorisee, quoi] of LECTURES) {
    const { statut, code } = await rest(`${table}?select=*&limit=1`)
    const lisible = statut === 200
    verdict(
      lisible === autorisee,
      `${table.padEnd(20)} ${lisible ? 'lisible' : 'refusée'}`,
      lisible === autorisee ? quoi : `attendu : ${autorisee ? 'lisible' : 'refusée'} — ${quoi}`,
    )
    if (!lisible && autorisee) note('', `statut ${statut}, code ${code}`)
  }
}

/* -- 2. écritures publiques -------------------------------------------------- */

/**
 * Corps volontairement vides : ils échouent de toute façon. Ce qu'on lit,
 * c'est POURQUOI ils échouent.
 */
const ECRITURES = [
  ['realisations', false],
  ['produits_boutique', false],
  ['postes_carrieres', false],
  ['profils', false],
  // Seule exception légitime : le formulaire de contact écrit ici.
  ['demandes_contact', true],
]

async function ecritures() {
  console.log('\n2 · Écriture avec la clé publique (corps invalide, rien n’est créé)')
  for (const [table, autorisee] of ECRITURES) {
    const { statut, code, message } = await rest(table, { methode: 'POST', corps: {} })
    const bloquee = code === '42501' || statut === 401 || statut === 403
    verdict(
      bloquee !== autorisee,
      `${table.padEnd(20)} ${bloquee ? 'bloquée' : 'PASSE la sécurité'}`,
      bloquee ? '' : `arrêtée par le schéma seulement (${code ?? statut}) ${message ?? ''}`,
    )
  }

  console.log('\n   Suppression et modification publiques')
  for (const table of ['realisations', 'produits_boutique', 'profils', 'demandes_contact']) {
    const { statut, code } = await rest(`${table}?id=eq.00000000-0000-0000-0000-000000000000`, {
      methode: 'DELETE',
    })
    // 204 sur zéro ligne = la requête est passée, elle n'a simplement rien
    // trouvé. C'est le cas ambigu : RLS filtre silencieusement au lieu de
    // refuser. On le signale sans conclure.
    const refusee = code === '42501' || statut === 401 || statut === 403
    if (refusee) verdict(true, `${table.padEnd(20)} DELETE refusé`)
    else note(`${table.padEnd(20)} DELETE → ${statut}`, 'zéro ligne touchée, ou RLS silencieux')
  }
}

/* -- 3. contrainte de rôle --------------------------------------------------- */

/**
 * Quels rôles la base accepte-t-elle vraiment ?
 *
 * ⚠️ Méthode. Un UPDATE sur un identifiant inexistant ne prouve RIEN : zéro
 * ligne touchée, aucune contrainte évaluée, et la requête réussit. Cette
 * erreur a déjà été commise sur ce projet et a mené à annoncer comme appliquée
 * une migration qui ne l'était pas.
 *
 * Ce qui prouve quelque chose : un INSERT. PostgreSQL évalue le CHECK à
 * l'insertion de la ligne, AVANT de déclencher le trigger de clé étrangère.
 * Avec un identifiant bidon :
 *
 *   rôle refusé par le CHECK  → 23514 (le rôle n'est pas dans la liste)
 *   rôle accepté              → 23503 (le CHECK a passé, la FK vers
 *                                      auth.users a bloqué)
 *
 * Aucune ligne n'est créée dans les deux cas.
 */
async function contrainteRole() {
  console.log('\n3 · Rôles acceptés par la table profils')
  if (!CLE_SERVICE) {
    note('SUPABASE_SERVICE_ROLE_KEY absente', 'vérification impossible')
    return
  }

  const bidon = '00000000-0000-0000-0000-0000000000ff'
  const attendus = {
    admin: true,
    editor: true,
    client: true,
    vendeur: true,
    livreur: true,
    invite: null, // remplacé par « client » en 0009 : présent = 0009 non appliquée
    pirate: false, // ne doit JAMAIS passer
  }

  for (const [role, attendu] of Object.entries(attendus)) {
    const { code, statut } = await rest('profils', {
      cle: CLE_SERVICE,
      methode: 'POST',
      corps: { id: bidon, role },
    })

    const accepte = code === '23503'
    const refuse = code === '23514'

    if (!accepte && !refuse) {
      note(`${role.padEnd(8)} indéterminé`, `statut ${statut}, code ${code}`)
      continue
    }
    if (attendu === null) {
      note(`${role.padEnd(8)} ${accepte ? 'ACCEPTÉ' : 'refusé'}`, accepte ? '0009 non appliquée' : '0009 appliquée')
      continue
    }
    verdict(accepte === attendu, `${role.padEnd(8)} ${accepte ? 'accepté' : 'refusé'}`)
  }
}

/* -- 4. stockage ------------------------------------------------------------- */

/**
 * Un bucket de photos, sondé une fois par appelant.
 *
 * Factorisé plutôt que dupliqué : produits (0010) et réalisations (0012)
 * suivent EXACTEMENT le même schéma de politiques — bucket public, écriture
 * réservée à l'équipe. Deux copies auraient fini par diverger silencieusement
 * à la première correction apportée à l'une des deux.
 */
async function bucketPhotos(nom, migration) {
  console.log(`\n4 · Bucket des photos ${nom}`)

  const r = await fetch(`${URL_BASE}/storage/v1/bucket/${nom}`, {
    headers: { apikey: CLE_SERVICE ?? CLE_PUBLIQUE, Authorization: `Bearer ${CLE_SERVICE ?? CLE_PUBLIQUE}` },
  })

  // ⚠️ PAS `r.status === 404`. L'API Storage de Supabase renvoie un bucket
  // manquant en HTTP 400, avec le vrai code dans le CORPS JSON
  // (`{ statusCode: "404", error: "Bucket not found" }`) — un statut HTTP 404
  // littéral n'arrive jamais ici. Vérifier seulement le statut HTTP a d'abord
  // laissé passer un faux « bucket présent », les champs lus valant
  // `undefined` sans que rien ne l'signale.
  if (!r.ok) {
    // `note`, pas `verdict` : un bucket absent avant que sa migration soit
    // jouée est un état ATTENDU, pas une mauvaise configuration — même
    // raisonnement que la table `reglages` absente en section 6.
    note(`bucket « ${nom} » absent`, `le téléversement échouera tant que la migration ${migration} n'est pas exécutée`)
    return
  }

  const b = await r.json()
  verdict(true, 'bucket présent', `public=${b.public}, limite=${b.file_size_limit}`)

  // Téléversement anonyme : doit être refusé.
  const envoi = await fetch(`${URL_BASE}/storage/v1/object/${nom}/audit-${Date.now()}.txt`, {
    method: 'POST',
    headers: {
      apikey: CLE_PUBLIQUE,
      Authorization: `Bearer ${CLE_PUBLIQUE}`,
      'Content-Type': 'text/plain',
    },
    body: 'audit',
  })
  verdict(envoi.status !== 200, `téléversement anonyme ${envoi.status === 200 ? 'ACCEPTÉ' : 'refusé'}`, `statut ${envoi.status}`)
}

/**
 * Bucket `cv` — le seul bucket privé du projet (0017).
 *
 * ⚠️ Ce contrôle manquait, et c'est le trou le plus gênant du dispositif :
 * le script sondait `produits` et `realisations` — deux buckets de photos
 * publiques — et ignorait celui qui contient des documents personnels.
 *
 * Deux choses à vérifier, et elles sont différentes :
 *   · la LECTURE anonyme doit être refusée (elle l'a toujours été) ;
 *   · le DÉPÔT anonyme doit être BORNÉ, pas interdit. Le formulaire de
 *     candidature dépose sans compte, c'est sa raison d'être. Ce qu'on
 *     interdit, c'est le dépôt d'un chemin arbitraire — ce que l'audit du
 *     2026-07-30 avait trouvé possible, et que 0019 a resserré.
 */
async function bucketCv() {
  const lecture = await fetch(`${URL_BASE}/storage/v1/object/public/cv/quelconque.pdf`)
  verdict(
    lecture.status !== 200,
    `bucket cv — lecture publique ${lecture.status === 200 ? 'ACCEPTÉE' : 'refusée'}`,
    `statut ${lecture.status}`,
  )

  // Chemin volontairement illégitime : sous-dossier + extension hors liste.
  // 0019 le refuse ; avant 0019 il passait.
  //
  // ⚠️ NOM UNIQUE À CHAQUE EXÉCUTION, et ce n'est pas cosmétique. Avec un nom
  // fixe, un fichier laissé par une exécution précédente fait échouer le dépôt
  // en « doublon » (les buckets sont en `upsert: false`) : la sonde conclut
  // « refusé » alors que la politique laisse toujours passer. Un faux négatif
  // qui masque exactement ce qu'on cherche.
  const cible = `zzaudit/x-${Date.now()}.exe`
  const abus = await fetch(`${URL_BASE}/storage/v1/object/cv/${cible}`, {
    method: 'POST',
    headers: {
      apikey: CLE_PUBLIQUE,
      Authorization: `Bearer ${CLE_PUBLIQUE}`,
      'Content-Type': 'application/pdf',
    },
    body: 'audit',
  })
  verdict(
    abus.status !== 200,
    `bucket cv — dépôt anonyme hors format ${abus.status === 200 ? 'ACCEPTÉ' : 'refusé'}`,
    abus.status === 200 ? 'exécuter la migration 0019' : `statut ${abus.status}`,
  )

  // ⚠️ NETTOYER CE QUE LA SONDE A ÉCRIT.
  //
  // Tant que 0019 n'est pas exécutée, ce dépôt réussit — et un script d'audit
  // qui laisse un fichier dans le stockage du client à chaque exécution est un
  // script qu'on finit par ne plus lancer. Le retrait passe par la clé de
  // service : le bucket `cv` n'accorde la suppression qu'à `admin`.
  if (abus.status === 200) {
    await nettoyer(
      `${URL_BASE}/storage/v1/object/cv`,
      { prefixes: [cible] },
      'fichier de test déposé dans cv',
    )
  }
}

/**
 * Retire une trace laissée par une sonde, avec la clé de service.
 *
 * Signale bruyamment un échec plutôt que de le taire : une trace oubliée dans
 * la base d'un client doit se voir.
 */
async function nettoyer(url, corps, quoi) {
  if (!CLE_SERVICE) {
    note(`${quoi} — NON NETTOYÉ`, 'SUPABASE_SERVICE_ROLE_KEY absente de .env.local')
    return
  }
  const r = await fetch(url, {
    method: 'DELETE',
    headers: {
      apikey: CLE_SERVICE,
      Authorization: `Bearer ${CLE_SERVICE}`,
      'Content-Type': 'application/json',
    },
    ...(corps ? { body: JSON.stringify(corps) } : {}),
  })
  if (r.status >= 400) note(`${quoi} — NON NETTOYÉ`, `statut ${r.status}`)
}

/**
 * Tables apportées par 0016 et 0017, absentes du script d'origine.
 *
 * `candidatures` est la table la plus sensible du projet. Un `200 []` n'est
 * PAS un bon résultat ici : il signifie que `anon` détient le privilège SELECT
 * et que seule la politique RLS renvoie l'ensemble vide. On attend un 401
 * (42501), comme pour `demandes_contact` et `profils`. Voir 0019 §1.
 */
async function tablesRecentes() {
  const c = await rest('candidatures?select=nom,email&limit=1')
  verdict(
    c.statut === 401,
    `candidatures — lecture anonyme ${c.statut === 200 ? 'ACCORDÉE PAR GRANT (RLS seul rempart)' : 'refusée'}`,
    c.statut === 200 ? 'exécuter la migration 0019 §1' : `statut ${c.statut}`,
  )

  // Insertion anonyme en forçant `statut = 'traite'` : la candidature
  // n'apparaîtrait jamais comme nouvelle dans /admin. 0019 §3 l'interdit.
  // Le courriel sert de marqueur pour le nettoyage juste après.
  const MARQUEUR = 'zzaudit-sonde@example.test'
  const ecriture = await rest('candidatures', {
    methode: 'POST',
    corps: {
      nom: 'ZZAUDIT sonde',
      telephone: '000000',
      email: MARQUEUR,
      ville: 'ZZ',
      postes: ['ZZ'],
      disponibilites: 'ZZ',
      travail_exterieur: false,
      a_experience: false,
      statut: 'traite',
    },
  })
  verdict(
    ecriture.statut >= 400,
    `candidatures — insertion anonyme avec statut forcé ${ecriture.statut < 400 ? 'ACCEPTÉE' : 'refusée'}`,
    ecriture.statut < 400 ? 'exécuter la migration 0019 §3' : `statut ${ecriture.statut}`,
  )

  if (ecriture.statut < 400) {
    await nettoyer(
      `${URL_BASE}/rest/v1/candidatures?email=eq.${encodeURIComponent(MARQUEUR)}`,
      null,
      'candidature de test insérée',
    )
  }

  // `videos` est du contenu marketing : la lecture publique est NORMALE, on
  // vérifie seulement qu'elle se limite aux vidéos actives.
  const v = await rest('videos?select=actif')
  if (v.statut !== 200) {
    note('lecture des vidéos impossible', `statut ${v.statut} ${v.message ?? ''}`)
  } else {
    const inactives = v.charge.filter((x) => x.actif === false).length
    verdict(inactives === 0, `${inactives} vidéo(s) inactive(s) visible(s) publiquement`, '')
  }
}

/**
 * commandes / lignes_commande — migration 0021.
 *
 * ⚠️ Différent de tout ce qui précède : `anon` ne doit RIEN pouvoir faire ici,
 * ni lire ni écrire, quel que soit le filtre — pas même un GRANT insert.
 * Depuis 0021, confirmer une commande exige une session (décision de
 * Christian, 1ᵉʳ août 2026) ; `anon` n'a donc plus aucune raison légitime de
 * toucher ces deux tables, à aucun moment du parcours. Le test d'accès
 * croisé entre deux comptes réels (A ne lit ni ne modifie une commande de B)
 * est fait à part, dans les E2E — deux sessions authentifiées ne se prouvent
 * pas avec la seule clé publique.
 */
async function commandes() {
  const c = await rest('commandes?select=id&limit=1')
  if (c.code === 'PGRST205') {
    note('commandes — table absente', 'exécuter la migration 0021')
  } else {
    verdict(
      c.statut === 401,
      `commandes — lecture anonyme ${c.statut === 200 ? 'ACCORDÉE (RLS seul rempart)' : 'refusée'}`,
      `statut ${c.statut}`,
    )
  }

  const l = await rest('lignes_commande?select=id&limit=1')
  if (l.code !== 'PGRST205') {
    verdict(
      l.statut === 401,
      `lignes_commande — lecture anonyme ${l.statut === 200 ? 'ACCORDÉE (RLS seul rempart)' : 'refusée'}`,
      `statut ${l.statut}`,
    )
  }

  // Corps minimal mais valide : si jamais un GRANT INSERT existait par
  // erreur, on veut le voir échouer sur le RLS, pas sur une colonne
  // manquante qui masquerait la vraie question.
  const MARQUEUR = `zzaudit-sonde-${Date.now()}@example.test`
  const ins = await rest('commandes', {
    methode: 'POST',
    corps: { nom: 'ZZAUDIT sonde', email: MARQUEUR, mode_livraison: 'ramassage' },
  })
  if (ins.code !== 'PGRST205') {
    verdict(
      ins.statut >= 400,
      `commandes — insertion anonyme ${ins.statut < 400 ? 'ACCEPTÉE' : 'refusée'}`,
      ins.statut < 400 ? 'GRANT INSERT à retirer (0021 ne doit en poser aucun à anon)' : `statut ${ins.statut}`,
    )
    if (ins.statut < 400) {
      await nettoyer(
        `${URL_BASE}/rest/v1/commandes?email=eq.${encodeURIComponent(MARQUEUR)}`,
        null,
        'commande de test insérée par la sonde',
      )
    }
  }
}

async function stockage() {
  await bucketPhotos('produits', '0010')
  await bucketPhotos('realisations', '0012')
  await bucketCv()
  await tablesRecentes()
  await commandes()
}

/* -- 5. données de développement en production ------------------------------- */

/**
 * 0003_seed_dev.sql a été exécuté sur la base de production. Les lignes qu'il
 * a créées sont publiques : une fausse offre d'emploi et des réalisations
 * inventées sont visibles par n'importe qui, et indexables.
 */
async function seedDev() {
  console.log('\n5 · Restes du jeu de données de développement')

  // ⚠️ postes_carrieres se publie avec `actif`, pas `publie` (0001). Confondre
  // les deux renvoie un 400 — c'est l'erreur qui avait fait annuler 0008 en
  // entier, la transaction emportant la mise à jour des réalisations avec elle.
  //
  // ⚠️ CE CONTRÔLE A ÉTÉ RETIRÉ, ET C'EST VOLONTAIRE.
  //
  // Il cherchait le titre « Chef d'équipe terrain », qui désignait la fausse
  // offre de 0003. La migration 0017 a inséré les NEUF postes réels de
  // Christian, et l'un d'eux porte exactement ce titre. Le contrôle signalait
  // donc une vraie offre comme du contenu de démonstration à chaque exécution
  // — et une alerte qui crie au loup finit par masquer les vraies.
  //
  // Il n'y a rien à remettre à la place : le seed n'a jamais inséré cette
  // offre (son `where not exists` l'en a empêchée), et les neuf offres en base
  // sont toutes réelles. On compte simplement, pour que le chiffre saute aux
  // yeux si un jour il change tout seul.
  const r = await rest('postes_carrieres?select=titre_fr&actif=eq.true')
  if (r.statut !== 200) {
    note('lecture des offres impossible', `statut ${r.statut} ${r.message ?? ''}`)
  } else {
    note(`${r.charge.length} offre(s) active(s)`, 'toutes réelles depuis 0017')
  }

  const rr = await rest('realisations?select=slug,titre_fr&publie=eq.true')
  if (rr.statut !== 200) {
    note('lecture des réalisations impossible', `statut ${rr.statut} ${rr.message ?? ''}`)
    return
  }
  const seed = ['deploiement-evenementiel-2025', 'installation-saisonniere-2025', 'fabrication-sur-mesure-2025']
  const fictives = rr.charge.filter((x) => seed.includes(x.slug))
  verdict(
    fictives.length === 0,
    `${fictives.length} réalisation(s) fictive(s) en ligne sur ${rr.charge.length}`,
    fictives.map((x) => x.titre_fr).join(', '),
  )
}

/* -- 6. réglages ------------------------------------------------------------- */

/**
 * La table des réglages est un cas particulier : elle est LUE publiquement
 * — le site rend le pied de page avec la clé anon — mais ne doit jamais être
 * ÉCRITE que par un admin. Une politique d'écriture trop large donnerait à
 * n'importe qui l'adresse qui reçoit les demandes de devis.
 */
async function reglages() {
  console.log('\n6 · Réglages du site')

  const lecture = await rest('reglages?select=cle,valeur,publique')
  if (lecture.statut === 404 || lecture.code === '42P01') {
    note('table absente', 'migration 0011 non exécutée — le site tourne sur ses valeurs de repli')
    return
  }
  if (lecture.statut !== 200) {
    note('lecture impossible', `statut ${lecture.statut} ${lecture.message ?? ''}`)
    return
  }

  verdict(lecture.charge.length > 0, `${lecture.charge.length} réglage(s) lisible(s) publiquement`)
  verdict(
    lecture.charge.every((r) => r.publique === true),
    'aucun réglage non public n’est exposé',
    'la politique de lecture publique filtre bien sur `publique`',
  )

  // Écriture anonyme : doit être filtrée. PostgREST ne renvoie PAS d'erreur
  // quand le RLS filtre un UPDATE — il en modifie zéro. On compte donc les
  // lignes renvoyées plutôt que de se fier au statut.
  const r = await fetch(
    `${URL_BASE}/rest/v1/reglages?cle=eq.contact_courriel&select=cle`,
    {
      method: 'PATCH',
      headers: {
        apikey: CLE_PUBLIQUE,
        Authorization: `Bearer ${CLE_PUBLIQUE}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ valeur: 'audit@example.invalid' }),
    },
  )
  const touchees = r.status === 200 ? ((await r.json()) ?? []).length : 0
  verdict(
    touchees === 0,
    `écriture anonyme ${touchees === 0 ? 'sans effet' : 'ACCEPTÉE — ' + touchees + ' ligne(s)'}`,
    `statut ${r.status}`,
  )

  // Contrôle de non-régression : si la ligne AVAIT été modifiée, on le voit.
  const apres = await rest('reglages?select=valeur&cle=eq.contact_courriel')
  if (apres.statut === 200 && apres.charge[0]) {
    verdict(
      apres.charge[0].valeur !== 'audit@example.invalid',
      'le courriel de contact est intact',
      apres.charge[0].valeur,
    )
  }
}

/* -- exécution --------------------------------------------------------------- */

console.log(`Audit de ${URL_BASE}`)
await lectures()
await ecritures()
await contrainteRole()
await stockage()
await seedDev()
await reglages()

console.log(
  alertes === 0
    ? `\n${VERT}Aucune alerte.${RAZ}\n`
    : `\n${ROUGE}${alertes} alerte(s).${RAZ}\n`,
)
process.exit(alertes === 0 ? 0 : 1)
