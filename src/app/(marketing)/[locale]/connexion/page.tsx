import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { buttonVariants } from '@/components/ui/Button'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { ROUTES } from '@/lib/routes'

import type { Metadata } from 'next'

type Props = { params: Promise<{ locale: string }> }

/**
 * Espace équipe — porte d'entrée de la partie administration.
 *
 * ---------------------------------------------------------------------------
 * PAGE D'ATTENTE, PAS UN FORMULAIRE DE CONNEXION
 *
 * Aucun champ courriel/mot de passe n'est rendu ici, et c'est délibéré.
 * L'authentification Supabase, les rôles du skill 24 et le tableau de bord
 * arrivent dans le chantier administration. Afficher dès maintenant un
 * formulaire qui ne connecte à rien reviendrait à demander un mot de passe
 * sans rien en faire — le pire des deux mondes : le visiteur croit s'être
 * trompé d'identifiants, et le champ finit indexé comme une vraie page de
 * connexion.
 *
 * À l'arrivée de l'authentification, c'est ce fichier qui reçoit le
 * formulaire, et le middleware qui protège /admin.
 * ---------------------------------------------------------------------------
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

export default async function ConnexionPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations('Connexion')

  return (
    <section className="flex min-h-[70svh] items-center bg-ko-cream py-24 lg:py-32">
      <div className="mx-auto w-full max-w-container px-6 lg:px-12">
        <div className="max-w-[46ch]">
          <span aria-hidden="true" className="block h-px w-8 bg-ko-blue" />
          <h1 className="ko-display mt-6 text-ko-ink">{t('titre')}</h1>
          <p className="mt-7 text-base leading-relaxed text-ko-muted lg:text-lg">{t('intro')}</p>

          <div className="mt-10 border border-ko-line bg-ko-white p-6 lg:p-8">
            <p className="label-mono text-ko-blue">{t('statut_titre')}</p>
            <p className="mt-3 text-base leading-relaxed text-ko-ink">{t('statut_texte')}</p>
          </div>

          <Link href={ROUTES.accueil} className={`mt-10 ${buttonVariants({ variant: 'text' })}`}>
            {t('retour')}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
