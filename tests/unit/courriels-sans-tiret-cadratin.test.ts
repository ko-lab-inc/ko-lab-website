import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  gabaritAccuseCandidature,
  gabaritAccuseReception,
  gabaritCandidatureRefusee,
  gabaritDemandeTraitee,
  gabaritNouvelleCandidature,
} from '@/lib/email/gabaritsNotifications'

/**
 * Aucun tiret cadratin dans un courriel de KO-LAB.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI CETTE RÈGLE EXISTE
 *
 * Demande de Christian, 3 octobre 2026, après avoir reçu les courriels de
 * test : « je ne veux pas les voir dans aucun de nos courriels, même dans le
 * titre ». Le tiret cadratin (—) employé comme liaison — « Merci — nous avons
 * bien reçu » — est un marqueur de texte généré, au même titre que les motifs
 * listés dans `08-anti-ia-design.md` pour le visuel.
 *
 * Ce n'est pas qu'une question de goût : ces courriels partent à des clients
 * et à des candidats, et ce signe est désormais lu comme « écrit par une
 * machine ».
 *
 * ---------------------------------------------------------------------------
 * CE QUE CE TEST COUVRE, ET CE QU'IL NE COUVRE PAS
 *
 * Il rend les gabarits et vérifie la sortie RÉELLE — objet compris. Un test
 * qui se contenterait de lire le code source raterait les textes assemblés à
 * l'exécution.
 *
 * Pour les gabarits HTML (commande, statut, invitation), qui demandent une
 * commande complète pour être rendus, il inspecte le source en écartant les
 * commentaires — un `<!-- … — … -->` ne parvient jamais à l'œil du
 * destinataire, et les commentaires du code encore moins.
 *
 * Hors périmètre : les messages `console.error`. Ils ne quittent pas le
 * serveur et aucun destinataire ne les lit.
 * ---------------------------------------------------------------------------
 */

/** — (U+2014) et – (U+2013). */
const TIRETS = /[—–]/g

const COMMUN = { nom: 'Awa Diallo', delaiHeures: 48 } as const

/** Tous les courriels en texte brut, rendus dans les deux langues. */
const COURRIELS: ReadonlyArray<readonly [string, { sujet: string; texte: string }]> = [
  ['accusé demande FR', gabaritAccuseReception({ nom: 'Luc', locale: 'fr', delaiHeures: 48 })],
  ['accusé demande EN', gabaritAccuseReception({ nom: 'Luc', locale: 'en', delaiHeures: 48 })],
  [
    'accusé demande FR (absence)',
    gabaritAccuseReception({
      nom: 'Luc',
      locale: 'fr',
      delaiHeures: 48,
      absence: 'Nous sommes fermés jusqu’au 6 janvier.',
    }),
  ],
  ['demande traitée FR', gabaritDemandeTraitee({ nom: 'Luc', locale: 'fr' })],
  ['demande traitée EN', gabaritDemandeTraitee({ nom: 'Luc', locale: 'en' })],
  ['accusé candidature FR', gabaritAccuseCandidature({ ...COMMUN, locale: 'fr' })],
  ['accusé candidature EN', gabaritAccuseCandidature({ ...COMMUN, locale: 'en' })],
  ['refus candidature FR', gabaritCandidatureRefusee({ nom: 'Awa Diallo', locale: 'fr' })],
  ['refus candidature EN', gabaritCandidatureRefusee({ nom: 'Awa Diallo', locale: 'en' })],
  [
    'notification candidature (complète)',
    gabaritNouvelleCandidature({
      nom: 'Awa Diallo',
      email: 'awa@exemple.ca',
      telephone: '819 555-0101',
      ville: 'Gatineau',
      postes: ['Technicien de scène'],
      disponibilites: 'Fins de semaine',
      aExperience: true,
      travailExterieur: true,
      avecCv: true,
      lienAdmin: 'https://ko-lab-center.ca/fr/admin/candidatures',
    }),
  ],
  [
    'notification candidature (minimale)',
    // ⚠️ Le cas qui comptait le plus : les champs vides affichaient un tiret
    // en guise de « non renseigné ». C'est par là que le signe revenait.
    gabaritNouvelleCandidature({
      nom: 'Awa Diallo',
      email: 'awa@exemple.ca',
      telephone: '',
      ville: '',
      postes: [],
      disponibilites: '',
      aExperience: false,
      travailExterieur: false,
      avecCv: false,
      lienAdmin: 'https://ko-lab-center.ca/fr/admin/candidatures',
    }),
  ],
]

describe('aucun tiret cadratin dans les courriels en texte brut', () => {
  for (const [nom, courriel] of COURRIELS) {
    it(`${nom} — objet`, () => {
      expect(courriel.sujet.match(TIRETS)).toBeNull()
    })
    it(`${nom} — corps`, () => {
      expect(courriel.texte.match(TIRETS)).toBeNull()
    })
  }

  it('les champs vides disent « non précisé », ils n’affichent pas un tiret', () => {
    const { texte } = COURRIELS.find(([n]) => n.includes('minimale'))![1]
    expect(texte).toMatch(/Ville\s*:\s*non précisée/)
    expect(texte).toMatch(/Téléphone\s*:\s*non précisé/)
  })
})

/* ==========================================================================
 * Gabarits HTML — inspection du source, commentaires écartés
 * ========================================================================== */

/**
 * Retire les commentaires, en gardant tout le reste.
 *
 * ⚠️ UN BALAYAGE CARACTÈRE PAR CARACTÈRE, PAS UNE EXPRESSION RÉGULIÈRE.
 *
 * Première version de ce test : `/^\s*\/\/.*$/gm`, qui ne retire que les
 * commentaires occupant toute une ligne. Il laissait passer
 * `const BLANC = '#fafafa' // ko-white — blanc cassé`, et le test signalait un
 * tiret qu'aucun destinataire ne verra jamais.
 *
 * Et une regex plus large (`\/\/.*$`) couperait au milieu de `https://…`,
 * qu'on trouve dans chaque gabarit. Il faut donc savoir si l'on est dans une
 * chaîne, ce qu'une expression régulière ne sait pas faire.
 */
function texteVisible(source: string): string {
  let sortie = ''
  let i = 0

  while (i < source.length) {
    const c = source[i]!

    // Chaîne (simple, double ou gabarit) : recopiée telle quelle.
    if (c === "'" || c === '"' || c === '`') {
      let fin = i + 1
      while (fin < source.length) {
        if (source[fin] === '\\') {
          fin += 2
          continue
        }
        if (source[fin] === c) break
        // Une chaîne simple ou double ne franchit pas la fin de ligne.
        if (c !== '`' && source[fin] === '\n') break
        fin += 1
      }
      sortie += source.slice(i, fin + 1)
      i = fin + 1
      continue
    }

    if (source.startsWith('//', i)) {
      const fin = source.indexOf('\n', i)
      i = fin === -1 ? source.length : fin
      continue
    }
    if (source.startsWith('/*', i)) {
      const fin = source.indexOf('*/', i)
      i = fin === -1 ? source.length : fin + 2
      continue
    }

    sortie += c
    i += 1
  }

  // Les commentaires HTML vivent DANS les gabarits : retirés en dernier.
  return sortie.replace(/<!--[\s\S]*?-->/g, '')
}

const HTML = ['gabaritCommande.ts', 'gabaritStatutCommande.ts', 'gabaritInvitation.ts']

describe('aucun tiret cadratin dans les gabarits HTML', () => {
  for (const fichier of HTML) {
    it(fichier, () => {
      const source = readFileSync(join(process.cwd(), 'src', 'lib', 'email', fichier), 'utf8')
      const restants = texteVisible(source).match(TIRETS)
      // Le message nomme le fichier : un échec doit se corriger sans enquête.
      expect(restants, `tiret(s) trouvé(s) dans ${fichier}`).toBeNull()
    })
  }
})

/* ==========================================================================
 * Objets assemblés hors des gabarits
 * ========================================================================== */

const OBJETS = [
  ['src/app/api/contact/route.ts', /sujet: `[^`]*`/g],
  ['src/app/(admin)/[locale]/admin/commandes/actions.ts', /subject: `[^`]*`/g],
  ['src/app/(admin)/[locale]/admin/utilisateurs/actions.ts', /subject: "[^"]*"/g],
  ['src/app/(marketing)/[locale]/boutique/commande/details/actions.ts', /`Order[^`]*`|`Confirmation[^`]*`/g],
  ['src/app/(marketing)/[locale]/compte/commandes/[id]/actions.ts', /`Order[^`]*`|`Commande[^`]*`/g],
] as const

describe('aucun tiret cadratin dans les objets construits ailleurs', () => {
  for (const [chemin, motif] of OBJETS) {
    it(chemin, () => {
      const source = readFileSync(join(process.cwd(), chemin), 'utf8')
      const objets = texteVisible(source).match(motif) ?? []
      // Si le motif ne trouve plus rien, c'est que le code a bougé : mieux
      // vaut un échec bruyant qu'un test qui ne vérifie plus rien.
      expect(objets.length).toBeGreaterThan(0)
      for (const o of objets) expect(o.match(TIRETS), o).toBeNull()
    })
  }
})
