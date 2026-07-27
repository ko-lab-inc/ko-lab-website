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

const PARAMS = 'fm=jpg&q=85&w=2400&auto=format&fit=crop'

/** Construit l'URL finale. Le `w=2400` sert de source ; next/image redimensionne. */
function unsplash(chemin: string): string {
  return `https://images.unsplash.com/${chemin}?${PARAMS}`
}

export const IMAGES = {
  /** Chantier de nuit : 3 ouvriers, lampes de travail, pelleteuse, asphalte mouillé. */
  hero: unsplash('reserve/7VRjBuoQRG6b0U7sIqjk_ConstructionNight_wide2.jpg'),

  /** Silhouettes d'ouvriers sur dalle + grue à tour, ciel ambré. Format vertical. */
  besoinDeployer: unsplash('photo-1579847188804-ecba0e2ea330'),

  /** Deux ouvriers en silhouette sur échafaudage tubulaire, contre-jour ambré. Vertical. */
  besoinInstaller: unsplash('photo-1670846112333-ca9115b38b18'),

  /** Gerbe d'étincelles de meuleuse sur fond noir. */
  besoinFabriquer: unsplash('reserve/7vjJbdDRga27ApDoYicw_Sparks.jpg'),

  /** Semi-remorque de nuit, feux de gabarit ambrés devant un dépôt. */
  besoinLouer: unsplash('photo-1714009889233-6699f04623ff'),

  /**
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
   * Imprimante FDM en cours d'impression, halo bleu du panneau de commande.
   * Page Le LAB — correspond à l'item « Impression 3D ».
   */
  labImpression3d: unsplash('photo-1642969164999-979483e21601'),

  /**
   * Ouvrier sur nacelle élévatrice contre une façade de pierre, lumière rasante.
   * Page Installations — « Centres commerciaux et tours à bureaux ».
   */
  installationNacelle: unsplash('photo-1641384390864-dbfa6e39fd28'),

  /** Soudeur au masque, arc blanc-bleu, atelier noyé dans le noir. Disponible. */
  soudeur: unsplash('photo-1745448797900-35d08e85e9db'),

  // ⚠️ TEMPORAIRE — duplication en attente de la vraie photo KO-LAB 2025-2026.
  // Ces trois emplacements réutilisent des images déjà présentes plus haut sur
  // la page : c'est visible et volontaire, pour ne pas masquer le manque.
  preuveTerrain: unsplash('reserve/7VRjBuoQRG6b0U7sIqjk_ConstructionNight_wide2.jpg'),
  realisationTerrain: unsplash('photo-1579847188804-ecba0e2ea330'),
  realisationInstallation: unsplash('photo-1670846112333-ca9115b38b18'),
  realisationLab: unsplash('photo-1745448797900-35d08e85e9db'),
  /** Réutilisée par les Réalisations : la CNC porte déjà la section LAB. */

} as const

/**
 * Cadrages. Deux des photos retenues sont au format vertical : sans recentrage,
 * un recadrage 16/9 couperait précisément les silhouettes qui font l'image.
 */
export const CADRAGES = {
  /** Silhouettes en haut à gauche du cadre. */
  besoinDeployer: 'object-[30%_25%]',
  /** Ouvriers sur le tiers gauche. */
  besoinInstaller: 'object-[22%_40%]',
  /** Nacelle et ouvrier au centre, légèrement sous le milieu du cadre vertical. */
  installationNacelle: 'object-[50%_58%]',
} as const
