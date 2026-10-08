import { describe, expect, it } from 'vitest'

import { schemaDemandeLocation } from '@/lib/validation'

/**
 * Les dates de la demande de location.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI CE TEST EXISTE
 *
 * Deux fois de suite, la regex de date a perdu ses antislashs en passant par
 * un script shell : `/^\d{4}-\d{2}-\d{2}$/` est devenu `/^d{4}-d{2}-d{2}$/`.
 * Cette version-là n'accepte QUE la chaîne littérale « dddd-dd-dd » et refuse
 * toute vraie date. Le formulaire aurait été inutilisable en production, et
 * rien dans le build ni le typage ne l'aurait signalé.
 *
 * Le premier test ci-dessous attrape exactement ça.
 *
 * ---------------------------------------------------------------------------
 * ET POURQUOI LES DATES SONT EXIGÉES
 *
 * Le prix d'une location dépend de la durée : Rentman applique un facteur
 * (mesuré le 7 octobre 2026, 580 $ deviennent 1 392 $ sur quatre jours). Sans
 * dates, aucun devis n'est calculable. Une demande sans dates n'est pas
 * incomplète, elle est intraitable.
 * ---------------------------------------------------------------------------
 */

const base = {
  nom: 'Client Test',
  email: 'client@example.test',
  consentement: true,
}

describe('schemaDemandeLocation — les dates', () => {
  it('accepte une vraie date au format AAAA-MM-JJ', () => {
    const r = schemaDemandeLocation.safeParse({
      ...base,
      dateDebut: '2026-12-20',
      dateFin: '2026-12-27',
    })
    expect(r.success).toBe(true)
  })

  it('refuse la chaîne littérale « dddd-dd-dd » (regex aux antislashs perdus)', () => {
    const r = schemaDemandeLocation.safeParse({
      ...base,
      dateDebut: 'dddd-dd-dd',
      dateFin: 'dddd-dd-dd',
    })
    expect(r.success).toBe(false)
  })

  it('EXIGE les deux dates', () => {
    expect(schemaDemandeLocation.safeParse({ ...base }).success).toBe(false)
    expect(
      schemaDemandeLocation.safeParse({ ...base, dateDebut: '2026-12-20' }).success,
    ).toBe(false)
    expect(schemaDemandeLocation.safeParse({ ...base, dateFin: '2026-12-27' }).success).toBe(false)
  })

  it('refuse une date vide ou mal formée', () => {
    for (const d of ['', '20-12-2026', '2026/12/20', '2026-12-20T00:00:00Z', 'demain']) {
      const r = schemaDemandeLocation.safeParse({ ...base, dateDebut: d, dateFin: '2026-12-27' })
      expect(r.success, `dateDebut=${JSON.stringify(d)} aurait dû être refusée`).toBe(false)
    }
  })

  it('refuse un retour antérieur au début', () => {
    const r = schemaDemandeLocation.safeParse({
      ...base,
      dateDebut: '2026-12-27',
      dateFin: '2026-12-20',
    })
    expect(r.success).toBe(false)
    expect(r.success === false && r.error.issues[0]?.message).toBe('dates_ordre')
  })

  it('accepte un aller-retour le même jour', () => {
    const r = schemaDemandeLocation.safeParse({
      ...base,
      dateDebut: '2026-12-20',
      dateFin: '2026-12-20',
    })
    expect(r.success).toBe(true)
  })

  it('exige toujours le consentement', () => {
    const r = schemaDemandeLocation.safeParse({
      ...base,
      consentement: false,
      dateDebut: '2026-12-20',
      dateFin: '2026-12-27',
    })
    expect(r.success).toBe(false)
  })
})
