import { getTranslations } from 'next-intl/server'

import { buttonVariants } from '@/components/ui/Button'
import { Link } from '@/i18n/navigation'
import { ROUTES } from '@/lib/routes'

/**
 * 404 — n'existait pas avant ce fichier (Phase 10, étape 3).
 *
 * Sans lui, toute route introuvable — y compris `/boutique/*` quand
 * `boutiqueActive` est à faux (voir `boutique/layout.tsx`) — retombait sur la
 * page 404 générique de Next : non stylée, non traduite (toujours en
 * anglais), sans Nav ni Footer. Les libellés `Commun.page_introuvable_*`
 * existaient déjà dans les deux langues depuis un moment mais n'étaient
 * référencés nulle part — ce fichier est leur premier et seul consommateur.
 *
 * Posé à CE niveau (`(marketing)/[locale]/`) et pas à la racine : Next rend
 * ce composant à l'intérieur du layout englobant, donc Nav/Footer
 * l'enveloppent automatiquement (ce sont eux, pas cette page, qui les
 * posent) — pas besoin de les répéter ici. `getTranslations` sans locale
 * explicite lit le contexte déjà posé par `setRequestLocale` dans le layout,
 * même motif que toutes les autres pages server de ce dossier.
 *
 * Une route non préfixée par une locale (ex. un lien externe mal formé vers
 * `/quelque-chose` sans `/fr` ni `/en`) reste un angle mort résiduel : elle
 * ne traverse jamais ce segment, donc jamais ce fichier — elle retombe sur le
 * `/_not-found` générique de Next à la racine. Ajouter un root layout pour le
 * couvrir recréerait le problème de désynchronisation de `lang` documenté en
 * tête de `layout.tsx`, pour un cas qui ne devrait pas se produire tant que
 * le routage next-intl préfixe correctement toute navigation interne.
 */
export default async function NotFound() {
  const t = await getTranslations('Commun')

  return (
    <section className="border-b border-ko-line bg-ko-cream pb-20 pt-28 lg:pb-28 lg:pt-40">
      <div className="mx-auto max-w-container px-6 text-center lg:px-12">
        <span aria-hidden="true" className="mx-auto block h-px w-8 bg-ko-blue" />

        <p className="label-mono mt-6 text-ko-muted">404</p>

        <h1 className="ko-display mt-4 text-ko-ink">{t('page_introuvable_titre')}</h1>

        <p className="mx-auto mt-7 max-w-[52ch] text-base leading-relaxed text-ko-muted lg:text-lg">
          {t('page_introuvable_texte')}
        </p>

        <Link href={ROUTES.accueil} className={`mt-10 ${buttonVariants({ variant: 'primary' })}`}>
          {t('retour_accueil')}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  )
}
