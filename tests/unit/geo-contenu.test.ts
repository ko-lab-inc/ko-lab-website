import { describe, expect, it } from 'vitest'

import { contenuGeo, SERVICES_GEO, type ReglagesGeo } from '@/lib/geo/contenu'
import { jsonLdEntrepriseLocale, jsonLdFaq, jsonLdService, serialiserJsonLd } from '@/lib/geo/json-ld'
import { contenuMentionsLegales, PAGE_FAQ } from '@/lib/geo/pages'

/**
 * Contenu GEO (FAQ, faits clés, comparatifs) — corrections du 14 novembre 2026.
 *
 * Ce contenu vit dans des modules TS, pas dans messages/*.json : le test
 * `site-sans-tiret-cadratin` ne le voit donc pas. Celui-ci reprend la même
 * règle, et vérifie en plus ce qui ferait mentir le site en silence : une
 * coordonnée écrite en dur au lieu de venir des réglages, un tableau dont une
 * ligne n'a pas le bon nombre de cellules, un FAQPage mal formé.
 */

const REGLAGES: ReglagesGeo = {
  contactCourriel: 'test@exemple.test',
  contactTelephone: '+1 555 010-0199',
  contactRegion: 'Région de test',
  contactAdresse: '1 rue du Test, Ville',
  delaiReponseHeures: 37,
  heuresOuverture: 'Lun-ven 8 h à 17 h',
}

const TIRETS = /[—–]/

type Noeud = string | number | boolean | null | undefined | { [cle: string]: Noeud } | readonly Noeud[]

function textes(noeud: Noeud): string[] {
  if (typeof noeud === 'string') return [noeud]
  if (noeud === null || typeof noeud !== 'object') return []
  if (Array.isArray(noeud)) return noeud.flatMap(textes)
  return Object.values(noeud as { [cle: string]: Noeud }).flatMap(textes)
}

describe('contenuGeo', () => {
  const contenu = contenuGeo('fr', REGLAGES)

  it('n’existe qu’en français pour ce lot', () => {
    expect(contenu).not.toBeNull()
    expect(contenuGeo('en', REGLAGES)).toBeNull()
  })

  it('les mentions légales affichent le NEQ de KO-LAB INC.', () => {
    const page = contenuMentionsLegales(REGLAGES)
    const editeur = page.sections.find((s) => s.titre === 'Éditeur du site')
    expect(editeur?.texte).toContain('NEQ) : 1181317331')
    // Le nom du site ne dépend pas de NEXT_PUBLIC_SITE_URL (ancien domaine en local).
    expect(editeur?.texte).toContain('Le site ko-lab.ca est exploité')
    expect(JSON.stringify(page)).not.toContain('ko-lab-center')
    expect(page.faq[0]?.reponse).toContain('NEQ 1181317331')
  })

  it('ne contient aucun tiret cadratin', () => {
    const fautifs = [
      ...textes(contenu as unknown as Noeud),
      ...textes(contenuMentionsLegales(REGLAGES) as unknown as Noeud),
      ...textes(PAGE_FAQ as unknown as Noeud),
    ].filter((t) => TIRETS.test(t))
    expect(fautifs).toEqual([])
  })

  it('lit les coordonnées et le délai dans les réglages, jamais en dur', () => {
    const tout = textes(contenu as unknown as Noeud).join('\n')
    expect(tout).toContain('test@exemple.test')
    expect(tout).toContain('555 010-0199')
    expect(tout).toContain('Région de test')
    expect(tout).toContain('1 rue du Test, Ville')
    expect(tout).toContain('37 heures')
    // Aucune vraie coordonnée ne doit traîner dans le texte.
    expect(tout).not.toMatch(/ko-lab\.ca|819|48 heures/)
  })

  it('omet téléphone, adresse et heures quand ils ne sont pas renseignés', () => {
    const sans = contenuGeo('fr', {
      ...REGLAGES,
      contactTelephone: '',
      contactAdresse: '',
      heuresOuverture: '',
    })
    const tout = textes(sans as unknown as Noeud).join('\n')
    expect(tout).not.toMatch(/appelez|Adresse :|Heures d’ouverture|bureaux sont situés/)
    expect(tout).not.toMatch(/undefined|null| {2}|\. \./)
  })

  it('couvre les six sujets demandés dans la FAQ générale', () => {
    const questions = contenu!.faqGenerale.map((q) => q.question).join('\n')
    for (const sujet of [/zones/i, /combien de temps/i, /envergure/i, /louer ou acheter/i, /soumission/i, /joindre/i]) {
      expect(questions).toMatch(sujet)
    }
  })

  it('n’a aucune question en double, toutes pages confondues', () => {
    const questions = [
      ...contenu!.faqGenerale,
      ...SERVICES_GEO.flatMap((cle) => contenu!.services[cle].faq),
      ...contenuMentionsLegales(REGLAGES).faq,
    ].map((q) => q.question)
    expect(new Set(questions).size).toBe(questions.length)
  })

  it.each(SERVICES_GEO)('%s : faits, comparatif et FAQ complets', (cle) => {
    const service = contenu!.services[cle]
    const termes = service.faits.map((f) => f.terme)
    expect(termes).toEqual(expect.arrayContaining(['Zone desservie', 'Délai de réponse', 'Contact']))
    expect(new Set(termes).size).toBe(termes.length)
    expect(service.faq.length).toBeGreaterThanOrEqual(3)
    expect(service.comparatifs.length).toBeGreaterThanOrEqual(1)
    for (const comparatif of service.comparatifs) {
      for (const ligne of comparatif.lignes) {
        expect(ligne).toHaveLength(comparatif.colonnes.length)
      }
    }
  })
})

describe('JSON-LD', () => {
  it('FAQPage : une Question et une Answer par entrée', () => {
    const bloc = jsonLdFaq([{ question: 'Q?', reponse: 'R.' }])
    expect(bloc).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'Q?', acceptedAnswer: { '@type': 'Answer', text: 'R.' } },
      ],
    })
  })

  it('Service : rattaché à l’organisation, URL dans la bonne langue', () => {
    const bloc = jsonLdService({
      nom: 'Nom',
      description: 'Desc',
      chemin: '/location',
      locale: 'en',
      region: 'Région',
    })
    expect(bloc['@type']).toBe('Service')
    expect(String(bloc.url)).toMatch(/\/en\/location$/)
    expect(bloc.provider).toEqual({ '@id': expect.stringMatching(/#organisation$/) })
  })

  it('LocalBusiness : aucun bloc sans adresse postale', () => {
    const base = { ...REGLAGES, reseauFacebook: '', reseauInstagram: '', reseauLinkedin: '' }
    expect(jsonLdEntrepriseLocale({ ...base, contactAdresse: '' }, 'd')).toBeNull()
    const bloc = jsonLdEntrepriseLocale(base, 'd')
    expect(bloc).toMatchObject({ '@type': 'LocalBusiness', address: '1 rue du Test, Ville' })
    expect(bloc).not.toHaveProperty('sameAs')
  })

  it('échappe les chevrons : une valeur ne peut pas fermer la balise script', () => {
    const sortie = serialiserJsonLd({ name: '</script><script>alert(1)</script>' })
    expect(sortie).not.toContain('<')
    expect(JSON.parse(sortie).name).toBe('</script><script>alert(1)</script>')
  })
})
