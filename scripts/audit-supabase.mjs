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

async function stockage() {
  await bucketPhotos('produits', '0010')
  await bucketPhotos('realisations', '0012')
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
  const r = await rest('postes_carrieres?select=titre_fr&actif=eq.true')
  if (r.statut !== 200) {
    note('lecture des offres impossible', `statut ${r.statut} ${r.message ?? ''}`)
  } else {
    const faux = r.charge.filter((p) => /chef d.équipe terrain/i.test(p.titre_fr ?? ''))
    verdict(
      faux.length === 0,
      `${faux.length} offre(s) fictive(s) en ligne sur ${r.charge.length}`,
      faux.map((p) => p.titre_fr).join(', '),
    )
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
