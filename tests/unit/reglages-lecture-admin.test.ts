import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * L'écran d'administration des réglages lit-il la base, ou un cache ?
 *
 * ---------------------------------------------------------------------------
 * POURQUOI UN TEST SUR LE CODE SOURCE, CE QUI N'EST PAS L'HABITUDE ICI
 *
 * Parce que le défaut est invisible partout ailleurs. Il n'apparaît ni au
 * typecheck, ni au build, ni dans un test de rendu : `lireReglages()` rend un
 * objet parfaitement valide. Il ne se manifeste qu'en production, après un
 * délai, et sous la forme d'une donnée qui revient toute seule.
 *
 * INCIDENT DU 3 OCTOBRE 2026
 *
 * Un bandeau d'annonce est resté affiché sur ko-lab-center.ca alors que la
 * base était vide depuis une heure. Mesuré à ce moment-là : l'écran de
 * production affichait `bandeau_texte_fr = "AUDIT 1790987314247…"` et
 * `bandeau_actif = true`, pendant que la base rendait `""` et `"false"`.
 *
 * Enchaînement :
 *   1. `lireReglages()` est un `unstable_cache` — voulu, le layout public
 *      l'appelle à chaque rendu de chaque page.
 *   2. L'écran d'administration l'appelait aussi, pour préremplir le
 *      formulaire.
 *   3. Le cache d'une instance ne se vide que par un `updateTag` exécuté SUR
 *      cette instance. Une modification faite ailleurs ne l'atteint pas.
 *   4. Le formulaire envoie TOUS les réglages d'un seul bouton. Changer un
 *      seul champ a donc réécrit en base les valeurs périmées de tous les
 *      autres — et les a republiées sur le site.
 *
 * Une mise à jour perdue, sans message et sans trace. Ce test est le seul
 * endroit qui en garde la mémoire.
 * ---------------------------------------------------------------------------
 */

const ECRAN = join(
  process.cwd(),
  'src',
  'app',
  '(admin)',
  '[locale]',
  'admin',
  'reglages',
  'page.tsx',
)

/** Le fichier moins ses commentaires — on juge le CODE, pas les notes. */
function codeSeul(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

describe('écran d’administration des réglages', () => {
  const source = readFileSync(ECRAN, 'utf8')
  const code = codeSeul(source)

  it('n’appelle PAS lireReglages() — le formulaire réécrit tout, il doit lire la base', () => {
    expect(code).not.toMatch(/lireReglages\s*\(/)
  })

  it('ne l’importe pas non plus en valeur', () => {
    // `import type { Reglages }` reste légitime : c'est le TYPE, pas la
    // fonction. Seul un import de valeur depuis ce module poserait problème.
    //
    // ⚠️ Examen LIGNE PAR LIGNE, et pas une regex sur le fichier entier : ce
    // dépôt n'utilise pas de point-virgule, donc un `[^;]*` traverse tout le
    // bloc d'imports et rapporte un faux positif. Erreur commise en écrivant
    // ce test même.
    const importsValeur = code
      .split('\n')
      .filter((l) => l.includes("from '@/lib/reglages'"))
      .filter((l) => !/^\s*import\s+type\b/.test(l))

    expect(importsValeur).toEqual([])
  })

  it('lit la base par le client de SESSION', () => {
    // Pas la service role key : `lib/supabase/admin.ts` la réserve aux API
    // routes, et la politique `reglages_lecture_equipe` suffit — elle laisse
    // déjà l'équipe voir les lignes `publique = false`.
    expect(code).toMatch(/createClient\s*\(\s*\)/)
    expect(code).toMatch(/from\('reglages'\)/)
    expect(code).not.toMatch(/getSupabaseAdmin/)
  })

  it('convertit les drapeaux par comparaison à la chaîne « true »', () => {
    // `Boolean(valeur(...))` allumerait tous les interrupteurs : en
    // JavaScript, la chaîne 'false' est vraie.
    expect(code).toMatch(/===\s*'true'/)
    expect(code).not.toMatch(/Boolean\(\s*valeur\(/)
  })
})
