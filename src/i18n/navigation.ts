import { createNavigation } from 'next-intl/navigation'

import { routing } from './routing'

/**
 * API de navigation conscientes de la locale — next-intl 4.
 *
 * TOUJOURS importer Link depuis ce fichier, jamais depuis 'next/link' :
 * un <Link href="/realisations"> standard perdrait le préfixe de langue et
 * renverrait un visiteur anglophone vers la version française.
 *
 *     import { Link } from '@/i18n/navigation'
 *     <Link href="/realisations">…</Link>   →  /fr/realisations ou /en/realisations
 *
 * `getPathname` sert à construire des URL absolues hors composant — canonical,
 * hreflang et sitemap (skill 10).
 *
 * Quand les chemins localisés seront configurés en Phase 3 (`pathnames` dans
 * routing.ts), ces mêmes fonctions traduiront aussi les segments d'URL :
 * /fr/solutions-modulaires ↔ /en/modular-solutions (skill 21).
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
