import { DOMAINE } from '@/lib/constantes'
import { telephoneAffiche } from '@/lib/utils/telephone'

import type { Comparatif, QuestionReponse, ReglagesGeo } from '@/lib/geo/contenu'

/**
 * Textes des deux pages créées par le lot GEO du 14 novembre 2026 :
 * /fr/faq et /fr/mentions-legales. Français seulement (voir contenu.ts).
 *
 * Mêmes règles que contenu.ts : rien d'inventé, coordonnées lues dans les
 * réglages, pas de tiret cadratin.
 */

/** `ko-lab.ca`, déduit du domaine configuré : jamais écrit en dur. */
const HOTE = new URL(DOMAINE).host

export const PAGE_FAQ = {
  metaTitre: 'Questions fréquentes',
  metaDescription:
    'Zones desservies, délais de réponse, capacités, location ou achat, demande de soumission et coordonnées : les réponses de KO-LAB Inc. aux questions les plus fréquentes.',
  eyebrow: 'FAQ',
  titre: 'Questions fréquentes',
  intro:
    'Zones desservies, délais, capacités, location ou achat, soumission et contact : les réponses courtes aux questions qu’on nous pose le plus souvent.',
  generalTitre: 'KO-LAB en général',
  parServiceLabel: 'Par service',
  lienService: 'Voir la page',
} as const

export type ContenuMentionsLegales = {
  metaTitre: string
  metaDescription: string
  eyebrow: string
  titre: string
  intro: string
  miseAJour: string
  sections: { titre: string; texte: string }[]
  documents: Comparatif
  documentsLabel: string
  faqLabel: string
  faqTitre: string
  faq: QuestionReponse[]
  servicesLabel: string
  servicesTitre: string
}

export function contenuMentionsLegales(reglages: ReglagesGeo): ContenuMentionsLegales {
  const courriel = reglages.contactCourriel
  const telephone = reglages.contactTelephone ? telephoneAffiche(reglages.contactTelephone) : ''
  const adresse = reglages.contactAdresse

  const coordonnees = [
    adresse ? `Adresse : ${adresse}.` : '',
    `Courriel : ${courriel}.`,
    telephone ? `Téléphone : ${telephone}.` : '',
  ]
    .filter(Boolean)
    .join(' ')

  return {
    metaTitre: 'Mentions légales',
    metaDescription:
      'Qui exploite le site de KO-LAB Inc., comment joindre l’entreprise, qui héberge le site et quelles règles s’appliquent à son contenu.',
    eyebrow: 'Mentions légales',
    titre: 'Mentions légales',
    intro:
      'Qui exploite ce site, comment nous joindre et où trouver les règles qui s’appliquent à son utilisation.',
    // ⚠️ À METTRE À JOUR À LA MAIN quand le texte de cette page change.
    miseAJour: 'Dernière mise à jour : 14 novembre 2026',

    sections: [
      {
        titre: 'Éditeur du site',
        texte: `Le site ${HOTE} est exploité par KO-LAB Inc., entreprise de déploiement terrain, de fabrication et de logistique basée en Outaouais, au Québec. ${coordonnees}`,
      },
      {
        titre: 'Hébergement et fournisseurs techniques',
        texte:
          'Le site est hébergé par Vercel. La base de données, l’authentification et le stockage des fichiers sont assurés par Supabase, et l’envoi des courriels transactionnels par Resend. Le rôle de chaque fournisseur est détaillé dans la politique de confidentialité.',
      },
      {
        titre: 'Propriété intellectuelle',
        texte:
          'Les textes, photos, logos et autres contenus de ce site appartiennent à KO-LAB Inc. ou sont utilisés avec l’autorisation de leurs propriétaires. Toute reproduction sans autorisation écrite est interdite.',
      },
      {
        titre: 'Renseignements personnels',
        texte: `La collecte et l’utilisation des renseignements personnels sont décrites dans la politique de confidentialité. Pour demander l’accès à vos renseignements, leur rectification ou le retrait de votre consentement, écrivez à ${courriel}.`,
      },
      {
        titre: 'Prix et paiements',
        texte:
          'Le site ne traite aucun paiement en ligne. Les prix affichés sont indicatifs et sont confirmés directement par notre équipe avant toute commande ferme.',
      },
      {
        titre: 'Droit applicable',
        texte:
          'Le site et son utilisation sont régis par les lois de la province de Québec et les lois applicables du Canada.',
      },
    ],

    documentsLabel: 'Comparer',
    documents: {
      titre: 'Quel document consulter',
      colonnes: ['Document', 'Ce qu’il couvre', 'Quand le consulter'],
      lignes: [
        [
          'Mentions légales',
          'Qui exploite le site, ses coordonnées et son hébergement.',
          'Pour savoir à qui vous vous adressez.',
        ],
        [
          'Politique de confidentialité',
          'Les renseignements recueillis, pourquoi, avec qui ils sont partagés et vos droits.',
          'Avant de remplir un formulaire ou de créer un compte.',
        ],
        [
          'Conditions d’utilisation',
          'Les comptes, les commandes et demandes de prix, la propriété intellectuelle et la responsabilité.',
          'Avant de soumettre une commande ou une demande de prix.',
        ],
      ],
    },

    faqLabel: 'FAQ',
    faqTitre: 'En bref',
    faq: [
      {
        question: `Qui exploite le site ${HOTE}?`,
        reponse: `KO-LAB Inc., entreprise de déploiement terrain, de fabrication et de logistique basée en Outaouais, au Québec. ${coordonnees}`,
      },
      {
        question: 'Qui héberge le site?',
        reponse:
          'Le site est hébergé par Vercel. Supabase fournit la base de données, l’authentification et le stockage des fichiers.',
      },
      {
        question: 'Peut-on réutiliser les photos et les textes du site?',
        reponse:
          'Non, pas sans autorisation écrite. Les textes, photos et logos appartiennent à KO-LAB Inc. ou sont utilisés avec l’autorisation de leurs propriétaires.',
      },
    ],

    servicesLabel: 'Services',
    servicesTitre: 'Ce que fait KO-LAB',
  }
}
