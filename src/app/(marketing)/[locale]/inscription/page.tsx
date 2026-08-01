import { hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { CadreAuth } from '@/components/sections/CadreAuth'
import { FormulaireInscription } from '@/components/sections/FormulairesCompte'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { ROUTES } from '@/lib/routes'

import type { Metadata } from 'next'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ suivant?: string }>
}

/**
 * Création de compte.
 *
 * L'inscription est ouverte à tous, et c'est sans risque : le trigger
 * on_auth_user_created crée le profil avec le rôle par défaut, qui vaut
 * 'client' depuis la migration 0004 — aucune politique RLS ne lui correspond.
 * Un compte tout neuf n'ouvre donc aucune donnée tant qu'un admin ne l'a pas
 * élevé. C'est précisément ce qui permet d'accepter l'inscription publique
 * sans rouvrir l'élévation de privilège corrigée par 0004.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations({ locale, namespace: 'Inscription' })
  return { title: t('titre'), description: t('intro'), robots: { index: false, follow: false } }
}

export default async function InscriptionPage({ params, searchParams }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const { suivant } = await searchParams
  const t = await getTranslations('Inscription')

  return (
    <CadreAuth titre={t('titre')} intro={t('intro')}>
      <FormulaireInscription
        locale={locale}
        suivant={suivant}
        libelles={{
          courriel: t('courriel'),
          motDePasse: t('mot_de_passe'),
          aideMotDePasse: t('aide_mot_de_passe'),
            afficher: t('afficher_mot_de_passe'),
            masquer: t('masquer_mot_de_passe'),
          confirmation: t('confirmation'),
          creer: t('creer'),
          enCours: t('en_cours'),
          succesTitre: t('succes_titre'),
          succesTexte: t('succes_texte'),
          erreurDonnees: t('erreur_donnees'),
          erreurConfirmation: t('erreur_confirmation'),
          erreurFaible: t('erreur_faible'),
          erreurTentatives: t('erreur_tentatives'),
          erreurRefuse: t('erreur_refuse'),
          erreurCourriel: t('erreur_courriel'),
          erreurServeur: t('erreur_serveur'),
        }}
      />

      <p className="mt-6 text-sm text-ko-muted">
        {t('deja_compte')}{' '}
        <Link
          // `suivant` reporté sur ce lien : quelqu'un venu ici pour commander
          // mais qui a DÉJÀ un compte ne doit pas perdre sa destination en
          // choisissant de se connecter plutôt que de s'inscrire.
          href={suivant ? `${ROUTES.connexion}?suivant=${encodeURIComponent(suivant)}` : ROUTES.connexion}
          className="text-ko-blue underline-offset-4 transition-colors duration-200 hover:underline"
        >
          {t('se_connecter')}
        </Link>
      </p>
    </CadreAuth>
  )
}
