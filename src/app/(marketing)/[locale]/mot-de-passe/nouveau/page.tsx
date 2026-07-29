import { hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { notFound, redirect } from 'next/navigation'

import { CadreAuth, EncartAuth } from '@/components/sections/CadreAuth'
import { FormulaireNouveauMotDePasse } from '@/components/sections/FormulairesCompte'
import { routing } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'

import type { Metadata } from 'next'

type Props = { params: Promise<{ locale: string }> }

/**
 * Choix d'un nouveau mot de passe, après clic sur le lien reçu par courriel.
 *
 * ---------------------------------------------------------------------------
 * CE QUI PROTÈGE CETTE PAGE
 *
 * Rien dans l'URL : ni jeton, ni identifiant. Le lien du courriel passe
 * d'abord par /api/auth/confirmer, qui échange le code contre une SESSION.
 * Cette page se contente donc de vérifier qu'une session existe.
 *
 * C'est plus solide qu'un jeton dans l'URL, qui se retrouve dans l'historique
 * du navigateur, dans les journaux du serveur et dans l'en-tête Referer envoyé
 * à la première ressource externe chargée.
 *
 * L'écriture elle-même (updateUser) n'agit que sur la session en cours : sans
 * elle, l'action échoue. Personne ne change un mot de passe sans avoir prouvé
 * qu'il relève la boîte.
 * ---------------------------------------------------------------------------
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations({ locale, namespace: 'MotDePasse' })
  return { title: t('nouveau_titre'), robots: { index: false, follow: false } }
}

export default async function NouveauMotDePassePage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations('MotDePasse')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Arrivée sans être passé par le lien : rien à changer, on renvoie à la
  // demande plutôt que d'afficher un formulaire qui échouerait à l'envoi.
  if (!user) redirect(`/${locale}/connexion?lien=invalide`)

  return (
    <CadreAuth titre={t('nouveau_titre')} intro={t('nouveau_intro')}>
      <EncartAuth titre={t('courriel')} texte={user.email ?? ''} />
      <FormulaireNouveauMotDePasse
        locale={locale}
        libelles={{
          motDePasse: t('mot_de_passe'),
          aideMotDePasse: t('aide_mot_de_passe'),
          confirmation: t('confirmation'),
          enregistrer: t('enregistrer'),
          enCours: t('enregistrement'),
          erreurDonnees: t('erreur_donnees'),
          erreurServeur: t('erreur_serveur'),
        }}
      />
    </CadreAuth>
  )
}
