import { createNavigation } from 'next-intl/navigation'

import { routing } from './routing'

/**
 * API de navigation conscientes de la locale — next-intl 4.
 *
 * Une seule locale existe désormais ('fr'), mais on garde ces fonctions
 * plutôt que `next/link` brut : elles posent quand même le préfixe /fr et
 * gardent le code prêt si une seconde langue revenait un jour — un seul
 * fichier à changer (routing.ts) plutôt que chaque `<Link>` du site.
 *
 *     import { Link } from '@/i18n/navigation'
 *     <Link href="/realisations">…</Link>   →  /fr/realisations
 *
 * `getPathname` sert à construire des URL absolues hors composant —
 * canonical, essentiellement (skill 10).
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
