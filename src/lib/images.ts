/**
 * ⚠️ TEMPORAIRE — photos de développement Unsplash.
 * Remplacer par les photos KO-LAB 2025-2026 avant la mise en production.
 * Voir skill 22, section « Images temporaires à remplacer ».
 *
 * ---------------------------------------------------------------------------
 * ÉCART ASSUMÉ AU SKILL 22
 * Le skill interdit les photos de stock (« elles trahissent immédiatement un
 * site template »). Écart validé par Christian pour la phase de maquette :
 * des emplacements réservés ne permettent pas de juger le rythme d'une page.
 *
 * Chaque URL ci-dessous a été vérifiée en HTTP 200 ET visionnée. Les critères
 * retenus : lumière venant de l'outil ou à contre-jour, aucun visage face à
 * l'objectif, palette noir + ambre, aucun logo de client lisible.
 *
 * Licence : uniquement images.unsplash.com (libre). Les visuels Unsplash+
 * payants vivent sur plus.unsplash.com, hôte absent de next.config.ts — une
 * URL premium échouerait donc en 400 plutôt que de passer inaperçue.
 * ---------------------------------------------------------------------------
 */

/**
 * Traitement colorimétrique partagé — TOUTES les photos terrain du site.
 *
 * Avant unification : quatre copies indépendantes de la correction « ambre »
 * (Besoins.tsx, GalerieRealisations.tsx, PageCapacite.tsx, nos-capacites/page.tsx),
 * plus quatre bases différentes pour les photos plein cadre — le hero utilisait
 * grayscale(0.1)/contrast(1.05)/brightness(0.85), PageCapacite un tout autre
 * contrast(1.05)/brightness(0.65) sans grayscale, le hub capacités un troisième
 * réglage encore. Deux sections (Lab, PreuveTerrain) n'avaient AUCUN filtre.
 * Résultat : chaque section imposait sa propre température, sans qu'on
 * reconnaisse « une photo KO-LAB » d'une page à l'autre.
 *
 * FILTRE_TERRAIN reprend tel quel le réglage du hero — c'est la première
 * section vue, donc la référence. FILTRE_TERRAIN_CHAUD y ajoute uniquement la
 * correction nécessaire aux deux contre-jours de fin de journée (grue,
 * échafaudage), dont le ciel doré entrait en concurrence avec le bleu accent :
 * mêmes grayscale et brightness que la base (c'est ce qui fait « famille »),
 * plus une désaturation et un contraste légèrement accrus pour ramener l'ambre
 * au même niveau que les autres photos (déjà noir + ambre par la source, pas
 * par un aplat de ciel).
 */
export const FILTRE_TERRAIN = { filter: 'grayscale(0.1) contrast(1.05) brightness(0.85)' }
export const FILTRE_TERRAIN_CHAUD = {
  filter: 'grayscale(0.1) saturate(0.5) contrast(1.1) brightness(0.85)',
}

const PARAMS = 'fm=jpg&q=85&w=2400&auto=format&fit=crop'

/** Construit l'URL finale. Le `w=2400` sert de source ; next/image redimensionne. */
function unsplash(chemin: string): string {
  return `https://images.unsplash.com/${chemin}?${PARAMS}`
}

/**
 * Photos KO-LAB réelles — bucket public `medias`, Supabase Storage.
 * Déposées et redimensionnées le 18 août 2026 (mandats Canada Day 2026,
 * DEVFEST 2026, atelier Le LAB) — voir KO-LAB-PHOTOS/_metadonnees.txt
 * (hors dépôt, jamais commité) pour la source et le contexte de chaque photo.
 */
function medias(chemin: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/medias/${chemin}`
}

export const IMAGES = {
  /** Photo réelle — scène Fête du Canada Day 2026, plateau de scène en montage. */
  hero: '/images/hero/hero-canada-day-2026.webp',

  /**
   * ⚠️ TOUJOURS UNSPLASH — aucune photo reçue pour ce besoin.
   * Le dossier `canada day img/Déployer une équipe` du lot du 18 août 2026
   * était VIDE (confirmé par recherche récursive) : la photo attendue pour
   * ce besoin n'a jamais été fournie. Rien à remplacer tant qu'elle n'arrive
   * pas — ne pas réutiliser une autre photo du lot à sa place sans validation.
   */
  besoinDeployer: unsplash('photo-1579847188804-ecba0e2ea330'),

  /** Photo réelle — équipe KO-LAB (gilets orange) sur site, Canada Day 2026. */
  besoinInstaller: medias('home/besoin-installer-2026.webp'),

  /** Photo réelle — impression 3D en cours, atelier Le LAB (pièce dorée drapée). */
  besoinFabriquer: medias('home/besoin-fabriquer-2026.webp'),

  /** Photo réelle — mobilier et aménagement de site loués, DEVFEST 2026. */
  besoinLouer: medias('rental/location-mobilier-2026.webp'),

  /**
   * ⚠️ TOUJOURS UNSPLASH — aucune photo de découpe laser/CNC reçue.
   * Le lot du 18 août 2026 (dossier `le lab 3d`) ne contient que des photos
   * d'impression 3D (Bambu Lab) — aucune ne montre de découpe laser ni de
   * CNC, le sujet exact que cette clé doit illustrer. Le watermark signalé
   * ci-dessous reste donc non corrigé : ne pas la remplacer par une photo
   * d'impression 3D, ce serait montrer autre chose que ce que le texte décrit.
   *
   * Découpe laser CNC en action, deux gerbes d'étincelles, fond noir.
   * Section LAB de l'accueil — correspond à l'item « Laser et CNC ».
   *
   * ⚠️ watermark visible — à remplacer en priorité
   * Signature de photographe incrustée en bas à droite, en rouge. Discrète sur
   * fond sombre mais présente : c'est la première image à remplacer quand les
   * photos KO-LAB arriveront.
   */
  lab: unsplash('photo-1711418235334-8895331a6cf9'),

  /**
   * Photo réelle — imprimante Bambu Lab X2D en cours d'impression, halo bleu
   * de l'éclairage d'atelier. Page Le LAB — correspond à l'item « Impression 3D ».
   */
  labImpression3d: medias('lab/lab-machine-2026.webp'),

  /**
   * ⚠️ TOUJOURS UNSPLASH — dossier Installations en attente.
   * Le photographe des photos d'Installations (série _87T75xx, mandat décor
   * de Noël concession automobile) n'est pas confirmé interne — voir
   * KO-LAB-PHOTOS/_metadonnees.txt. Tenu à l'écart de tout usage (site
   * générique comme réalisation) tant que l'autorisation n'est pas obtenue.
   *
   * Ouvrier sur nacelle élévatrice contre une façade de pierre, lumière rasante.
   * Page Installations — « Centres commerciaux et tours à bureaux ».
   */
  installationNacelle: unsplash('photo-1641384390864-dbfa6e39fd28'),

  /**
   * Photo réelle — petite série de pièces imprimées (jaune-vert), tête
   * d'impression Bambu Lab visible en haut du cadre. Atelier KO-LAB,
   * lot du 18 août 2026 (dossier « le lab 3d » / Petite série production).
   *
   * ⚠️ AUCUN CONSOMMATEUR ACTUEL — grep vérifié, cette clé n'est référencée
   * nulle part dans src/ en dehors de sa propre définition (Phase 8). Le
   * remplacement règle l'objectif « 0 URL Unsplash dans src/ » sans changer
   * quoi que ce soit à l'écran ; câbler un usage reste à faire.
   *
   * ⚠️ MODÈLE — la machine visible porte la marque « Bambu Lab » (lisible,
   * réel) mais AUCUN numéro de modèle identifiable dans ce cadrage —
   * volontaire : le catalogue vend le X1 Carbon et le P1S, pas la machine
   * de cette photo (un X2D, `lab/lab-machine-2026.webp`). Si cette clé est
   * un jour posée sur UNE fiche produit précise plutôt qu'un usage
   * générique « catégorie Impression 3D », vérifier que le modèle
   * correspond à ce qui est vendu — sinon même défaut que l'ancien
   * placeholder Unsplash, juste avec une vraie photo.
   *
   * Aucune mention de statut de revendeur nulle part autour de cette image
   * (RAPPEL Phase 8) : KO-LAB n'est ni revendeur ni distributeur autorisé
   * Bambu Lab — la photo montre l'atelier, pas une affirmation commerciale.
   */
  boutiqueImpression3d: medias('boutique/impression-3d-2026.webp'),

  /** Soudeur au masque, arc blanc-bleu, atelier noyé dans le noir. Disponible. */
  soudeur: unsplash('photo-1745448797900-35d08e85e9db'),

  // Duplication volontaire des emplacements ci-dessus (même raison qu'avant :
  // c'est visible, pas caché). preuveTerrain et realisationInstallation
  // suivent désormais hero/besoinInstaller, devenus des photos réelles.
  // realisationTerrain (besoinDeployer) et realisationLab (soudeur) restent
  // Unsplash tant que ces clés-source n'ont pas de remplacement — voir leurs
  // commentaires respectifs plus haut.
  preuveTerrain: '/images/hero/hero-canada-day-2026.webp',
  realisationTerrain: unsplash('photo-1579847188804-ecba0e2ea330'),
  realisationInstallation: medias('home/besoin-installer-2026.webp'),
  realisationLab: unsplash('photo-1745448797900-35d08e85e9db'),
  /** Réutilisée par les Réalisations : la CNC porte déjà la section LAB. */

  /**
   * Photos réelles — Phase 5, section 4 (Opérations terrain), accueil.
   * Deux fichiers pour le même sujet : `Vertical` recadre l'équipe pour un
   * écran portrait plutôt que de forcer une photo pensée pour du paysage
   * dans un cadre trop étroit (skill 11).
   */
  operationsCrew: medias('operations/operations-crew-2026.webp'),
  operationsCrewVertical: medias('operations/operations-crew-vertical-2026.webp'),

  /** Photos réelles — Phase 5, section 7 (Équipements et déploiement), accueil. */
  deploiementRemorque: medias('deployment/deploiement-remorque-2026.webp'),
  deploiementCamion: medias('deployment/deploiement-camion-2026.webp'),

  /**
   * Photos réelles — Phase 5, section 11 (Location), accueil.
   * locationMobilier existe déjà plus haut (besoinLouer) : même photo,
   * réutilisée ici pour le même besoin — duplication assumée, pas une erreur.
   */
  locationStructures: medias('rental/location-structures-2026.webp'),
  locationAmbiance: medias('rental/location-ambiance-2026.webp'),
} as const

/**
 * Cadrages. Deux des photos retenues sont au format vertical : sans recentrage,
 * un recadrage 16/9 couperait précisément les silhouettes qui font l'image.
 */
export const CADRAGES = {
  /** Silhouettes en haut à gauche du cadre. */
  besoinDeployer: 'object-[30%_25%]',
  /**
   * Photo réelle (équipe KO-LAB, Canada Day 2026), format portrait recadré
   * dans une carte 16/9 — le groupe se tient dans le tiers bas du cadre.
   * L'ancien réglage (22% 40%, calé sur l'ex-silhouette Unsplash) montrait la
   * bannière plutôt que l'équipe une fois la vraie photo posée ; corrigé en
   * visionnant le rendu réel de la carte, pas en le supposant.
   */
  besoinInstaller: 'object-[55%_82%]',
  /** Nacelle et ouvrier au centre, légèrement sous le milieu du cadre vertical. */
  installationNacelle: 'object-[50%_58%]',
} as const
