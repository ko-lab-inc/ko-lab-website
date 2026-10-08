import { afterEach, describe, expect, it, vi } from 'vitest'

import { trouverClient } from '@/lib/rentman/demandes'

/**
 * Le rattachement d'une demande au bon client Rentman.
 *
 * ---------------------------------------------------------------------------
 * CE QUE CE TEST PROTÈGE
 *
 * Un courriel n'identifie PAS un client de façon unique. Mesuré le 8 octobre
 * 2026 sur le compte de KO-LAB : trois concessions Dilawri partagent une même
 * adresse, et deux entités Bluesfest aussi.
 *
 * Si on rattachait « le premier trouvé », un devis partirait un jour à la
 * mauvaise société. La règle est donc : UNE seule correspondance, sinon rien.
 * Ce fichier la verrouille.
 * ---------------------------------------------------------------------------
 */

// Le client Rentman refuse de partir sans jeton. Valeur factice : aucune
// requête ne sort d'ici, fetch est simulé.
process.env.RENTMAN_API_TOKEN ??= 'jeton-de-test'

/** Simule les réponses de l'API Rentman, chemin par chemin. */
function simulerRentman(reponses: Record<string, unknown[]>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const chemin = String(url).replace('https://api.rentman.net', '')
      const cle = Object.keys(reponses).find((k) => chemin.startsWith(k))
      return {
        ok: true,
        json: async () => ({ data: cle ? reponses[cle] : [] }),
      } as unknown as Response
    }),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('trouverClient', () => {
  it('rattache la SOCIETE de la personne de contact quand elle est unique', async () => {
    simulerRentman({
      '/contactpersons': [{ id: 37, contact: '/contacts/3660' }],
    })
    // Pas de linked_contact_person : Rentman refuse qu'on l'ecrive.
    expect(await trouverClient('sloyer@brigil.com')).toEqual({
      linked_contact: '/contacts/3660',
    })
  })

  it('rattache la société quand aucune personne ne correspond mais une seule société oui', async () => {
    simulerRentman({
      '/contactpersons': [],
      '/contacts': [{ id: 3661 }],
    })
    expect(await trouverClient('client@exemple.test')).toEqual({
      linked_contact: '/contacts/3661',
    })
  })

  it('NE RATTACHE RIEN quand plusieurs sociétés partagent le courriel', async () => {
    // Le cas Dilawri : trois concessions, une seule adresse.
    simulerRentman({
      '/contactpersons': [],
      '/contacts': [{ id: 1 }, { id: 2 }, { id: 3 }],
    })
    expect(await trouverClient('pawandilawri@gmail.com')).toEqual({})
  })

  it('NE RATTACHE RIEN quand le courriel est inconnu', async () => {
    simulerRentman({ '/contactpersons': [], '/contacts': [] })
    expect(await trouverClient('inconnu@exemple.test')).toEqual({})
  })

  it('NE RATTACHE RIEN quand plusieurs personnes partagent le courriel', async () => {
    simulerRentman({ '/contactpersons': [{ id: 1 }, { id: 2 }], '/contacts': [] })
    expect(await trouverClient('partage@exemple.test')).toEqual({})
  })

  it('ne lève jamais si Rentman est injoignable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('reseau coupe') }))
    await expect(trouverClient('x@exemple.test')).resolves.toEqual({})
  })
})
