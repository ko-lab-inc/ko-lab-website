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
   * Comment l'image occupe son cadre carré.
   *
   * `contain` (défaut) — visuel détouré sur fond blanc : la machine reste
   * entière et centrée, le blanc du fichier se confond avec celui du cadre.
   *
   * `cover` — photo de scène, impossible à détourer (un conteneur est
   * photographié dans une cour, avec ciel et sol). En `contain` elle
   * s'afficherait en bandes blanches au-dessus et en dessous ; elle remplit
   * donc le cadre bord à bord. C'est le seul écart de traitement assumé de
   * la grille, et il est porté par la donnée plutôt que par une exception
   * codée dans le composant.
   */
  cadrage?: 'contain' | 'cover'
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
 * ⚠️ IMAGES — les douze produits en ont une depuis le 28 juillet 2026, mais
 * QUATRE ne montrent pas le modèle qu'elles annoncent (bambu-lab-p1s,
 * xtool-p2, xtool-s1, xtool-f1 — détail sur chaque fiche plus bas). Deux
 * d'entre elles affichent même une marque concurrente, CREALITY et ACMER.
 * C'est exactement le risque que ce fichier documentait quand ces champs
 * valaient encore `null` : une photo générique sous le nom d'un modèle précis
 * désigne une autre machine. Christian les remplace ; d'ici là, ne pas
 * considérer la boutique comme publiable en production.
 *
 * ⚠️ EN REMPLAÇANT UNE IMAGE, CHANGER LE NOM DU FICHIER (par exemple
 * `xtool-f1-v2.webp`). L'optimiseur de next/image met en cache par URL, pas
 * par contenu : réécrire un fichier sous le même nom laisse servir l'ancienne
 * version optimisée. Constaté ici — la grille a continué d'afficher le visuel
 * précédent après remplacement, alors que le fichier sur disque était le bon.
 * Localement, `.next/cache/images` se vide à la main.
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
      // Photo revendeur (shop3d.ca), modèle correctement identifié (logo
      // « X1-Carbon » lisible sur l'appareil). Retraitée le 28 juillet 2026 :
      // l'original était un visuel marketing 2800×2800 (5,6 Mo) sur fond studio
      // dégradé, avec volutes de fumée décoratives et reflet de sol — le fond
      // ne pouvait pas raccorder avec le cadre. Recadrée sur la machine seule,
      // reposée sur blanc pur, 1000×1000 WebP (46 ko).
      src: '/images/produits/bambu-lab-x1-carbon.webp',
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
      // ⚠️ LE VISUEL NE MONTRE PAS CE MODÈLE. Fourni par Christian le
      // 28 juillet 2026 sous le nom « bambu lab p1s », mais la machine porte
      // « Bambu Lab A1 » sur son portique : c'est une A1 à cadre ouvert avec
      // AMS lite (quatre bobines externes). La P1S est une imprimante FERMÉE,
      // de forme cubique. Bonne marque, mauvais modèle — à remplacer avant
      // mise en production.
      src: '/images/produits/bambu-lab-p1s.webp',
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
      // Fond uni ramené au blanc pur et recadrée au même gabarit que les
      // autres (1000×1000, produit à 84 % du cadre).
      src: '/images/produits/bambu-lab-ams.webp',
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
      // ⚠️ LE VISUEL NE MONTRE PAS CE PRODUIT, sur deux points. La machine
      // porte « CREALITY » et « Creality Falcon » sur son châssis, et la
      // gravure affiche « 10W » : c'est un graveur DIODE 10 W d'une marque
      // concurrente. La fiche vend un xTool P2, laser CO2 55 W, qui est une
      // machine fermée d'un autre gabarit et d'une autre technologie.
      // Afficher une marque tierce sous notre nom de produit et notre prix
      // est le cas le plus net des quatre — à remplacer en priorité.
      src: '/images/produits/xtool-p2.webp',
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
      // ⚠️ LE VISUEL NE MONTRE PAS CE PRODUIT. La machine porte « ACMER » en
      // façade — marque concurrente — et son cadre est OUVERT, alors que la
      // fiche vend un laser diode fermé. À remplacer avant mise en production.
      src: '/images/produits/xtool-s1.webp',
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
      // ⚠️ Visuel fourni par Christian le 28 juillet 2026, en remplacement de
      // la photo revendeur (filaments.ca) qui portait un badge « Best Overall
      // — U.S. News 2024 » non vérifiable par KO-LAB. Le nouveau visuel ne
      // porte AUCUNE marque tierce ni badge — sur ce plan il est meilleur —
      // mais rien n'y identifie non plus le modèle, et sa forme (bras en
      // porte-à-faux sur socle) ne correspond pas au F1, qui est un caisson
      // fermé. Source d'origine 350×468 : c'est le plus petit fichier des
      // douze, il sera visiblement flou sur la fiche produit.
      src: '/images/produits/xtool-f1.webp',
      prixIndicatif: 1100,
    },

    // ---- Équipements
    //
    // Les trois visuels ci-dessous sont les seuls du lot fourni le 28 juillet
    // 2026 qui montrent bien ce qu'ils annoncent : ce sont des catégories
    // génériques (un mât d'éclairage, un transpalette, une caisse à outils),
    // pas des modèles nommés, donc aucun risque de désigner la mauvaise
    // machine — contrairement aux quatre fiches Bambu Lab / xTool ci-dessus.
    {
      slug: 'eclairage-temporaire',
      categorie: 'equipements',
      nom: t('produits.equip_eclairage_nom'),
      texte: t('produits.equip_eclairage_texte'),
      src: '/images/produits/eclairage-temporaire.webp',
      prixIndicatif: 450,
    },
    {
      slug: 'equipement-manutention',
      categorie: 'equipements',
      nom: t('produits.equip_manutention_nom'),
      texte: t('produits.equip_manutention_texte'),
      src: '/images/produits/equipement-manutention.webp',
      prixIndicatif: 350,
    },
    {
      slug: 'outillage-installation',
      categorie: 'equipements',
      nom: t('produits.equip_outillage_nom'),
      texte: t('produits.equip_outillage_texte'),
      // Coffret de marque DEKO — marque du produit lui-même, pas d'un
      // concurrent : à traiter comme le logo Bambu Lab sur une imprimante.
      src: '/images/produits/outillage-installation.webp',
      prixIndicatif: 250,
    },

    // ---- Conteneurs — filtrés côté page tant que le drapeau est inactif
    //
    // Seule famille en `cadrage: 'cover'` : un conteneur se photographie dans
    // une cour, avec ciel et sol, et ne se détoure pas. En `contain` ces trois
    // photos s'afficheraient en bandes blanches dans un cadre carré.
    {
      slug: 'conteneur-20-pieds',
      categorie: 'conteneurs',
      nom: t('produits.cont_20_nom'),
      texte: t('produits.cont_20_texte'),
      src: '/images/produits/conteneur-20-pieds.webp',
      cadrage: 'cover',
      prixIndicatif: 3500,
    },
    {
      slug: 'conteneur-40-pieds-high-cube',
      categorie: 'conteneurs',
      nom: t('produits.cont_40_nom'),
      texte: t('produits.cont_40_texte'),
      src: '/images/produits/conteneur-40-pieds-high-cube.webp',
      cadrage: 'cover',
      prixIndicatif: 5800,
    },
    {
      slug: 'conteneur-bureau-amenage',
      categorie: 'conteneurs',
      nom: t('produits.cont_bureau_nom'),
      texte: t('produits.cont_bureau_texte'),
      // 10 % du bas de la photo d'origine retirés : elle portait le filigrane
      // « WWW.BOXINNOV.COM », incrusté par le fournisseur du visuel. Publier
      // l'adresse d'un tiers sur la boutique KO-LAB reviendrait à le
      // référencer depuis nos propres fiches produit.
      src: '/images/produits/conteneur-bureau-amenage.webp',
      cadrage: 'cover',
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
