import { hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { CadreAuth, EncartAuth } from '@/components/sections/CadreAuth'
import { FormulaireConnexion } from '@/components/sections/FormulaireConnexion'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { ROUTES } from '@/lib/routes'

import type { Metadata } from 'next'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    suivant?: string
    refus?: string
    lien?: string
    motdepasse?: string
  }>
}

/**
 * Connexion.
 *
 * ⚠️ Ce n'était pas ça il y a une heure. La page s'intitulait « Espace équipe »
 * et annonçait des comptes sur invitation ; Christian a tranché pour un
 * parcours ordinaire — on se connecte, sinon on crée un compte et on valide
 * son adresse. L'icône de profil de la nav tombait donc sur une page qui
 * parlait d'administration, ce qui n'avait aucun sens pour un visiteur.
 *
 * Ce que ça ne change PAS : un compte créé arrive en 'client' et n'ouvre
 * aucune donnée (migration 0004). L'espace de gestion reste conditionné à une
 * élévation manuelle.
 *
 * Rendu dynamique par nature : la page lit `searchParams`.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations({ locale, namespace: 'Connexion' })
  return { title: t('titre'), description: t('intro'), robots: { index: false, follow: false } }
}

export default async function ConnexionPage({ params, searchParams }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const { suivant, refus, lien, motdepasse } = await searchParams
  const t = await getTranslations('Connexion')
  const tMdp = await getTranslations('MotDePasse')

  return (
    <CadreAuth titre={t('titre')} intro={t('intro')}>
      {/* Renvoi du proxy pour rôle insuffisant. La personne EST connectée :
          sans ce message elle réessaierait ses identifiants en boucle. */}
      {refus === 'role' && (
        <EncartAuth titre={t('refus_role_titre')} texte={t('refus_role_texte')} />
      )}

      {/* Retour de /api/auth/confirmer quand le code est expiré, déjà consommé,
          ou ouvert dans un autre navigateur que celui de la demande. */}
      {lien === 'invalide' && (
        <EncartAuth titre={tMdp('lien_invalide_titre')} texte={tMdp('lien_invalide_texte')} />
      )}

      {motdepasse === 'change' && (
        <p className="mt-8 text-base leading-relaxed text-ko-ink">{t('mot_de_passe_change')}</p>
      )}

      <FormulaireConnexion
        locale={locale}
        suivant={suivant}
        libelles={{
          courriel: t('courriel'),
          motDePasse: t('mot_de_passe'),
            afficherMotDePasse: t('afficher_mot_de_passe'),
            masquerMotDePasse: t('masquer_mot_de_passe'),
          seConnecter: t('se_connecter'),
          enCours: t('en_cours'),
          erreurIdentifiants: t('erreur_identifiants'),
          erreurTentatives: t('erreur_tentatives'),
          erreurServeur: t('erreur_serveur'),
        }}
      />

      <div className="mt-6 flex flex-col gap-2 text-sm">
        <Link
          href={ROUTES.motDePasseOublie}
          className="text-ko-muted underline-offset-4 transition-colors duration-200 hover:text-ko-ink hover:underline"
        >
          {t('mot_de_passe_oublie')}
        </Link>
        <p className="text-ko-muted">
          {t('pas_encore')}{' '}
          <Link
            // Même report qu'en sens inverse (voir inscription/page.tsx) :
            // quelqu'un venu commander qui n'a PAS encore de compte ne doit
            // pas atterrir sur /compte une fois inscrit.
            href={suivant ? `${ROUTES.inscription}?suivant=${encodeURIComponent(suivant)}` : ROUTES.inscription}
            className="text-ko-ink underline-offset-4 transition-colors duration-200 hover:underline hover:decoration-ko-blue"
          >
            {t('creer_compte')}
          </Link>
        </p>
      </div>
    </CadreAuth>
  )
}
