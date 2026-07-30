import { afterEach, describe, expect, it, vi } from 'vitest'

import { adresseDepuis } from '@/lib/utils/adresseClient'
import { rateLimit, resetRateLimits } from '@/lib/utils/rateLimit'
import { slugifier } from '@/lib/utils/slug'

/**
 * Logique de sécurité vérifiable sans réseau ni base.
 *
 * Ces trois fonctions ont en commun d'être en amont de tout : une erreur ici ne
 * se voit pas à l'écran, elle se voit dans les journaux six mois plus tard. Un
 * compteur qui ne compte pas laisse le bourrage d'identifiants passer sans
 * bruit ; une extraction d'adresse qui retombe sur une constante met tous les
 * visiteurs dans le même seau, ce qui revient au même.
 */

/** En-têtes minimalistes, à la forme attendue par `adresseDepuis`. */
const entetes = (paires: Record<string, string>) => ({
  get: (nom: string) => paires[nom] ?? null,
})

describe('adresseDepuis', () => {
  it('préfère cf-connecting-ip quand Cloudflare est devant', () => {
    // C'est le seul en-tête que le proxy réécrit systématiquement : un client
    // ne peut pas le falsifier une fois Cloudflare en place.
    expect(
      adresseDepuis(entetes({ 'cf-connecting-ip': '203.0.113.7', 'x-forwarded-for': '198.51.100.1' })),
    ).toBe('203.0.113.7')
  })

  it('ne retient que la première entrée de x-forwarded-for', () => {
    // L'en-tête est une liste `client, proxy1, proxy2`. Garder la chaîne
    // entière donnerait une clé différente à chaque saut, et le compteur ne
    // compterait plus rien.
    expect(adresseDepuis(entetes({ 'x-forwarded-for': '203.0.113.7, 70.41.3.18, 150.172.238.178' }))).toBe(
      '203.0.113.7',
    )
  })

  it('retombe sur « inconnue » plutôt que sur une chaîne vide', () => {
    // Une clé vide ferait `connexion:` pour tout le monde — c'est le seau
    // commun, mais au moins il est nommé et repérable dans les journaux.
    expect(adresseDepuis(entetes({}))).toBe('inconnue')
    expect(adresseDepuis(entetes({ 'x-forwarded-for': '   ' }))).toBe('inconnue')
    expect(adresseDepuis(entetes({ 'cf-connecting-ip': '  ' , 'x-forwarded-for': '' }))).toBe('inconnue')
  })
})

describe('rateLimit', () => {
  afterEach(() => {
    resetRateLimits()
    vi.useRealTimers()
  })

  it('laisse passer jusqu’au plafond, puis refuse', () => {
    const opts = { max: 3, windowMs: 60_000 }
    expect(rateLimit('essai:1.1.1.1', opts)).toBe(false)
    expect(rateLimit('essai:1.1.1.1', opts)).toBe(false)
    expect(rateLimit('essai:1.1.1.1', opts)).toBe(false)
    expect(rateLimit('essai:1.1.1.1', opts)).toBe(true)
  })

  it('compte séparément deux adresses', () => {
    const opts = { max: 1, windowMs: 60_000 }
    expect(rateLimit('essai:1.1.1.1', opts)).toBe(false)
    // Sans cette séparation, le premier visiteur épuiserait le quota de tous
    // les autres — exactement l'inverse du but.
    expect(rateLimit('essai:2.2.2.2', opts)).toBe(false)
    expect(rateLimit('essai:1.1.1.1', opts)).toBe(true)
  })

  it('compte séparément deux routes', () => {
    // Le préfixe de route est une convention, pas une contrainte du type :
    // c'est justement pour ça qu'elle mérite un test.
    const opts = { max: 1, windowMs: 60_000 }
    expect(rateLimit('contact:1.1.1.1', opts)).toBe(false)
    expect(rateLimit('connexion:1.1.1.1', opts)).toBe(false)
    expect(rateLimit('contact:1.1.1.1', opts)).toBe(true)
  })

  it('rouvre le quota une fois la fenêtre écoulée', () => {
    vi.useFakeTimers()
    const opts = { max: 2, windowMs: 60_000 }

    expect(rateLimit('essai:1.1.1.1', opts)).toBe(false)
    expect(rateLimit('essai:1.1.1.1', opts)).toBe(false)
    expect(rateLimit('essai:1.1.1.1', opts)).toBe(true)

    // Une seconde avant l'échéance : toujours fermé. Un test qui n'avance
    // qu'au-delà de la fenêtre ne distinguerait pas « la fenêtre fonctionne »
    // de « le compteur se vide tout seul ».
    vi.advanceTimersByTime(59_000)
    expect(rateLimit('essai:1.1.1.1', opts)).toBe(true)

    vi.advanceTimersByTime(2_000)
    expect(rateLimit('essai:1.1.1.1', opts)).toBe(false)
  })

  it('purge les entrées expirées au lieu de grossir sans fin', () => {
    vi.useFakeTimers()
    const opts = { max: 1, windowMs: 1_000 }

    for (let i = 0; i < 50; i += 1) rateLimit(`essai:10.0.0.${i}`, opts)

    // Le balayage n'a lieu qu'une fois par minute pour ne pas parcourir le
    // Map à chaque requête : il faut donc dépasser cet intervalle.
    vi.advanceTimersByTime(61_000)
    rateLimit('essai:declencheur', opts)

    // Les 50 entrées sont expirées et balayées : la première adresse repart
    // avec un quota neuf.
    expect(rateLimit('essai:10.0.0.0', opts)).toBe(false)
  })
})

describe('slugifier', () => {
  it('produit le format attendu par Christian', () => {
    expect(slugifier('Conteneur bureau aménagé')).toBe('conteneur-bureau-amenage')
  })

  it('retire les accents au lieu des lettres', () => {
    // Un filtre alphanumérique naïf supprimerait le « é » : « aménagé »
    // deviendrait « amnag ».
    expect(slugifier('Élévation à côté')).toBe('elevation-a-cote')
  })

  it('ne laisse jamais de tiret en tête, en queue, ni doublé', () => {
    expect(slugifier('  xTool — P2  ')).toBe('xtool-p2')
    expect(slugifier("Outillage d'installation")).toBe('outillage-d-installation')
    expect(slugifier('!!!')).toBe('')
  })

  it('respecte la limite de 80 caractères sans finir sur un tiret', () => {
    // La coupe peut tomber en plein milieu d'un mot et laisser un tiret
    // orphelin, que la regex du schéma refuserait.
    const long = slugifier('a'.repeat(60) + ' ' + 'b'.repeat(60))
    expect(long.length).toBeLessThanOrEqual(80)
    expect(long.endsWith('-')).toBe(false)
    // Même contrainte que le schéma Zod du catalogue.
    expect(long).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  })
})
