import type { VignetteVideo } from '@/components/ui/BandeauVideos'

/**
 * Vidéos affichées en bande sur les pages de capacités.
 *
 * ---------------------------------------------------------------------------
 * ⚠️ VOLONTAIREMENT VIDE — NE PAS REMPLIR AVEC DES VIDÉOS DE TIERS
 *
 * Christian a demandé la bande de vidéos de bambulab.com (« Check Out What
 * the Pros Are Saying ») pour la page Le LAB, et m'a demandé d'en trouver
 * les liens si possible. Recherche faite le 30 juillet 2026 : KO-LAB n'a
 * aucune vidéo publique trouvable — ni chaîne, ni vidéo indexée.
 *
 * Et il ne faut PAS combler avec autre chose. La page Le LAB décrit ce que
 * KO-LAB sait faire : conception 3D, impression, laser et CNC, petites
 * séries. Y poser la vidéo d'un tiers — même excellente, même sur le même
 * sujet — reviendrait à présenter le travail de quelqu'un d'autre comme le
 * nôtre. C'est la même règle que celle appliquée partout dans ce dépôt :
 * `badgeRibbon` laissé vide tant qu'aucun texte vrai n'est confirmé, les
 * quatre visuels produit écartés parce qu'ils montraient une autre machine
 * (voir lib/produits.ts et l'en-tête de lib/images.ts).
 *
 * Contrairement à ces deux cas, la bande de bambulab.com montre des vidéos
 * de TIERS assumées comme telles (des testeurs qui parlent de la marque).
 * Une transposition honnête existe donc, mais elle demande une décision de
 * Christian — reprendre des avis externes engage l'image de l'entreprise —
 * et pas seulement des liens.
 *
 * ---------------------------------------------------------------------------
 * CE QU'IL FAUT POUR REMPLIR
 *
 *   1. Le lien de chaque vidéo (YouTube, Vimeo…).
 *   2. Une vignette par vidéo, hébergée par NOUS : déposée dans
 *      public/images/videos/ ou dans Supabase Storage. Pas l'URL de
 *      miniature de l'hébergeur — ce serait un domaine de plus à ouvrir
 *      dans la CSP, et une URL qu'on ne contrôle pas.
 *   3. Un titre court par vidéo.
 *
 * Tant que ce tableau est vide, la section s'affiche avec quatre EMPLACEMENTS
 * RÉSERVÉS (« Vidéo à venir ») — pas masquée. Le document de cadrage le
 * demande explicitement, et une section invisible empêchait Christian de
 * valider le format sur la page réelle. Dès qu'une entrée est ajoutée ici,
 * elle remplace un emplacement, sans autre changement de code et sans
 * décalage de mise en page (même format 16/9).
 *
 * ⚠️ Aucune ouverture de CSP n'est nécessaire tant qu'on s'en tient à ce
 * modèle (vignette locale + lien sortant). Elle le deviendrait seulement si
 * on voulait lire la vidéo SANS quitter le site — voir la note en tête de
 * BandeauVideos.tsx.
 * ---------------------------------------------------------------------------
 */
export const VIDEOS_LAB: readonly VignetteVideo[] = []
