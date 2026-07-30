/**
 * Extraction de l'identifiant d'une vidéo YouTube, et vignette déduite.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI DÉDUIRE PLUTÔT QUE DEMANDER
 *
 * Christian a demandé un écran où il « colle des liens » — pas un écran où il
 * colle un lien PUIS téléverse une image. La miniature d'une vidéo YouTube est
 * dérivable de son identifiant : autant la calculer.
 *
 * `vignette` reste une colonne de la table (migration 0016) pour les cas où
 * la miniature automatique ne convient pas, ou pour un autre hébergeur.
 *
 * ---------------------------------------------------------------------------
 * ⚠️ CE QUI A ÉTÉ OUVERT DANS LA CSP, ET CE QUI NE L'A PAS ÉTÉ
 *
 * `i.ytimg.com` est ajouté à `img-src` (next.config.ts) — c'est le CDN de
 * miniatures de YouTube. Des IMAGES seulement : aucun script, aucune iframe,
 * aucun cookie tiers, et rien qui s'exécute. `frame-src` reste fermé : la
 * lecture se fait toujours chez l'hébergeur, dans un nouvel onglet (voir la
 * note en tête de BandeauVideos.tsx).
 * ---------------------------------------------------------------------------
 */

/** Hôte des miniatures YouTube — doit rester aligné sur next.config.ts. */
const HOTE_MINIATURES = 'https://i.ytimg.com'

/**
 * Identifiant d'une vidéo YouTube, ou null si l'URL n'en est pas une.
 *
 * Les quatre formes que YouTube produit réellement sont acceptées — un lien
 * copié depuis la barre d'adresse, depuis le bouton « Partager », depuis un
 * Short ou depuis un code d'intégration :
 *
 *     https://www.youtube.com/watch?v=ID       (barre d'adresse)
 *     https://youtu.be/ID                      (bouton Partager)
 *     https://www.youtube.com/shorts/ID        (Short)
 *     https://www.youtube.com/embed/ID         (intégration)
 *
 * Les paramètres qui suivent (`&t=42`, `?si=…`) sont ignorés : ils changent
 * d'un partage à l'autre sans désigner une autre vidéo.
 */
export function identifiantYoutube(url: string): string | null {
  let u: URL
  try {
    u = new URL(url.trim())
  } catch {
    // Ni une URL absolue, ni rien d'exploitable.
    return null
  }

  const hote = u.hostname.replace(/^www\./, '')

  // Un identifiant YouTube fait 11 caractères, alphabet base64url. Le vérifier
  // évite de fabriquer une URL de miniature à partir de n'importe quel
  // fragment de chemin (« /watch », « /playlist »…).
  const valide = (id: string | undefined | null) =>
    id && /^[\w-]{11}$/.test(id) ? id : null

  if (hote === 'youtu.be') {
    return valide(u.pathname.split('/')[1])
  }

  if (hote === 'youtube.com' || hote === 'm.youtube.com' || hote === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') return valide(u.searchParams.get('v'))

    const [, segment, id] = u.pathname.split('/')
    if (segment === 'shorts' || segment === 'embed' || segment === 'v') return valide(id)
  }

  return null
}

/**
 * Vignette d'une vidéo, ou null si on ne sait pas la déduire.
 *
 * `vignetteImposee` l'emporte toujours : c'est le point de sortie pour un
 * autre hébergeur, ou pour une miniature YouTube jugée mauvaise.
 *
 * `hqdefault` (480×360) et non `maxresdefault` : cette dernière n'existe que
 * si la vidéo a été téléversée en haute définition, et renvoie sinon une 404
 * — donc un cadre vide. `hqdefault` existe pour toutes les vidéos.
 */
export function vignetteVideo(url: string, vignetteImposee?: string | null): string | null {
  if (vignetteImposee) return vignetteImposee

  const id = identifiantYoutube(url)
  return id ? `${HOTE_MINIATURES}/vi/${id}/hqdefault.jpg` : null
}
