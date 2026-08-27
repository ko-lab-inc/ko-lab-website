import { IMAGES } from '@/lib/images'

/**
 * Repli de huit emplacements de `medias_emplacements` (migration 0031) vers
 * `src/lib/images.ts`. Si une clé manque en base (table pas encore peuplée,
 * ligne supprimée à la main, Supabase injoignable), le composant appelant
 * reprend la photo qui servait déjà cet emplacement avant l'architecture
 * média — jamais de blanc.
 *
 * ⚠️ `lab_1`/`lab_2` retirées le 27 août 2026 (étape 3/3, migration 0043) :
 * la galerie Le LAB lit désormais `galeries_photos`, plus `medias_emplacements`
 * — ce repli n'a donc plus de raison d'être appelé pour ces deux clés (`lab_1`
 * n'existe même plus comme ligne de `medias_emplacements`, voir migration 0044).
 *
 * Les valeurs alt restantes reprennent celles posées par la migration 0031,
 * elles-mêmes vérifiées contre la photo réelle (pas contre le nom de
 * fichier) — voir le rapport de la conversation du 22 août 2026 pour le
 * détail par photo, notamment pourquoi `deployment_camion` pointe vers
 * `deploiementRemorque` et non `deploiementCamion` ou `transportRemorque2026`.
 *
 * ⚠️ UN SEUL `alt` PAR CLÉ, PAS DE PAIRE FR/EN — vérifié le 27 août 2026 en
 * corrigeant le bilingue de `resoudreEmplacement` : ce fichier n'a PAS le
 * même trou, par construction. Ce repli ne joue que si la ligne est
 * INTROUVABLE en base (`obtenirEmplacement` renvoie `null` — table pas
 * encore peuplée, ligne supprimée à la main, Supabase injoignable), jamais
 * pour une ligne existante dont `alt_text_en` serait simplement vide — ce
 * cas-là est un repli FR→FR normal, déjà géré par `resoudreEmplacement`
 * elle-même. Un visiteur anglophone qui tombe sur ce repli lit donc un texte
 * français plutôt qu'un texte anglais deviné — acceptable, l'alternative
 * (traduire ces textes de secours) n'a de valeur que dans une panne
 * Supabase, pas dans l'usage normal du site.
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
  operations_terrain: {
    url: IMAGES.operationsCrew,
    alt: 'Équipe KO-LAB en opérations terrain',
  },
  deployment_camion: {
    url: IMAGES.deploiementRemorque,
    alt: 'Camion et remorque de déploiement KO-LAB, chargement de matériel',
  },
  /**
   * Pas d'ancienne clé `IMAGES.*` à reprendre ici : la section « Positionnement »
   * de /a-propos affichait un `<PhotoPlaceholder>` avant la migration 0036, pas
   * une vraie photo — donc pas de « photo qui servait déjà cet emplacement ».
   * Le repli pointe directement vers le fichier téléversé pour ce même
   * emplacement plutôt que vers une photo sans rapport : si la base ne répond
   * pas, la page retombe sur la même image, pas sur un blanc ni un décalage.
   */
  apropos_1: {
    url: 'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/equipe/equipe-kolab-2024.webp',
    alt: "Six membres de l'équipe KO-LAB posant ensemble lors d'un événement, en tenue de soirée.",
  },
}

/**
 * ⚠️ Le repli `/images/placeholder.svg` ci-dessous N'EXISTE PAS dans
 * `public/` — vérifié avant d'écrire cette fonction. Il ne sert que si
 * `cle` ne correspond à AUCUNE des huit clés fixes ci-dessus, ce qui signale
 * une erreur de programmation (faute de frappe sur la clé), pas un cas
 * normal d'exploitation — les huit clés sont fixes, pas saisies par
 * Christian. À corriger avant la mise en production de l'écran admin :
 * soit déposer un vrai `public/images/placeholder.svg`, soit faire rendre
 * au composant appelant `<PhotoPlaceholder>` (déjà utilisé ailleurs sur le
 * site pour ce cas) plutôt qu'un `<Image src>` quand cette branche est prise.
 */
export function repliEmplacement(cle: string): { url: string; alt: string } {
  return REPLI_EMPLACEMENTS[cle] ?? { url: '/images/placeholder.svg', alt: '' }
}
