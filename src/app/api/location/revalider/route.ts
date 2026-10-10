import { timingSafeEqual } from 'node:crypto'

import { revalidatePath, revalidateTag } from 'next/cache'
import { NextResponse, type NextRequest } from 'next/server'

import { routing } from '@/i18n/routing'
import { ETIQUETTE_EMPLACEMENTS_MEDIAS } from '@/lib/medias-emplacements'
import { CATEGORIES_LOCATION } from '@/lib/rentman/categories'
import { ROUTES, routeCategorieLocation } from '@/lib/routes'
import { adresseDepuis } from '@/lib/utils/adresseClient'
import { rateLimit } from '@/lib/utils/rateLimit'

/**
 * Rafraîchissement immédiat du catalogue de location, appelé par le script de
 * synchronisation Rentman (scripts/rentman-synchroniser.mjs).
 *
 * -----------------------------------------------------------------------------
 * POURQUOI CETTE ROUTE EXISTE
 *
 * /location est une page ISR (`export const revalidate = 3600`). La synchro
 * écrit dans `articles_location` depuis un script CLI, HORS de l'application :
 * rien n'invalide donc le rendu mis en cache, et un article tout juste publié
 * dans Rentman n'apparaissait sur le site qu'au bout d'une heure, ou au
 * prochain déploiement. Cette route referme l'écart — la synchro l'appelle en
 * fin de passe et le catalogue est à jour à la requête suivante.
 *
 * Elle ne lit rien, n'écrit rien : elle ne fait qu'invalider un cache.
 *
 * -----------------------------------------------------------------------------
 * AUTHENTIFICATION
 *
 * Jeton partagé dans l'en-tête `X-Revalidation-Token`, comparé à temps
 * constant — même dispositif que /api/mission-nerf/decharges, et pour la même
 * raison : un seul appelant légitime (notre script), rien à négocier de plus
 * complexe qu'un secret fixe.
 *
 * Le jeton n'est pas qu'une formalité. Sans lui, n'importe qui pourrait faire
 * expirer le cache en boucle et forcer un rendu complet à chaque appel — un
 * déni de service à une requête près. D'où aussi la limite de débit, qui
 * s'applique AVANT la vérification du jeton.
 *
 * Ordre des contrôles, du moins coûteux au plus coûteux — même discipline que
 * /api/contact : débit, jeton, puis action.
 */

/** Cette route invalide un cache : elle ne doit elle-même jamais être mise en cache. */
export const dynamic = 'force-dynamic'

function jetonValide(recu: string | null): boolean {
  const attendu = process.env.REVALIDATION_TOKEN

  // Jeton non configuré : refuser. Comparer contre une chaîne vide
  // accepterait un en-tête absent, donc ouvrirait la route à tout le monde.
  if (!attendu || !recu) return false

  const bufAttendu = Buffer.from(attendu)
  const bufRecu = Buffer.from(recu)

  // timingSafeEqual exige deux buffers de MÊME longueur — un jeton plus court
  // ou plus long est rejeté avant la comparaison à temps constant, qui ne
  // porte donc que sur le CONTENU, jamais la longueur.
  if (bufRecu.length !== bufAttendu.length) return false

  return timingSafeEqual(bufRecu, bufAttendu)
}

export async function POST(req: NextRequest) {
  if (rateLimit(`location-revalider:${adresseDepuis(req.headers)}`, { max: 10, windowMs: 60_000 })) {
    return NextResponse.json({ erreur: 'trop_de_requetes' }, { status: 429 })
  }

  if (!jetonValide(req.headers.get('x-revalidation-token'))) {
    return NextResponse.json({ erreur: 'non_autorise' }, { status: 401 })
  }

  /**
   * Une entrée de cache par langue : /fr/location et /en/location sont deux
   * rendus distincts. On balaie `routing.locales` plutôt que d'écrire les deux
   * chemins en dur — une troisième langue serait couverte sans retoucher ici.
   *
   * ⚠️ Pages seulement. La route de métadonnées /sitemap.xml ne réagit PAS à
   * `revalidatePath` sur Vercel (voir la note d'en-tête de src/app/sitemap.ts) :
   * ne rien promettre ici à son sujet. Le catalogue de location n'y figure de
   * toute façon pas article par article.
   */
  const chemins = routing.locales.map((locale) => `/${locale}${ROUTES.location}`)
  for (const chemin of chemins) revalidatePath(chemin)

  /**
   * Les pages de CATÉGORIE (/location/categorie/<cle>), ajoutées le 9 octobre
   * 2026. Elles sont ISR comme /location : sans ça, une synchro qui ajoute des
   * articles mettait à jour le compteur des tuiles de /location immédiatement,
   * mais la page de la catégorie elle-même restait figée jusqu'à une heure —
   * tuile « Décor 374 » menant à une page qui n'en montrait que 108. On balaie
   * les sept catégories pour les deux langues.
   */
  const cheminsCategories = routing.locales.flatMap((locale) =>
    CATEGORIES_LOCATION.map((cle) => `/${locale}${routeCategorieLocation(cle)}`),
  )
  for (const chemin of cheminsCategories) revalidatePath(chemin)

  /**
   * L'ACCUEIL aussi, et le cache de données des emplacements média.
   *
   * L'accueil (section Besoins) affiche quatre photos lues dans
   * `medias_emplacements` via `unstable_cache` (tag ci-dessous, revalidate 1 h).
   * Quand on change une de ces photos HORS de l'admin — directement en base,
   * comme pour les cartes « Installer » et « Déployer » le 8 octobre 2026 — rien
   * ne rafraîchit l'accueil avant une heure.
   *
   * ⚠️ DANS UNE ROUTE, PAS `updateTag` : il est réservé aux Server Actions (il
   * lève sinon, et faisait planter cette route en 500, ce qui cassait AUSSI la
   * revalidation du catalogue). `revalidateTag` exige un second argument en
   * Next 16 : `{ expire: 0 }` purge sans condition de fraîcheur.
   *
   * ⚠️ ENVELOPPÉ dans un try/catch : le travail PRINCIPAL de cette route — la
   * revalidation du catalogue, ci-dessus, déjà faite — ne doit jamais échouer à
   * cause de ce bonus « accueil ». Un échec ici est journalisé, pas propagé.
   */
  const accueil = routing.locales.map((locale) => `/${locale}`)
  try {
    revalidateTag(ETIQUETTE_EMPLACEMENTS_MEDIAS, { expire: 0 })
    for (const chemin of accueil) revalidatePath(chemin)
  } catch (e) {
    console.error('[revalider] rafraîchissement accueil/médias non abouti :', e)
  }

  return NextResponse.json({
    succes: true,
    chemins: [...chemins, ...cheminsCategories, ...accueil],
    horodatage: new Date().toISOString(),
  })
}
