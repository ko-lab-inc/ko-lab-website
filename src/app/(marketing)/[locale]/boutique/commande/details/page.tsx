import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound, redirect } from 'next/navigation'

import { FormulaireDetailsCommande } from '@/components/sections/FormulaireDetailsCommande'
import { routing } from '@/i18n/routing'
import { ROUTES } from '@/lib/routes'
import { createClient } from '@/lib/supabase/server'

import type { Metadata } from 'next'

type Props = { params: Promise<{ locale: string }> }

/**
 * Étape 2 de la commande — téléphone, organisation, mode de livraison,
 * adresse si expédition. Parcours simplifié (Christian, revu le 1er août
 * 2026) : /boutique/demande ne montre plus qu'un récapitulatif et un bouton ;
 * cette page vient APRÈS la connexion, jamais avant.
 *
 * ---------------------------------------------------------------------------
 * ACCÈS PAR SESSION, MÊME GARDE QUE /compte/commandes
 *
 * `getUser()` puis redirection vers /connexion avec `suivant` pointant vers
 * CETTE page si absent — exactement le chemin qu'une personne anonyme
 * emprunte depuis le bouton « Confirmer ma commande » de PagePanier, et
 * celui que /connexion et /inscription savent maintenant honorer pour un
 * compte 'client' (voir connexion/actions.ts).
 *
 * Nom et courriel ne sont PAS lus ici : FormulaireDetailsCommande ne les
 * demande plus, creerCommande les tire de la session au moment d'écrire.
 * ---------------------------------------------------------------------------
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations({ locale, namespace: 'Commande' })
  return {
    title: t('details_titre'),
    description: t('details_intro'),
    robots: { index: false, follow: false },
  }
}

export default async function DetailsCommandePage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(
      `/${locale}${ROUTES.connexion}?suivant=${encodeURIComponent(`/${locale}${ROUTES.boutiqueCommandeDetails}`)}`,
    )
  }

  const t = await getTranslations('Commande')

  return (
    <>
      <section className="border-b border-ko-line bg-ko-cream pb-14 pt-28 lg:pb-20 lg:pt-40">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          <span aria-hidden="true" className="block h-px w-8 bg-ko-blue" />
          <h1 className="ko-display mt-6 max-w-[20ch] text-ko-ink">{t('details_titre')}</h1>
          <p className="mt-7 max-w-[54ch] text-base leading-relaxed text-ko-muted lg:text-lg">
            {t('details_intro')}
          </p>
        </div>
      </section>

      <section className="bg-ko-white py-16 lg:py-24">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          <FormulaireDetailsCommande locale={locale} />
        </div>
      </section>
    </>
  )
}
