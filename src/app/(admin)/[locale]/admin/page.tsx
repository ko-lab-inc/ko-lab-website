import { hasLocale } from 'next-intl'
import { getFormatter, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import {
  EnteteAdmin,
  EnteteTableau,
  GrilleStats,
  PanneauAdmin,
  TuileStat,
} from '@/components/layout/CadreAdmin'
import { routing } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import { SLUGS_PRODUITS } from '@/lib/produits'

type Props = { params: Promise<{ locale: string }> }

/**
 * Tableau de bord de l'espace équipe.
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
 */
export default async function TableauDeBordPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations('Admin')
  const format = await getFormatter({ locale })
  const supabase = await createClient()

  // `head: true` : on veut le compte, pas les lignes. Ramener toute la table
  // pour en mesurer la longueur deviendrait coûteux dès quelques centaines.
  const [{ count: total }, { count: nouvelles }, { count: comptes }, { data: recentes, error }] =
    await Promise.all([
      supabase.from('demandes_contact').select('*', { count: 'exact', head: true }),
      supabase
        .from('demandes_contact')
        .select('*', { count: 'exact', head: true })
        .eq('statut', 'nouveau'),
      supabase.from('profils').select('*', { count: 'exact', head: true }),
      supabase
        .from('demandes_contact')
        .select('id, created_at, type, nom, email, statut')
        .order('created_at', { ascending: false })
        .limit(8),
    ])

  return (
    <>
      <EnteteAdmin titre={t('titre')} />

      <GrilleStats>
        <TuileStat libelle={t('total_demandes')} valeur={total ?? 0} />
        <TuileStat libelle={t('nouvelles')} valeur={nouvelles ?? 0} accent />
        {/* Le catalogue n'est pas encore en base : le chiffre vient du fichier
            source, et la précision le dit plutôt que de laisser croire à une
            donnée gérée ici. */}
        <TuileStat
          libelle={t('nav_catalogue')}
          valeur={SLUGS_PRODUITS.length}
          precision={t('stat_catalogue_precision')}
        />
        <TuileStat libelle={t('nav_utilisateurs')} valeur={comptes ?? 0} />
      </GrilleStats>

      <h2 className="ko-h3 mb-4 mt-12 text-[22px] text-ko-ink">{t('recentes')}</h2>

      <PanneauAdmin sansPadding>
        {error ? (
          // Le message technique n'est PAS affiché : il révélerait noms de
          // tables et politiques. Il part dans les journaux du serveur.
          <p className="p-6 text-base text-ko-ink">{t('erreur_lecture')}</p>
        ) : !recentes || recentes.length === 0 ? (
          <p className="p-6 text-base leading-relaxed text-ko-muted">{t('aucune_demande')}</p>
        ) : (
          <>
            <EnteteTableau
              colonnes={[t('colonne_courriel'), t('colonne_type'), t('colonne_cree')]}
            />
            <ul className="divide-y divide-ko-line">
              {recentes.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-col gap-1.5 px-6 py-4 sm:flex-row sm:items-baseline sm:gap-6"
                >
                  <span className="min-w-0 flex-1 truncate text-base text-ko-ink">
                    {d.nom} — {d.email}
                  </span>
                  <span className="label-mono shrink-0 text-ko-blue sm:w-24">{d.type}</span>
                  <span className="shrink-0 font-mono text-xs text-ko-muted sm:w-40 sm:text-right">
                    {format.dateTime(new Date(d.created_at), {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </PanneauAdmin>
    </>
  )
}
