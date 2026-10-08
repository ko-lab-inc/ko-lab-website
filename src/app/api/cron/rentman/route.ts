import { timingSafeEqual } from 'node:crypto'

import { revalidatePath, revalidateTag } from 'next/cache'
import { NextResponse, type NextRequest } from 'next/server'

import { routing } from '@/i18n/routing'
import { ETIQUETTE_EMPLACEMENTS_MEDIAS } from '@/lib/medias-emplacements'
import { synchroniser } from '@/lib/rentman/synchroniser'
import { ROUTES } from '@/lib/routes'

/**
 * Synchronisation Rentman -> articles_location, PLANIFIEE par Vercel Cron.
 *
 * -----------------------------------------------------------------------------
 * POURQUOI CETTE ROUTE EXISTE
 *
 * Le catalogue de location est alimente par Rentman : Roxanne coche « in_shop »
 * et televerse une photo, et l'article doit apparaitre sur le site. Jusqu'ici
 * cette passe ne tournait QUE sur une commande manuelle (npm run rentman:synchro).
 * « Crucial, ne doit plus jamais retomber » veut dire : elle ne doit pas
 * dependre de quelqu'un qui pense a la lancer. Vercel Cron appelle donc cette
 * route une fois par jour (voir vercel.json).
 *
 * Le meme travail, exactement, que le script CLI : synchroniser() LIT Rentman et
 * ECRIT dans articles_location + le bucket de photos. Il ne supprime aucune
 * ligne et n'ecrit JAMAIS dans Rentman (CLAUDE.md, « Base unique » + Rentman est
 * l'ERP de production). Sans forcerPhotos : seules les photos d'articles
 * reellement modifies sont recopiees, donc une passe quotidienne est quasi
 * instantanee quand rien n'a bouge.
 *
 * -----------------------------------------------------------------------------
 * AUTHENTIFICATION
 *
 * Vercel Cron envoie « Authorization: Bearer <CRON_SECRET> » quand la variable
 * d'environnement CRON_SECRET est definie sur le projet. On la compare a temps
 * constant, meme discipline que /api/location/revalider. Sans CRON_SECRET
 * configure, la route refuse tout le monde (401) : pas de secret, pas de passe.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function autorise(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const entete = req.headers.get('authorization') ?? ''
  const prefixe = 'Bearer '
  if (!entete.startsWith(prefixe)) return false

  const recu = Buffer.from(entete.slice(prefixe.length))
  const attendu = Buffer.from(secret)

  // timingSafeEqual exige deux buffers de meme longueur.
  if (recu.length !== attendu.length) return false
  return timingSafeEqual(recu, attendu)
}

export async function GET(req: NextRequest) {
  if (!autorise(req)) {
    return NextResponse.json({ erreur: 'non_autorise' }, { status: 401 })
  }

  let rapport
  try {
    rapport = await synchroniser()
  } catch (e) {
    console.error('[cron/rentman] synchro echouee :', e)
    return NextResponse.json(
      { succes: false, erreur: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }

  /**
   * Rafraichir le catalogue SEULEMENT si quelque chose a bouge. On est DANS
   * l'app : revalidatePath / revalidateTag en direct, pas d'appel reseau a
   * /api/location/revalider. Jamais bloquant — la base est deja a jour ici, un
   * echec de revalidation est journalise, le cache expirera seul (<= 1 h).
   */
  const aChange = rapport.crees + rapport.mis_a_jour + rapport.depublies > 0
  if (aChange) {
    try {
      for (const locale of routing.locales) {
        revalidatePath(`/${locale}${ROUTES.location}`)
        revalidatePath(`/${locale}`)
      }
      revalidateTag(ETIQUETTE_EMPLACEMENTS_MEDIAS, { expire: 0 })
    } catch (e) {
      console.error('[cron/rentman] revalidation non aboutie :', e)
    }
  }

  return NextResponse.json({
    succes: rapport.erreurs.length === 0,
    change: aChange,
    lus: rapport.lus,
    retenus: rapport.retenus,
    crees: rapport.crees,
    mis_a_jour: rapport.mis_a_jour,
    inchanges: rapport.inchanges,
    depublies: rapport.depublies,
    photos_copiees: rapport.photos_copiees,
    photos_en_echec: rapport.photos_en_echec,
    dossiers_inconnus: rapport.dossiers_inconnus,
    erreurs: rapport.erreurs.slice(0, 10),
    duree_ms: rapport.duree_ms,
    horodatage: new Date().toISOString(),
  })
}
