import { hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { FormulaireConnexion } from '@/components/sections/FormulaireConnexion'
import { buttonVariants } from '@/components/ui/Button'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { ROUTES } from '@/lib/routes'

import type { Metadata } from 'next'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ suivant?: string; refus?: string }>
}

/**
 * Connexion à l'espace équipe.
 *
 * Rendu dynamique par nature : la page lit `searchParams` et le proxy y
 * redirige avec des paramètres. Aucun `setRequestLocale` de prérendu ici,
 * contrairement aux pages du site vitrine.
 *
 * ⚠️ Pas d'inscription. Les comptes se créent par invitation depuis l'espace
 * admin : l'inscription publique est fermée côté Supabase, et un compte créé
 * autrement arriverait en 'invite', sans aucun droit (migration 0004).
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations({ locale, namespace: 'Connexion' })

  return {
    title: t('titre'),
    description: t('intro'),
    // Un accès interne n'a rien à faire dans un index de moteur de recherche,
    // et suivre ses liens n'apporterait rien non plus.
    robots: { index: false, follow: false },
  }
}

export default async function ConnexionPage({ params, searchParams }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const { suivant, refus } = await searchParams
  const t = await getTranslations('Connexion')

  return (
    <section className="flex min-h-[70svh] items-center bg-ko-cream py-24 lg:py-32">
      <div className="mx-auto w-full max-w-container px-6 lg:px-12">
        <div className="max-w-[42ch]">
          <span aria-hidden="true" className="block h-px w-8 bg-ko-blue" />
          <h1 className="ko-display mt-6 text-ko-ink">{t('titre')}</h1>
          <p className="mt-6 text-base leading-relaxed text-ko-muted">{t('intro')}</p>

          {/* Renvoi du proxy pour cause de rôle insuffisant. La personne EST
              connectée : sans ce message elle réessaierait ses identifiants
              en boucle, alors que le problème est ailleurs. */}
          {refus === 'role' && (
            <div className="mt-8 border border-ko-line bg-ko-white p-5">
              <p className="label-mono text-ko-blue">{t('refus_role_titre')}</p>
              <p className="mt-2.5 text-sm leading-relaxed text-ko-ink">{t('refus_role_texte')}</p>
            </div>
          )}

          <FormulaireConnexion
            locale={locale}
            suivant={suivant}
            libelles={{
              courriel: t('courriel'),
              motDePasse: t('mot_de_passe'),
              seConnecter: t('se_connecter'),
              enCours: t('en_cours'),
              erreurIdentifiants: t('erreur_identifiants'),
              erreurTentatives: t('erreur_tentatives'),
              erreurServeur: t('erreur_serveur'),
            }}
          />

          <p className="mt-6 text-sm leading-relaxed text-ko-muted">{t('pas_de_compte')}</p>

          <Link href={ROUTES.accueil} className={`mt-8 ${buttonVariants({ variant: 'text' })}`}>
            {t('retour')}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
