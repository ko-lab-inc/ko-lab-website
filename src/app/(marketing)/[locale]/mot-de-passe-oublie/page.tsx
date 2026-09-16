import { hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { CadreAuth } from '@/components/sections/CadreAuth'
import { FormulaireOubli } from '@/components/sections/FormulairesCompte'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { ROUTES } from '@/lib/routes'

import type { Metadata, Viewport } from 'next'

/**
 * THÈME SOMBRE — migration page par page (méthode de 73255f2, accueil).
 * Importé ICI et non dans le layout : App Router ne charge le CSS d'une page
 * que sur sa route, et ses règles sont toutes préfixées par
 * `body:has([data-theme-sombre])`, le marqueur rendu plus bas.
 */
import '@/styles/theme-sombre.css'

type Props = { params: Promise<{ locale: string }> }

/**
 * Demande de réinitialisation de mot de passe.
 *
 * L'écran de succès s'affiche que l'adresse existe ou non — c'est
 * indispensable, pas de la prudence excessive : un formulaire qui répondrait
 * « adresse inconnue » deviendrait un outil pour découvrir qui a un compte
 * chez KO-LAB, une adresse à la fois.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations({ locale, namespace: 'MotDePasse' })
  return {
    title: t('oubli_titre'),
    description: t('oubli_intro'),
    robots: { index: false, follow: false },
  }
}

/** Barre du navigateur mobile assortie au fond sombre — voir theme-sombre.css. */
export const viewport: Viewport = {
  themeColor: '#111210',
}

export default async function MotDePasseOubliePage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations('MotDePasse')

  return (
    <div data-theme-sombre>
      <CadreAuth titre={t('oubli_titre')} intro={t('oubli_intro')}>
        <FormulaireOubli
          locale={locale}
          libelles={{
            courriel: t('courriel'),
            envoyer: t('envoyer'),
            enCours: t('envoi'),
            succesTitre: t('oubli_succes_titre'),
            succesTexte: t('oubli_succes_texte'),
            erreurTentatives: t('erreur_tentatives'),
            erreurServeur: t('erreur_serveur'),
          }}
        />

        <Link
          href={ROUTES.connexion}
          className="mt-6 inline-flex min-h-[44px] items-center gap-2 text-sm text-ko-muted transition-colors duration-200 hover:text-ko-ink"
        >
          <span aria-hidden="true">←</span>
          {t('retour_connexion')}
        </Link>
      </CadreAuth>
    </div>
  )
}
