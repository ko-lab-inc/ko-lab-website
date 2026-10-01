/**
 * Répétition à blanc de la synchronisation Rentman — N'ÉCRIT RIEN.
 *
 *     node scripts/rentman-apercu.mjs            # ce qui serait publié aujourd'hui
 *     node scripts/rentman-apercu.mjs --tout     # idem en ignorant la case in_shop
 *     node scripts/rentman-apercu.mjs --rejets   # détail des articles écartés
 *
 * -----------------------------------------------------------------------------
 * POURQUOI CE SCRIPT EXISTE
 *
 * Au 1er octobre 2026, zéro article sur 584 porte la case « in_shop » de
 * Rentman : une vraie synchronisation importerait donc zéro ligne, et on ne
 * saurait pas si c'est parce que la règle fonctionne ou parce que le code est
 * cassé. `--tout` lève ce doute en montrant le catalogue qu'on obtiendrait si
 * KO-LAB cochait tout — sans rien publier.
 *
 * Il sert aussi de garde-fou permanent : chaque passe signale les dossiers
 * Rentman que la table de correspondance ne connaît pas encore. Un dossier
 * ajouté là-bas ne doit jamais se ranger tout seul dans « décor ».
 *
 * ⚠️ LECTURE SEULE, des GET uniquement. Le compte Rentman est l'inventaire
 * réel de KO-LAB : voir CLAUDE.md, « Base unique ».
 * -----------------------------------------------------------------------------
 */

import { readFileSync } from 'node:fs'

const VERT = '\x1b[32m'
const ROUGE = '\x1b[31m'
const JAUNE = '\x1b[33m'
const GRIS = '\x1b[90m'
const RAZ = '\x1b[0m'

const TOUT = process.argv.includes('--tout')
const REJETS = process.argv.includes('--rejets')

// --- jeton : .env.local en développement, variable d'environnement sinon.
let jeton = process.env.RENTMAN_API_TOKEN
if (!jeton) {
  try {
    const l = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
      .split('\n')
      .find((x) => x.startsWith('RENTMAN_API_TOKEN='))
    jeton = l?.slice('RENTMAN_API_TOKEN='.length).trim()
  } catch {
    /* fichier absent : message ci-dessous */
  }
}
if (!jeton) {
  console.error(`${ROUGE}RENTMAN_API_TOKEN introuvable (ni variable d'environnement, ni .env.local).${RAZ}`)
  process.exit(1)
}

// --- Les règles sont celles du site, importées, pas recopiées : un aperçu qui
//     diverge du code réel ne prouverait rien.
const { normaliser, estRetenu } = await import('../src/lib/rentman/normaliser.ts')
const { CATEGORIES_LOCATION, DOSSIERS_EXCLUS, DOSSIER_VERS_CATEGORIE } = await import(
  '../src/lib/rentman/categories.ts'
)

/** Catégories qu'AUCUN dossier Rentman n'alimente — à distinguer d'une
 *  catégorie bien rattachée mais dont aucun article n'est encore coché. */
const SANS_DOSSIER = new Set(
  CATEGORIES_LOCATION.filter((c) => !Object.values(DOSSIER_VERS_CATEGORIE).includes(c)),
)

const get = async (c) => {
  const r = await fetch('https://api.rentman.net' + c, {
    headers: { Authorization: `Bearer ${jeton}`, Accept: 'application/json' },
  })
  if (!r.ok) throw new Error(`${c} → HTTP ${r.status}`)
  return r.json()
}

const articles = []
for (let offset = 0; offset < 5000; offset += 300) {
  const page = await get(`/equipment?limit=300&offset=${offset}`)
  const lot = page.data ?? []
  articles.push(...lot)
  if (lot.length < 300) break
}

const dossiers = Object.fromEntries(
  ((await get('/folders?limit=300')).data ?? []).map((d) => [`/folders/${d.id}`, d.name]),
)

console.log(`\n${articles.length} articles lus depuis Rentman${TOUT ? `  ${JAUNE}(mode --tout : la case in_shop est ignorée)${RAZ}` : ''}\n`)

const resultats = articles.map((a) => normaliser(TOUT ? { ...a, in_shop: true } : a))
const retenus = resultats.filter(estRetenu)
const rejets = resultats.filter((r) => !estRetenu(r))

// --- Ce qui serait publié
console.log(`${VERT}${retenus.length}${RAZ} article(s) seraient publiés, répartis ainsi :`)
for (const c of CATEGORIES_LOCATION) {
  const l = retenus.filter((r) => r.categorie === c)
  const sansPhoto = l.filter((r) => !r.reference_image).length
  const sansTexte = l.filter((r) => !r.description_fr).length
  const couleur = l.length === 0 ? GRIS : sansPhoto === l.length ? JAUNE : VERT
  const note = l.length
    ? `${GRIS}sans photo ${sansPhoto} · sans texte ${sansTexte}${RAZ}`
    : SANS_DOSSIER.has(c)
      ? `${ROUGE}aucun dossier Rentman ne lui correspond${RAZ}`
      : `${GRIS}aucun article coché pour l'instant${RAZ}`
  console.log(`  ${couleur}${String(l.length).padStart(4)}${RAZ}  ${c.padEnd(20)}${note}`)
}

// --- Pourquoi les autres sont écartés
const parRaison = {}
for (const r of rejets) (parRaison[r.raison] ??= []).push(r)
console.log(`\n${rejets.length} article(s) écartés :`)
for (const [raison, l] of Object.entries(parRaison).sort((a, b) => b[1].length - a[1].length)) {
  const grave = raison === 'dossier_inconnu'
  console.log(`  ${grave ? ROUGE : GRIS}${String(l.length).padStart(4)}  ${raison}${RAZ}`)
  if (grave) {
    const parDossier = {}
    for (const x of l) (parDossier[x.detail] ??= []).push(x.nom)
    for (const [d, noms] of Object.entries(parDossier)) {
      console.log(`        ${ROUGE}${d} (${dossiers[d] ?? 'nom inconnu'})${RAZ} — ${noms.length} article(s), ex. « ${noms[0]} »`)
      console.log(`        ${GRIS}→ ajouter ce dossier dans src/lib/rentman/categories.ts${RAZ}`)
    }
  }
}

// --- Détail des refus, à la demande : utile pour savoir QUELS articles
//     attendent une case à cocher, pas seulement combien.
if (REJETS) {
  console.log(`
${GRIS}Détail des articles écartés :${RAZ}`)
  for (const [raison, l] of Object.entries(parRaison).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`
  ${raison} (${l.length}) :`)
    for (const x of l.slice(0, 25)) console.log(`    ${GRIS}${String(x.rentman_id).padStart(5)}${RAZ}  ${x.nom}`)
    if (l.length > 25) console.log(`    ${GRIS}… et ${l.length - 25} autres${RAZ}`)
  }
}

if (Object.keys(DOSSIERS_EXCLUS).length) {
  console.log(`\n${GRIS}Dossiers exclus volontairement :${RAZ}`)
  for (const [id, raison] of Object.entries(DOSSIERS_EXCLUS)) console.log(`  ${GRIS}${id} — ${raison}${RAZ}`)
}

// --- Trois fiches en entier, pour juger du rendu réel
if (retenus.length) {
  console.log(`\n${GRIS}Trois fiches telles qu'elles arriveraient en base :${RAZ}`)
  for (const r of retenus.slice(0, 3)) {
    console.log(`\n  /location/${r.categorie}/${r.slug}`)
    console.log(`    nom .......... ${r.nom_fr}`)
    console.log(`    FR ........... ${(r.description_fr ?? '(aucune)').slice(0, 96)}`)
    console.log(`    EN ........... ${(r.description_en ?? '(aucune)').slice(0, 96)}`)
    console.log(`    prix ......... ${r.prix === null ? '(non affiché)' : r.prix + ' $'}`)
    console.log(`    photo ........ ${r.reference_image ?? ROUGE + '(aucune)' + RAZ}`)
    console.log(`    tags ......... ${r.tags.join(', ') || '(aucun)'}`)
  }
}

const sansPhoto = retenus.filter((r) => !r.reference_image).length
if (retenus.length && sansPhoto === retenus.length) {
  console.log(`\n${JAUNE}⚠ Aucun des ${retenus.length} articles retenus n'a de photo.${RAZ}`)
}
console.log()
