/**
 * Chargeur d'images personnalisé de `next/image`.
 *
 * =============================================================================
 * POURQUOI CE FICHIER EXISTE
 * =============================================================================
 * Le 5 septembre 2026, les photos de /realisations ne s'affichaient plus une
 * fois ouvertes en plein écran. Sonde en production, sur une image réelle :
 *
 *     /_next/image?url=<photo>&w=384&q=80   -> HTTP 402
 *     /_next/image?url=<photo>&w=640&q=80   -> HTTP 402
 *     /_next/image?url=<photo>&w=1920&q=85  -> HTTP 402
 *
 * 402 Payment Required : le quota d'optimisation d'images du plan Vercel
 * Hobby (5 000 transformations/mois) est épuisé. L'optimiseur ne sert plus
 * que ce qui est DÉJÀ en cache — d'où des vignettes qui s'affichent et la
 * même photo cassée en grand, la visionneuse demandant d'autres largeurs et
 * une autre qualité (85 contre 80).
 *
 * `minimumCacheTTL` avait déjà été porté à un an le 3 septembre pour arrêter
 * l'hémorragie, mais ça ne rend pas les transformations déjà consommées : le
 * quota reste épuisé jusqu'à la réinitialisation mensuelle.
 *
 * -----------------------------------------------------------------------------
 * LA SORTIE : SUPABASE REDIMENSIONNE, PAS VERCEL
 * -----------------------------------------------------------------------------
 * Supabase Storage expose son propre point de transformation, sur le même
 * hôte que les fichiers. Mesuré en direct sur une photo de 4,4 Mo :
 *
 *     .../object/public/<chemin>                    4 410 472 o  (source)
 *     .../render/image/public/<chemin>?width=640      467 574 o  (WebP)
 *     .../render/image/public/<chemin>?width=1200     827 068 o  (WebP)
 *
 * Le WebP sort tout seul quand le navigateur l'annonce dans `Accept` — rien
 * à configurer. Et surtout : aucun quota Vercel, puisque l'optimiseur n'est
 * plus dans la boucle pour ces images-là.
 *
 * -----------------------------------------------------------------------------
 * CE QUE CE CHARGEUR NE FAIT PAS
 * -----------------------------------------------------------------------------
 * Il ne détourne QUE les fichiers de Supabase Storage. Les images locales
 * (`/images/...` dans `public/`), Unsplash et les vignettes YouTube gardent
 * le chemin `/_next/image` d'origine — reconstruit ici à l'identique, parce
 * qu'un `loaderFile` remplace le chargeur pour TOUTES les images, pas
 * seulement celles qu'on visait.
 *
 * Ces images-là restent donc soumises au quota Vercel. C'est assumé : elles
 * sont peu nombreuses, déployées depuis longtemps, donc déjà en cache. Les
 * photos de Supabase — réalisations, galeries, médias — sont l'écrasante
 * majorité et le seul contenu qui bouge.
 *
 * ⚠️ Les composants portant déjà `unoptimized` (contournement du 3 septembre)
 * ne passent PAS par ce chargeur : `next/image` sert alors le fichier source
 * tel quel. Ils continuent de fonctionner, mais servent l'original au lieu
 * d'une version redimensionnée — à nettoyer à froid, hors de cette
 * correction.
 */

/** Marqueur du chemin de LECTURE d'un objet public dans Supabase Storage. */
const CHEMIN_OBJET = '/storage/v1/object/public/'

/** Chemin de TRANSFORMATION, même hôte, même fichier. */
const CHEMIN_RENDU = '/storage/v1/render/image/public/'

/**
 * Qualité par défaut de `next/image` quand la prop n'est pas passée.
 * Reprise telle quelle pour que le comportement soit identique aux deux
 * chemins de sortie.
 */
const QUALITE_DEFAUT = 75

export default function chargeurImage({
  src,
  width,
  quality,
}: {
  src: string
  width: number
  quality?: number
}): string {
  const q = quality ?? QUALITE_DEFAUT

  if (src.includes(CHEMIN_OBJET)) {
    /**
     * ⚠️ `resize=contain` EST OBLIGATOIRE — corrigé le 6 octobre 2026.
     *
     * Ce chargeur affirmait l'inverse : « par défaut Supabase conserve le
     * rapport d'image et ne fait que réduire la largeur ». C'EST FAUX, et ça
     * déformait TOUTES les photos Supabase du site depuis le 5 septembre 2026.
     * Mesuré sur une photo réelle de 1600x2133 (rapport 0,750) :
     *
     *     ?width=1024                   -> 1024x2133   rapport 0,480
     *     ?width=640                    -> 640x2133    rapport 0,300
     *     ?width=1024&resize=contain    -> 1024x1365   rapport 0,750  (correct)
     *
     * Sans `resize`, Supabase applique son défaut `cover` : il impose la
     * largeur demandée mais GARDE LA HAUTEUR D'ORIGINE, donc il écrase
     * l'image horizontalement. Plus la largeur demandée est petite, pire
     * c'est — d'où des vignettes mobiles méconnaissables.
     *
     * `contain` redimensionne proportionnellement pour tenir dans la largeur
     * demandée, ce qui est exactement le contrat d'un chargeur `next/image` :
     * le serveur ne fait que réduire, c'est le CSS (object-fit, aspect-ratio)
     * qui décide du cadrage. Il n'agrandit jamais une image plus petite que
     * la largeur demandée (700x700 reste 700x700) — vérifié aussi.
     */
    return `${src.replace(CHEMIN_OBJET, CHEMIN_RENDU)}?width=${width}&resize=contain&quality=${q}`
  }

  // Chemin d'origine de Next, reconstruit à l'identique. `encodeURIComponent`
  // est indispensable : `src` peut contenir des `&` ou des `?` qui casseraient
  // la chaîne de requête.
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${q}`
}
