/**
 * Limitation de débit en mémoire — skill 05.
 *
 * ---------------------------------------------------------------------------
 * PORTÉE RÉELLE — à lire avant de s'y fier
 * ---------------------------------------------------------------------------
 * Le compteur vit dans la mémoire du processus. Sur Vercel, chaque instance
 * serverless a la sienne : avec N instances actives, la limite effective est
 * N × max, et tout est remis à zéro à chaque démarrage à froid.
 *
 * C'est donc un ralentisseur contre l'abus opportuniste et les soumissions
 * répétées, pas une défense. La vraie protection vient du WAF Cloudflare et du
 * Bot Fight Mode (skill 14), plus le honeypot des formulaires (skill 15).
 *
 * Le jour où une garantie stricte est nécessaire, remplacer le Map par un
 * store partagé (Upstash Redis, Vercel KV) sans changer cette signature.
 * ---------------------------------------------------------------------------
 */

type Entry = {
  count: number
  /** Horodatage (ms) auquel la fenêtre courante expire. */
  reset: number
}

export type RateLimitOptions = {
  /** Nombre de requêtes autorisées par fenêtre. */
  max: number
  /** Durée de la fenêtre en millisecondes. */
  windowMs: number
}

const store = new Map<string, Entry>()

/**
 * Sans purge, le Map grossit indéfiniment : une entrée par IP vue, jamais
 * libérée. Sur un processus de longue durée, c'est une fuite mémoire.
 * On balaie au plus une fois par minute pour ne pas parcourir le Map à
 * chaque requête.
 */
const SWEEP_INTERVAL_MS = 60_000
let lastSweep = Date.now()

function sweepExpired(now: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return
  lastSweep = now

  for (const [key, entry] of store) {
    if (entry.reset < now) store.delete(key)
  }
}

/**
 * Enregistre une requête et indique si elle doit être rejetée.
 *
 * @param key Identifiant du compteur. **Toujours préfixer par la route**, sinon
 *   toutes les routes partagent le même budget : cinq envois de contact
 *   épuiseraient aussi le quota de la boutique.
 *
 *   ✅ rateLimit(`contact:${ip}`,  { max: 5, windowMs: 60_000 })
 *   ✅ rateLimit(`boutique:${ip}`, { max: 3, windowMs: 60_000 })
 *   ❌ rateLimit(ip, …)
 *
 * @returns `true` si la requête dépasse la limite (répondre 429),
 *   `false` si elle est autorisée.
 */
export function rateLimit(key: string, opts: RateLimitOptions): boolean {
  const now = Date.now()
  sweepExpired(now)

  const entry = store.get(key)

  // Première requête, ou fenêtre précédente expirée : on repart à zéro.
  if (!entry || entry.reset < now) {
    store.set(key, { count: 1, reset: now + opts.windowMs })
    return false
  }

  if (entry.count >= opts.max) return true

  entry.count += 1
  return false
}

/**
 * Vide le store. Réservé aux tests (skill 26) : sans ça, les compteurs
 * fuiraient d'un cas de test à l'autre et les assertions deviendraient
 * dépendantes de l'ordre d'exécution.
 */
export function resetRateLimits(): void {
  store.clear()
  lastSweep = Date.now()
}
