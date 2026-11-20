import { DOMAINE } from '@/lib/constantes'

import type { QuestionReponse } from '@/lib/geo/contenu'
import type { Reglages } from '@/lib/reglages'

/**
 * Données structurées schema.org du site : une fonction par type.
 *
 * Avant le 14 novembre 2026, le site ne déclarait qu'un seul bloc
 * (Organization, dans le layout). S'y ajoutent LocalBusiness (layout),
 * Service (une par page de service) et FAQPage (/faq et pages de services).
 *
 * Tout ce qui est déclaré ici doit être VISIBLE sur la page qui le porte :
 * un FAQPage dont les questions ne figurent pas dans le HTML est refusé par
 * Google et trompe les moteurs de réponse.
 */

/** Identifiant stable de l'organisation, pour relier les blocs entre eux. */
export const ID_ORGANISATION = `${DOMAINE}/#organisation`

type ReglagesEntreprise = Pick<
  Reglages,
  | 'contactCourriel'
  | 'contactTelephone'
  | 'contactRegion'
  | 'contactAdresse'
  | 'reseauFacebook'
  | 'reseauInstagram'
  | 'reseauLinkedin'
>

function reseaux(reglages: ReglagesEntreprise): string[] {
  return [reglages.reseauFacebook, reglages.reseauInstagram, reglages.reseauLinkedin].filter(
    (url) => url !== '',
  )
}

/**
 * LocalBusiness : l'établissement physique, distinct de l'Organization.
 *
 * Renvoie `null` sans adresse postale : un commerce local sans adresse n'a
 * pas de sens, et schema.org la tient pour requise.
 *
 * `address` reste au format TEXTE, comme dans l'Organization du layout :
 * l'adresse est un réglage libre (migration 0052), on ne la découpe pas en
 * devinant quelle partie est la ville ou le code postal.
 */
export function jsonLdEntrepriseLocale(
  reglages: ReglagesEntreprise,
  description: string,
): Record<string, unknown> | null {
  if (!reglages.contactAdresse) return null
  const liens = reseaux(reglages)
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${DOMAINE}/#etablissement`,
    name: 'KO-LAB Inc.',
    description,
    url: DOMAINE,
    image: `${DOMAINE}/images/og/og-ko-lab-terrasse-2026.jpg`,
    email: reglages.contactCourriel,
    ...(reglages.contactTelephone ? { telephone: reglages.contactTelephone } : {}),
    address: reglages.contactAdresse,
    areaServed: reglages.contactRegion,
    parentOrganization: { '@id': ID_ORGANISATION },
    ...(liens.length > 0 ? { sameAs: liens } : {}),
  }
}

/** Service : une capacité de KO-LAB, rattachée à l'organisation. */
export function jsonLdService({
  nom,
  description,
  chemin,
  locale,
  region,
}: {
  nom: string
  description: string
  /** Chemin sans préfixe de langue, tel que dans ROUTES. */
  chemin: string
  locale: string
  region: string
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: nom,
    serviceType: nom,
    description,
    url: `${DOMAINE}/${locale}${chemin}`,
    areaServed: region,
    provider: { '@id': ID_ORGANISATION },
  }
}

/** FAQPage : uniquement des questions affichées sur la page qui porte ce bloc. */
export function jsonLdFaq(questions: readonly QuestionReponse[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: { '@type': 'Answer', text: q.reponse },
    })),
  }
}

/**
 * Sérialise un bloc pour une balise <script>.
 *
 * Le `replace` échappe les chevrons ouvrants : sans lui, une valeur de
 * réglage contenant la séquence de fermeture du script couperait la balise
 * en plein milieu (même protection que le bloc Organization d'origine).
 */
export function serialiserJsonLd(donnees: Record<string, unknown>): string {
  return JSON.stringify(donnees).replace(/</g, '\\u003c')
}
