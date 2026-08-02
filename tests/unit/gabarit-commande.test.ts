import { writeFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { gabaritConfirmationCommande } from '@/lib/email/gabaritCommande'

const CREE_LE = new Date('2026-08-02T14:18:00')
const FENETRE_EXPIRE_LE = new Date('2026-08-04T14:18:00')

const DATE_LONGUE = new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium' }).format(CREE_LE)
const DATE_HEURE_EXPIRATION = new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium', timeStyle: 'short' }).format(
  FENETRE_EXPIRE_LE,
)

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
  it('inclut le numéro en titre, la date de réception, le rappel 48h, les produits, le total et le lien — jamais un <script>', () => {
    const { html, text } = gabaritConfirmationCommande({
      numero: 'CMD-2026-0099',
      creeLe: CREE_LE,
      fenetreExpireLe: FENETRE_EXPIRE_LE,
      lignes: LIGNES,
      modeLivraison: 'expedition',
      adresseLivraison: '123 rue Test, Gatineau (Québec) J8X 1A1',
      lienCommande: 'https://ko-lab-center.ca/fr/compte/commandes/abc-123',
      origine: 'https://ko-lab-center.ca',
    })

    // Numéro en gros titre — même traitement que /compte/commandes/[id].
    expect(html).toContain('<h1 style="margin:8px 0 0;font-family:Georgia,\'Times New Roman\',serif;font-weight:400;font-size:32px;color:#111210;">CMD-2026-0099</h1>')

    // Ligne de statut : reçue le [date], même vocabulaire que la page.
    expect(html).toContain(`Commande reçue le ${DATE_LONGUE}`)

    // Rappel de la fenêtre de 48h avec la date/heure EXACTE d'expiration —
    // pas « dans 48h », le même texte que Commande.fenetre_ouverte_texte.
    expect(html).toContain(`jusqu'au`)
    expect(html).toContain(DATE_HEURE_EXPIRATION)

    expect(html).toContain('Bambu Lab X1-Carbon')
    expect(html).toContain('Conteneur 2 pieds')
    expect(html).toContain('Solution sur mesure')
    expect(html).toContain('Sur demande')
    const totalAttendu = new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD',
      maximumFractionDigits: 0,
    }).format(5800)
    expect(html).toContain(totalAttendu)
    expect(html).toContain('123 rue Test')
    expect(html).toContain('https://ko-lab-center.ca/fr/compte/commandes/abc-123')
    expect(html).toContain('https://ko-lab-center.ca/images/produits/bambu-x1-carbon.webp')
    expect(html).toContain('https://exemple.supabase.co/storage/v1/object/public/produits/conteneur.webp')
    expect(html).not.toContain('https://ko-lab-center.cahttps://')
    expect(html).not.toMatch(/<script/i)

    // Rien qui n'est vrai pour KO-LAB aujourd'hui — voir la note d'en-tête.
    expect(html.toLowerCase()).not.toContain('paiement sécurisé')
    expect(html.toLowerCase()).not.toContain('retour')

    expect(text).toContain('CMD-2026-0099')
    expect(text).toContain(DATE_LONGUE)
    expect(text).toContain(DATE_HEURE_EXPIRATION)
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
      creeLe: CREE_LE,
      fenetreExpireLe: FENETRE_EXPIRE_LE,
      lignes: [LIGNES[0]!],
      modeLivraison: 'ramassage',
      adresseLivraison: null,
      lienCommande: 'https://ko-lab-center.ca/fr/compte/commandes/xyz',
      origine: 'https://ko-lab-center.ca',
    })

    expect(html).toContain('Ramassage sur place')
    expect(html).not.toContain('123 rue Test')
  })

  it('échappe les caractères HTML dans un nom de produit', () => {
    const { html } = gabaritConfirmationCommande({
      numero: 'CMD-2026-0101',
      creeLe: CREE_LE,
      fenetreExpireLe: FENETRE_EXPIRE_LE,
      lignes: [{ nom: '<b>Injecté</b> & Cie', categorie: 'Test', quantite: 1, prix: 10, image: null }],
      modeLivraison: 'ramassage',
      adresseLivraison: null,
      lienCommande: 'https://ko-lab-center.ca/fr/compte/commandes/xyz',
      origine: 'https://ko-lab-center.ca',
    })

    expect(html).not.toContain('<b>Injecté</b>')
    expect(html).toContain('&lt;b&gt;Injecté&lt;/b&gt; &amp; Cie')
  })
})
