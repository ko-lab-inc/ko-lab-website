/**
 * Vérifie la synchronisation Rentman DE BOUT EN BOUT, sur la vraie base.
 *
 *     npm run rentman:verifier
 *
 * -----------------------------------------------------------------------------
 * POURQUOI CE SCRIPT, ET POURQUOI IL ÉCRIT
 *
 * Les tests unitaires prouvent que la normalisation décide juste. Ils ne
 * prouvent pas que la ligne arrive en base, que la photo atterrit dans le
 * bucket, que relancer la passe ne réécrit rien, ni qu'un article retiré de la
 * boutique se dépublie au lieu de disparaître. Tout cela ne se voit qu'en
 * écrivant.
 *
 * Il n'existe pas d'environnement de test séparé (CLAUDE.md, « Base unique »),
 * donc les règles de ce fichier sont celles qu'impose cette contrainte :
 *
 *   · L'inventaire Rentman n'est JAMAIS touché. Les articles sont injectés en
 *     mémoire (`synchroniser` accepte une source), le compte Rentman du client
 *     n'est même pas interrogé.
 *   · Tout ce qui est écrit porte un identifiant NÉGATIF et un slug préfixé
 *     `AUDIT_<horodatage>` — impossible à confondre avec un vrai article, dont
 *     l'identifiant Rentman est toujours positif.
 *   · Le nettoyage est dans un `finally`, et il s'exécute même si une
 *     vérification échoue en cours de route.
 *
 * ⚠️ Nécessite --conditions=react-server : la bibliothèque est marquée
 * `server-only` et refuse de s'importer sans (voir le script npm).
 * -----------------------------------------------------------------------------
 */

import { readFileSync } from 'node:fs'

const VERT = '\x1b[32m'
const ROUGE = '\x1b[31m'
const GRIS = '\x1b[90m'
const RAZ = '\x1b[0m'

// --- Variables d'environnement : .env.local en développement.
for (const ligne of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const i = ligne.indexOf('=')
  if (i > 0 && /^[A-Z_]+$/.test(ligne.slice(0, i))) {
    process.env[ligne.slice(0, i)] ??= ligne.slice(i + 1).trim()
  }
}

const { synchroniser } = await import('../src/lib/rentman/synchroniser.ts')
const { createClient } = await import('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

const HORODATAGE = Date.now()
const ID_TEST = -HORODATAGE % 100000000 // négatif : jamais un identifiant Rentman
const NOM = `AUDIT_${HORODATAGE} Table de verification`

let reussites = 0
let echecs = 0
function verifier(libelle, condition, detail = '') {
  if (condition) {
    reussites += 1
    console.log(`  ${VERT}OK${RAZ}    ${libelle}${detail ? ` ${GRIS}${detail}${RAZ}` : ''}`)
  } else {
    echecs += 1
    console.log(`  ${ROUGE}ÉCHEC${RAZ} ${libelle}${detail ? ` ${GRIS}${detail}${RAZ}` : ''}`)
  }
}

/** L'article injecté. Mêmes formes que la vraie base : texte « FR / EN »,
 *  note interne qui ne doit jamais sortir, dossier Mobilier. */
function articleTest(sur = {}) {
  return {
    id: ID_TEST,
    displayname: NOM,
    folder: '/folders/75', // Mobilier
    in_shop: true,
    external_remark:
      'Table de vérification, écrite par un script d’audit. / Verification table, written by an audit script.',
    internal_remark: 'NOTE INTERNE AUDIT — ne doit jamais atteindre le site.',
    price: 42,
    tags: 'audit, verification',
    image: null,
    modified: '2026-10-01T12:00:00-04:00',
    ...sur,
  }
}

const lire = async () =>
  (
    await supabase
      .from('articles_location')
      .select('*')
      .eq('rentman_id', ID_TEST)
      .maybeSingle()
  ).data

try {
  console.log(`\nArticle d'audit : rentman_id ${ID_TEST}, « ${NOM} »\n`)

  // ---------------------------------------------------------------- 1. Création
  console.log('1. Première passe — création')
  let r = await synchroniser(async () => [articleTest()])
  let ligne = await lire()
  verifier('la ligne est créée', r.crees === 1 && ligne !== null, `crees=${r.crees}`)
  verifier('elle est publiée', ligne?.publie === true)
  verifier('catégorie déduite du dossier Rentman', ligne?.categorie === 'mobilier', `→ ${ligne?.categorie}`)
  verifier(
    'texte coupé en français',
    ligne?.description_fr === 'Table de vérification, écrite par un script d’audit.',
  )
  verifier(
    'texte coupé en anglais',
    ligne?.description_en === 'Verification table, written by an audit script.',
  )
  verifier('prix repris', Number(ligne?.prix) === 42)
  verifier('tags repris', JSON.stringify(ligne?.tags) === JSON.stringify(['audit', 'verification']))
  verifier(
    'LA NOTE INTERNE N’EST NULLE PART',
    !JSON.stringify(ligne).includes('NOTE INTERNE AUDIT'),
  )

  // ------------------------------------------------------------- 2. Idempotence
  console.log('\n2. Deuxième passe, données identiques — rien ne doit être réécrit')
  const avant = ligne.updated_at
  r = await synchroniser(async () => [articleTest()])
  ligne = await lire()
  verifier('comptée comme inchangée', r.inchanges === 1, `inchanges=${r.inchanges}`)
  verifier('aucune mise à jour', r.mis_a_jour === 0 && r.crees === 0)
  verifier('updated_at n’a pas bougé', ligne.updated_at === avant)

  // ----------------------------------------------------------- 3. Modification
  console.log('\n3. Troisième passe, article modifié dans Rentman')
  r = await synchroniser(async () => [
    articleTest({ modified: '2026-10-02T09:00:00-04:00', price: 55 }),
  ])
  ligne = await lire()
  verifier('comptée comme mise à jour', r.mis_a_jour === 1, `mis_a_jour=${r.mis_a_jour}`)
  verifier('le nouveau prix est en base', Number(ligne.prix) === 55)
  verifier('le slug n’a PAS changé', ligne.slug.endsWith(String(ID_TEST)), `→ ${ligne.slug}`)

  // -------------------------------------------------------- 4. Case décochée
  console.log('\n4. Quatrième passe, case in_shop retirée — dépublication, pas suppression')
  r = await synchroniser(async () => [articleTest({ in_shop: false })])
  ligne = await lire()
  verifier('comptée comme dépubliée', r.depublies === 1, `depublies=${r.depublies}`)
  verifier('LA LIGNE EXISTE TOUJOURS', ligne !== null)
  verifier('elle n’est plus publiée', ligne?.publie === false)

  // --------------------------------------------------- 5. Invisible pour anon
  console.log('\n5. Un article dépublié est invisible du public')
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const { data: vuParAnon } = await anon
    .from('articles_location')
    .select('rentman_id')
    .eq('rentman_id', ID_TEST)
  verifier('anon ne le voit pas', (vuParAnon ?? []).length === 0, `${(vuParAnon ?? []).length} ligne(s)`)

  // ------------------------------------------------------------ 6. Republication
  console.log('\n6. Case recochée — l’article revient')
  r = await synchroniser(async () => [articleTest()])
  ligne = await lire()
  verifier('republié', ligne?.publie === true)
  verifier('même slug qu’à la création', ligne.slug.endsWith(String(ID_TEST)))
} finally {
  // --------------------------------------------------------------- Nettoyage
  const { error } = await supabase.from('articles_location').delete().eq('rentman_id', ID_TEST)
  const reste = await lire()
  console.log(
    `\n${GRIS}Nettoyage :${RAZ} ${error ? ROUGE + error.message + RAZ : reste === null ? VERT + 'ligne d’audit supprimée' + RAZ : ROUGE + 'LIGNE RESTANTE — à supprimer à la main' + RAZ}`,
  )
  const { count } = await supabase
    .from('articles_location')
    .select('rentman_id', { count: 'exact', head: true })
  console.log(`${GRIS}Lignes restantes dans la table :${RAZ} ${count}`)
}

console.log(`\n${echecs === 0 ? VERT : ROUGE}${reussites} vérification(s) réussie(s), ${echecs} échec(s)${RAZ}\n`)
process.exit(echecs === 0 ? 0 : 1)
