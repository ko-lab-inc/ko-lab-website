import { hasLocale } from 'next-intl'
import { getFormatter, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { EnteteAdmin, PanneauAdmin } from '@/components/layout/CadreAdmin'
import { TableauDemandes } from '@/components/sections/TableauDemandes'
import { routing } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import { STATUTS_DEMANDE, TYPES_DEMANDE } from '@/types'

type Props = { params: Promise<{ locale: string }> }

/**
 * Gestion des demandes — table demandes_contact.
 *
 * ---------------------------------------------------------------------------
 * TOUT PASSE PAR LE RLS
 *
 * Lecture et écriture utilisent le client de SESSION. Les politiques de 0002
 * décident : admin et editor lisent et changent le statut, seul l'admin
 * supprime. Le bouton de suppression n'est masqué à l'editor que par confort
 * d'affichage — la garantie est dans la politique, pas dans ce fichier.
 *
 * Aucune donnée personnelle ne transite par un client Supabase autre que
 * celui-ci : jamais la service role key, qui contournerait le RLS et
 * afficherait ici des demandes qu'un editor n'a peut-être pas le droit de voir.
 * ---------------------------------------------------------------------------
 */
export default async function DemandesPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations('Admin')
  const format = await getFormatter({ locale })
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: demandes, error }, { data: moi }] = await Promise.all([
    supabase
      .from('demandes_contact')
      .select('id, type, nom, email, telephone, organisation, message, statut, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('profils').select('role').eq('id', user?.id ?? '').maybeSingle(),
  ])

  const estAdmin = moi?.role === 'admin'

  const libellesTypes: Record<string, string> = Object.fromEntries(
    TYPES_DEMANDE.map((v) => [v, t(`type_${v}`)]),
  )
  const libellesStatuts: Record<string, string> = Object.fromEntries(
    STATUTS_DEMANDE.map((v) => [v, t(`statut_${v}`)]),
  )

  if (error) {
    return (
      <>
        <EnteteAdmin titre={t('demandes_titre')} />
        {/* Le message technique reste dans les journaux : il nomme des tables
            et des politiques. */}
        <PanneauAdmin>
          <p className="text-base text-ko-ink">{t('erreur_lecture')}</p>
        </PanneauAdmin>
      </>
    )
  }

  // Date formatée UNE fois ici, jamais une fonction transmise au client — voir
  // le plantage documenté dans TableauRealisations.tsx (imagesCompte).
  const donnees = (demandes ?? []).map((d) => ({
    ...d,
    dateFormatee: format.dateTime(new Date(d.created_at), {
      dateStyle: 'medium',
      timeStyle: 'short',
    }),
  }))

  return (
    <>
      <EnteteAdmin titre={t('demandes_titre')} intro={t('demandes_intro')} />

      <TableauDemandes
        locale={locale}
        demandes={donnees}
        estAdmin={estAdmin}
        libelles={{
          types: libellesTypes,
          statuts: libellesStatuts,
        }}
        textes={{
          vide: t('aucune_demande'),
          videFiltre: t('demandes_vide_filtre'),
          rechercheLabel: t('demandes_recherche_label'),
          recherchePlaceholder: t('demandes_recherche_placeholder'),
          tousTypes: t('demandes_tous_types'),
          tousStatuts: t('demandes_tous_statuts'),
          colonneNom: t('colonne_nom'),
          colonneCourriel: t('colonne_courriel'),
          colonneType: t('colonne_type'),
          colonneStatut: t('colonne_statut'),
          colonneCree: t('colonne_cree'),
          colonneTelephone: t('colonne_telephone'),
          colonneOrganisation: t('colonne_organisation'),
          colonneMessage: t('colonne_message'),
          voir: t('action_voir'),
          supprimer: t('supprimer'),
          confirmer: t('confirmer_suppression_demande'),
          fermer: t('fermer'),
          titreDetail: t('demandes_titre_detail'),
          pageGabarit: t('page_gabarit'),
          pagePrecedente: t('page_precedente'),
          pageSuivante: t('page_suivante'),
        }}
      />
    </>
  )
}
