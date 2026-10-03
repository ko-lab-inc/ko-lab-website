import { describe, expect, it } from 'vitest'

import { decouperAdresses } from '@/lib/destinataires'
import { bandeauPour, messageAbsence, type Reglages } from '@/lib/reglages'

/**
 * Migration 0053 — bandeau d'annonce, message d'absence, destinataires.
 *
 * ---------------------------------------------------------------------------
 * CE QUE CES TESTS PROTÈGENT
 *
 * Trois règles qui ne se voient pas dans le code appelant, et dont chaque
 * oubli produit un défaut VISIBLE PAR LE PUBLIC :
 *
 *   1. Un bandeau dont le texte n'existe que dans une langue ne doit pas
 *      afficher l'autre langue en repli. C'est la tentation naturelle quand on
 *      écrit `texteEn || texteFr`.
 *
 *   2. Le message d'absence REMPLACE la promesse de délai. Un `??` inversé,
 *      ou un repli vers l'autre langue, et le site promet 48 heures pendant
 *      une fermeture de deux semaines.
 *
 *   3. Une liste de destinataires ne doit JAMAIS revenir vide : Resend refuse
 *      l'envoi, et la demande reçue n'avertit personne — le défaut exact du
 *      1er octobre 2026.
 * ---------------------------------------------------------------------------
 */

/** Réglages neutres. Chaque test ne modifie que ce qu'il examine. */
const BASE: Reglages = {
  contactCourriel: 'info@ko-lab.ca',
  contactTelephone: '',
  contactRegion: 'Outaouais, Québec',
  contactAdresse: '',
  panierActif: false,
  solutionsModulaires: false,
  boutiqueActive: true,
  concoursActif: false,
  lienRentman: '',
  lienCandidatureExterne: '',
  delaiReponseHeures: 48,
  heuresOuverture: '',
  reseauFacebook: '',
  reseauInstagram: '',
  reseauLinkedin: '',
  courrielRh: 'rh@ko-lab.ca',
  bandeauActif: false,
  bandeauTexteFr: '',
  bandeauTexteEn: '',
  absenceActif: false,
  absenceMessageFr: '',
  absenceMessageEn: '',
}

describe('bandeauPour', () => {
  it('ne rend rien quand l’interrupteur est éteint, même avec du texte', () => {
    // Le texte reste enregistré pour l'an prochain — c'est tout l'intérêt de
    // séparer l'interrupteur du texte. Il ne doit pas s'afficher pour autant.
    const r = { ...BASE, bandeauActif: false, bandeauTexteFr: 'Fermé les fêtes' }
    expect(bandeauPour(r, 'fr')).toBeNull()
  })

  it('rend le texte de la langue demandée', () => {
    const r = {
      ...BASE,
      bandeauActif: true,
      bandeauTexteFr: 'Fermé du 24 au 2 janvier',
      bandeauTexteEn: 'Closed Dec 24 – Jan 2',
    }
    expect(bandeauPour(r, 'fr')).toBe('Fermé du 24 au 2 janvier')
    expect(bandeauPour(r, 'en')).toBe('Closed Dec 24 – Jan 2')
  })

  it('NE REPLIE PAS sur l’autre langue quand une seule est remplie', () => {
    // Le piège : `texteEn || texteFr` afficherait du français à un visiteur
    // anglophone. Une annonce peut ne concerner qu'un public — un avis sur un
    // événement francophone n'a rien à dire sur /en.
    const r = { ...BASE, bandeauActif: true, bandeauTexteFr: 'Portes ouvertes samedi' }
    expect(bandeauPour(r, 'fr')).toBe('Portes ouvertes samedi')
    expect(bandeauPour(r, 'en')).toBeNull()
  })

  it('traite une saisie d’espaces comme un texte vide', () => {
    // Quelqu'un qui « vide » le champ laisse souvent un espace. Un bandeau
    // noir de 40 px de haut, vide, sur toutes les pages du site.
    const r = { ...BASE, bandeauActif: true, bandeauTexteFr: '   \n  ' }
    expect(bandeauPour(r, 'fr')).toBeNull()
  })
})

describe('messageAbsence', () => {
  it('ne rend rien quand l’absence est éteinte', () => {
    const r = { ...BASE, absenceActif: false, absenceMessageFr: 'Fermé jusqu’au 6' }
    expect(messageAbsence(r, 'fr')).toBeNull()
  })

  it('rend le message de la langue demandée', () => {
    const r = {
      ...BASE,
      absenceActif: true,
      absenceMessageFr: 'Nous sommes fermés jusqu’au 6 janvier.',
      absenceMessageEn: 'We are closed until January 6.',
    }
    expect(messageAbsence(r, 'fr')).toBe('Nous sommes fermés jusqu’au 6 janvier.')
    expect(messageAbsence(r, 'en')).toBe('We are closed until January 6.')
  })

  it('garde la phrase de délai quand la langue n’est pas remplie', () => {
    // `null` veut dire « garder la phrase habituelle ». Différent du bandeau,
    // où `null` veut dire « ne rien afficher » : une page de contact sans
    // aucune indication de délai serait une régression, pas une omission.
    const r = { ...BASE, absenceActif: true, absenceMessageFr: 'Fermé.' }
    expect(messageAbsence(r, 'fr')).toBe('Fermé.')
    expect(messageAbsence(r, 'en')).toBeNull()
  })
})

describe('decouperAdresses', () => {
  it('découpe sur la virgule, le point-virgule et le retour à la ligne', () => {
    // Le champ est rempli à la main : on ne va pas refuser une saisie parce
    // qu'elle utilise le point-virgule.
    expect(decouperAdresses('a@ko-lab.ca, b@ko-lab.ca; c@ko-lab.ca\nd@ko-lab.ca')).toEqual([
      'a@ko-lab.ca',
      'b@ko-lab.ca',
      'c@ko-lab.ca',
      'd@ko-lab.ca',
    ])
  })

  it('retire les espaces autour — sinon l’envoi échoue sur l’adresse', () => {
    expect(decouperAdresses('  a@ko-lab.ca ,  b@ko-lab.ca  ')).toEqual([
      'a@ko-lab.ca',
      'b@ko-lab.ca',
    ])
  })

  it('écarte les fragments vides d’une double virgule', () => {
    expect(decouperAdresses('a@ko-lab.ca,,b@ko-lab.ca,')).toEqual(['a@ko-lab.ca', 'b@ko-lab.ca'])
  })

  it('rend un tableau vide sur une saisie vide — l’appelant doit replier', () => {
    expect(decouperAdresses('')).toEqual([])
    expect(decouperAdresses('   ')).toEqual([])
  })

  it('n’invente pas de validation d’adresse', () => {
    // Le `@` est le seul filtre, volontairement : Zod valide à
    // l'enregistrement, là où l'erreur peut être montrée à quelqu'un. Ici, à
    // l'envoi, écarter une entrée douteuse retirerait un destinataire en
    // silence. Une entrée sans `@` ne peut pas être une adresse, elle part.
    expect(decouperAdresses('pas-une-adresse, vrai@ko-lab.ca')).toEqual(['vrai@ko-lab.ca'])
  })
})
