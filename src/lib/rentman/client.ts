import 'server-only'

import type { ArticleRentman } from './normaliser'

/**
 * Client de l'API Rentman — LECTURE SEULE.
 *
 * `server-only` en tête : le jeton ne doit jamais partir dans un bundle
 * client. L'import échoue à la compilation si un composant client touche ce
 * fichier, plutôt qu'en production.
 *
 * ---------------------------------------------------------------------------
 * CE QUE CE MODULE NE FAIT PAS
 *
 * Aucune écriture. Pas de POST, pas de PUT, pas de DELETE — le compte Rentman
 * est l'inventaire réel de KO-LAB, pas un bac à sable, et le site n'a aucune
 * raison de le modifier. Le jeton devrait de toute façon être généré depuis un
 * utilisateur Rentman en lecture seule (demandé à Roxanne le 1er octobre
 * 2026) ; ce fichier ne s'appuie pas sur cette promesse, il ne propose
 * simplement aucun verbe d'écriture.
 *
 * Aucun appel depuis le rendu d'une page non plus : seule la synchronisation
 * l'utilise, et elle écrit dans `articles_location`. Voir la migration 0048
 * pour le détail de ce choix (latence, quotas non documentés, disponibilité).
 * ---------------------------------------------------------------------------
 */

const BASE = 'https://api.rentman.net'

/** Plafond de pagination de l'API. 300 par page = 2 appels pour 590 articles. */
const PAR_PAGE = 300

/** Garde-fou : au-delà, quelque chose boucle. L'inventaire en compte 590. */
const MAX_ARTICLES = 5000

function jeton(): string {
  const t = process.env.RENTMAN_API_TOKEN
  if (!t) {
    throw new Error(
      'RENTMAN_API_TOKEN absent. En local il vit dans .env.local ; en production, dans les variables d’environnement Vercel — jamais dans le dépôt.',
    )
  }
  return t
}

async function get<T>(chemin: string): Promise<T> {
  const r = await fetch(BASE + chemin, {
    headers: { Authorization: `Bearer ${jeton()}`, Accept: 'application/json' },
    // La synchronisation veut l'état courant, pas une réponse de cache Next.
    cache: 'no-store',
  })
  if (!r.ok) {
    throw new Error(`Rentman ${chemin} → HTTP ${r.status} ${(await r.text()).slice(0, 200)}`)
  }
  return (await r.json()) as T
}

type Enveloppe<T> = { data: T[]; itemCount?: number }

/**
 * Tout l'équipement, page par page.
 *
 * `itemCount` de l'API renvoie le nombre d'éléments de LA PAGE, pas le total :
 * on ne peut donc pas s'en servir pour savoir quand s'arrêter. La boucle
 * s'arrête sur une page incomplète, ce qui est la seule information fiable.
 */
export async function lireEquipement(): Promise<ArticleRentman[]> {
  const tout: ArticleRentman[] = []
  for (let offset = 0; offset < MAX_ARTICLES; offset += PAR_PAGE) {
    const page = await get<Enveloppe<ArticleRentman>>(
      `/equipment?limit=${PAR_PAGE}&offset=${offset}`,
    )
    const lot = page.data ?? []
    tout.push(...lot)
    if (lot.length < PAR_PAGE) break
  }
  return tout
}

export type FichierRentman = {
  id: number
  url?: string | null
  /** Redirection maison de Rentman. Marche avec ou sans jeton. */
  proxy_url?: string | null
  type?: string | null
  displayname?: string | null
}

/** Une fiche fichier, à partir d'une référence `/files/479`. */
export async function lireFichier(reference: string): Promise<FichierRentman | null> {
  if (!/^\/files\/\d+$/.test(reference)) return null
  const r = await get<{ data: FichierRentman }>(reference)
  return r.data ?? null
}

/**
 * Télécharge une photo.
 *
 * ⚠️ `url` est une URL S3 **signée** : lui envoyer l'en-tête `Authorization`
 * la fait répondre 403 (constaté le 1er octobre 2026 — la signature et
 * l'en-tête s'excluent). `proxy_url`, lui, fonctionne dans les deux cas.
 * On essaie donc le proxy d'abord, et l'URL signée NUE en repli.
 *
 * Aucune des deux n'est stockée en base : la photo est recopiée dans notre
 * bucket `location`. Voir la migration 0048.
 */
export async function telechargerPhoto(f: FichierRentman): Promise<{ octets: Buffer; type: string } | null> {
  const essais: Array<{ url: string; avecJeton: boolean }> = []
  if (f.proxy_url) essais.push({ url: f.proxy_url, avecJeton: true })
  if (f.url) essais.push({ url: f.url, avecJeton: false })

  for (const { url, avecJeton } of essais) {
    const r = await fetch(url, {
      headers: avecJeton ? { Authorization: `Bearer ${jeton()}` } : {},
      cache: 'no-store',
    })
    if (!r.ok) continue
    const type = r.headers.get('content-type') ?? ''
    if (!type.startsWith('image/')) continue
    return { octets: Buffer.from(await r.arrayBuffer()), type }
  }
  return null
}
