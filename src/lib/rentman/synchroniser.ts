import 'server-only'

import { createClient } from '@supabase/supabase-js'

import { lireEquipement, lireFichier, telechargerPhoto } from './client'
import { estRetenu, normaliser, type ArticleNormalise, type ArticleRentman, type Rejet } from './normaliser'

/**
 * Synchronisation Rentman → `articles_location`.
 *
 * Écrit avec la CLÉ DE SERVICE, donc hors RLS : c'est volontaire et c'est la
 * raison pour laquelle la migration 0048 n'accorde aucune policy INSERT ni
 * DELETE à `authenticated`. Le catalogue appartient à cette fonction ; une
 * ligne créée à la main serait écrasée ou orpheline à la passe suivante.
 *
 * ---------------------------------------------------------------------------
 * CE QU'ELLE NE FAIT JAMAIS
 *
 * Supprimer. Un article qui perd sa case `in_shop` dans Rentman, ou qui
 * disparaît de l'inventaire, passe à `publie = false` — il quitte le site
 * sans quitter la base. « Masquer, jamais supprimer » : une suppression
 * perdrait l'ordre d'affichage et les textes alternatifs saisis à la main par
 * l'équipe, et les reconstituer après une fausse manœuvre dans Rentman serait
 * impossible.
 *
 * Écrire dans Rentman. Le client (client.ts) ne propose aucun verbe
 * d'écriture.
 * ---------------------------------------------------------------------------
 */

export type Rapport = {
  lus: number
  retenus: number
  crees: number
  mis_a_jour: number
  inchanges: number
  depublies: number
  photos_copiees: number
  photos_en_echec: number
  rejets: Rejet[]
  /** Dossiers Rentman absents de la table de correspondance. À traiter. */
  dossiers_inconnus: string[]
  erreurs: string[]
  duree_ms: number
}

function clientService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !cle) throw new Error('NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY absent.')
  // Pas de session, pas de rafraîchissement : appel serveur à serveur.
  return createClient(url, cle, { auth: { persistSession: false, autoRefreshToken: false } })
}

/** Deux dates ISO désignent-elles le même instant ? Deux `null` aussi. */
function memeInstant(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return a === b
  const x = Date.parse(a)
  const y = Date.parse(b)
  return Number.isFinite(x) && Number.isFinite(y) && x === y
}

type LigneExistante = {
  rentman_id: number
  slug: string
  image_url: string | null
  publie: boolean
  rentman_modifie_le: string | null
}

/**
 * Copie la photo d'un article dans le bucket `location` et rend son URL
 * publique. `null` si l'article n'a pas de photo ou si le téléchargement
 * échoue — un article sans photo reste publiable, il s'affichera avec le
 * PhotoPlaceholder du site.
 *
 * Le nom du fichier est déterministe (`<rentman_id>.<ext>`) : une
 * resynchronisation écrase la photo au lieu d'empiler des orphelins dans le
 * bucket. `upsert: true` est donc indispensable.
 */
async function copierPhoto(
  supabase: ReturnType<typeof clientService>,
  article: ArticleNormalise,
): Promise<string | null> {
  if (!article.reference_image) return null

  const fichier = await lireFichier(article.reference_image)
  if (!fichier) return null

  const photo = await telechargerPhoto(fichier)
  if (!photo) return null

  const extension = photo.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'
  const chemin = `${article.rentman_id}.${extension}`

  const { error } = await supabase.storage.from('location').upload(chemin, photo.octets, {
    contentType: photo.type,
    upsert: true,
  })
  if (error) throw new Error(`photo ${chemin} : ${error.message}`)

  return supabase.storage.from('location').getPublicUrl(chemin).data.publicUrl
}

/**
 * @param source  Les articles Rentman. Injectable pour que le test de bout en
 *                bout puisse passer un article `AUDIT_<horodatage>` sans
 *                toucher à l'inventaire réel du client (CLAUDE.md, « Base
 *                unique » : il n'existe pas d'environnement de test séparé).
 */
export async function synchroniser(
  source?: () => Promise<ArticleRentman[]>,
): Promise<Rapport> {
  const debut = Date.now()
  const supabase = clientService()

  const bruts = await (source ?? lireEquipement)()
  const resultats = bruts.map(normaliser)
  const retenus = resultats.filter(estRetenu)
  const rejets = resultats.filter((r): r is Rejet => !estRetenu(r))

  const rapport: Rapport = {
    lus: bruts.length,
    retenus: retenus.length,
    crees: 0,
    mis_a_jour: 0,
    inchanges: 0,
    depublies: 0,
    photos_copiees: 0,
    photos_en_echec: 0,
    rejets,
    dossiers_inconnus: [
      ...new Set(rejets.filter((r) => r.raison === 'dossier_inconnu').map((r) => r.detail ?? '?')),
    ],
    erreurs: [],
    duree_ms: 0,
  }

  const { data: existantes, error: erreurLecture } = await supabase
    .from('articles_location')
    .select('rentman_id, slug, image_url, publie, rentman_modifie_le')
  if (erreurLecture) throw new Error(`lecture de l'existant : ${erreurLecture.message}`)

  const parId = new Map<number, LigneExistante>(
    ((existantes ?? []) as LigneExistante[]).map((l) => [l.rentman_id, l]),
  )

  for (const article of retenus) {
    try {
      const avant = parId.get(article.rentman_id)

      // Rien n'a bougé côté Rentman ET la photo est déjà là : on ne réécrit
      // pas. Sans ce test, chaque passe retéléverserait les photos et
      // toucherait `updated_at` de toutes les lignes pour rien.
      //
      // ⚠️ Comparaison d'INSTANTS, pas de chaînes. Rentman renvoie
      // « 2026-10-01T12:00:00-04:00 », PostgreSQL relit la même valeur en
      // « 2026-10-01T16:00:00+00:00 » : même moment, textes différents. La
      // comparaison de chaînes déclarait donc tout modifié à chaque passe —
      // 584 réécritures et autant de retéléversements de photos par
      // synchronisation (constaté par le script de vérification, étape 2).
      const aJour =
        avant !== undefined &&
        avant.publie &&
        memeInstant(avant.rentman_modifie_le, article.rentman_modifie_le) &&
        (article.reference_image === null) === (avant.image_url === null)
      if (aJour) {
        rapport.inchanges += 1
        continue
      }

      let imageUrl: string | null = avant?.image_url ?? null
      try {
        const copiee = await copierPhoto(supabase, article)
        if (copiee) {
          imageUrl = copiee
          rapport.photos_copiees += 1
        } else if (article.reference_image) {
          rapport.photos_en_echec += 1
        } else {
          // L'article n'a plus de photo dans Rentman : on retire la nôtre.
          imageUrl = null
        }
      } catch (e) {
        // Une photo qui ne se copie pas ne doit pas empêcher l'article
        // d'arriver : il s'affichera avec le placeholder.
        rapport.photos_en_echec += 1
        rapport.erreurs.push(e instanceof Error ? e.message : String(e))
      }

      const { error } = await supabase.from('articles_location').upsert(
        {
          rentman_id: article.rentman_id,
          // Le slug ne change jamais après la création : une URL déjà
          // indexée par Google ne doit pas bouger parce que quelqu'un a
          // renommé un article dans Rentman.
          slug: avant?.slug ?? article.slug,
          nom_fr: article.nom_fr,
          nom_en: article.nom_en,
          description_fr: article.description_fr,
          description_en: article.description_en,
          categorie: article.categorie,
          dossier_rentman: article.dossier_rentman,
          prix: article.prix,
          tags: article.tags,
          image_url: imageUrl,
          publie: true,
          rentman_modifie_le: article.rentman_modifie_le,
          synchronise_le: new Date().toISOString(),
        },
        { onConflict: 'rentman_id' },
      )
      if (error) throw new Error(`article ${article.rentman_id} : ${error.message}`)

      if (avant) rapport.mis_a_jour += 1
      else rapport.crees += 1
    } catch (e) {
      rapport.erreurs.push(e instanceof Error ? e.message : String(e))
    }
  }

  // Dépublication : tout ce qui était publié et n'est plus retenu. Jamais de
  // DELETE — voir la note d'en-tête.
  const retenusIds = new Set(retenus.map((a) => a.rentman_id))
  const aDepublier = [...parId.values()].filter((l) => l.publie && !retenusIds.has(l.rentman_id))
  if (aDepublier.length > 0) {
    const { error } = await supabase
      .from('articles_location')
      .update({ publie: false, synchronise_le: new Date().toISOString() })
      .in(
        'rentman_id',
        aDepublier.map((l) => l.rentman_id),
      )
    if (error) rapport.erreurs.push(`dépublication : ${error.message}`)
    else rapport.depublies = aDepublier.length
  }

  rapport.duree_ms = Date.now() - debut
  return rapport
}
