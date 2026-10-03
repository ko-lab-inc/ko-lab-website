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
  adresse: 'adresse',
  adresseAide: 'adresseAide',
  groupeLiens: 'groupeLiens',
  groupeLiensAide: 'groupeLiensAide',
  lienRentman: 'lienRentman',
  lienRentmanAide: 'lienRentmanAide',
  lienCandidature: 'lienCandidature',
  lienCandidatureAide: 'lienCandidatureAide',
  delaiReponse: 'delaiReponse',
  delaiReponseAide: 'delaiReponseAide',
  heuresOuverture: 'heuresOuverture',
  heuresOuvertureAide: 'heuresOuvertureAide',
  groupeReseaux: 'groupeReseaux',
  groupeReseauxAide: 'groupeReseauxAide',
  facebook: 'facebook',
  instagram: 'instagram',
  linkedin: 'linkedin',
  reseauAide: 'reseauAide',
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
  concoursActif: 'Page Concours',
  concoursActifAide: 'Désactivée, la page disparaît de la navigation.',
  enregistrer: 'Enregistrer',
  enCours: 'Enregistrement…',
  succes: 'Enregistré.',
  erreurDonnees: 'Vérifiez les champs.',
  erreurAdresse: 'Une adresse est mal écrite.',
  erreurRefuse: 'Refusé.',
  erreurServeur: 'Échec.',
  // Migration 0053.
  courrielRh: 'Courriel RH affiché',
  courrielRhAide: 'Vide = rh@ko-lab.ca.',
  groupeNotifications: 'Qui reçoit les notifications',
  groupeNotificationsAide: 'Jamais affichées sur le site.',
  notifDemandes: 'Nouvelle demande de contact',
  notifDemandesAide: 'Vide = le courriel de contact.',
  notifCandidatures: 'Nouvelle candidature',
  notifCandidaturesAide: 'Vide = le courriel RH.',
  groupeBandeau: 'Bandeau d’annonce',
  groupeBandeauAide: 'Une bande au-dessus du menu.',
  bandeauActif: 'Afficher le bandeau',
  bandeauActifAide: 'Visible immédiatement sur tout le site.',
  bandeauFr: 'Texte français',
  bandeauEn: 'Texte anglais',
  bandeauTexteAide: 'Une langue vide n’affiche rien dans cette langue.',
  groupeAbsence: 'Message d’absence',
  groupeAbsenceAide: 'Pendant une fermeture.',
  absenceActif: 'Activer le message d’absence',
  absenceActifAide: 'Remplace le délai annoncé.',
  absenceFr: 'Message français',
  absenceEn: 'Message anglais',
  absenceTexteAide: 'Une langue vide conserve la phrase de délai.',
}

const REGLAGES = {
  contactCourriel: 'info@ko-lab-center.ca',
  contactTelephone: '',
  contactRegion: 'Outaouais, Québec',
  contactAdresse: '',
  panierActif: true,
  solutionsModulaires: false,
  boutiqueActive: true,
  concoursActif: true,
  // Migration 0051 — valeurs qui etaient figees dans le code.
  lienRentman: '',
  lienCandidatureExterne: '',
  delaiReponseHeures: 48,
  heuresOuverture: '',
  reseauFacebook: '',
  reseauInstagram: '',
  reseauLinkedin: '',
  // Migration 0053.
  courrielRh: 'rh@ko-lab.ca',
  bandeauActif: false,
  bandeauTexteFr: '',
  bandeauTexteEn: '',
  absenceActif: false,
  absenceMessageFr: '',
  absenceMessageEn: '',
}

const BRUTES = { demandes: '', candidatures: '', courrielRh: '' }

function monter(reglages = REGLAGES, brutes = BRUTES) {
  return render(
    <FormulaireReglages
      locale="fr"
      reglages={reglages}
      brutes={brutes}
      courrielRhDefaut="rh@ko-lab.ca"
      libelles={LIBELLES}
    />,
  )
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

  /* ======================================================================
   * Migration 0053 — destinataires, bandeau, absence
   * ==================================================================== */

  it('présente les destinataires venus de la prop SÉPARÉE, pas de `reglages`', () => {
    // ⚠️ Le test qui compte vraiment de ce lot.
    //
    // Les deux listes sont marquées `publique = false` en base : elles ne sont
    // PAS dans `Reglages`, parce que `lireReglages()` lit avec la clé anon et
    // ne les voit pas. Elles arrivent par une lecture distincte, faite avec le
    // client de session.
    //
    // Si quelqu'un « simplifie » un jour en les reversant dans `reglages`,
    // les champs s'afficheront vides à chaque ouverture de l'écran quelle que
    // soit la valeur enregistrée — un réglage qui semble ne jamais se
    // sauvegarder, sans le moindre message d'erreur. Ce test échoue d'abord.
    monter(REGLAGES, {
      demandes: 'info@ko-lab.ca, christian@ko-lab.ca',
      candidatures: 'rh@ko-lab.ca',
      courrielRh: '',
    })

    expect(screen.getByLabelText('Nouvelle demande de contact')).toHaveValue(
      'info@ko-lab.ca, christian@ko-lab.ca',
    )
    expect(screen.getByLabelText('Nouvelle candidature')).toHaveValue('rh@ko-lab.ca')
  })

  it('envoie les neuf nouveaux champs dans le FormData', () => {
    monter(
      {
        ...REGLAGES,
        courrielRh: 'rh@ko-lab.ca',
        bandeauActif: true,
        bandeauTexteFr: 'Fermé du 24 au 2',
        bandeauTexteEn: 'Closed Dec 24 – Jan 2',
        absenceActif: false,
        absenceMessageFr: 'De retour le 6.',
        absenceMessageEn: 'Back on the 6th.',
      },
      { demandes: 'a@ko-lab.ca', candidatures: 'b@ko-lab.ca', courrielRh: 'rh@ko-lab.ca' },
    )

    const formulaire = screen.getByRole('button', { name: 'Enregistrer' }).closest('form')
    const donnees = new FormData(formulaire as HTMLFormElement)

    expect(donnees.get('courriel_rh')).toBe('rh@ko-lab.ca')
    expect(donnees.get('notifications_demandes')).toBe('a@ko-lab.ca')
    expect(donnees.get('notifications_candidatures')).toBe('b@ko-lab.ca')
    expect(donnees.get('bandeau_texte_fr')).toBe('Fermé du 24 au 2')
    expect(donnees.get('bandeau_texte_en')).toBe('Closed Dec 24 – Jan 2')
    expect(donnees.get('absence_message_fr')).toBe('De retour le 6.')
    expect(donnees.get('absence_message_en')).toBe('Back on the 6th.')
    // Les deux interrupteurs, dans des états opposés : coché = présent,
    // décoché = absent, comme les quatre drapeaux d'origine.
    expect(donnees.get('bandeau_actif')).toBe('true')
    expect(donnees.get('absence_actif')).toBeNull()
  })

  it('le champ RH reste VIDE quand la base est vide — le repli n’est qu’un placeholder', () => {
    // ⚠️ Régression constatée en réel le 2 octobre 2026.
    //
    // `lireReglages()` rend `courrielRh` APRÈS repli : vide en base devient
    // rh@ko-lab.ca. Le champ était prérempli avec cette valeur, donc le
    // premier enregistrement écrivait le repli EN BASE — mesuré pendant un
    // audit, `courriel_rh` est passé de "" à "rh@ko-lab.ca" sans que personne
    // ne l'ait saisi.
    //
    // Conséquence : le réglage cesse de dire « vide = la valeur du code » et
    // devient une copie, qui divergera le jour où EMAILS.rh changera. C'est
    // exactement le piège que 0053 évite pour les destinataires.
    monter({ ...REGLAGES, courrielRh: 'rh@ko-lab.ca' }, { ...BRUTES, courrielRh: '' })

    const champ = screen.getByLabelText('Courriel RH affiché')
    expect(champ).toHaveValue('')
    expect(champ).toHaveAttribute('placeholder', 'rh@ko-lab.ca')

    // Et rien ne part dans le FormData : l'action écrira bien une chaîne vide.
    const formulaire = screen.getByRole('button', { name: 'Enregistrer' }).closest('form')
    expect(new FormData(formulaire as HTMLFormElement).get('courriel_rh')).toBe('')
  })

  it('affiche l’adresse RH quand elle a vraiment été choisie', () => {
    // Le pendant du test précédent : une valeur réellement saisie doit
    // apparaître, sinon la correction aurait rendu le champ inutilisable.
    monter(REGLAGES, { ...BRUTES, courrielRh: 'recrutement@ko-lab.ca' })
    expect(screen.getByLabelText('Courriel RH affiché')).toHaveValue('recrutement@ko-lab.ca')
  })

  it('dit que le message d’absence REMPLACE la phrase de délai', () => {
    // Le point le moins évident de cet écran. Quelqu'un qui croit n'ajouter
    // qu'un avis ne s'attend pas à ce que le courriel de confirmation change
    // de texte : l'aide doit le dire avant, pas après.
    monter()
    expect(screen.getByText('Pendant une fermeture.')).toBeVisible()
    expect(screen.getByText('Remplace le délai annoncé.')).toBeVisible()
  })

  it('les textes bilingues sont des zones de texte, pas des champs d’une ligne', () => {
    monter()
    for (const libelle of ['Texte français', 'Texte anglais', 'Message français', 'Message anglais']) {
      expect(screen.getByLabelText(libelle).tagName).toBe('TEXTAREA')
    }
  })
})
