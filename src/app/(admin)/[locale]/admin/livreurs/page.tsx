import { hasLocale } from 'next-intl'
import { getFormatter, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { ListeProfils } from '@/components/sections/ListeProfils'
import { RepertoireLivreurs } from '@/components/sections/RepertoireLivreurs'
import { routing } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'

type Props = { params: Promise<{ locale: string }> }

/**
 * Le seul poste réel dont le titre désigne un chauffeur-livreur (0017).
 *
 * ⚠️ Comparaison EXACTE sur ce libellé, pas sur une catégorie dédiée :
 * `postes_carrieres` n'a pas de colonne qui distingue « ce poste correspond au
 * rôle livreur » — `type` y décrit le régime d'emploi (temps plein, contrat…),
 * pas le métier. `candidatures.postes` stocke les intitulés cochés sur le
 * formulaire, mot pour mot. Si ce poste est un jour renommé depuis
 * /admin/carrieres, cette constante doit suivre.
 */
const POSTE_LIVREUR = 'Chauffeur-livreur'

/**
 * Écran de gestion — deux sources bien distinctes.
 *
 * ---------------------------------------------------------------------------
 * COMPTES RÉELS, PUIS CANDIDATURES RETENUES
 *
 * `ListeProfils` reste le moteur partagé avec Utilisateurs et Vendeurs — un
 * compte avec identifiants et rôle. Elle n'est pas touchée par ce qui suit.
 *
 * En dessous, un second bloc SANS RAPPORT avec les comptes : les candidatures
 * dont le statut est passé à « traité » et qui visaient le poste de
 * chauffeur-livreur. Décision de Christian, motivée par un besoin de
 * recrutement immédiat : on doit pouvoir répertorier un livreur retenu sans
 * lui fabriquer un accès de connexion qu'il n'a jamais demandé. Voir
 * RepertoireLivreurs pour le détail.
 * ---------------------------------------------------------------------------
 */
export default async function Page({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations('Admin')
  const format = await getFormatter({ locale })
  const supabase = await createClient()

  // Même RLS que l'écran Candidatures (candidatures_lecture_equipe) : client
  // de session, jamais la service role key.
  const { data: candidatures } = await supabase
    .from('candidatures')
    .select('id, nom, telephone, email, ville, created_at')
    .eq('statut', 'traite')
    .contains('postes', [POSTE_LIVREUR])
    .order('created_at', { ascending: false })

  const candidats = (candidatures ?? []).map((c) => ({
    ...c,
    dateFormatee: format.dateTime(new Date(c.created_at), { dateStyle: 'medium' }),
  }))

  return (
    <>
      <ListeProfils
        locale={locale}
        titre={t('livreurs_titre')}
        intro={t('livreurs_intro')}
        roles={['livreur']}
        vide={t('livreurs_vide')}
      />

      <div className="mt-10">
        <RepertoireLivreurs
          candidats={candidats}
          titre={t('livreurs_candidats_titre')}
          intro={t('livreurs_candidats_intro')}
          vide={t('livreurs_candidats_vide')}
          colonnes={[t('colonne_nom'), t('colonne_telephone'), t('colonne_ville'), t('colonne_cree')]}
        />
      </div>
    </>
  )
}
