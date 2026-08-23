import { hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { EnteteAdmin } from '@/components/layout/CadreAdmin'
import { FormulaireReglages } from '@/components/sections/FormulaireReglages'
import { routing } from '@/i18n/routing'
import { lireReglages } from '@/lib/reglages'

type Props = { params: Promise<{ locale: string }> }

/**
 * Réglages du site.
 *
 * ---------------------------------------------------------------------------
 * CE QUI EST MODIFIABLE ICI, ET CE QUI NE L'EST PAS
 *
 * Ce qui l'est : les coordonnées, et les trois drapeaux qui ouvrent ou
 * ferment une partie du site. Ce sont précisément les réglages qui doivent
 * pouvoir bouger sans développeur — avant, changer une adresse de courriel
 * demandait un commit et un déploiement, et fermer la boutique passait par
 * une variable d'environnement Vercel que seul Moussa pouvait toucher.
 *
 * Ce qui ne l'est pas : les textes du site. La page le dit explicitement
 * plutôt que de laisser chercher.
 *
 * ⚠️ Sans la migration 0011, l'écran s'affiche avec les valeurs de repli et
 * l'enregistrement échoue proprement en annonçant pourquoi. C'est préférable
 * à une page qui refuse de se charger : le reste de l'administration reste
 * utilisable.
 *
 * ⚠️ 0029 AUSSI, PAS SEULEMENT POUR boutique_active. L'action d'enregistrement
 * met à jour les trois drapeaux en une seule fois (`Promise.all`) et échoue
 * en bloc si UNE SEULE clé ne trouve aucune ligne à modifier (voir
 * actions.ts) — sans 0029, ENREGISTRER NE FAIT PLUS RIEN DU TOUT, y compris
 * pour les coordonnées de contact, tant que 0029 n'a pas tourné.
 * ---------------------------------------------------------------------------
 */
export default async function Page({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations('Admin')
  const reglages = await lireReglages()

  return (
    <>
      <EnteteAdmin titre={t('reglages_titre')} />

      <p className="mb-8 max-w-[70ch] text-base leading-relaxed text-ko-muted">
        {t('reglages_intro')}
      </p>

      <FormulaireReglages
        locale={locale}
        reglages={reglages}
        libelles={{
          groupeContact: t('reglages_groupe_contact'),
          groupeContactAide: t('reglages_groupe_contact_aide'),
          groupeFonctions: t('reglages_groupe_fonctions'),
          groupeFonctionsAide: t('reglages_groupe_fonctions_aide'),
          courriel: t('reglages_courriel'),
          courrielAide: t('reglages_courriel_aide'),
          telephone: t('reglages_telephone'),
          telephoneAide: t('reglages_telephone_aide'),
          region: t('reglages_region'),
          regionAide: t('reglages_region_aide'),
          panier: t('reglages_panier'),
          panierAide: t('reglages_panier_aide'),
          modulaires: t('reglages_modulaires'),
          modulairesAide: t('reglages_modulaires_aide'),
          boutiqueActive: t('reglages_boutique_active'),
          boutiqueActiveAide: t('reglages_boutique_active_aide'),
          concoursActif: t('reglages_concours_actif'),
          concoursActifAide: t('reglages_concours_actif_aide'),
          enregistrer: t('reglages_enregistrer'),
          enCours: t('reglages_en_cours'),
          succes: t('reglages_succes'),
          erreurDonnees: t('reglages_erreur_donnees'),
          erreurRefuse: t('reglages_erreur_refuse'),
          erreurServeur: t('reglages_erreur_serveur'),
        }}
      />

      {/* Dire ce que l'écran NE fait pas évite la recherche inutile. Sans
          cette note, on ouvre les réglages en cherchant où changer le titre
          d'une page, et on repart sans réponse. */}
      <section className="mt-10 max-w-[640px] border-l-2 border-ko-line pl-5">
        <h2 className="label-mono text-ko-muted">{t('reglages_textes_titre')}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ko-muted">{t('reglages_textes')}</p>
      </section>
    </>
  )
}
