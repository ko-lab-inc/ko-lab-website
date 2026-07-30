import { hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { ListeProfils } from '@/components/sections/ListeProfils'
import { routing } from '@/i18n/routing'

type Props = { params: Promise<{ locale: string }> }

/**
 * Écran de gestion — même moteur que les deux autres listes de comptes, seul
 * le filtre de rôle change. Voir ListeProfils pour le détail du RLS et du
 * pourquoi ces trois pages partagent une seule requête.
 */
export default async function Page({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations('Admin')

  return (
    <ListeProfils
      locale={locale}
      titre={t('livreurs_titre')}
      intro={t('livreurs_intro')}
      roles={['livreur']}
      vide={t('livreurs_vide')}
    />
  )
}
