import { hasLocale } from 'next-intl'
import { getFormatter, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { routing } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'

type Props = { params: Promise<{ locale: string }> }

/**
 * Tableau de bord de l'espace équipe — premier écran.
 *
 * Il montre les DEMANDES REÇUES, et pas des statistiques décoratives : c'est
 * la seule donnée que le site produit aujourd'hui, et la seule qui se périme.
 * Une réalisation non publiée attend ; une demande de client, non.
 *
 * ⚠️ Les compteurs passent par la session de la personne connectée, donc par
 * le RLS (politique `demandes_lecture_equipe` de 0002) — pas par la service
 * role key. Un contournement du RLS ici afficherait des données qu'un editor
 * n'a peut-être pas le droit de voir, et masquerait toute erreur de politique
 * jusqu'au jour où elle compte.
 *
 * Rendu dynamique par nature : `createClient()` lit les cookies.
 */
export default async function TableauDeBordPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations('Admin')
  const format = await getFormatter({ locale })
  const supabase = await createClient()

  // `head: true` : on veut le compte, pas les lignes. Ramener toute la table
  // pour en mesurer la longueur deviendrait coûteux dès quelques centaines de
  // demandes.
  const [{ count: total }, { count: nouvelles }, { data: recentes, error }] = await Promise.all([
    supabase.from('demandes_contact').select('*', { count: 'exact', head: true }),
    supabase
      .from('demandes_contact')
      .select('*', { count: 'exact', head: true })
      .eq('statut', 'nouveau'),
    supabase
      .from('demandes_contact')
      .select('id, created_at, type, nom, email, statut')
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  return (
    <>
      <h1 className="ko-h2 text-ko-ink">{t('titre')}</h1>

      <div className="mt-8 grid grid-cols-2 gap-px border border-ko-line bg-ko-line sm:grid-cols-2">
        {/* Filets obtenus par `gap-px` sur fond ko-line : deux cellules
            adjacentes partagent une seule ligne, sans double bordure. */}
        <div className="bg-ko-white p-6">
          <p className="label-mono text-ko-muted">{t('total_demandes')}</p>
          <p className="mt-3 font-mono text-3xl text-ko-ink">{total ?? 0}</p>
        </div>
        <div className="bg-ko-white p-6">
          <p className="label-mono text-ko-muted">{t('nouvelles')}</p>
          <p className="mt-3 font-mono text-3xl text-ko-blue">{nouvelles ?? 0}</p>
        </div>
      </div>

      <h2 className="ko-h3 mt-12 text-[22px] text-ko-ink">{t('recentes')}</h2>

      {error ? (
        // Le message technique n'est PAS affiché : il révélerait noms de tables
        // et politiques. Il part dans les journaux du serveur, la personne voit
        // qu'il y a un problème et qui prévenir.
        <p className="mt-4 text-base text-ko-ink">{t('erreur_lecture')}</p>
      ) : !recentes || recentes.length === 0 ? (
        <p className="mt-4 text-base leading-relaxed text-ko-muted">{t('aucune_demande')}</p>
      ) : (
        <ul className="mt-6 divide-y divide-ko-line border-y border-ko-line">
          {recentes.map((d) => (
            <li key={d.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-baseline sm:gap-6">
              <span className="font-mono text-xs text-ko-muted sm:w-40 sm:shrink-0">
                {format.dateTime(new Date(d.created_at), {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ko-blue sm:w-24 sm:shrink-0">
                {d.type}
              </span>
              <span className="min-w-0 flex-1 truncate text-base text-ko-ink">
                {d.nom} — {d.email}
              </span>
              {d.statut === 'nouveau' && (
                <span className="label-mono shrink-0 text-ko-blue">{t('statut_nouveau')}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Honnêteté sur l'état du chantier : sans cette ligne, l'absence de
          gestion du catalogue passerait pour un oubli plutôt que pour la
          suite prévue. */}
      <p className="mt-12 border-t border-ko-line pt-6 text-sm leading-relaxed text-ko-muted">
        {t('a_venir')}
      </p>
    </>
  )
}
