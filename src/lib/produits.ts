import type { IconeProps } from '@/components/ui/Icones'
import type { getTranslations } from 'next-intl/server'
import type { ComponentType } from 'react'

/**
 * Catalogue boutique — source unique de vérité.
 *
 * Extrait de boutique/page.tsx pour que la fiche produit ([slug]/page.tsx)
 * lise exactement les mêmes données, sans dupliquer la liste — un produit
 * ajouté ici apparaît automatiquement dans les deux pages.
 */

export type ProduitCarte = {
  slug: string
  categorie: string
  nom: string
  texte: string
  /** URL d'image, ou null pour un emplacement réservé. */
  src: string | null
  /**
   * Prix indicatif CAD, avant taxes. `null` = pas de prix indicatif
   * disponible (la carte retombe sur `prixSurDemande`).
   *
   * Champ numérique structuré — pas de texte libre — pour qu'un vrai prix
   * Supabase le remplace un jour sans toucher à l'affichage.
   */
  prixIndicatif: number | null
  /**
   * Ruban coin supérieur gauche. VIDE PAR DÉFAUT : Christian doit confirmer
   * un texte vrai et vérifiable par produit avant affichage (« Revendeur
   * officiel », « En stock »…) — jamais une allégation copiée d'une
   * référence externe sans vérifier qu'elle s'applique à KO-LAB.
   */
  badgeRibbon?: string
  /** Icône accolée au ruban — purement visuelle, `aria-hidden` (voir Icones.tsx).
   *  Optionnelle et indépendante du texte : un ruban peut exister sans icône. */
  badgeRibbonIcone?: ComponentType<IconeProps>
  /** Badge coin supérieur droit — uniquement si KO-LAB a un vrai badge à
   *  afficher (certification, exclusivité régionale). Rien par défaut. */
  badgeSecondaire?: string
  badgeSecondaireIcone?: ComponentType<IconeProps>
}

type Traducteur = Awaited<ReturnType<typeof getTranslations>>

/**
 * ⚠️ CONTENU PROVISOIRE — produits en dur en attendant Supabase.
 *
 * Les images de Bambu Lab et xTool doivent venir des visuels presse
 * officiels : une photo générique sous le nom d'un modèle précis désigne une
 * autre machine. `src: null` affiche donc un emplacement réservé.
 *
 * ⚠️ prixIndicatif — VALEURS ARBITRAIRES, pas des prix fournisseur réels.
 * Christian a validé l'affichage d'un prix « à partir de » même provisoire
 * pour cette phase (changement de direction, style Bambu Store) ; à
 * remplacer avant mise en production par le vrai prix négocié KO-LAB.
 *
 * badgeRibbon / badgeSecondaire : volontairement VIDES sur tous les
 * produits, icônes comprises. Contrairement au prix, un badge affiche une
 * AFFIRMATION (« revendeur officiel », « en stock »…) — la laisser vide tant
 * que Christian n'a pas confirmé un texte vrai évite une allégation
 * commerciale fausse. Champs déjà câblés, prêts à recevoir un texte (et une
 * icône, IconeBadgeOfficiel / IconeBadgeStock) dès confirmation.
 *
 * À l'arrivée de `produits_boutique` :
 *     const supabase = createStaticClient()   // JAMAIS createClient()
 *     const { data } = await supabase.from('produits_boutique')
 *       .select('*').eq('publie', true).order('ordre')
 */
export function construireProduits(t: Traducteur): ProduitCarte[] {
  return [
    // ---- Impression 3D
    {
      // ⚠️ PROVISOIRE — non confirmé : ca.store.bambulab.com bloque la
      // récupération automatisée (402) et aucune autre source n'a donné un
      // prix CAD fiable pour ce modèle précis. À vérifier manuellement avant
      // mise en prod.
      slug: 'bambu-lab-x1-carbon',
      categorie: 'impression',
      nom: t('produits.bambu_x1c_nom'),
      texte: t('produits.bambu_x1c_texte'),
      // Photo revendeur (shop3d.ca), vérifiée visuellement le 28 juillet 2026 :
      // fond clair, modèle correctement identifié (logo « X1-Carbon » visible
      // sur l'appareil). À remplacer par le visuel presse officiel dès que
      // possible.
      src: '/images/produits/bambu-lab-x1-carbon.png',
      prixIndicatif: 1800,
    },
    {
      // Prix relevé sur ca.store.bambulab.com (prix régulier, hors promotion
      // temporaire) le 28 juillet 2026 — à reconfirmer avant mise en prod,
      // les fabricants ajustent leurs prix sans préavis.
      slug: 'bambu-lab-p1s',
      categorie: 'impression',
      nom: t('produits.bambu_p1s_nom'),
      texte: t('produits.bambu_p1s_texte'),
      src: null,
      prixIndicatif: 899,
    },
    {
      // Prix relevé sur ca.store.bambulab.com (prix régulier) le 28 juillet
      // 2026 — à reconfirmer avant mise en prod.
      slug: 'bambu-lab-ams',
      categorie: 'impression',
      nom: t('produits.bambu_ams_nom'),
      texte: t('produits.bambu_ams_texte'),
      // Photo revendeur (caz3d.com), vérifiée visuellement le 28 juillet 2026.
      src: '/images/produits/bambu-lab-ams.png',
      prixIndicatif: 449,
    },

    // ---- Découpe laser
    {
      // ⚠️ PROVISOIRE — n'a pas pu être confirmé sur une source officielle :
      // les résultats trouvés variaient de 4999 $US à 6599 $CA selon la
      // source, aucune ne provenant directement de ca.xtool.com. À vérifier
      // manuellement avant mise en prod.
      slug: 'xtool-p2',
      categorie: 'laser',
      nom: t('produits.xtool_p2_nom'),
      texte: t('produits.xtool_p2_texte'),
      src: null,
      prixIndicatif: 5000,
    },
    {
      // Prix relevé chez un revendeur canadien officiel xTool (RB Digital,
      // prix régulier hors promotion) le 28 juillet 2026 — à reconfirmer
      // avant mise en prod.
      slug: 'xtool-s1',
      categorie: 'laser',
      nom: t('produits.xtool_s1_nom'),
      texte: t('produits.xtool_s1_texte'),
      src: null,
      prixIndicatif: 3399,
    },
    {
      // ⚠️ PROVISOIRE — non confirmé : les prix trouvés visaient le F1 Ultra
      // (modèle supérieur, ~3999 $CA), pas le F1 de base vendu ici. À vérifier
      // manuellement avant mise en prod.
      slug: 'xtool-f1',
      categorie: 'laser',
      nom: t('produits.xtool_f1_nom'),
      texte: t('produits.xtool_f1_texte'),
      // Photo revendeur (filaments.ca), vérifiée le 28 juillet 2026 : fond
      // blanc correct, mais porte un badge « Best Overall — U.S. News 2024 »
      // non vérifié par KO-LAB. Idéalement recadré ou remplacé avant
      // publication définitive.
      src: '/images/produits/xtool-f1.webp',
      prixIndicatif: 1100,
    },

    // ---- Équipements
    {
      slug: 'eclairage-temporaire',
      categorie: 'equipements',
      nom: t('produits.equip_eclairage_nom'),
      texte: t('produits.equip_eclairage_texte'),
      src: null,
      prixIndicatif: 450,
    },
    {
      slug: 'equipement-manutention',
      categorie: 'equipements',
      nom: t('produits.equip_manutention_nom'),
      texte: t('produits.equip_manutention_texte'),
      src: null,
      prixIndicatif: 350,
    },
    {
      slug: 'outillage-installation',
      categorie: 'equipements',
      nom: t('produits.equip_outillage_nom'),
      texte: t('produits.equip_outillage_texte'),
      src: null,
      prixIndicatif: 250,
    },

    // ---- Conteneurs — filtrés côté page tant que le drapeau est inactif
    {
      slug: 'conteneur-20-pieds',
      categorie: 'conteneurs',
      nom: t('produits.cont_20_nom'),
      texte: t('produits.cont_20_texte'),
      src: null,
      prixIndicatif: 3500,
    },
    {
      slug: 'conteneur-40-pieds-high-cube',
      categorie: 'conteneurs',
      nom: t('produits.cont_40_nom'),
      texte: t('produits.cont_40_texte'),
      src: null,
      prixIndicatif: 5800,
    },
    {
      slug: 'conteneur-bureau-amenage',
      categorie: 'conteneurs',
      nom: t('produits.cont_bureau_nom'),
      texte: t('produits.cont_bureau_texte'),
      src: null,
      prixIndicatif: 8200,
    },
  ]
}

/**
 * Slugs seuls, sans traduction — pour generateStaticParams (qui tourne une
 * fois par langue mais n'a pas besoin du nom traduit, seulement du chemin).
 * Garder cette liste synchronisée avec construireProduits ci-dessus.
 */
export const SLUGS_PRODUITS = [
  'bambu-lab-x1-carbon',
  'bambu-lab-p1s',
  'bambu-lab-ams',
  'xtool-p2',
  'xtool-s1',
  'xtool-f1',
  'eclairage-temporaire',
  'equipement-manutention',
  'outillage-installation',
  'conteneur-20-pieds',
  'conteneur-40-pieds-high-cube',
  'conteneur-bureau-amenage',
] as const
