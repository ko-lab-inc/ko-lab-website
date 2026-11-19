import { ROUTES } from '@/lib/routes'
import { telephoneAffiche } from '@/lib/utils/telephone'

import type { AppLocale } from '@/i18n/routing'
import type { Reglages } from '@/lib/reglages'

/**
 * Contenu « GEO » : ce que le site dit en clair aux moteurs de réponse (IA)
 * et aux visiteurs pressés. Faits clés, tableaux comparatifs et questions
 * fréquentes, pour la page /faq, les pages de services et /llms.txt.
 *
 * ---------------------------------------------------------------------------
 * RÈGLES DE RÉDACTION (lot du 14 novembre 2026)
 *
 * 1. RIEN D'INVENTÉ. Chaque phrase reprend un fait déjà publié sur le site
 *    (messages/fr.json) ou un réglage (/admin/reglages). Aucun prix, aucune
 *    quantité. Le seul chiffre repris est « plus de 20 000 heures de travail
 *    terrain », déjà affiché sur l'accueil.
 * 2. Les coordonnées et le délai de réponse viennent des RÉGLAGES, jamais
 *    d'une valeur écrite ici : changer un courriel dans l'admin met à jour
 *    la FAQ, les faits clés et le JSON-LD en même temps.
 * 3. Pas de tiret cadratin (tests/unit/geo-contenu.test.ts le vérifie).
 * 4. Si un fait change sur le site (une capacité retirée, une formule de
 *    location modifiée), ce fichier doit suivre : il le répète.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI UN MODULE TS ET PAS messages/fr.json
 *
 * Ce contenu est STRUCTURÉ (listes de questions, lignes de tableau) et sert
 * trois sorties à la fois : le HTML, le JSON-LD FAQPage et /llms.txt. Dans
 * le catalogue next-intl, il aurait fallu des clés numérotées et un tuple
 * `as const` par liste, répétés à trois endroits.
 *
 * FRANÇAIS SEULEMENT pour ce lot (décision d'Alkhaly : pas de nouvelle
 * traduction). `contenuGeo('en', ...)` renvoie `null` et les composants ne
 * rendent alors rien : les pages anglaises restent exactement comme avant.
 * Traduire plus tard = écrire la branche anglaise ici, rien d'autre à brancher.
 * ---------------------------------------------------------------------------
 */

export type CleService =
  | 'location'
  | 'installations'
  | 'equipements'
  | 'production'
  | 'operations'
  | 'lab'

export const SERVICES_GEO: readonly CleService[] = [
  'location',
  'installations',
  'equipements',
  'production',
  'operations',
  'lab',
]

/** Page de chaque service : pour les liens de la FAQ et le JSON-LD Service. */
export const ROUTE_SERVICE: Record<CleService, string> = {
  location: ROUTES.location,
  installations: ROUTES.installations,
  equipements: ROUTES.equipements,
  production: ROUTES.production,
  operations: ROUTES.operations,
  lab: ROUTES.lab,
}

export type QuestionReponse = { question: string; reponse: string }

export type Fait = { terme: string; valeur: string }

export type Comparatif = {
  titre: string
  /** En-têtes : la première nomme le critère, les suivantes les options comparées. */
  colonnes: readonly string[]
  /** Une ligne par critère, même nombre de cellules que `colonnes`. */
  lignes: readonly (readonly string[])[]
}

export type ContenuService = {
  nom: string
  faits: readonly Fait[]
  comparatifs: readonly Comparatif[]
  faq: readonly QuestionReponse[]
}

export type ContenuGeo = {
  libelles: {
    enBref: string
    faitsTitre: string
    comparerLabel: string
    faqLabel: string
    faqTitre: string
    voirFaq: string
  }
  /** Présentation en deux phrases, reprise par /llms.txt et la FAQ. */
  resume: string
  faqGenerale: readonly QuestionReponse[]
  services: Record<CleService, ContenuService>
}

/** Les seuls réglages lus ici : coordonnées et délai de réponse. */
export type ReglagesGeo = Pick<
  Reglages,
  | 'contactCourriel'
  | 'contactTelephone'
  | 'contactRegion'
  | 'contactAdresse'
  | 'delaiReponseHeures'
  | 'heuresOuverture'
>

const COLONNES_AUTONOME = ['', 'Par vos propres moyens', 'Avec KO-LAB'] as const

export function contenuGeo(locale: AppLocale, reglages: ReglagesGeo): ContenuGeo | null {
  if (locale !== 'fr') return null

  const heures = reglages.delaiReponseHeures
  const region = reglages.contactRegion
  const courriel = reglages.contactCourriel
  const telephone = reglages.contactTelephone ? telephoneAffiche(reglages.contactTelephone) : ''
  const adresse = reglages.contactAdresse

  // Phrases de coordonnées, écrites une fois : la FAQ et les faits clés
  // doivent dire exactement la même chose.
  const joindre = telephone
    ? `Écrivez à ${courriel} ou appelez au ${telephone}.`
    : `Écrivez à ${courriel}.`
  const contactCourt = telephone ? `${courriel} · ${telephone}` : courriel

  const faitsCommuns: Fait[] = [
    { terme: 'Zone desservie', valeur: region },
    { terme: 'Délai de réponse', valeur: `Réponse à votre demande dans les ${heures} heures.` },
    { terme: 'Contact', valeur: contactCourt },
  ]

  return {
    libelles: {
      enBref: 'En bref',
      faitsTitre: 'L’essentiel en quelques lignes',
      comparerLabel: 'Comparer',
      faqLabel: 'FAQ',
      faqTitre: 'Questions fréquentes',
      voirFaq: 'Toutes les questions',
    },

    resume:
      'KO-LAB Inc. est une entreprise de déploiement terrain, de fabrication et de logistique basée en Outaouais, au Québec. Elle réunit la conception, la fabrication, les équipements, les équipes et les partenaires nécessaires pour transformer une idée en opération concrète. Sa signature : De l’idée au terrain.',

    faqGenerale: [
      {
        question: 'Que fait KO-LAB?',
        reponse:
          'KO-LAB Inc. est une entreprise de déploiement terrain, de fabrication et de logistique basée en Outaouais, au Québec. Elle réunit la conception, la fabrication, les équipements, les équipes et les partenaires nécessaires pour transformer une idée en opération concrète, avec un seul point de contact, de l’idée au déploiement.',
      },
      {
        question: 'Quels services KO-LAB offre-t-elle?',
        reponse:
          'Six volets : la location d’équipement, les installations et aménagements, la logistique, le transport et les équipements, la production événementielle, les opérations terrain (main-d’œuvre et coordination) et Le LAB, l’atelier de conception et de fabrication sur mesure.',
      },
      {
        question: 'Quelles zones KO-LAB dessert-elle?',
        reponse: `KO-LAB dessert le secteur ${region}.${adresse ? ` Ses bureaux sont situés au ${adresse}.` : ''} La production événementielle couvre l’Outaouais et Ottawa. Pour un mandat hors de ce secteur, décrivez-nous le projet.`,
      },
      {
        question: 'En combien de temps KO-LAB répond-elle à une demande?',
        reponse: `Nous revenons vers vous dans les ${heures} heures. Le calendrier de réalisation dépend ensuite du mandat : indiquez vos dates et le lieu dès le premier message.`,
      },
      {
        question: 'Quelle envergure de projets KO-LAB peut-elle prendre en charge?',
        reponse:
          'Nos équipes cumulent plus de 20 000 heures de travail terrain, sur des opérations multisites, des mandats gouvernementaux et des festivals majeurs. La capacité est complète : main-d’œuvre, coordination, transport, montage, démontage, logistique et soutien opérationnel.',
      },
      {
        question: 'Vaut-il mieux louer ou acheter?',
        reponse:
          'Cela dépend du besoin. Pour un événement ou un besoin ponctuel, KO-LAB loue du mobilier, des scènes, des clôtures, de l’éclairage, du décor, des équipements terrain et des infrastructures. Le décor des Fêtes est offert en location clé en main ou à l’achat. Si la pièce recherchée n’existe pas, Le LAB peut la concevoir et la fabriquer sur mesure.',
      },
      {
        question: 'Comment demander une soumission?',
        reponse: `Remplissez le formulaire de la page Contact en décrivant le projet, les dates, le lieu et ce qu’il faut mettre sur le terrain. Nous revenons vers vous dans les ${heures} heures. Pour une location, vous pouvez aussi préparer votre demande directement dans le catalogue.`,
      },
      {
        question: 'Comment louer de l’équipement?',
        reponse:
          'Sur la page Location, choisissez une catégorie, ajoutez les équipements à votre demande, indiquez la date de début et la date de retour, puis envoyez le tout. Nous revenons vers vous avec le prix et la disponibilité.',
      },
      {
        question: 'Peut-on payer en ligne sur le site?',
        reponse:
          'Non. Le site ne traite aucun paiement en ligne. Les prix affichés sont indicatifs et sont confirmés directement par notre équipe avant toute commande ferme.',
      },
      {
        question: 'KO-LAB fabrique-t-elle des pièces et des décors sur mesure?',
        reponse:
          'Oui. Le LAB prend en charge la conception et la modélisation 3D, l’impression 3D, la découpe laser, le CNC, le prototypage, les petites séries et la reproduction de pièces difficiles à obtenir, puis KO-LAB livre et installe.',
      },
      {
        question: 'KO-LAB travaille-t-elle de nuit ou en dehors des heures d’ouverture?',
        reponse:
          'Oui. Nos équipes travaillent de nuit, hors des heures d’ouverture et sur plusieurs sites à la fois quand le mandat le demande.',
      },
      {
        question: 'Comment joindre KO-LAB?',
        reponse: `${joindre}${adresse ? ` Adresse : ${adresse}.` : ''}${reglages.heuresOuverture ? ` Heures d’ouverture : ${reglages.heuresOuverture}.` : ''} Vous pouvez aussi utiliser le formulaire de la page Contact.`,
      },
    ],

    services: {
      location: {
        nom: 'Location d’équipement',
        faits: [
          {
            terme: 'Inventaire',
            valeur:
              'Mobilier, scènes et plateformes, clôtures et barrières, éclairage, décor, équipements terrain et infrastructures.',
          },
          {
            terme: 'Prix',
            valeur:
              'Prix et disponibilité confirmés par l’équipe après votre demande. Aucun paiement en ligne.',
          },
          {
            terme: 'Au-delà de l’inventaire',
            valeur:
              'Accès à davantage de machinerie grâce au partenaire GM Locations. Si un article manque, écrivez-nous.',
          },
          ...faitsCommuns,
        ],
        comparatifs: [
          {
            titre: 'Louer ou acheter',
            colonnes: ['', 'Louer', 'Acheter'],
            lignes: [
              [
                'Quand c’est le bon choix',
                'Besoin ponctuel, saisonnier ou événementiel.',
                'Usage fréquent ou permanent.',
              ],
              [
                'Entreposage',
                'Le matériel retourne à l’inventaire KO-LAB après vos dates.',
                'À prévoir entre deux utilisations.',
              ],
              [
                'Transport, installation et retrait',
                'Peuvent être confiés aux équipes KO-LAB.',
                'À organiser vous-même, ou à confier à KO-LAB dans le cadre d’un mandat.',
              ],
              [
                'Pièce introuvable',
                'Écrivez-nous : l’inventaire va souvent au-delà de ce qui est affiché en ligne.',
                'Le LAB peut la concevoir et la fabriquer sur mesure.',
              ],
            ],
          },
          {
            titre: 'Trois façons de louer',
            colonnes: ['Formule', 'Ce que ça comprend', 'Pour qui'],
            lignes: [
              [
                'Location d’équipement',
                'Les articles choisis dans l’inventaire, pour vos dates.',
                'Vous avez votre équipe, il vous manque le matériel.',
              ],
              [
                'Décor des Fêtes clé en main',
                'Conception, installation, démontage en janvier et entreposage jusqu’à l’an prochain, par KO-LAB.',
                'Vous voulez un décor livré, sans gérer la logistique.',
              ],
              [
                'Location intégrée à un mandat',
                'Équipements, logistique, installation et coordination terrain dans un même projet.',
                'Un événement ou un déploiement complet.',
              ],
            ],
          },
        ],
        faq: [
          {
            question: 'Comment faire une demande de location?',
            reponse:
              'Choisissez une catégorie, ajoutez les équipements à votre demande, indiquez la date de début et la date de retour, puis envoyez le tout. Nous revenons vers vous avec le prix et la disponibilité.',
          },
          {
            question: 'Les prix affichés pour la location sont-ils fermes?',
            reponse:
              'Non. L’inventaire évolue constamment : les quantités disponibles et les prix affichés peuvent varier. Le prix est confirmé par notre équipe après réception de votre demande.',
          },
          {
            question: 'Que faire si l’équipement recherché n’apparaît pas dans le catalogue?',
            reponse:
              'Écrivez-nous. Notre inventaire et nos capacités vont souvent au-delà de ce qui est affiché en ligne, et notre partenaire GM Locations donne accès à davantage de machinerie.',
          },
        ],
      },

      installations: {
        nom: 'Installations et aménagements',
        faits: [
          {
            terme: 'Ce que ça couvre',
            valeur:
              'Décors saisonniers, éclairage décoratif, aménagement de parcs et d’espaces publics, signalisation et enseignes, murales, présentoirs, mobilier et aménagements commerciaux.',
          },
          {
            terme: 'Déroulement',
            valeur: 'Conception, fabrication, location, transport, installation et retrait.',
          },
          {
            terme: 'Horaires',
            valeur: 'De nuit ou hors des heures d’ouverture quand il le faut.',
          },
          ...faitsCommuns,
        ],
        comparatifs: [
          {
            titre: 'KO-LAB ou faire soi-même',
            colonnes: COLONNES_AUTONOME,
            lignes: [
              [
                'Interlocuteurs',
                'Un fournisseur par étape : design, fabrication, transport, pose.',
                'Un seul point de contact, de l’idée au retrait.',
              ],
              [
                'Éléments de décor',
                'À acheter ou à faire fabriquer, puis à entreposer.',
                'Loués depuis l’inventaire KO-LAB ou créés sur mesure au LAB.',
              ],
              [
                'Installation',
                'À organiser avec votre personnel.',
                'Les équipes KO-LAB, de nuit ou hors des heures d’ouverture au besoin.',
              ],
              [
                'Fin de saison',
                'Démontage et entreposage à organiser.',
                'Retrait par KO-LAB. Pour le décor des Fêtes, entreposage jusqu’à l’an prochain.',
              ],
            ],
          },
        ],
        faq: [
          {
            question: 'KO-LAB offre-t-elle des décors de Noël pour les entreprises?',
            reponse:
              'Oui. KO-LAB conçoit des décors d’entreprise, des illuminations et des créations personnalisées pour les Fêtes, en location clé en main ou à l’achat. L’équipe s’occupe de la conception, de l’installation, du démontage en janvier et de l’entreposage.',
          },
          {
            question: 'Pouvez-vous installer en dehors des heures d’ouverture?',
            reponse:
              'Oui. Les installations se font de nuit ou hors des heures d’ouverture quand il le faut, dans des environnements commerciaux, publics, événementiels ou temporaires.',
          },
          {
            question: 'Les éléments installés sont-ils loués ou fabriqués?',
            reponse:
              'Les deux sont possibles. Les éléments peuvent être loués depuis l’inventaire KO-LAB ou créés sur mesure au LAB lorsque le projet le demande.',
          },
        ],
      },

      equipements: {
        nom: 'Logistique, transport et équipements',
        faits: [
          {
            terme: 'Moyens',
            valeur:
              'Camions et véhicules de travail, remorques ouvertes, fermées et spécialisées, nacelles et équipements d’élévation, équipements de manutention, éclairage temporaire et distribution électrique.',
          },
          {
            terme: 'Réseau',
            valeur: 'Accès à davantage de machinerie grâce au partenaire GM Locations.',
          },
          ...faitsCommuns,
        ],
        comparatifs: [
          {
            titre: 'KO-LAB ou faire soi-même',
            colonnes: COLONNES_AUTONOME,
            lignes: [
              [
                'Transport',
                'Louer un camion, trouver une remorque et des chauffeurs.',
                'Camions, remorques et équipes organisés par KO-LAB.',
              ],
              [
                'Levage et manutention',
                'Louer chaque appareil séparément.',
                'Nacelles, équipements d’élévation et de manutention prévus avec le mandat.',
              ],
              [
                'Besoin de plus de machinerie',
                'Chercher un autre fournisseur.',
                'Accès élargi grâce à GM Locations.',
              ],
              [
                'Coordination',
                'Vous arrimez les horaires de chaque fournisseur.',
                'Un seul point de contact pour acheminer, installer et retirer le matériel.',
              ],
            ],
          },
        ],
        faq: [
          {
            question: 'Peut-on obtenir l’équipement sans la main-d’œuvre?',
            reponse:
              'Oui, pour l’équipement offert en location : les remorques, les nacelles et l’outillage figurent dans la catégorie Équipements terrain de la page Location. Dans un mandat, KO-LAB peut fournir à la fois les équipes et les moyens nécessaires pour accomplir le travail.',
          },
          {
            question: 'Quels équipements de levage et de manutention sont disponibles?',
            reponse:
              'Des nacelles et des équipements d’élévation, des équipements de manutention, des outils d’installation et du matériel de chargement.',
          },
          {
            question: 'Et si le projet demande de la machinerie que KO-LAB n’a pas?',
            reponse:
              'Lorsque le projet demande plus que l’inventaire régulier, le partenariat avec GM Locations permet d’élargir rapidement les moyens disponibles.',
          },
        ],
      },

      production: {
        nom: 'Production événementielle',
        faits: [
          {
            terme: 'Types d’événements',
            valeur:
              'Événements corporatifs, lancements, levées de fonds, conférences de presse, activations, soirées spéciales, aménagements VIP et expériences de marque.',
          },
          {
            terme: 'Ce que ça couvre',
            valeur:
              'Concept et direction de production, plan de site, décor, fabrication d’éléments, location d’équipements, logistique, installation, démontage et coordination terrain.',
          },
          { terme: 'Zone desservie', valeur: 'Outaouais et Ottawa.' },
          ...faitsCommuns.filter((f) => f.terme !== 'Zone desservie'),
        ],
        comparatifs: [
          {
            titre: 'KO-LAB ou faire soi-même',
            colonnes: COLONNES_AUTONOME,
            lignes: [
              [
                'Fournisseurs',
                'Agence, décorateur, locateur, transporteur et équipe de montage.',
                'Une seule équipe, du plan de site au démontage.',
              ],
              [
                'Équipements et décor',
                'Loués chez plusieurs fournisseurs.',
                'Les équipements et les équipes de KO-LAB, avec des éléments fabriqués au besoin.',
              ],
              [
                'Jour de l’événement',
                'Vous coordonnez le terrain.',
                'Coordination terrain assurée par KO-LAB.',
              ],
              [
                'Après l’événement',
                'Démontage et retours à gérer.',
                'L’installation et le démontage font partie du mandat.',
              ],
            ],
          },
        ],
        faq: [
          {
            question: 'Quels types d’événements KO-LAB produit-elle?',
            reponse:
              'Des événements corporatifs, des lancements, des levées de fonds, des conférences de presse, des activations, des soirées spéciales, des aménagements VIP, des expériences de marque et des événements dans des lieux atypiques.',
          },
          {
            question: 'Faut-il déjà avoir un concept pour faire appel à KO-LAB?',
            reponse:
              'Non. Le concept et la direction de production font partie de ce que KO-LAB prend en charge, tout comme le plan de site, le décor et la fabrication d’éléments.',
          },
          {
            question: 'Dans quelle région KO-LAB produit-elle des événements?',
            reponse: 'En Outaouais et à Ottawa.',
          },
        ],
      },

      operations: {
        nom: 'Opérations terrain',
        faits: [
          { terme: 'Expérience', valeur: 'Plus de 20 000 heures de travail terrain.' },
          {
            terme: 'Types de mandats',
            valeur: 'Événements majeurs, opérations gouvernementales et projets multisites.',
          },
          {
            terme: 'Ce que ça couvre',
            valeur:
              'Main-d’œuvre terrain, chefs d’équipe, planification des effectifs et des horaires, montage et démontage, logistique et transport, soutien opérationnel sur site.',
          },
          ...faitsCommuns,
        ],
        comparatifs: [
          {
            titre: 'KO-LAB ou faire soi-même',
            colonnes: COLONNES_AUTONOME,
            lignes: [
              [
                'Personnel',
                'Recruter, former et encadrer du personnel temporaire.',
                'Équipes terrain et chefs d’équipe fournis par KO-LAB.',
              ],
              [
                'Horaires',
                'Planification à votre charge.',
                'Planification des effectifs et des horaires par KO-LAB.',
              ],
              [
                'Plusieurs sites',
                'Une coordination à monter pour chaque site.',
                'Plusieurs sites et horaires coordonnés simultanément.',
              ],
              [
                'Vos équipes',
                'Votre personnel absorbe le travail supplémentaire.',
                'Les équipes KO-LAB s’intègrent à vos équipes internes.',
              ],
            ],
          },
        ],
        faq: [
          {
            question: 'KO-LAB peut-elle fournir seulement de la main-d’œuvre?',
            reponse:
              'Oui. KO-LAB fournit de la main-d’œuvre terrain et des chefs d’équipe, planifie les effectifs et les horaires, et intègre ses équipes aux équipes internes du client.',
          },
          {
            question: 'Pouvez-vous coordonner plusieurs sites en même temps?',
            reponse:
              'Oui. Nos équipes coordonnent plusieurs sites et plusieurs horaires simultanément, pour des événements majeurs, des opérations gouvernementales et des projets multisites.',
          },
          {
            question: 'Quelle est l’expérience terrain de KO-LAB?',
            reponse:
              'Plus de 20 000 heures de travail terrain, réalisées sur des opérations multisites, des mandats gouvernementaux et des festivals majeurs.',
          },
        ],
      },

      lab: {
        nom: 'Le LAB',
        faits: [
          {
            terme: 'Ce que ça couvre',
            valeur:
              'Développement de produits et prototypage, signalisation et affichage architectural, création et fabrication sur mesure, production visuelle et déploiement.',
          },
          {
            terme: 'Technologies',
            valeur:
              'Impression 3D, découpe et gravure laser, CNC, impression grand format, finition et assemblage. Électronique et éclairage lorsque le projet le demande.',
          },
          {
            terme: 'Processus',
            valeur:
              'Comprendre, concevoir, prototyper, tester et améliorer, préparer la production, produire, puis installer.',
          },
          ...faitsCommuns,
        ],
        comparatifs: [
          {
            titre: 'KO-LAB ou faire soi-même',
            colonnes: COLONNES_AUTONOME,
            lignes: [
              [
                'Conception',
                'Trouver un designer, puis un atelier.',
                'Conception, modélisation 3D et prototypage au même endroit.',
              ],
              [
                'Fabrication',
                'Un sous-traitant par procédé.',
                'Impression 3D, découpe laser et CNC au LAB.',
              ],
              [
                'Pièce introuvable',
                'Chercher un fournisseur, ou y renoncer.',
                'Reproduction de pièces difficiles à obtenir.',
              ],
              [
                'Installation',
                'À organiser une fois la fabrication terminée.',
                'Livraison, installation et déploiement par KO-LAB.',
              ],
            ],
          },
        ],
        faq: [
          {
            question: 'Le LAB fabrique-t-il des pièces uniques ou des séries?',
            reponse:
              'Les deux. Le LAB produit des pièces uniques, des prototypes, des gabarits, des outils de production et des petites séries.',
          },
          {
            question: 'Le LAB peut-il gérer la signalisation complète d’un immeuble?',
            reponse:
              'Oui. Pour des tours résidentielles, des immeubles de bureaux, des commerces et des projets immobiliers, KO-LAB peut développer, produire et installer un programme complet de signalisation, de la prise de mesures jusqu’au déploiement final.',
          },
          {
            question: 'Faut-il fournir un plan ou un fichier 3D?',
            reponse:
              'Non. Le développement de produits, la conception et la modélisation 3D font partie du travail du LAB, du premier concept jusqu’à la production.',
          },
        ],
      },
    },
  }
}
