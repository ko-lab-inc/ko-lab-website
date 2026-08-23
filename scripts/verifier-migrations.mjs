/**
 * Compare ce que les migrations de supabase/migrations/*.sql DÉCLARENT à ce
 * qui existe RÉELLEMENT en base — colonnes, GRANTs, policies, fonctions,
 * triggers — par sonde comportementale et par parsing du dépôt, jamais en
 * faisant confiance à la seule lecture des fichiers .sql.
 *
 *     node scripts/verifier-migrations.mjs
 *
 * -----------------------------------------------------------------------------
 * POURQUOI CE SCRIPT EXISTE
 * -----------------------------------------------------------------------------
 * Audit du 22 août 2026 : trois migrations écrites et jamais appliquées
 * (0017 §GRANT INSERT candidatures, 0028 colonne candidatures.canal, 0037
 * medias_emplacements.url_stockage) sont restées invisibles pendant 3
 * semaines — découvertes par accident, en sondant tout autre chose. Rien
 * dans le projet ne comparait automatiquement le dépôt à la base.
 *
 * `scripts/audit-supabase.mjs` sonde déjà le comportement réel, mais avec
 * une liste de contrôles ÉCRITE À LA MAIN, table par table — un nouvel écart
 * sur une table qu'on n'a pas pensé à y ajouter reste invisible. Ce script-ci
 * part du dépôt : il EXTRAIT ce que chaque migration déclare (par parsing des
 * fichiers .sql, un travail purement mécanique) puis sonde si c'est vrai. Un
 * nouvel `add column` ou un nouveau `grant` dans une future migration est
 * automatiquement couvert au prochain lancement, sans y toucher.
 *
 * -----------------------------------------------------------------------------
 * LECTURE SEULE — AUCUNE CORRECTION AUTOMATIQUE
 * -----------------------------------------------------------------------------
 * Les seules écritures faites ici sont des sondes minimales, immédiatement
 * nettoyées dans un `finally` (voir `nettoyer()` et le compte `authenticated`
 * jetable créé pour les GRANTs de ce rôle). Ce script ne pose ni ne retire
 * jamais un GRANT, une policy, une colonne ou une contrainte — il RAPPORTE
 * l'écart, la correction reste un choix humain, faite dans SA PROPRE
 * migration numérotée.
 *
 * -----------------------------------------------------------------------------
 * CE QUE CE SCRIPT NE PEUT PAS VÉRIFIER LUI-MÊME
 * -----------------------------------------------------------------------------
 * PostgREST n'expose que les schémas `public` et `graphql_public` — vérifié
 * en direct, `information_schema` et `pg_catalog` répondent `406 PGRST106`
 * quel que soit la clé utilisée, y compris la clé de service. Le texte EXACT
 * des politiques RLS (`qual`/`with_check`) et le `proacl` des fonctions
 * restent donc hors de portée d'ici — ce script se contente d'en dresser
 * l'inventaire déclaré et imprime la requête SQL à coller dans l'éditeur
 * Supabase pour les confirmer.
 * -----------------------------------------------------------------------------
 */

import { readFileSync, readdirSync } from 'node:fs'

/* -- configuration ------------------------------------------------------- */

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

if (!URL_BASE || !CLE_PUBLIQUE || !CLE_SERVICE) {
  console.error('NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY ou SUPABASE_SERVICE_ROLE_KEY manquante')
  process.exit(1)
}

const MIGRATIONS_DIR = new URL('../supabase/migrations/', import.meta.url)

/* -- couleurs -------------------------------------------------------------- */

const VERT = '\x1b[32m'
const ROUGE = '\x1b[31m'
const JAUNE = '\x1b[33m'
const GRIS = '\x1b[90m'
const RAZ = '\x1b[0m'

let alertes = 0

function verdict(ok, texte, detail) {
  if (ok) console.log(`  ${VERT}ok${RAZ}    ${texte} ${GRIS}${detail ?? ''}${RAZ}`)
  else {
    alertes += 1
    console.log(`  ${ROUGE}ÉCART${RAZ}  ${texte} ${GRIS}${detail ?? ''}${RAZ}`)
  }
}

function note(texte, detail) {
  console.log(`  ${JAUNE}note${RAZ}  ${texte} ${GRIS}${detail ?? ''}${RAZ}`)
}

/* -- 1. extraction du dépôt : ce que les migrations déclarent -------------- */

const fichiers = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort()

const colonnesDeclarees = [] // { table, colonne, migration }
const grantsTable = new Map() // "table|role|privilege" -> { accorde: bool, migration }
const policiesDeclarees = [] // { table, nom, cmd, migration }
const fonctionsDeclarees = [] // { nom, securityDefiner, migration }
const triggersDeclares = [] // { nom, table, migration }

const ROLES_SUIVIS = ['anon', 'authenticated']

function enregistrerGrant(sens, table, privsBrut, rolesBrut, migration) {
  const privs = privsBrut.split(',').map((p) => p.trim().toLowerCase()).filter(Boolean)
  const roles = rolesBrut.split(',').map((r) => r.trim().toLowerCase()).filter(Boolean)
  for (const role of roles) {
    if (!ROLES_SUIVIS.includes(role)) continue
    for (const priv of privs) {
      if (!['select', 'insert', 'update', 'delete'].includes(priv)) continue
      grantsTable.set(`${table}|${role}|${priv}`, { accorde: sens === 'grant', migration })
    }
  }
}

for (const fichier of fichiers) {
  const texte = readFileSync(new URL(fichier, MIGRATIONS_DIR), 'utf8')

  // --- add column (un bloc `alter table` peut ajouter plusieurs colonnes) ---
  for (const bloc of texte.matchAll(/alter\s+table\s+(?:if\s+exists\s+)?public\.(\w+)\s*\n((?:\s*add\s+column[^;]*?,\s*\n)*\s*add\s+column[^;]*?)(?=;)/gis)) {
    const table = bloc[1]
    for (const col of bloc[2].matchAll(/add\s+column\s+(?:if\s+not\s+exists\s+)?(\w+)/gi)) {
      colonnesDeclarees.push({ table, colonne: col[1], migration: fichier })
    }
  }

  // --- grant / revoke sur une table (jamais sur schema/sequence/function) ---
  for (const m of texte.matchAll(
    /^\s*(grant|revoke)\s+([a-z, ]+?)\s+on\s+(?:table\s+)?public\.(\w+)\s+(?:to|from)\s+([a-z_, ]+?);/gim,
  )) {
    const [, sens, privs, table, roles] = m
    if (/^all\b/i.test(privs.trim())) continue // grant all ... to service_role — hors périmètre anon/authenticated
    enregistrerGrant(sens.toLowerCase(), table, privs, roles, fichier)
  }

  // --- policies déclarées (inventaire seulement, pas le qual/with_check) ---
  for (const m of texte.matchAll(/create\s+policy\s+"([^"]+)"\s*\n\s*on\s+public\.(\w+)\s+for\s+(\w+)/gi)) {
    policiesDeclarees.push({ nom: m[1], table: m[2], cmd: m[3].toLowerCase(), migration: fichier })
  }

  // --- fonctions (security definer ou non) ---
  for (const m of texte.matchAll(/create\s+(?:or\s+replace\s+)?function\s+public\.(\w+)\s*\([^)]*\)[\s\S]{0,200}?(?=\$\$|\$function\$|as\s)/gi)) {
    const nom = m[1]
    const securityDefiner = /security\s+definer/i.test(m[0])
    // Une fonction peut être redéfinie par une migration ultérieure (create or
    // replace) : on garde la DERNIÈRE déclaration rencontrée, l'ordre des
    // fichiers est chronologique.
    const existant = fonctionsDeclarees.findIndex((f) => f.nom === nom)
    const entree = { nom, securityDefiner, migration: fichier }
    if (existant >= 0) fonctionsDeclarees[existant] = entree
    else fonctionsDeclarees.push(entree)
  }

  // --- triggers ---
  for (const m of texte.matchAll(/create\s+trigger\s+(\w+)[\s\S]{0,200}?on\s+public\.(\w+)/gi)) {
    triggersDeclares.push({ nom: m[1], table: m[2], migration: fichier })
  }
}

console.log(`Migrations analysées : ${fichiers.length} fichier(s) dans supabase/migrations/`)

/* -- 2. colonnes : chaque `add column` déclaré existe-t-il vraiment ? ------- */

async function verifierColonnes() {
  console.log('\n1 · Colonnes ajoutées par une migration (`alter table ... add column`)')

  if (colonnesDeclarees.length === 0) {
    note('aucune colonne ajoutée détectée dans le dépôt')
    return
  }

  for (const { table, colonne, migration } of colonnesDeclarees) {
    const r = await fetch(`${URL_BASE}/rest/v1/${table}?select=${colonne}&limit=1`, {
      headers: { apikey: CLE_SERVICE, Authorization: `Bearer ${CLE_SERVICE}` },
    })
    const texte = await r.text()
    const manquante = r.status === 400 && /42703|does not exist/.test(texte)
    verdict(
      !manquante,
      `${table}.${colonne.padEnd(20)}`,
      manquante ? `MANQUANTE — déclarée par ${migration}` : `déclarée par ${migration}`,
    )
  }
}

/* -- 3. GRANTs `anon` : sonde comportementale, sans écrire de vraie ligne --- */

/**
 * Reprend la technique de `audit-supabase.mjs` (`ecritures()`) : un corps
 * `{}` échoue TOUJOURS, mais le MESSAGE d'erreur dit pourquoi.
 *
 * ⚠️ LE CODE SEUL NE SUFFIT PAS POUR UN INSERT — piège trouvé en écrivant ce
 * script : Postgres renvoie `42501` à la fois pour « GRANT absent »
 * (message « permission denied for table X ») ET pour « RLS refuse le
 * with_check » (message « new row violates row-level security policy for
 * table X »). Une première version de cette fonction ne regardait que le
 * code et signalait à tort une absence de GRANT sur `realisations`,
 * `produits_boutique`, `postes_carrieres`, `videos`, `commandes` et
 * `lignes_commande` — six faux positifs, alors que RLS faisait exactement
 * son travail (un compte `client` jetable n'a pas le droit d'y écrire). Le
 * texte du message est donc ce qui distingue les deux, pas le code seul.
 *
 *   « permission denied »              → le privilège lui-même manque (GRANT absent)
 *   « row-level security policy »      → le GRANT est là, RLS a refusé la ligne
 *   autre chose (23502, 23514, ...)    → le GRANT est là, seule la validation
 *                                          du schéma a arrêté ce corps vide
 *
 * Pour UPDATE/DELETE, un filtre sur un id inexistant isole le GRANT de la
 * décision RLS : `42501 permission denied` = GRANT absent, `200`/`204` =
 * GRANT présent (RLS décide ensuite des lignes visibles, question distincte
 * de celle posée ici — un `using` qui échoue sur un id inexistant ne lève
 * jamais d'erreur, il retourne simplement zéro ligne).
 */
async function sondeGrantAnon(table, priv) {
  const idBidon = '00000000-0000-0000-0000-000000000000'
  const commun = { apikey: CLE_PUBLIQUE, Authorization: `Bearer ${CLE_PUBLIQUE}`, 'Content-Type': 'application/json' }

  if (priv === 'select') {
    const r = await fetch(`${URL_BASE}/rest/v1/${table}?select=*&limit=1`, { headers: commun })
    return r.status !== 401 && r.status !== 403
  }
  if (priv === 'insert') {
    const r = await fetch(`${URL_BASE}/rest/v1/${table}`, { method: 'POST', headers: commun, body: '{}' })
    const j = await r.json().catch(() => ({}))
    return !(j.code === '42501' && /permission denied/i.test(j.message ?? ''))
  }
  if (priv === 'update') {
    const r = await fetch(`${URL_BASE}/rest/v1/${table}?id=eq.${idBidon}`, { method: 'PATCH', headers: commun, body: '{}' })
    return r.status !== 401 && r.status !== 403
  }
  if (priv === 'delete') {
    const r = await fetch(`${URL_BASE}/rest/v1/${table}?id=eq.${idBidon}`, { method: 'DELETE', headers: commun })
    return r.status !== 401 && r.status !== 403
  }
  return null
}

async function verifierGrantsAnon() {
  console.log('\n2 · GRANTs déclarés pour `anon` (sonde comportementale, corps vide, rien n’est créé)')

  const entrees = [...grantsTable.entries()].filter(([cle]) => cle.split('|')[1] === 'anon')
  if (entrees.length === 0) {
    note('aucun GRANT vers anon détecté dans le dépôt')
    return
  }

  for (const [cle, { accorde, migration }] of entrees) {
    const [table, , priv] = cle.split('|')
    const present = await sondeGrantAnon(table, priv)
    verdict(
      present === accorde,
      `anon ${priv.toUpperCase().padEnd(7)} ${table.padEnd(22)}`,
      accorde
        ? present
          ? `déclaré par ${migration}, confirmé`
          : `déclaré par ${migration}, ABSENT EN BASE`
        : present
          ? `révoqué par ${migration}, MAIS TOUJOURS PRÉSENT EN BASE`
          : `absence confirmée`,
    )
  }
}

/* -- 4. GRANTs `authenticated` : nécessite un compte jetable ---------------- */

async function creerCompteJetable() {
  const email = `audit-migrations+${Date.now()}@ko-lab.test`
  const mdp = `Zz!${Math.random().toString(36).slice(2)}Aa9`
  const r = await fetch(`${URL_BASE}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: CLE_SERVICE, Authorization: `Bearer ${CLE_SERVICE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: mdp, email_confirm: true }),
  })
  const { id } = await r.json()
  const t = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: CLE_PUBLIQUE, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: mdp }),
  })
  const { access_token: jeton } = await t.json()
  return { id, jeton }
}

async function supprimerCompteJetable(id) {
  await fetch(`${URL_BASE}/auth/v1/admin/users/${id}`, {
    method: 'DELETE',
    headers: { apikey: CLE_SERVICE, Authorization: `Bearer ${CLE_SERVICE}` },
  })
}

/**
 * Même principe que `sondeGrantAnon`, avec le jeton d'un compte authentifié
 * jetable (rôle `client` par défaut — le GRANT de table est le même pour
 * tout `authenticated` quel que soit `profils.role`, seule RLS distingue
 * ensuite les rôles entre eux, question hors périmètre ici).
 */
async function sondeGrantAuthentifie(table, priv, jeton) {
  const idBidon = '00000000-0000-0000-0000-000000000000'
  const commun = { apikey: CLE_PUBLIQUE, Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' }

  if (priv === 'select') {
    const r = await fetch(`${URL_BASE}/rest/v1/${table}?select=*&limit=1`, { headers: commun })
    return r.status !== 401 && r.status !== 403
  }
  if (priv === 'insert') {
    const r = await fetch(`${URL_BASE}/rest/v1/${table}`, { method: 'POST', headers: commun, body: '{}' })
    const j = await r.json().catch(() => ({}))
    return !(j.code === '42501' && /permission denied/i.test(j.message ?? ''))
  }
  if (priv === 'update') {
    const r = await fetch(`${URL_BASE}/rest/v1/${table}?id=eq.${idBidon}`, { method: 'PATCH', headers: commun, body: '{}' })
    return r.status !== 401 && r.status !== 403
  }
  if (priv === 'delete') {
    const r = await fetch(`${URL_BASE}/rest/v1/${table}?id=eq.${idBidon}`, { method: 'DELETE', headers: commun })
    return r.status !== 401 && r.status !== 403
  }
  return null
}

async function verifierGrantsAuthentifies() {
  console.log('\n3 · GRANTs déclarés pour `authenticated` (compte jetable, supprimé en fin de script)')

  const entrees = [...grantsTable.entries()].filter(([cle]) => cle.split('|')[1] === 'authenticated')
  if (entrees.length === 0) {
    note('aucun GRANT vers authenticated détecté dans le dépôt')
    return
  }

  const { id, jeton } = await creerCompteJetable()
  try {
    for (const [cle, { accorde, migration }] of entrees) {
      const [table, , priv] = cle.split('|')
      const present = await sondeGrantAuthentifie(table, priv, jeton)
      verdict(
        present === accorde,
        `authenticated ${priv.toUpperCase().padEnd(7)} ${table.padEnd(22)}`,
        accorde
          ? present
            ? `déclaré par ${migration}, confirmé`
            : `déclaré par ${migration}, ABSENT EN BASE`
          : present
            ? `révoqué par ${migration}, MAIS TOUJOURS PRÉSENT EN BASE`
            : `absence confirmée`,
      )
    }
  } finally {
    await supprimerCompteJetable(id)
  }
}

/* -- 5. fonctions SECURITY DEFINER : exécutables par anon ? ----------------- */

async function verifierFonctions() {
  console.log('\n4 · Fonctions `SECURITY DEFINER` déclarées — exécutables par anon ?')

  const definer = fonctionsDeclarees.filter((f) => f.securityDefiner)
  if (definer.length === 0) {
    note('aucune fonction SECURITY DEFINER détectée dans le dépôt')
    return
  }

  for (const { nom, migration } of definer) {
    const r = await fetch(`${URL_BASE}/rest/v1/rpc/${nom}`, {
      method: 'POST',
      headers: { apikey: CLE_PUBLIQUE, Authorization: `Bearer ${CLE_PUBLIQUE}`, 'Content-Type': 'application/json' },
      body: '{}',
    })
    const j = await r.json().catch(() => ({}))
    if (r.status === 404 && j.code === 'PGRST202') {
      note(`${nom.padEnd(30)} 404 — fonction trigger, exclue du catalogue RPC (attendu)`, migration)
    } else if (r.status === 401 && j.code === '42501') {
      note(`${nom.padEnd(30)} 401 — EXECUTE non accordé à anon`, migration)
    } else {
      note(`${nom.padEnd(30)} ${r.status} — appelable par anon, à confirmer que c'est voulu`, migration)
    }
  }
}

/* -- 6. inventaire non vérifiable ici : policies + triggers ----------------- */

function inventaireSqlEditor() {
  console.log('\n5 · Policies et triggers déclarés — inventaire (contenu réel non vérifiable via PostgREST)')

  console.log(`  ${GRIS}${policiesDeclarees.length} policy(ies) déclarée(s), ${triggersDeclares.length} trigger(s) déclaré(s)${RAZ}`)
  console.log(`  ${JAUNE}information_schema et pg_catalog ne sont pas exposés par PostgREST (406 PGRST106,`)
  console.log(`  vérifié avec la clé de service). Coller dans l'éditeur SQL Supabase pour confirmer :${RAZ}`)
  console.log(`
    select tablename, policyname, cmd, roles, qual, with_check
    from pg_policies where schemaname = 'public' order by tablename, cmd;

    select tgname, relname as table, tgenabled
    from pg_trigger t join pg_class c on c.oid = t.tgrelid
    where not tgisinternal and relnamespace = 'public'::regnamespace
    order by relname, tgname;

    select proname, prosecdef as security_definer, proconfig, proacl
    from pg_proc where pronamespace = 'public'::regnamespace;
`)
}

/* -- exécution --------------------------------------------------------------- */

console.log(`\nBase : ${URL_BASE}\n`)
await verifierColonnes()
await verifierGrantsAnon()
await verifierGrantsAuthentifies()
await verifierFonctions()
inventaireSqlEditor()

console.log(
  alertes === 0
    ? `\n${VERT}Aucun écart mesurable entre le dépôt et la base.${RAZ}\n`
    : `\n${ROUGE}${alertes} écart(s) entre le dépôt et la base — voir ÉCART ci-dessus.${RAZ}\n`,
)
process.exit(alertes === 0 ? 0 : 1)
