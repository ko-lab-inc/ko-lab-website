import { describe, expect, it } from 'vitest'

import { schemaContact } from '@/lib/validation'

/**
 * Ce que le navigateur peut, et ne peut pas, glisser dans une demande de
 * location — migration 0055.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI CE TEST EXISTE
 *
 * La demande groupée envoie désormais ses articles sous forme structurée, et
 * ces articles finiront par alimenter un devis. La tentation évidente serait
 * de stocker ce que le navigateur envoie : nom, catégorie, prix. Ce serait une
 * faille tranquille — un visiteur pourrait renommer un article dans VOTRE
 * demande, ou en inventer un qui n'existe pas, et personne ne le verrait avant
 * que le devis ne parte.
 *
 * Le schéma n'accepte donc que `slug` et `quantite`. Tout le reste est
 * re-dérivé côté serveur depuis `articles_location` (voir `resoudreLignes`
 * dans /api/contact). Ce fichier verrouille cette frontière : si quelqu'un
 * ajoute un jour `nom` ou `prix` au schéma, un test casse.
 * ---------------------------------------------------------------------------
 */

/** Demande minimale valide, à laquelle chaque test ajoute ce qu'il éprouve. */
const base = {
  type: 'location' as const,
  nom: 'Client Test',
  email: 'client@example.test',
  message: 'Une demande suffisamment longue pour passer la borne de 10.',
  consentement: true,
}

describe('schemaContact — lignes d\'une demande de location', () => {
  it('ne retient que le slug et la quantité', () => {
    const r = schemaContact.safeParse({
      ...base,
      lignes: [{ slug: 'barrel-cocktail-table-2689', quantite: 2 }],
    })
    expect(r.success).toBe(true)
    expect(r.success && r.data.lignes).toEqual([
      { slug: 'barrel-cocktail-table-2689', quantite: 2 },
    ])
  })

  it('ÉCARTE un nom, une catégorie, un prix ou un rentman_id envoyés par le client', () => {
    const r = schemaContact.safeParse({
      ...base,
      lignes: [
        {
          slug: 'barrel-cocktail-table-2689',
          quantite: 1,
          // Tout ceci est ce qu'un visiteur mal intentionné tenterait.
          nom_fr: 'Article renommé par le visiteur',
          categorie: 'mobilier',
          prix: 0,
          rentman_id: 999999,
        },
      ],
    })
    expect(r.success).toBe(true)
    const ligne = r.success ? (r.data.lignes?.[0] as Record<string, unknown>) : {}
    // Les clés inconnues ne survivent pas à l'analyse : elles n'atteignent
    // jamais la base, et surtout jamais un devis.
    expect(Object.keys(ligne).sort()).toEqual(['quantite', 'slug'])
    expect(ligne.nom_fr).toBeUndefined()
    expect(ligne.prix).toBeUndefined()
    expect(ligne.rentman_id).toBeUndefined()
  })

  it('refuse une quantité nulle, négative ou démesurée', () => {
    for (const quantite of [0, -3, 100, 1.5]) {
      const r = schemaContact.safeParse({
        ...base,
        lignes: [{ slug: 'x', quantite }],
      })
      expect(r.success, `quantite=${quantite} aurait dû être refusée`).toBe(false)
    }
  })

  it('refuse plus de 50 lignes', () => {
    const lignes = Array.from({ length: 51 }, (_, i) => ({ slug: `a-${i}`, quantite: 1 }))
    expect(schemaContact.safeParse({ ...base, lignes }).success).toBe(false)
  })

  it('accepte une demande sans aucune ligne — le formulaire de contact ordinaire', () => {
    const r = schemaContact.safeParse({ ...base, type: 'mandat' })
    expect(r.success).toBe(true)
    expect(r.success && r.data.lignes).toBeUndefined()
  })
})

describe('schemaContact — dates de location', () => {
  it('accepte le format natif AAAA-MM-JJ', () => {
    const r = schemaContact.safeParse({
      ...base,
      dateDebut: '2026-12-20',
      dateFin: '2026-12-27',
    })
    expect(r.success).toBe(true)
  })

  it('refuse tout autre format', () => {
    for (const d of ['20-12-2026', '2026/12/20', '2026-12-20T00:00:00Z', 'demain', '']) {
      const r = schemaContact.safeParse({ ...base, dateDebut: d })
      expect(r.success, `dateDebut=${JSON.stringify(d)} aurait dû être refusée`).toBe(false)
    }
  })

  it('laisse les dates facultatives', () => {
    const r = schemaContact.safeParse(base)
    expect(r.success).toBe(true)
    expect(r.success && r.data.dateDebut).toBeUndefined()
  })
})
