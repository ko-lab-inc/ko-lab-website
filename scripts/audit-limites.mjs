/**
 * Vérifie que les limites de débit s'appliquent VRAIMENT, sur un serveur lancé.
 *
 *     npm run build && npx next start &
 *     node scripts/audit-limites.mjs
 *
 * -----------------------------------------------------------------------------
 * POURQUOI EN PLUS DES TESTS UNITAIRES
 *
 * Les tests unitaires prouvent que `rateLimit()` compte juste. Ils ne prouvent
 * pas qu'on l'a branché, ni qu'il s'exécute AVANT le travail coûteux. Une
 * limite placée après la validation ou après l'écriture ne protège rien : elle
 * refuse la réponse une fois la dépense faite.
 *
 * Les corps envoyés sont volontairement invalides — aucune donnée n'est créée.
 * Ce qu'on lit, c'est le code de retour : un 429 avant que la validation ait pu
 * se plaindre prouve que le compteur passe en premier.
 *
 * ⚠️ À lancer sur un serveur LOCAL. Contre la production, ce script
 * consommerait le quota de vraies personnes.
 * -----------------------------------------------------------------------------
 */

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'

const VERT = '\x1b[32m'
const ROUGE = '\x1b[31m'
const GRIS = '\x1b[90m'
const RAZ = '\x1b[0m'

let alertes = 0

function verdict(ok, texte, detail) {
  if (!ok) alertes += 1
  console.log(`  ${ok ? VERT + 'ok' + RAZ + '    ' : ROUGE + 'ALERTE' + RAZ + ' '}${texte} ${GRIS}${detail ?? ''}${RAZ}`)
}

/**
 * Chaque sonde utilise une adresse distincte.
 *
 * Le compteur est indexé par adresse : sans ça, la première sonde épuiserait
 * le quota de la seconde et le résultat ne voudrait plus rien dire. C'est
 * aussi, incidemment, la démonstration que l'en-tête est bien pris en compte —
 * un serveur qui l'ignorerait ferait échouer la deuxième sonde d'emblée.
 */
let compteur = 0
const adresse = () => `198.51.100.${(compteur += 1)}`

async function sonder({ nom, chemin, methode = 'GET', corps, max, essais }) {
  const ip = adresse()
  const codes = []

  for (let i = 0; i < essais; i += 1) {
    const r = await fetch(`${BASE}${chemin}`, {
      method: methode,
      headers: {
        'x-forwarded-for': ip,
        ...(corps ? { 'Content-Type': 'application/json' } : {}),
      },
      body: corps ? JSON.stringify(corps) : undefined,
    })
    codes.push(r.status)
  }

  const premier429 = codes.indexOf(429)
  const avant = codes.slice(0, max)

  verdict(
    premier429 !== -1,
    `${nom.padEnd(22)} ${premier429 === -1 ? 'AUCUN 429 en ' + essais + ' appels' : 'refus au ' + (premier429 + 1) + 'ᵉ appel'}`,
    `plafond annoncé : ${max}`,
  )

  // La limite ne doit pas non plus se déclencher trop tôt : un plafond de 5
  // qui refuse au 2ᵉ appel casserait un usage normal.
  verdict(
    !avant.includes(429),
    `${nom.padEnd(22)} les ${max} premiers appels passent`,
    `codes : ${[...new Set(codes)].join(', ')}`,
  )
}

console.log(`Limites de débit sur ${BASE}\n`)

// 240 par minute — volontairement large, un bureau entier partage une seule
// adresse publique. On en fait 245 : les cinq derniers doivent être refusés.
await sonder({ nom: 'GET /api/session', chemin: '/api/session', max: 240, essais: 245 })

// 5 par minute. Corps vide : la validation le refuserait de toute façon, ce
// qui compte est que le 429 arrive AVANT elle.
await sonder({
  nom: 'POST /api/contact',
  chemin: '/api/contact',
  methode: 'POST',
  corps: {},
  max: 5,
  essais: 8,
})

console.log(alertes === 0 ? `\n${VERT}Aucune alerte.${RAZ}\n` : `\n${ROUGE}${alertes} alerte(s).${RAZ}\n`)
process.exit(alertes === 0 ? 0 : 1)
