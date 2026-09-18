import { hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'

import { buttonVariants } from '@/components/ui/Button'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { ROUTES } from '@/lib/routes'

/**
 * THÈME SOMBRE — migration page par page (méthode de 73255f2, accueil).
 * Cet écran se rend DANS le layout marketing, avec sa nav et son pied : le
 * marqueur ci-dessous les fait basculer avec lui. Pas d'export `viewport`
 * ici, Next ne l'accepte que sur page.tsx et layout.tsx — pour la 404, c'est
 * le fourre-tout [...rest]/page.tsx qui porte le theme-color.
 */
import '@/styles/theme-sombre.css'

import type { Metadata } from 'next'

/**
 * Métadonnées de la 404 (17 septembre 2026). Sans elles, la page introuvable
 * héritait du title et de la description de l'ACCUEIL — constaté en
 * production, FR et EN, jusque dans les résultats de recherche. Exportées
 * ICI pour le HTML serveur : quand une page appelle notFound(), Next résout
 * le <head> depuis ce fichier — c'est ce que lisent Googlebot et curl
 * (vérifié avec son User-Agent : « Page introuvable — KO-LAB »). Après
 * hydratation, le navigateur réapplique celles de la page : la page
 * fourre-tout [...rest] exporte donc les MÊMES, sinon l'onglet retombe sur
 * le titre du layout 2 s après le chargement (mesuré). Couvre toute URL
 * inconnue et tout notFound() du site vitrine. `robots: noindex` : une page d'erreur n'a
 * rien à faire dans l'index. Le gabarit « %s — KO-LAB » du layout s'applique.
 *
 * ⚠️ Locale passée EXPLICITEMENT à getTranslations : Next fournit `params` à
 * cette fonction (vérifié, `locale` y est). Sans elle, next-intl lit la
 * requête et rend DYNAMIQUES toutes les pages qui appellent notFound() — les
 * trois pages boutique (inactives) étaient passées de ● à ƒ au build. Le
 * repli sans locale ne sert qu'à une locale inconnue, cas où la page est
 * déjà dynamique.
 */
export async function generateMetadata(props: { params?: Promise<{ locale?: string }> }): Promise<Metadata> {
  const { locale } = (await props.params) ?? {}
  const t = hasLocale(routing.locales, locale)
    ? await getTranslations({ locale, namespace: 'Metadata.introuvable' })
    : await getTranslations('Metadata.introuvable')
  return { title: t('title'), description: t('description'), robots: { index: false, follow: true } }
}

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
    <div data-theme-sombre>
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
    </div>
  )
}
