import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { FormulaireReglages } from '@/components/sections/FormulaireReglages'

/**
 * Formulaire des réglages.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI EN TEST UNITAIRE ET NON EN E2E
 *
 * L'écran vit derrière l'authentification admin. Un test E2E devrait donc se
 * connecter avec un vrai compte administrateur de KO-LAB — soit stocker ses
 * identifiants dans le dépôt, soit en fabriquer un sur la base de production.
 * Ni l'un ni l'autre.
 *
 * Ce qui est vérifiable sans session, c'est le formulaire lui-même : les
 * valeurs qu'il présente, ce qu'il envoie, et le piège des cases à cocher.
 * L'autorisation, elle, est garantie par la politique RLS `reglages_maj_admin`
 * — vérifiée côté base par `npm run audit:supabase`, pas ici.
 * ---------------------------------------------------------------------------
 */

// L'action serveur ne peut pas s'exécuter sous jsdom : elle importe le client
// Supabase et `next/cache`. On la remplace, le test porte sur le formulaire.
vi.mock('@/app/(admin)/[locale]/admin/reglages/actions', () => ({
  enregistrerReglages: vi.fn(),
}))

const LIBELLES = {
  groupeContact: 'Coordonnées',
  groupeContactAide: 'Affichées sur le site.',
  groupeFonctions: 'Parties du site',
  groupeFonctionsAide: 'Chaque interrupteur ouvre ou ferme une partie.',
  courriel: 'Courriel de contact',
  courrielAide: 'Reçoit les demandes.',
  telephone: 'Téléphone',
  telephoneAide: 'Vide, la ligne disparaît.',
  region: 'Secteur',
  regionAide: 'Sous les coordonnées.',
  panier: 'Panier de demande groupée',
  panierAide: 'Désactivé, le panier disparaît.',
  modulaires: 'Conteneurs et solutions modulaires',
  modulairesAide: 'Désactivé, la catégorie disparaît.',
  boutiqueActive: 'Boutique en ligne',
  boutiqueActiveAide: 'Désactivée, la boutique disparaît entièrement.',
  enregistrer: 'Enregistrer',
  enCours: 'Enregistrement…',
  succes: 'Enregistré.',
  erreurDonnees: 'Vérifiez les champs.',
  erreurRefuse: 'Refusé.',
  erreurServeur: 'Échec.',
}

const REGLAGES = {
  contactCourriel: 'info@ko-lab-center.ca',
  contactTelephone: '',
  contactRegion: 'Outaouais, Québec',
  panierActif: true,
  solutionsModulaires: false,
  boutiqueActive: true,
}

function monter(reglages = REGLAGES) {
  return render(<FormulaireReglages locale="fr" reglages={reglages} libelles={LIBELLES} />)
}

describe('FormulaireReglages', () => {
  it('présente les valeurs en vigueur', () => {
    monter()

    expect(screen.getByLabelText('Courriel de contact')).toHaveValue('info@ko-lab-center.ca')
    expect(screen.getByLabelText('Secteur')).toHaveValue('Outaouais, Québec')
    // Téléphone vide : c'est une valeur voulue, pas une absence.
    expect(screen.getByLabelText('Téléphone')).toHaveValue('')
  })

  it('reflète l’état de chaque interrupteur, séparément', () => {
    monter()

    // Le piège serait un composant qui coche tout ou rien. Les deux drapeaux
    // sont volontairement dans des états opposés ici.
    expect(screen.getByRole('checkbox', { name: /Panier de demande groupée/ })).toBeChecked()
    expect(
      screen.getByRole('checkbox', { name: /Conteneurs et solutions modulaires/ }),
    ).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Boutique en ligne/ })).toBeChecked()
  })

  it('les interrupteurs sont de vraies cases à cocher', () => {
    monter()

    const panier = screen.getByRole('checkbox', { name: /Panier de demande groupée/ })

    // Une `div` stylée en interrupteur n'aurait ni le rôle, ni l'état coché,
    // ni la barre d'espace, ni l'envoi dans le FormData. C'est exactement ce
    // que ce test interdit de refaire.
    expect(panier.tagName).toBe('INPUT')
    expect(panier).toHaveAttribute('type', 'checkbox')

    fireEvent.click(panier)
    expect(panier).not.toBeChecked()
    fireEvent.click(panier)
    expect(panier).toBeChecked()
  })

  it('une case décochée n’est PAS envoyée — d’où la conversion côté serveur', () => {
    monter()

    const formulaire = screen.getByRole('button', { name: 'Enregistrer' }).closest('form')
    const donnees = new FormData(formulaire as HTMLFormElement)

    // Cochée : présente avec la valeur 'true'.
    expect(donnees.get('panier_actif')).toBe('true')
    // Décochée : ABSENTE. C'est la règle du HTML, et la raison pour laquelle
    // l'action serveur traduit « absent » en 'false' plutôt que de lire la
    // valeur du champ.
    expect(donnees.get('solutions_modulaires')).toBeNull()
    expect(donnees.get('boutique_active')).toBe('true')
    expect(donnees.get('locale')).toBe('fr')
  })

  it('le courriel est obligatoire et typé', () => {
    monter()
    const champ = screen.getByLabelText('Courriel de contact')

    // Le contrôle du navigateur ne remplace pas la validation serveur, mais
    // il évite l'aller-retour sur la faute de frappe la plus courante.
    expect(champ).toBeRequired()
    expect(champ).toHaveAttribute('type', 'email')
  })

  it('chaque interrupteur explique ce que le décocher provoque', () => {
    monter()

    // « Panier actif » seul ne dit rien à quelqu'un qui n'a pas écrit le code.
    // La conséquence, si.
    expect(screen.getByText('Désactivé, le panier disparaît.')).toBeVisible()
    expect(screen.getByText('Désactivé, la catégorie disparaît.')).toBeVisible()
    expect(screen.getByText('Désactivée, la boutique disparaît entièrement.')).toBeVisible()
  })
})
