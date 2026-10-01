import { describe, expect, it } from 'vitest'

import {
  couperBilingue,
  estRetenu,
  listerTags,
  normaliser,
  slugArticle,
  type ArticleRentman,
} from '@/lib/rentman/normaliser'

/**
 * Normalisation Rentman → catalogue de location.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI EN TEST UNITAIRE
 *
 * Il n'existe pas d'environnement Rentman de test : le compte est l'inventaire
 * réel du client. Les règles qui décident de ce qui devient public ne peuvent
 * donc pas être vérifiées contre la vraie API sans risque, et elles sont
 * justement l'endroit où une erreur se voit — publier une note d'entrepôt,
 * ranger un groupe électrogène dans les guirlandes, afficher « 0 $ ».
 *
 * Les cas ci-dessous sont des extraits RÉELS relevés le 1er octobre 2026 par
 * sondage en lecture seule, pas des exemples inventés.
 * ---------------------------------------------------------------------------
 */

/** Article minimal valide — chaque test ne surcharge que ce qui l'intéresse. */
function article(sur: Partial<ArticleRentman> = {}): ArticleRentman {
  return {
    id: 2673,
    displayname: 'Industrial Bistro Table',
    folder: '/folders/75', // Mobilier
    in_shop: true,
    external_remark:
      'Table bistro industrielle avec plateau en bois foncé et base en métal noir. / Industrial bistro table with dark wood top and black metal base.',
    price: 75,
    tags: 'bistro, mobilier, signature',
    image: '/files/479',
    modified: '2026-09-24T14:22:07-04:00',
    ...sur,
  }
}

describe('couperBilingue', () => {
  it('coupe un texte « français / anglais » sur le séparateur', () => {
    const { fr, en } = couperBilingue(
      'Table cocktail en bois 32 pouces pour réceptions. / 32-inch wood cocktail table for receptions.',
    )
    expect(fr).toBe('Table cocktail en bois 32 pouces pour réceptions.')
    expect(en).toBe('32-inch wood cocktail table for receptions.')
  })

  it('sert le même texte aux deux langues quand il n’y a pas de séparateur', () => {
    // 39 articles sont dans ce cas sur la base réelle.
    expect(couperBilingue('Sapin 6 pieds vers lime')).toEqual({
      fr: 'Sapin 6 pieds vers lime',
      en: 'Sapin 6 pieds vers lime',
    })
  })

  it('ne coupe PAS une barre collée au texte', () => {
    // Cas réel : « remorque flatbed ou remorque fermée de 24 pi » voisine des
    // noms contenant « A/V » ou « 110/220 ». Couper sur « / » seul les
    // casserait en deux.
    const { fr, en } = couperBilingue('Distribution 110/220 V pour site événementiel')
    expect(fr).toBe('Distribution 110/220 V pour site événementiel')
    expect(en).toBe(fr)
  })

  it('garde le texte entier si une moitié est vide', () => {
    expect(couperBilingue('Texte français / ')).toEqual({
      fr: 'Texte français /',
      en: 'Texte français /',
    })
  })

  it('garde le texte entier quand il y a plusieurs séparateurs', () => {
    // Un seul article de la base est dans ce cas ; le couper au hasard
    // produirait une description tronquée.
    const t = 'TRAVEL CREW / ÉQUIP / Service de transport avec équipe'
    expect(couperBilingue(t)).toEqual({ fr: t, en: t })
  })

  it('rend null sur un texte absent ou vide', () => {
    expect(couperBilingue(null)).toEqual({ fr: null, en: null })
    expect(couperBilingue('   ')).toEqual({ fr: null, en: null })
  })
})

describe('slugArticle', () => {
  it('translittère, met en minuscules et suffixe l’identifiant', () => {
    expect(slugArticle('Sapin 6 pieds vers l’vert lime', 412)).toBe(
      'sapin-6-pieds-vers-l-vert-lime-412',
    )
  })

  it('distingue deux articles de même nom', () => {
    // « Sapin 6 pieds » existe en plusieurs exemplaires dans l'inventaire :
    // sans le suffixe, le second écraserait le premier.
    expect(slugArticle('Sapin 6 pieds', 10)).not.toBe(slugArticle('Sapin 6 pieds', 11))
  })

  it('retombe sur un slug utilisable si le nom n’a aucun caractère latin', () => {
    expect(slugArticle('***', 7)).toBe('article-7')
  })
})

describe('listerTags', () => {
  it('découpe sur la virgule et retire les blancs', () => {
    expect(listerTags('bistro, mobilier , signature')).toEqual([
      'bistro',
      'mobilier',
      'signature',
    ])
  })

  it('rend un tableau vide plutôt que [""]', () => {
    expect(listerTags('')).toEqual([])
    expect(listerTags(null)).toEqual([])
  })
})

describe('normaliser — ce qui est REFUSÉ', () => {
  it('refuse un article dont la case in_shop n’est pas cochée', () => {
    // C'est le cas des 584 articles au 1er octobre 2026. Sans ce refus, le
    // site publierait tout l'inventaire, y compris le matériel interne.
    const r = normaliser(article({ in_shop: false }))
    expect(estRetenu(r)).toBe(false)
    expect(r).toMatchObject({ raison: 'non_coche_in_shop' })
  })

  it('refuse un article dont in_shop est absent', () => {
    const { in_shop: _, ...sans } = article()
    expect(normaliser(sans as ArticleRentman)).toMatchObject({ raison: 'non_coche_in_shop' })
  })

  it('refuse les archives, les temporaires et la vente seule', () => {
    expect(normaliser(article({ in_archive: true }))).toMatchObject({ raison: 'archive' })
    expect(normaliser(article({ temporary: true }))).toMatchObject({ raison: 'temporaire' })
    expect(normaliser(article({ rental_sales: 'Sales' }))).toMatchObject({ raison: 'vente_seule' })
  })

  it('refuse un dossier explicitement exclu, en disant lequel', () => {
    const r = normaliser(article({ folder: '/folders/113' })) // Services
    expect(r).toMatchObject({ raison: 'dossier_exclu' })
    expect((r as { detail?: string }).detail).toMatch(/Services/)
  })

  it('refuse un dossier inconnu PLUTÔT que de deviner une catégorie', () => {
    // Le cœur de la règle : pas de défaut silencieux. Un dossier ajouté dans
    // Rentman doit remonter dans le rapport, pas atterrir dans « décor ».
    const r = normaliser(article({ folder: '/folders/9999' }))
    expect(r).toMatchObject({ raison: 'dossier_inconnu', detail: '/folders/9999' })
  })

  it('refuse un article sans dossier', () => {
    expect(normaliser(article({ folder: null }))).toMatchObject({ raison: 'dossier_inconnu' })
  })

  it('refuse un article sans nom', () => {
    expect(normaliser(article({ displayname: '  ', name: undefined }))).toMatchObject({
      raison: 'sans_nom',
    })
  })
})

describe('normaliser — ce qui est RETENU', () => {
  it('traduit une fiche complète', () => {
    const r = normaliser(article())
    expect(estRetenu(r)).toBe(true)
    if (!estRetenu(r)) return
    expect(r).toMatchObject({
      rentman_id: 2673,
      slug: 'industrial-bistro-table-2673',
      nom_fr: 'Industrial Bistro Table',
      categorie: 'mobilier',
      dossier_rentman: '/folders/75',
      prix: 75,
      tags: ['bistro', 'mobilier', 'signature'],
      reference_image: '/files/479',
    })
    expect(r.description_fr).toBe(
      'Table bistro industrielle avec plateau en bois foncé et base en métal noir.',
    )
    expect(r.description_en).toBe(
      'Industrial bistro table with dark wood top and black metal base.',
    )
  })

  it('range le décor, les structures et l’éclairage dans les bonnes catégories', () => {
    const cat = (dossier: number) => {
      const r = normaliser(article({ folder: `/folders/${dossier}` }))
      return estRetenu(r) ? r.categorie : null
    }
    expect(cat(86)).toBe('decor') // Décor - Thématique (202 articles)
    expect(cat(85)).toBe('decor') // Décor - Noël
    expect(cat(89)).toBe('decor') // Textiles
    expect(cat(88)).toBe('scenes') // Structures & panneaux
    expect(cat(77)).toBe('eclairage') // Éclairage
    expect(cat(91)).toBe('infrastructures') // Audio
    expect(cat(83)).toBe('equipements_terrain') // Gestion des matières résiduelles
    expect(cat(76)).toBe('mobilier') // Bars
  })

  it('suit la réorganisation « Équipement > X » de Rentman', () => {
    // Dossiers vides au 1er octobre 2026, mais déjà créés côté Rentman : le
    // jour où le matériel y est déplacé, la synchronisation ne doit pas
    // tomber en « dossier inconnu ».
    const r = normaliser(article({ folder: '/folders/93' })) // Équipement > Mobilier
    expect(estRetenu(r) && r.categorie).toBe('mobilier')
  })

  it('n’affiche pas un prix de 0', () => {
    // Rentman met 0 sur ce qui n'est pas tarifé à l'unité ; « 0 $ » sur une
    // page publique se lit « gratuit ».
    const r = normaliser(article({ price: 0 }))
    expect(estRetenu(r) && r.prix).toBeNull()
  })

  it('accepte une fiche sans description, sans prix, sans photo ni tags', () => {
    const r = normaliser(
      article({ external_remark: null, price: null, image: null, tags: null }),
    )
    expect(estRetenu(r)).toBe(true)
    if (!estRetenu(r)) return
    expect(r.description_fr).toBeNull()
    expect(r.description_en).toBeNull()
    expect(r.prix).toBeNull()
    expect(r.reference_image).toBeNull()
    expect(r.tags).toEqual([])
  })

  it('ne laisse AUCUN champ porter la note interne', () => {
    // Garde-fou explicite : 497 articles portent un internal_remark. Si
    // quelqu'un ajoute un jour ce champ au type, ce test doit le voir.
    const avecNote = {
      ...article(),
      internal_remark: 'Stock principal : 3D SHOP. À valider lors de l’inventaire.',
    } as ArticleRentman
    const r = normaliser(avecNote)
    expect(estRetenu(r)).toBe(true)
    expect(JSON.stringify(r)).not.toMatch(/3D SHOP/)
  })
})
