import { hasLocale } from 'next-intl'
import { getFormatter, getTranslations } from 'next-intl/server'
import { notFound, redirect } from 'next/navigation'

import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { routeCommande } from '@/lib/routes'
import { createClient } from '@/lib/supabase/server'
import { STATUTS_COMMANDE } from '@/types'

import type { Metadata } from 'next'

type Props = { params: Promise<{ locale: string }> }

/**
 * Mes commandes — migration 0021.
 *
 * ---------------------------------------------------------------------------
 * ACCÈS PAR SESSION, PAS PAR UN TOKEN DANS L'URL
 *
 * Même garde que /compte : `getUser()` puis redirection vers /connexion avec
 * `suivant` si absent. La LISTE, elle, repose entièrement sur la politique
 * `commandes_lecture_client` (0021) — aucun filtre `.eq('client_id', …)`
 * ajouté ici volontairement : le laisser à RLS seul rend une régression de
 * politique immédiatement visible (tout le monde verrait tout), plutôt que
 * masquée par un filtre applicatif redondant. Même choix que
 * /admin/demandes, qui ne filtre pas non plus et laisse le RLS décider.
 * ---------------------------------------------------------------------------
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations({ locale, namespace: 'Commande' })
  return { title: t('mes_commandes_titre'), robots: { index: false, follow: false } }
}

export default async function MesCommandesPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/${locale}/connexion?suivant=/${locale}/compte/commandes`)

  const t = await getTranslations('Commande')
  const format = await getFormatter({ locale })

  const { data: commandes } = await supabase
    .from('commandes')
    .select('id, numero, statut, mode_livraison, created_at')
    .order('created_at', { ascending: false })

  const libellesStatuts: Record<string, string> = Object.fromEntries(
    STATUTS_COMMANDE.map((s) => [s, t(`statut_${s}`)]),
  )

  return (
    <>
      <section className="border-b border-ko-line bg-ko-cream pb-14 pt-28 lg:pb-20 lg:pt-40">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          <span aria-hidden="true" className="block h-px w-8 bg-ko-blue" />
          <h1 className="ko-display mt-6 max-w-[16ch] text-ko-ink">{t('mes_commandes_titre')}</h1>
          <p className="mt-7 max-w-[54ch] text-base leading-relaxed text-ko-muted lg:text-lg">
            {t('mes_commandes_intro')}
          </p>
        </div>
      </section>

      <section className="bg-ko-white py-16 lg:py-24">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          {!commandes || commandes.length === 0 ? (
            <div className="border border-ko-line bg-ko-cream p-8 lg:p-12">
              <p className="ko-h3 text-ko-ink">{t('mes_commandes_vide_titre')}</p>
              <p className="mt-4 max-w-[46ch] text-base leading-relaxed text-ko-muted">
                {t('mes_commandes_vide_texte')}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-ko-line border-y border-ko-line">
              {commandes.map((c) => (
                <li key={c.id}>
                  <Link
                    href={routeCommande(c.id)}
                    className="flex flex-col gap-2 py-6 transition-colors duration-200 hover:bg-ko-cream sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-mono text-base text-ko-ink">{c.numero}</p>
                      <p className="mt-1 text-xs text-ko-muted">
                        {format.dateTime(new Date(c.created_at), { dateStyle: 'medium' })}
                      </p>
                    </div>
                    <span className="label-mono text-ko-blue">
                      {libellesStatuts[c.statut] ?? c.statut}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  )
}
