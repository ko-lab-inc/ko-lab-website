import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * `creerCompteEtInviter` ne doit JAMAIS redevenir une Server Action.
 *
 * ---------------------------------------------------------------------------
 * CE QUE CE TEST PROTÈGE
 *
 * La fonction crée un compte avec la service role key (hors RLS) et envoie un
 * courriel depuis le domaine vérifié de KO-LAB. Tant qu'elle était exportée
 * depuis `admin/utilisateurs/actions.ts` (un fichier `'use server'`), Next
 * l'enregistrait comme endpoint HTTP joignable sans session : un appel direct
 * aurait pu créer des comptes non confirmés et déclencher des courriels
 * d'invitation vers des adresses arbitraires.
 *
 * Elle vit désormais dans `lib/auth/invitation.ts`, un module `server-only`
 * importé par ses deux appelants légitimes, qui passent tous deux
 * `exigerRole(['admin'])` avant. Ce test échoue si quelqu'un la ramène dans un
 * fichier `'use server'` ou retire le garde `server-only` — deux gestes qui
 * rouvriraient l'endpoint sans le moindre signe à la compilation.
 * ---------------------------------------------------------------------------
 */

const racine = process.cwd()
const lire = (rel: string) => readFileSync(join(racine, rel), 'utf8')

describe('creerCompteEtInviter n’est pas un point d’entrée HTTP', () => {
  const invitation = lire('src/lib/auth/invitation.ts')

  it('est définie dans le module server-only', () => {
    expect(invitation).toMatch(/export async function creerCompteEtInviter/)
  })

  it('ce module porte le garde `server-only`', () => {
    // Il fait échouer la compilation si le module atterrit dans un bundle
    // client, et il n'est PAS un fichier `'use server'` — donc aucune de ses
    // fonctions n'est enregistrée comme Server Action.
    expect(invitation).toMatch(/^import 'server-only'/m)
    expect(invitation).not.toMatch(/^'use server'/m)
  })

  it('n’est PLUS exportée depuis un fichier `use server`', () => {
    // Le fichier d'origine : il garde ses autres actions, mais plus celle-ci.
    const actions = lire('src/app/(admin)/[locale]/admin/utilisateurs/actions.ts')
    expect(actions).toMatch(/^'use server'/m)
    expect(actions).not.toMatch(/export (async )?function creerCompteEtInviter/)
  })

  it('ses deux appelants l’importent du module server-only', () => {
    for (const rel of [
      'src/app/(admin)/[locale]/admin/utilisateurs/actions.ts',
      'src/app/(admin)/[locale]/admin/candidatures/actions.ts',
    ]) {
      const src = lire(rel)
      if (src.includes('creerCompteEtInviter(')) {
        expect(src).toMatch(/import \{ creerCompteEtInviter \} from '@\/lib\/auth\/invitation'/)
      }
    }
  })
})
