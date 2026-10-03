import { describe, expect, it } from 'vitest'

import en from '../../messages/en.json'
import fr from '../../messages/fr.json'

/**
 * Aucun tiret cadratin dans les textes du site.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI CETTE RÈGLE
 *
 * Demande de Christian, 3 octobre 2026, après le même nettoyage côté
 * courriels. Le tiret cadratin employé comme liaison — « La coordination
 * n'est pas un service en plus — c'est le métier » — est un marqueur de texte
 * généré, au même titre que les motifs visuels listés dans
 * `08-anti-ia-design.md`.
 *
 * 48 occurrences en français, 50 en anglais, toutes réécrites : la phrase est
 * retravaillée, jamais seulement amputée du signe.
 *
 * ---------------------------------------------------------------------------
 * CE QUE CE TEST COUVRE
 *
 * Les deux catalogues entiers, clé par clé. Un échec nomme la clé fautive, ce
 * qui suffit à la corriger sans chercher.
 *
 * Il NE couvre PAS les textes codés en dur dans les composants : il en reste,
 * et ce sont des cas d'une autre nature (marqueur de cellule vide dans un
 * tableau, séparateur de nom accessible). Voir le test jumeau
 * `courriels-sans-tiret-cadratin.test.ts` pour les courriels.
 * ---------------------------------------------------------------------------
 */

/** — (U+2014) et – (U+2013). */
const TIRETS = /[—–]/

type Noeud = string | number | boolean | null | { [cle: string]: Noeud } | Noeud[]

/** Aplatit un catalogue en paires [chemin.de.la.clé, texte]. */
function aplatir(noeud: Noeud, prefixe = ''): Array<[string, string]> {
  if (typeof noeud === 'string') return [[prefixe, noeud]]
  if (noeud === null || typeof noeud !== 'object') return []
  if (Array.isArray(noeud)) {
    return noeud.flatMap((v, i) => aplatir(v, `${prefixe}[${i}]`))
  }
  return Object.entries(noeud).flatMap(([cle, v]) =>
    aplatir(v, prefixe ? `${prefixe}.${cle}` : cle),
  )
}

describe.each([
  ['messages/fr.json', fr as unknown as Noeud],
  ['messages/en.json', en as unknown as Noeud],
])('%s', (_nom, catalogue) => {
  const textes = aplatir(catalogue)

  it('contient bien des textes (le test vérifie quelque chose)', () => {
    // Sans ce garde, une erreur d'import rendrait la suite verte à vide.
    expect(textes.length).toBeGreaterThan(1000)
  })

  it('aucun texte ne contient de tiret cadratin', () => {
    const fautifs = textes
      .filter(([, texte]) => TIRETS.test(texte))
      .map(([cle, texte]) => `${cle} : ${texte.slice(0, 80)}`)

    expect(fautifs).toEqual([])
  })
})

describe('les deux catalogues restent alignés', () => {
  it('mêmes clés de part et d’autre', () => {
    // Une réécriture qui ne toucherait qu'une langue laisserait le site
    // bilingue incohérent : autant l'attraper ici.
    const cf = aplatir(fr as unknown as Noeud).map(([c]) => c)
    const ce = aplatir(en as unknown as Noeud).map(([c]) => c)
    expect(cf.filter((c) => !ce.includes(c))).toEqual([])
    expect(ce.filter((c) => !cf.includes(c))).toEqual([])
  })
})
