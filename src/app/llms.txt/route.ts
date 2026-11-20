import en from '../../../messages/en.json'
import fr from '../../../messages/fr.json'

import { DOMAINE } from '@/lib/constantes'
import { contenuGeo, ROUTE_SERVICE, SERVICES_GEO } from '@/lib/geo/contenu'
import { lireRealisationsPubliees } from '@/lib/realisations'
import { lireReglages } from '@/lib/reglages'
import { ROUTES } from '@/lib/routes'
import { telephoneAffiche } from '@/lib/utils/telephone'

/**
 * /llms.txt — carte du site écrite pour les moteurs de réponse (IA).
 * Corrections GEO du 14 novembre 2026, proposition 1.
 *
 * Avant ce fichier, /llms.txt répondait 500 : faute de route, l'URL tombait
 * dans le segment `[locale]` avec « llms.txt » pour langue.
 *
 * Format : markdown simple, selon la convention llmstxt.org (un titre, un
 * résumé en citation, puis des sections de liens décrits).
 *
 * Rien n'est écrit en dur qui existe déjà ailleurs :
 *  - titres et descriptions : les métadonnées des pages (messages/*.json) ;
 *  - faits clés et résumé : lib/geo/contenu.ts ;
 *  - coordonnées : les réglages (/admin/reglages) ;
 *  - réalisations : les fiches publiées en base.
 *
 * Route hors du système de langue, comme robots.ts et sitemap.ts : le proxy
 * exclut tout chemin portant une extension. Les catalogues sont donc importés
 * directement, sans next-intl.
 */
export const revalidate = 3600

type CleMeta = keyof typeof fr.Metadata

function url(locale: 'fr' | 'en', chemin: string): string {
  return `${DOMAINE}/${locale}${chemin === ROUTES.accueil ? '' : chemin}`
}

/** Une ligne de lien décrit, à partir des métadonnées de la page. */
function lien(locale: 'fr' | 'en', cle: CleMeta, chemin: string): string {
  const meta = (locale === 'fr' ? fr : en).Metadata[cle]
  return `- [${meta.title}](${url(locale, chemin)}): ${meta.description}`
}

const PAGES_SERVICES: readonly [CleMeta, string][] = [
  ['location', ROUTES.location],
  ['installations', ROUTES.installations],
  ['equipements', ROUTES.equipements],
  ['production', ROUTES.production],
  ['operations', ROUTES.operations],
  ['lab', ROUTES.lab],
  ['noel', ROUTES.noel],
]

const PAGES_ENTREPRISE: readonly [CleMeta, string][] = [
  ['capacites', ROUTES.capacites],
  ['apropos', ROUTES.apropos],
  ['carrieres', ROUTES.carrieres],
  ['contact', ROUTES.contact],
]

export async function GET() {
  const reglages = await lireReglages()
  const geo = contenuGeo('fr', reglages)
  const fiches = ((await lireRealisationsPubliees('fr')) ?? []).filter((r) => r.fiche)

  const lignes: string[] = [
    '# KO-LAB Inc.',
    '',
    `> ${geo?.resume ?? fr.Metadata.home.description}`,
    '',
    'Site bilingue : le français est la langue de référence, chaque page de service existe aussi en anglais.',
    '',
    '## Faits clés',
    '',
    `- Zone desservie : ${reglages.contactRegion}. Production événementielle : Outaouais et Ottawa.`,
    `- Délai de réponse à une demande : ${reglages.delaiReponseHeures} heures.`,
    '- Expérience : plus de 20 000 heures de travail terrain, opérations multisites, mandats gouvernementaux et festivals majeurs.',
    '- Moyens : atelier de fabrication (Le LAB), inventaire d’équipements en location, camions, remorques et nacelles, réseau de partenaires.',
    '- Aucun paiement en ligne : les prix affichés sont indicatifs et confirmés par l’équipe.',
    '',
    '## Services',
    '',
    ...PAGES_SERVICES.map(([cle, chemin]) => lien('fr', cle, chemin)),
    '',
    '## Réalisations',
    '',
    lien('fr', 'realisations', ROUTES.realisations),
    ...fiches.map(
      (r) =>
        `- [${r.titre}](${url('fr', `${ROUTES.realisations}/${r.slug}`)})${r.description ? `: ${r.description.replace(/\s+/g, ' ').trim()}` : ''}`,
    ),
    '',
    '## Questions fréquentes',
    '',
    `- [Questions fréquentes](${url('fr', ROUTES.faq)}): zones desservies, délais, capacités, location ou achat, soumission et contact.`,
    ...(geo
      ? SERVICES_GEO.map(
          (cle) =>
            `- [${geo.services[cle].nom} : faits clés, comparatif et questions](${url('fr', ROUTE_SERVICE[cle])})`,
        )
      : []),
    '',
    '## Entreprise',
    '',
    ...PAGES_ENTREPRISE.map(([cle, chemin]) => lien('fr', cle, chemin)),
    `- [Mentions légales](${url('fr', ROUTES.mentionsLegales)}): qui exploite le site, coordonnées et hébergement.`,
    lien('fr', 'politiqueConfidentialite', ROUTES.politiqueConfidentialite),
    lien('fr', 'conditionsUtilisation', ROUTES.conditionsUtilisation),
    '',
    '## Coordonnées',
    '',
    `- Courriel : ${reglages.contactCourriel}`,
    ...(reglages.contactTelephone
      ? [`- Téléphone : ${telephoneAffiche(reglages.contactTelephone)}`]
      : []),
    ...(reglages.contactAdresse ? [`- Adresse : ${reglages.contactAdresse}`] : []),
    ...(reglages.heuresOuverture ? [`- Heures d’ouverture : ${reglages.heuresOuverture}`] : []),
    `- Formulaire : ${url('fr', ROUTES.contact)}`,
    '',
    '## English',
    '',
    `- [${en.Metadata.home.title}](${url('en', ROUTES.accueil)}): ${en.Metadata.home.description}`,
    ...PAGES_SERVICES.map(([cle, chemin]) => lien('en', cle, chemin)),
    lien('en', 'realisations', ROUTES.realisations),
    ...PAGES_ENTREPRISE.map(([cle, chemin]) => lien('en', cle, chemin)),
    '',
    '## Optional',
    '',
    `- [Plan du site XML](${DOMAINE}/sitemap.xml)`,
    '',
  ]

  return new Response(lignes.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
