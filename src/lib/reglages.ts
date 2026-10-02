import 'server-only'

import { unstable_cache } from 'next/cache'

import { EMAILS } from '@/lib/constantes'
import { createStaticClient } from '@/lib/supabase/static'

/**
 * Réglages du site — coordonnées et drapeaux, modifiables sans redéploiement.
 *
 * ---------------------------------------------------------------------------
 * CE QUE ÇA REMPLACE, ET POURQUOI
 *
 * Avant, un changement de courriel de contact demandait une modification de
 * `messages/fr.json`, une revue, un commit et un déploiement. Et fermer la
 * boutique passait par une variable d'environnement Vercel — donc, là encore,
 * un redéploiement, et personne d'autre que Moussa ne pouvait le faire.
 *
 * Ce sont exactement les réglages qui doivent bouger sans développeur.
 *
 * ---------------------------------------------------------------------------
 * ⚠️ POURQUOI unstable_cache ET PAS UNE SIMPLE REQUÊTE
 *
 * Ces valeurs sont lues par le layout du site vitrine, donc sur CHAQUE page.
 * Une requête directe ajouterait un aller-retour Supabase à chaque rendu, et —
 * plus grave — la lecture des cookies par le client de session basculerait
 * tout le site en rendu dynamique, supprimant l'ISR du skill 12.
 *
 * `createStaticClient()` ne touche pas aux cookies, et `unstable_cache` garde
 * le résultat entre les rendus. L'étiquette `reglages` permet à l'écran
 * d'administration d'invalider le tout d'un coup à l'enregistrement : le
 * changement est visible immédiatement, sans attendre la revalidation horaire.
 *
 * ---------------------------------------------------------------------------
 * ⚠️ LE REPLI N'EST PAS UNE PRÉCAUTION DÉCORATIVE
 *
 * La table n'existe que si la migration 0011 a été exécutée — et sur ce
 * projet, plusieurs migrations sont restées en attente pendant des jours.
 * Sans repli, le site entier tomberait sur une page 500 entre le déploiement
 * du code et l'exécution du SQL.
 *
 * Le repli reprend donc l'état d'AVANT : variables d'environnement pour les
 * drapeaux, valeurs de messages/*.json pour les coordonnées. Rien ne change
 * tant que la table n'est pas là ; tout devient modifiable dès qu'elle l'est.
 * ---------------------------------------------------------------------------
 */

export type Reglages = {
  contactCourriel: string
  contactTelephone: string
  contactRegion: string
  panierActif: boolean
  solutionsModulaires: boolean
  /**
   * Portée distincte de panierActif — voir la migration 0029. panierActif
   * retire le panier d'une boutique qui reste visible ; boutiqueActive
   * retire la boutique elle-même (nav, section accueil, routes, sitemap,
   * robots).
   */
  boutiqueActive: boolean
  /**
   * Même mécanique que boutiqueActive, pour /concours (migration 0040).
   * Retire la page de la nav, du footer, de la section accueil, du sitemap
   * et de robots.txt, et rend ses routes introuvables (404).
   */
  concoursActif: boolean

  /* --------------------------------------------------------------------------
   * Migration 0051 — valeurs qui étaient FIGÉES DANS LE CODE.
   *
   * Chacune de ces trois premières obligeait à un déploiement pour un
   * changement que personne chez KO-LAB ne devrait avoir à demander.
   * ------------------------------------------------------------------------ */

  /**
   * URL publique de l'inventaire Rentman. Vide = le bouton « Voir
   * l'inventaire » laisse place à « Demander une location », qui mène au
   * formulaire. Remplace la constante LIEN_RENTMAN.
   */
  lienRentman: string
  /**
   * Formulaire de candidature externe, proposé à côté de celui du site.
   * Vide = le lien disparaît. Remplace LIEN_CANDIDATURE_EXTERNE.
   */
  lienCandidatureExterne: string
  /**
   * Délai de réponse annoncé, EN HEURES. Écrit en dur à trois endroits
   * jusqu'au 2 octobre 2026 — page Contact, accusé de réception, Carrières —
   * qui divergeaient dès que l'un des trois changeait.
   */
  delaiReponseHeures: number
  /** Heures d'ouverture affichées. Vide = la ligne n'apparaît pas. */
  heuresOuverture: string
  /** URL complète. Vide = aucune icône affichée. */
  reseauFacebook: string
  reseauInstagram: string
  reseauLinkedin: string
}

/**
 * Valeurs de repli — l'état exact du site avant 0011.
 *
 * ⚠️ Elles doivent rester alignées sur le `insert` de la migration. Une
 * divergence produirait un site qui change d'apparence selon que la table
 * répond ou non, ce qui est le pire des deux mondes.
 */
function repli(): Reglages {
  return {
    // Domaine DIFFÉRENT de celui du site (ko-lab-center.ca) — volontaire,
    // voir lib/constantes.ts pour l'explication complète des deux rôles.
    contactCourriel: EMAILS.info,
    contactTelephone: '',
    contactRegion: 'Outaouais, Québec',
    // Comparaison stricte à 'true' : une variable absente, vide ou mal
    // orthographiée désactive la fonctionnalité au lieu de lever une
    // exception. Même règle que l'ancien lib/config/features.ts, retiré : les
    // drapeaux vivent désormais en base, ces variables ne servent plus qu'ici.
    panierActif: process.env.NEXT_PUBLIC_FEATURE_PANIER === 'true',
    solutionsModulaires: process.env.NEXT_PUBLIC_SOLUTIONS_MODULAIRES === 'true',
    // Pas de variable d'environnement de repli ici, à la différence des deux
    // au-dessus : ce drapeau n'a jamais existé avant 0029, donc aucun « état
    // d'avant la table » à reproduire. `true` en dur reproduit directement
    // « rien ne change tant que personne ne décoche la case ».
    boutiqueActive: true,
    // `false`, PAS `true` comme boutiqueActive/panierActif/solutions_modulaires
    // — inverse de leur raisonnement, pour la même raison : la page /concours
    // elle-même est neuve (Phase 10), rien à laisser inchangé en son absence.
    concoursActif: false,
    // Vides : aucune de ces valeurs n'a d'équivalent « avant la table » à
    // reproduire, et une URL inventée serait pire qu'une absence — un lien
    // mort sur un site public se voit, une icône absente non.
    lienRentman: '',
    lienCandidatureExterne: '',
    // 48 h : la valeur qui était en dur dans les trois textes.
    delaiReponseHeures: 48,
    heuresOuverture: '',
    reseauFacebook: '',
    reseauInstagram: '',
    reseauLinkedin: '',
  }
}

/** Clés attendues en base, et leur place dans l'objet renvoyé. */
const CLES = {
  contact_courriel: 'contactCourriel',
  contact_telephone: 'contactTelephone',
  contact_region: 'contactRegion',
  panier_actif: 'panierActif',
  solutions_modulaires: 'solutionsModulaires',
  boutique_active: 'boutiqueActive',
  concours_actif: 'concoursActif',
  lien_rentman: 'lienRentman',
  lien_candidature_externe: 'lienCandidatureExterne',
  delai_reponse_heures: 'delaiReponseHeures',
  heures_ouverture: 'heuresOuverture',
  reseau_facebook: 'reseauFacebook',
  reseau_instagram: 'reseauInstagram',
  reseau_linkedin: 'reseauLinkedin',
} as const

export type CleReglage = keyof typeof CLES

/** Étiquette de cache, partagée avec l'action d'enregistrement. */
export const ETIQUETTE_REGLAGES = 'reglages'

async function lireDepuisBase(): Promise<Reglages> {
  const valeurs = repli()

  try {
    const supabase = createStaticClient()
    const { data, error } = await supabase.from('reglages').select('cle, valeur')

    // Table absente (42P01) ou politique refusant la lecture : on garde le
    // repli. Le site fonctionne, il n'est simplement pas encore pilotable.
    if (error || !data) return valeurs

    for (const ligne of data) {
      const champ = CLES[ligne.cle as CleReglage]
      if (!champ) continue

      if (
        champ === 'panierActif' ||
        champ === 'solutionsModulaires' ||
        champ === 'boutiqueActive' ||
        champ === 'concoursActif'
      ) {
        valeurs[champ] = ligne.valeur === 'true'
      } else if (champ === 'delaiReponseHeures') {
        // Seul réglage numérique. Une saisie illisible garde le repli plutôt
        // que de produire « On revient vers vous dans les NaN heures » sur une
        // page publique — le champ est libre dans l'admin, il faut le prévoir.
        const n = Number.parseInt(ligne.valeur.trim(), 10)
        if (Number.isFinite(n) && n > 0) valeurs[champ] = n
      } else {
        // Une valeur vide en base est une valeur VOULUE — « pas de téléphone à
        // afficher » — et non une absence. On ne retombe donc pas sur le
        // repli, sauf pour le courriel : le site doit toujours donner un moyen
        // d'écrire, et une adresse vide couperait la réception des demandes.
        const texte = ligne.valeur.trim()
        if (champ === 'contactCourriel' && texte === '') continue
        valeurs[champ] = texte
      }
    }
  } catch {
    // Supabase injoignable au moment du rendu : le repli tient le site debout.
  }

  return valeurs
}

/**
 * Réglages en vigueur. Mis en cache, invalidé par l'écran d'administration.
 *
 * ⚠️ Ne JAMAIS appeler depuis un composant client. Le module importe
 * `server-only` : la tentative échoue à la compilation plutôt qu'au premier
 * rendu en production.
 */
export const lireReglages = unstable_cache(lireDepuisBase, ['reglages-site'], {
  tags: [ETIQUETTE_REGLAGES],
  // Filet si l'invalidation par étiquette est manquée — un enregistrement
  // pendant un déploiement, par exemple. Une heure, comme l'ISR des pages.
  revalidate: 3600,
})
