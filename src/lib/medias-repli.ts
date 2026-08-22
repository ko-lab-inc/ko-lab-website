import { IMAGES } from '@/lib/images'

/**
 * Repli des neuf emplacements de `medias_emplacements` (migration 0031) vers
 * `src/lib/images.ts`. Si une clé manque en base (table pas encore peuplée,
 * ligne supprimée à la main, Supabase injoignable), le composant appelant
 * reprend la photo qui servait déjà cet emplacement avant l'architecture
 * média — jamais de blanc.
 *
 * Les neuf valeurs alt reprennent celles posées par la migration 0031, elles-
 * mêmes vérifiées contre la photo réelle (pas contre le nom de fichier) —
 * voir le rapport de la conversation du 22 août 2026 pour le détail par
 * photo, notamment pourquoi `deployment_camion` pointe vers
 * `deploiementRemorque` et non `deploiementCamion` ou `transportRemorque2026`.
 */
const REPLI_EMPLACEMENTS: Record<string, { url: string; alt: string }> = {
  besoin_1: {
    url: IMAGES.besoinDeployer,
    alt: 'Équipe KO-LAB en préparation de déploiement, conditions hivernales',
  },
  besoin_2: {
    url: IMAGES.besoinInstaller,
    alt: 'Structure de scène en montage, Fête du Canada Day 2026',
  },
  besoin_3: {
    url: IMAGES.besoinFabriquerKiosque2025,
    alt: "Kiosque en bois fabriqué sur mesure par l'atelier KO-LAB",
  },
  besoin_4: {
    url: IMAGES.besoinLouer,
    alt: 'Mobilier et aménagement de site loués pour un événement',
  },
  capacite_installations: {
    url: IMAGES.terrasseAmenagee2021,
    alt: 'Terrasse aménagée avec pergola et mobilier sur mesure',
  },
  lab_1: {
    url: IMAGES.labImpression3d,
    alt: "Imprimante 3D en cours d'impression, atelier KO-LAB",
  },
  lab_2: {
    url: IMAGES.precisionCablage2024,
    alt: 'Câblage de précision pour un déploiement pyrotechnique',
  },
  operations_terrain: {
    url: IMAGES.operationsCrew,
    alt: 'Équipe KO-LAB en opérations terrain',
  },
  deployment_camion: {
    url: IMAGES.deploiementRemorque,
    alt: 'Camion et remorque de déploiement KO-LAB, chargement de matériel',
  },
}

/**
 * ⚠️ Le repli `/images/placeholder.svg` ci-dessous N'EXISTE PAS dans
 * `public/` — vérifié avant d'écrire cette fonction. Il ne sert que si
 * `cle` ne correspond à AUCUNE des neuf clés fixes ci-dessus, ce qui signale
 * une erreur de programmation (faute de frappe sur la clé), pas un cas
 * normal d'exploitation — les neuf clés sont fixes, pas saisies par
 * Christian. À corriger avant la mise en production de l'écran admin :
 * soit déposer un vrai `public/images/placeholder.svg`, soit faire rendre
 * au composant appelant `<PhotoPlaceholder>` (déjà utilisé ailleurs sur le
 * site pour ce cas) plutôt qu'un `<Image src>` quand cette branche est prise.
 */
export function repliEmplacement(cle: string): { url: string; alt: string } {
  return REPLI_EMPLACEMENTS[cle] ?? { url: '/images/placeholder.svg', alt: '' }
}
