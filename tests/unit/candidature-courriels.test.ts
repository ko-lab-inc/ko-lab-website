import { describe, expect, it } from 'vitest'

import {
  gabaritAccuseCandidature,
  gabaritCandidatureRefusee,
} from '@/lib/email/gabaritsNotifications'

/**
 * Les deux courriels qu'un candidat reçoit — migration 0054.
 *
 * ---------------------------------------------------------------------------
 * CE QUE CES TESTS PROTÈGENT
 *
 * Jusqu'au 3 octobre 2026, un candidat ne recevait RIEN : il joignait son CV,
 * lisait « nous revenons vers vous dans les 48 heures ouvrables », et plus
 * aucun signe de vie — ni à l'envoi, ni au refus.
 *
 * Ce qui est vérifié ici n'est pas que le texte existe, mais qu'il ne dit pas
 * ce qu'il ne doit pas dire. Un accusé trop chaleureux fait attendre quelqu'un
 * pour rien ; un refus qui invente un motif ou promet de « garder le dossier »
 * ment à une personne qui a confié son CV. Ces écarts ne cassent aucun build.
 * ---------------------------------------------------------------------------
 */

describe('gabaritAccuseCandidature', () => {
  const base = { nom: 'Awa Diallo', delaiHeures: 48 } as const

  it('répond dans la langue de la candidature', () => {
    expect(gabaritAccuseCandidature({ ...base, locale: 'fr' }).sujet).toContain(
      'bien reçu votre candidature',
    )
    expect(gabaritAccuseCandidature({ ...base, locale: 'en' }).sujet).toContain(
      'received your application',
    )
  })

  it('reprend le délai des réglages, pas une valeur en dur', () => {
    // `delai_reponse_heures` (0051) existe précisément pour que les cinq
    // endroits qui font cette promesse ne divergent plus.
    const { texte } = gabaritAccuseCandidature({ ...base, locale: 'fr', delaiHeures: 72 })
    expect(texte).toContain('72 heures ouvrables')
    expect(texte).not.toContain('48')
  })

  it('NE PROMET PAS qu’on rappellera', () => {
    // Le piège de ce courriel : il est lu avec espoir. S'il ressemble à une
    // réponse, la personne attend, relance, puis en veut à l'entreprise. La
    // condition « si votre profil correspond » doit rester.
    const fr = gabaritAccuseCandidature({ ...base, locale: 'fr' }).texte
    const en = gabaritAccuseCandidature({ ...base, locale: 'en' }).texte
    expect(fr).toMatch(/si votre profil correspond/i)
    expect(en).toMatch(/if your profile matches/i)
    // Rien qui annonce une suite certaine.
    expect(fr.toLowerCase()).not.toMatch(/entrevue|entretien|nous vous rappellerons|retenu/)
    expect(en.toLowerCase()).not.toMatch(/interview|we will call you|shortlist/)
  })

  it('le message d’absence REMPLACE la phrase de délai', () => {
    const { texte } = gabaritAccuseCandidature({
      ...base,
      locale: 'fr',
      absence: 'Nous sommes fermés jusqu’au 6 janvier.',
    })
    expect(texte).toContain('Nous sommes fermés jusqu’au 6 janvier.')
    expect(texte).not.toContain('48')
    expect(texte).not.toMatch(/heures ouvrables/)
  })

  it('sans absence, le courriel est celui d’avant', () => {
    const avecNull = gabaritAccuseCandidature({ ...base, locale: 'fr', absence: null })
    const sansArgument = gabaritAccuseCandidature({ ...base, locale: 'fr' })
    expect(avecNull).toEqual(sansArgument)
  })

  it('ne laisse jamais passer un « undefined »', () => {
    const { texte } = gabaritAccuseCandidature({ nom: 'Luc', locale: 'en', delaiHeures: 48 })
    expect(texte).not.toContain('undefined')
    expect(texte).not.toContain('null')
  })
})

describe('gabaritCandidatureRefusee', () => {
  it('existe dans les deux langues', () => {
    expect(gabaritCandidatureRefusee({ nom: 'Luc', locale: 'fr' }).texte).toContain('Bonjour Luc,')
    expect(gabaritCandidatureRefusee({ nom: 'Luc', locale: 'en' }).texte).toContain('Hello Luc,')
  })

  it('N’INVENTE AUCUN MOTIF', () => {
    // ⚠️ Le test qui compte le plus de ce fichier.
    //
    // La base ne connaît aucune raison de refus — il n'existe pas de champ
    // pour ça. Tout motif écrit ici serait donc inventé. Et un motif
    // générique (« nous avons reçu de nombreuses candidatures ») est lu pour
    // ce qu'il est.
    for (const locale of ['fr', 'en'] as const) {
      const { texte } = gabaritCandidatureRefusee({ nom: 'Luc', locale })
      expect(texte.toLowerCase()).not.toMatch(
        /nombreuses candidatures|many applications|expérience insuffisante|not enough experience|malheureusement|unfortunately|profil ne correspond pas/,
      )
    }
  })

  it('ne promet PAS de garder le dossier', () => {
    // Promesse que rien ne tient : aucun rappel automatique n'existe sur un
    // dossier classé, et la Loi 25 pousse à ne pas conserver un CV sans fin.
    for (const locale of ['fr', 'en'] as const) {
      const { texte } = gabaritCandidatureRefusee({ nom: 'Luc', locale })
      expect(texte.toLowerCase()).not.toMatch(
        /gardons votre|conservons votre|dans nos dossiers|keep your (cv|resume|application) on file|we will keep/,
      )
    }
  })

  it('laisse la porte ouverte et une adresse réelle', () => {
    const fr = gabaritCandidatureRefusee({ nom: 'Luc', locale: 'fr' }).texte
    const en = gabaritCandidatureRefusee({ nom: 'Luc', locale: 'en' }).texte
    expect(fr).toMatch(/postuler de nouveau/i)
    expect(en).toMatch(/apply again/i)
    // info@ko-lab.ca est la boîte réellement consultée ; site@ko-lab-center.ca
    // n'est qu'un expéditeur technique que personne ne relève.
    for (const t of [fr, en]) {
      expect(t).toContain('info@ko-lab.ca')
      expect(t).not.toContain('site@ko-lab-center.ca')
    }
  })

  it('ne dit pas de quel poste il s’agit — le gabarit n’en sait rien', () => {
    // Il ne reçoit que le nom et la langue. Si quelqu'un ajoute un poste au
    // texte un jour, il devra d'abord le faire entrer dans la signature, et
    // ce test l'y obligera.
    const { texte } = gabaritCandidatureRefusee({ nom: 'Luc', locale: 'fr' })
    expect(texte).not.toContain('{')
    expect(texte).not.toContain('undefined')
  })
})
