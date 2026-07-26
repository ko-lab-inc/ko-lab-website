import createMiddleware from 'next-intl/middleware'

import { routing } from '@/i18n/routing'

/**
 * Proxy next-intl — négociation de langue et redirections.
 *
 * ⚠️ NOMMAGE : ce fichier s'appelait `middleware.ts` jusqu'à Next 15.
 * Next 16 a renommé la convention en `proxy.ts` et émet un avertissement de
 * dépréciation sur l'ancien nom. Les skills 21 et 24 parlent encore de
 * `src/middleware.ts` — c'est ce fichier-ci qu'ils désignent.
 *
 * Absent de la liste de fichiers initiale, mais indispensable :
 * - `/` renvoyait un 404 au lieu de rediriger vers `/fr`
 * - la langue n'était pas résolue pour la requête, donc le corps des pages
 *   sortait toujours en français, même sur /en
 *
 * Il pose aussi le cookie de langue et l'en-tête `Link` des versions alternées
 * (alternateLinks), en complément des hreflang du skill 10.
 *
 * ⚠️ Quand la protection de /admin sera ajoutée (skill 24), les deux logiques
 * devront être FUSIONNÉES dans ce fichier — Next n'exécute qu'un seul proxy par
 * projet. Vérifier la session Supabase d'abord, puis déléguer à celui-ci.
 */
export default createMiddleware(routing)

export const config = {
  // Exclut les routes d'API, les fichiers internes de Next et tout ce qui
  // porte une extension (images, robots.txt, sitemap.xml…) : ces requêtes ne
  // doivent jamais être réécrites avec un préfixe de langue.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
