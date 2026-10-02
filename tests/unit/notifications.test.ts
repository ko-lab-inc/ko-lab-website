import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import {
  gabaritAccuseReception,
  gabaritDemandeTraitee,
  gabaritNouvelleCandidature,
} from '@/lib/email/gabaritsNotifications'

/**
 * Notifications — gabarits et envoi.
 *
 * ---------------------------------------------------------------------------
 * CE QUE CES TESTS PROTÈGENT
 *
 * L'audit du 1er octobre 2026 a montré trois trous : une candidature ne
 * prévenait personne, un échec d'envoi était avalé, et le demandeur n'avait
 * aucun accusé. Les deux premiers sont des défauts SILENCIEUX — rien dans
 * l'interface ne les signalait. Un test est le seul endroit où ce genre de
 * manque laisse une trace quand il revient.
 *
 * Les gabarits sont testés sur ce qui se voit : la langue, et l'absence de ce
 * qui ne doit pas sortir. L'envoi est testé sur sa promesse centrale — ne
 * jamais lancer, et dire la vérité sur l'échec.
 * ---------------------------------------------------------------------------
 */

describe('gabaritNouvelleCandidature', () => {
  const base = {
    nom: 'Awa Diallo',
    email: 'awa@exemple.ca',
    telephone: '819 555-0101',
    ville: 'Gatineau',
    postes: ['Technicien de scène', 'Manutention'],
    disponibilites: 'Fins de semaine',
    aExperience: true,
    travailExterieur: true,
    avecCv: true,
    lienAdmin: 'https://ko-lab-center.ca/fr/admin/candidatures',
  }

  it('met le nom et la ville dans l’objet — la liste des courriels suffit à trier', () => {
    expect(gabaritNouvelleCandidature(base).sujet).toBe('Nouvelle candidature — Awa Diallo, Gatineau')
  })

  it('reprend les champs utiles au rappel', () => {
    const { texte } = gabaritNouvelleCandidature(base)
    expect(texte).toContain('awa@exemple.ca')
    expect(texte).toContain('819 555-0101')
    expect(texte).toContain('Technicien de scène, Manutention')
    expect(texte).toContain('Fins de semaine')
  })

  it('NE JOINT PAS le CV, et dit où il se trouve', () => {
    // Le CV vit dans un bucket privé : une pièce jointe en ferait une copie
    // hors de tout contrôle d'accès, pour un document personnel.
    const { texte } = gabaritNouvelleCandidature(base)
    expect(texte).toMatch(/CV joint\s*:\s*oui/)
    expect(texte).toContain('/fr/admin/candidatures')
  })

  it('survit à une candidature minimale', () => {
    const { sujet, texte } = gabaritNouvelleCandidature({
      ...base,
      ville: '',
      telephone: '',
      postes: [],
      disponibilites: '',
      avecCv: false,
    })
    expect(sujet).toBe('Nouvelle candidature — Awa Diallo')
    expect(texte).toMatch(/CV joint\s*:\s*non/)
    expect(texte).not.toContain('undefined')
    expect(texte).not.toContain('null')
  })
})

describe('gabaritAccuseReception', () => {
  it('répond en français à qui a écrit depuis /fr', () => {
    const { sujet, texte } = gabaritAccuseReception({ nom: 'Luc', locale: 'fr' })
    expect(sujet).toContain('Nous avons bien reçu')
    expect(texte).toContain('Bonjour Luc,')
    expect(texte).toContain('48 heures')
  })

  it('répond en anglais à qui a écrit depuis /en', () => {
    const { sujet, texte } = gabaritAccuseReception({ nom: 'Luc', locale: 'en' })
    expect(sujet).toContain('We received your request')
    expect(texte).toContain('Hello Luc,')
    expect(texte).toContain('48 hours')
    // Aucun reliquat de la version française.
    expect(texte).not.toMatch(/Bonjour|heures/)
  })

  it('donne une adresse de contact réelle, pas l’expéditeur technique', () => {
    // info@ko-lab.ca est la boîte consultée ; site@ko-lab-center.ca n'est
    // qu'un expéditeur vérifié chez Resend et n'est relevé par personne.
    const { texte } = gabaritAccuseReception({ nom: 'Luc', locale: 'fr' })
    expect(texte).toContain('info@ko-lab.ca')
    expect(texte).not.toContain('site@ko-lab-center.ca')
  })
})

describe('gabaritDemandeTraitee', () => {
  it('existe dans les deux langues', () => {
    expect(gabaritDemandeTraitee({ nom: 'Luc', locale: 'fr' }).sujet).toContain('traitée')
    expect(gabaritDemandeTraitee({ nom: 'Luc', locale: 'en' }).sujet).toContain('handled')
  })

  it('ne promet RIEN que la base ne sache', () => {
    // Les trois statuts sont nouveau / lu / traité. « Traité » ne dit pas si
    // le projet est accepté, refusé, livré ou facturé : le texte ne doit donc
    // jamais le laisser croire.
    for (const locale of ['fr', 'en'] as const) {
      const { texte } = gabaritDemandeTraitee({ nom: 'Luc', locale })
      expect(texte.toLowerCase()).not.toMatch(
        /accept|approuv|refus|declin|livr|deliver|factur|invoic|devis|quote/,
      )
    }
  })

  it('laisse une porte de sortie au demandeur', () => {
    expect(gabaritDemandeTraitee({ nom: 'Luc', locale: 'fr' }).texte).toMatch(/répondez/i)
    expect(gabaritDemandeTraitee({ nom: 'Luc', locale: 'en' }).texte).toMatch(/reply/i)
  })
})

describe('envoyerCourriel', () => {
  const CLE = process.env.RESEND_API_KEY

  beforeEach(() => {
    vi.resetModules()
  })
  afterEach(() => {
    if (CLE === undefined) delete process.env.RESEND_API_KEY
    else process.env.RESEND_API_KEY = CLE
    vi.doUnmock('resend')
  })

  it('ne lance pas quand la clé est absente — elle REND l’échec', async () => {
    delete process.env.RESEND_API_KEY
    const { envoyerCourriel } = await import('@/lib/email/envoyer')
    const r = await envoyerCourriel({ a: 'x@exemple.ca', sujet: 's', texte: 't' })
    expect(r.ok).toBe(false)
    // Le message finit affiché dans /admin/demandes : il doit être
    // compréhensible par quelqu'un qui n'a pas accès aux journaux.
    expect(r.ok === false && r.raison).toMatch(/RESEND_API_KEY/)
  })

  it('traite un refus métier de Resend comme un ÉCHEC, pas comme un succès', async () => {
    // Resend ne lève pas sur une adresse invalide ou un domaine non vérifié :
    // il renvoie `{ error }`. Sans ce test, le jour où quelqu'un simplifie ce
    // code, un envoi refusé repasserait pour un succès — et on serait revenu
    // au défaut du 1er octobre 2026.
    process.env.RESEND_API_KEY = 're_test'
    vi.doMock('resend', () => ({
      Resend: class {
        emails = {
          send: async () => ({
            data: null,
            error: { name: 'validation_error', message: 'Domain is not verified' },
          }),
        }
      },
    }))
    const { envoyerCourriel } = await import('@/lib/email/envoyer')
    const r = await envoyerCourriel({ a: 'x@exemple.ca', sujet: 's', texte: 't' })
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.raison).toContain('Domain is not verified')
  })

  it('ne lance pas non plus quand la bibliothèque jette', async () => {
    process.env.RESEND_API_KEY = 're_test'
    vi.doMock('resend', () => ({
      Resend: class {
        emails = {
          send: async () => {
            throw new Error('réseau injoignable')
          },
        }
      },
    }))
    const { envoyerCourriel } = await import('@/lib/email/envoyer')
    const r = await envoyerCourriel({ a: 'x@exemple.ca', sujet: 's', texte: 't' })
    expect(r).toEqual({ ok: false, raison: 'réseau injoignable' })
  })

  it('rend l’identifiant Resend en cas de succès', async () => {
    process.env.RESEND_API_KEY = 're_test'
    vi.doMock('resend', () => ({
      Resend: class {
        emails = { send: async () => ({ data: { id: 'abc-123' }, error: null }) }
      },
    }))
    const { envoyerCourriel } = await import('@/lib/email/envoyer')
    expect(await envoyerCourriel({ a: 'x@exemple.ca', sujet: 's', texte: 't' })).toEqual({
      ok: true,
      id: 'abc-123',
    })
  })
})

describe('raisonCourte', () => {
  it('tronque une pile d’appels sans la rendre illisible', async () => {
    const { raisonCourte } = await import('@/lib/email/envoyer')
    const long = 'x'.repeat(1000)
    const r = raisonCourte(long)
    // Le contrat est « pas plus de 300 », pas « exactement 300 » : 297
    // caractères plus l'ellipse en font 298.
    expect(r.length).toBeLessThanOrEqual(300)
    expect(r.endsWith('…')).toBe(true)
  })

  it('aplatit les sauts de ligne — la colonne est affichée dans un tableau', async () => {
    const { raisonCourte } = await import('@/lib/email/envoyer')
    expect(raisonCourte('erreur\n  sur deux lignes')).toBe('erreur sur deux lignes')
  })
})
