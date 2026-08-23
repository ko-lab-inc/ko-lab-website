/**
 * Résolution de la photo d'un poste — partagée entre la page publique
 * /carrieres (Server Component) et l'admin (composants client) : PAS de
 * `server-only` ici, contrairement à lib/carrieres.ts, exprès pour rester
 * importable depuis TableauPostes.tsx / SelecteurPhotoPoste.tsx.
 *
 * ---------------------------------------------------------------------------
 * UNE SEULE SOURCE DE VÉRITÉ — décision du 23 août 2026
 *
 * Avant ce fichier, deux mécanismes coexistaient sans lien : la page publique
 * choisissait une photo par DÉPARTEMENT (photoPourDepartement, Phase 6.3),
 * l'admin gérait une photo par POSTE (photo_url, migration 0032) — sans
 * jamais se lire l'un l'autre. Résultat : l'admin affichait un placeholder
 * gris pour les neuf postes (photo_url à NULL partout) pendant que le public
 * affichait déjà des photos, choisies par un mapping que rien dans l'admin
 * ne montrait ni ne contrôlait.
 *
 * `resoudrePhotoPoste` est maintenant le SEUL endroit qui décide, dans les
 * deux DEUX écrans : `photo_url` d'abord, `photoPourDepartement` en repli
 * tant qu'aucune photo n'est assignée, sinon rien.
 * ---------------------------------------------------------------------------
 */

export type ClePhotoRepli =
  | 'chantierBalisage2026'
  | 'amenagementSite2025'
  | 'deploiementCamion'
  | 'labImpression3d'

export type ResolutionPhotoPoste =
  | { source: 'assignee'; url: string }
  | { source: 'repli'; cle: ClePhotoRepli }
  | { source: 'aucune' }

/**
 * ⚠️ DETTE TRANSITOIRE, PAS UNE FONCTIONNALITÉ PÉRENNE.
 *
 * Repli département — Phase 6.3, avant que photo_url (0032) n'existe.
 * Aucune photo n'a été prise spécifiquement pour les postes à l'époque : le
 * document de cadrage demandait de réutiliser une photo déjà réelle
 * (medias/) quand le département y correspond thématiquement, jamais une
 * photo de stock (skill 22). Match par département plutôt que par titre :
 * plus stable si un titre est reformulé, et les postes d'un même département
 * partagent le même type de terrain.
 *
 * 'Opérations' et 'Logistique événementielle' ne renvoient plus
 * operationsCrew/operationsCrewVertical depuis le 20 août 2026 (revue
 * visuelle, point 1) : cette paire sert déjà OperationsTerrain.tsx (section 4
 * de l'accueil) en pleine largeur — la revoir en miniature sur /carrieres
 * était la 4ᵉ répétition d'une même photo signalée ce jour-là. chantierBalisage2026
 * et amenagementSite2025 restent thématiquement justes (chantier/opérations,
 * aménagement de site événementiel) sans dupliquer l'accueil.
 *
 * LE JOUR OÙ LES NEUF POSTES AURONT LEUR photo_url ASSIGNÉE depuis
 * /admin/carrieres, cette fonction et son import dans resoudrePhotoPoste
 * peuvent disparaître — elle n'existe que pour éviter que la page publique ne
 * perde ses photos d'un coup pendant la transition. Ne pas lui ajouter de
 * nouveau département : le repli se réduit, il ne s'étend pas.
 *
 * Renvoie une clé de IMAGES, pas l'URL — l'appelant importe IMAGES lui-même,
 * ce module ne dépend pas de next/image.
 */
export function photoPourDepartement(departement: string): ClePhotoRepli | null {
  switch (departement) {
    case 'Opérations':
      return 'chantierBalisage2026'
    case 'Logistique événementielle':
      return 'amenagementSite2025'
    case 'Transport & logistique':
      return 'deploiementCamion'
    case 'Lab créatif':
      return 'labImpression3d'
    // Installation, Atelier, Administration & coordination, Bureau : aucune
    // photo réelle ne correspond honnêtement — PhotoPlaceholder (voir
    // l'appelant).
    default:
      return null
  }
}

/**
 * Ordre de résolution, identique pour /carrieres (public) et /admin/carrieres :
 *
 *   1. photo_url si renseigné (assignée depuis l'admin — priorité absolue)
 *   2. sinon photoPourDepartement(departement), si le département matche
 *   3. sinon rien — PhotoPlaceholder côté appelant
 */
export function resoudrePhotoPoste(photoUrl: string | null, departement: string): ResolutionPhotoPoste {
  if (photoUrl) return { source: 'assignee', url: photoUrl }
  const repli = photoPourDepartement(departement)
  return repli ? { source: 'repli', cle: repli } : { source: 'aucune' }
}
