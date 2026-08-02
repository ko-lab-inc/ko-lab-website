import { writeFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { gabaritConfirmationCommande } from '@/lib/email/gabaritCommande'

const LIGNES = [
  {
    nom: 'Bambu Lab X1-Carbon',
    categorie: 'Impression 3D',
    quantite: 1,
    prix: 1800,
    image: '/images/produits/bambu-x1-carbon.webp',
  },
  {
    nom: 'Conteneur 2 pieds',
    categorie: 'Conteneurs',
    quantite: 2,
    prix: 2000,
    image: 'https://exemple.supabase.co/storage/v1/object/public/produits/conteneur.webp',
  },
  {
    nom: 'Solution sur mesure',
    categorie: 'Fabrication',
    quantite: 1,
    prix: null,
    image: null,
  },
]

describe('gabaritConfirmationCommande', () => {
  it('inclut le numéro, les produits, le total et le lien — jamais un <script>', () => {
    const { html, text } = gabaritConfirmationCommande({
      numero: 'CMD-2026-0099',
      lignes: LIGNES,
      modeLivraison: 'expedition',
      adresseLivraison: '123 rue Test, Gatineau (Québec) J8X 1A1',
      lienCommande: 'https://ko-lab.ca/fr/compte/commandes/abc-123',
      origine: 'https://ko-lab.ca',
    })

    expect(html).toContain('CMD-2026-0099')
    expect(html).toContain('Bambu Lab X1-Carbon')
    expect(html).toContain('Conteneur 2 pieds')
    expect(html).toContain('Solution sur mesure')
    expect(html).toContain('Sur demande')
    // Espace insécable (U+202F/U+00A0) entre les milliers, pas une espace
    // normale — même piège documenté dans panier.spec.ts.
    const totalAttendu = new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD',
      maximumFractionDigits: 0,
    }).format(5800)
    expect(html).toContain(totalAttendu)
    expect(html).toContain('123 rue Test')
    expect(html).toContain('https://ko-lab.ca/fr/compte/commandes/abc-123')
    // Image locale préfixée avec `origine`, jamais laissée relative.
    expect(html).toContain('https://ko-lab.ca/images/produits/bambu-x1-carbon.webp')
    // Image déjà absolue laissée telle quelle, jamais doublement préfixée.
    expect(html).toContain('https://exemple.supabase.co/storage/v1/object/public/produits/conteneur.webp')
    expect(html).not.toContain('https://ko-lab.cahttps://')
    expect(html).not.toMatch(/<script/i)

    expect(text).toContain('CMD-2026-0099')
    expect(text).toContain(totalAttendu)

    // Aperçu visuel manuel — écrit dans le scratchpad, jamais commité.
    writeFileSync(
      'C:/Users/DG/AppData/Local/Temp/claude/c--Users-DG-Downloads-KOLABINC/b2dbc591-dfa6-46f9-b5f8-6e6bcdedc8ce/scratchpad/apercu-courriel.html',
      html,
    )
  })

  it('mode ramassage : aucune adresse affichée', () => {
    const { html } = gabaritConfirmationCommande({
      numero: 'CMD-2026-0100',
      lignes: [LIGNES[0]!],
      modeLivraison: 'ramassage',
      adresseLivraison: null,
      lienCommande: 'https://ko-lab.ca/fr/compte/commandes/xyz',
      origine: 'https://ko-lab.ca',
    })

    expect(html).toContain('Ramassage sur place')
    expect(html).not.toContain('123 rue Test')
  })

  it('échappe les caractères HTML dans un nom de produit', () => {
    const { html } = gabaritConfirmationCommande({
      numero: 'CMD-2026-0101',
      lignes: [{ nom: '<b>Injecté</b> & Cie', categorie: 'Test', quantite: 1, prix: 10, image: null }],
      modeLivraison: 'ramassage',
      adresseLivraison: null,
      lienCommande: 'https://ko-lab.ca/fr/compte/commandes/xyz',
      origine: 'https://ko-lab.ca',
    })

    expect(html).not.toContain('<b>Injecté</b>')
    expect(html).toContain('&lt;b&gt;Injecté&lt;/b&gt; &amp; Cie')
  })
})
