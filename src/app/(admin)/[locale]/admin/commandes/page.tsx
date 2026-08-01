import { hasLocale } from 'next-intl'
import { getFormatter, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { EnteteAdmin, PanneauAdmin } from '@/components/layout/CadreAdmin'
import { TableauCommandes } from '@/components/sections/TableauCommandes'
import { routing } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import { STATUTS_COMMANDE } from '@/types'

type Props = { params: Promise<{ locale: string }> }

/**
 * Commandes — table commandes, migration 0021.
 *
 * Tout passe par le client de SESSION, comme /admin/demandes : les politiques
 * `commandes_lecture_equipe` / `lignes_commande_lecture_equipe` (0021)
 * décident, admin et editor lisent et changent le statut, personne ne
 * supprime — `annulee` est un statut, pas une suppression.
 */
export default async function CommandesPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations('Admin')
  const format = await getFormatter({ locale })
  const supabase = await createClient()

  const [{ data: commandes, error }, { data: lignes }] = await Promise.all([
    supabase
      .from('commandes')
      .select('id, numero, nom, email, statut, mode_livraison, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('lignes_commande').select('commande_id, quantite, prix_indicatif'),
  ])

  if (error) {
    // Même distinction que /admin/videos : une migration en attente n'est pas
    // une panne, et le message doit dire quoi faire.
    const migrationManquante = error.code === 'PGRST205'
    return (
      <>
        <EnteteAdmin titre={t('commandes_titre')} />
        <PanneauAdmin>
          <p className="text-base leading-relaxed text-ko-ink">
            {migrationManquante ? t('erreur_migration_commandes') : t('erreur_lecture_commandes')}
          </p>
        </PanneauAdmin>
      </>
    )
  }

  // Total indicatif par commande — calculé ici, une fois, plutôt que
  // recalculé dans le composant client à chaque rendu.
  const totauxParCommande = new Map<string, number>()
  for (const l of lignes ?? []) {
    if (l.prix_indicatif == null) continue
    totauxParCommande.set(
      l.commande_id,
      (totauxParCommande.get(l.commande_id) ?? 0) + l.prix_indicatif * l.quantite,
    )
  }

  const libellesStatuts: Record<string, string> = Object.fromEntries(
    STATUTS_COMMANDE.map((s) => [s, t(`commande_statut_${s}`)]),
  )

  const donnees = (commandes ?? []).map((c) => ({
    ...c,
    totalIndicatif: totauxParCommande.get(c.id) ?? null,
    dateFormatee: format.dateTime(new Date(c.created_at), { dateStyle: 'medium', timeStyle: 'short' }),
  }))

  return (
    <>
      <EnteteAdmin titre={t('commandes_titre')} intro={t('commandes_intro')} />

      <TableauCommandes
        locale={locale}
        commandes={donnees}
        libelles={{ statuts: libellesStatuts }}
        textes={{
          vide: t('commandes_vide'),
          colonneNumero: t('colonne_numero'),
          colonneClient: t('colonne_client'),
          colonneStatut: t('colonne_statut'),
          colonneLivraison: t('colonne_livraison'),
          colonneTotal: t('colonne_total'),
          colonneCree: t('colonne_cree'),
          totalSurDemande: t('commande_total_sur_demande'),
        }}
      />
    </>
  )
}
