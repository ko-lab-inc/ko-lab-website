/**
 * Lance une synchronisation Rentman → `articles_location`. ÉCRIT EN BASE.
 *
 *     npm run rentman:synchro
 *
 * Pour voir ce qui se passerait sans rien écrire : `npm run rentman:apercu`.
 *
 * -----------------------------------------------------------------------------
 * Ce script est le déclencheur manuel. Il n'est pas le déclencheur final :
 * une fois le premier lot d'articles coché `in_shop` par KO-LAB, la passe
 * sera appelée périodiquement côté Vercel. En attendant, une commande
 * explicite vaut mieux qu'une tâche planifiée qui tourne à vide.
 *
 * Ce qu'il ne fait jamais, parce que `synchroniser()` ne le fait jamais :
 * supprimer une ligne, ou écrire quoi que ce soit dans Rentman.
 * -----------------------------------------------------------------------------
 */

import { readFileSync } from 'node:fs'

const VERT = '\x1b[32m'
const ROUGE = '\x1b[31m'
const JAUNE = '\x1b[33m'
const GRIS = '\x1b[90m'
const RAZ = '\x1b[0m'

for (const ligne of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const i = ligne.indexOf('=')
  if (i > 0 && /^[A-Z_]+$/.test(ligne.slice(0, i))) {
    process.env[ligne.slice(0, i)] ??= ligne.slice(i + 1).trim()
  }
}

const { synchroniser } = await import('../src/lib/rentman/synchroniser.ts')

const r = await synchroniser()

console.log(`\n${GRIS}Synchronisation terminée en ${(r.duree_ms / 1000).toFixed(1)} s${RAZ}\n`)
console.log(`  articles lus chez Rentman ... ${r.lus}`)
console.log(`  retenus (in_shop coché) ..... ${r.retenus === 0 ? JAUNE : VERT}${r.retenus}${RAZ}`)
console.log(`    créés ..................... ${r.crees}`)
console.log(`    mis à jour ................ ${r.mis_a_jour}`)
console.log(`    inchangés ................. ${r.inchanges}`)
console.log(`  dépubliés ................... ${r.depublies}`)
console.log(`  photos copiées .............. ${r.photos_copiees}`)
console.log(`  photos en échec ............. ${r.photos_en_echec ? ROUGE : GRIS}${r.photos_en_echec}${RAZ}`)

if (r.dossiers_inconnus.length) {
  console.log(`\n${ROUGE}Dossiers Rentman inconnus — ces articles ne sont PAS publiés :${RAZ}`)
  for (const d of r.dossiers_inconnus) console.log(`  ${ROUGE}${d}${RAZ}`)
  console.log(`  ${GRIS}→ les ajouter dans src/lib/rentman/categories.ts${RAZ}`)
}

if (r.erreurs.length) {
  console.log(`\n${ROUGE}${r.erreurs.length} erreur(s) :${RAZ}`)
  for (const e of r.erreurs.slice(0, 10)) console.log(`  ${e}`)
}

if (r.retenus === 0) {
  console.log(
    `\n${JAUNE}Aucun article n'a la case « in_shop » cochée dans Rentman : la table reste vide.${RAZ}`,
  )
  console.log(`${GRIS}C'est le comportement attendu, pas une panne — voir npm run rentman:apercu --tout.${RAZ}`)
}
console.log()

process.exit(r.erreurs.length === 0 ? 0 : 1)
