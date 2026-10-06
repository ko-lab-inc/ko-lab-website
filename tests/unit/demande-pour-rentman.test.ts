import { describe, expect, it } from 'vitest'

import { texteRentman } from '@/lib/demandes/pourRentman'

/**
 * Le bloc « Copier pour Rentman » dit-il vraiment ce qu'il faut recopier ?
 *
 * Ce texte est la seule chose qui sépare Roxanne d'une ressaisie complète.
 * S'il perd un numéro d'article, elle revient à chercher un nom parmi
 * 590 pièces sans s'en rendre compte. D'où ces tests.
 */

const base = {
  nom: 'Alkhaly Moussa Touré',
  email: 'web@ko-lab.ca',
  telephone: '18734562099',
  organisation: 'Ko-lab inc.',
  langue: 'fr',
  dateDebut: '9 octobre 2026',
  dateFin: '13 octobre 2026',
  lignes: [
    { rentman_id: 2881, nom_fr: 'Petite fleur blanche,', quantite: 1 },
    { rentman_id: 2689, nom_fr: 'Barrel Cocktail Table', quantite: 2 },
  ],
}

describe('texteRentman', () => {
  it('porte le numéro Rentman de chaque article', () => {
    const t = texteRentman(base)
    expect(t).toContain('#2881')
    expect(t).toContain('#2689')
  })

  it('porte la quantité de chaque article', () => {
    const t = texteRentman(base)
    expect(t).toMatch(/#2881\s+x1\s+Petite fleur blanche,/)
    expect(t).toMatch(/#2689\s+x2\s+Barrel Cocktail Table/)
  })

  it('porte les coordonnées et la période', () => {
    const t = texteRentman(base)
    expect(t).toContain('Alkhaly Moussa Touré')
    expect(t).toContain('web@ko-lab.ca')
    expect(t).toContain('18734562099')
    expect(t).toContain('Ko-lab inc.')
    expect(t).toContain('9 octobre 2026 au 13 octobre 2026')
  })

  it('annonce la langue du demandeur en majuscules', () => {
    expect(texteRentman({ ...base, langue: 'en' })).toContain('Langue       : EN')
  })

  it('OMET les champs vides au lieu d\'écrire un tiret', () => {
    const t = texteRentman({ ...base, telephone: null, organisation: null })
    expect(t).not.toContain('Téléphone')
    expect(t).not.toContain('Organisation')
    // Le reste survit.
    expect(t).toContain('web@ko-lab.ca')
  })

  it('dit « non précisée » quand aucune date n\'est donnée', () => {
    const t = texteRentman({ ...base, dateDebut: null, dateFin: null })
    expect(t).toContain('Période      : non précisée')
  })

  it('accepte une seule date', () => {
    expect(texteRentman({ ...base, dateFin: null })).toContain('Période      : 9 octobre 2026')
  })

  it('reste lisible sans aucun article', () => {
    const t = texteRentman({ ...base, lignes: [] })
    expect(t).not.toContain('Équipements')
    expect(t).toContain('Alkhaly Moussa Touré')
  })

  it('ne contient aucun tiret cadratin', () => {
    expect(texteRentman(base)).not.toContain('—')
  })
})
