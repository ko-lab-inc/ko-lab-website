import { hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { ListeProfils } from '@/components/sections/ListeProfils'
import { routing } from '@/i18n/routing'

import type { Viewport } from 'next'

/**
 * THÈME SOMBRE — migration page par page (méthode de 73255f2, accueil).
 * Importé ICI et non dans le layout : App Router ne charge le CSS d'une page
 * que sur sa route, et ses règles sont toutes préfixées par
 * `body:has([data-theme-sombre])`, le marqueur rendu plus bas.
 */
import '@/styles/theme-sombre.css'

type Props = { params: Promise<{ locale: string }> }

/**
 * Écran de gestion — même moteur que les deux autres listes de comptes, seul
 * le filtre de rôle change. Voir ListeProfils pour le détail du RLS et du
 * pourquoi ces trois pages partagent une seule requête.
 */
/** Barre du navigateur mobile assortie au fond sombre — voir theme-sombre.css. */
export const viewport: Viewport = {
  themeColor: '#111210',
}

export default async function Page({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations('Admin')

  return (
    <div data-theme-sombre>
      <ListeProfils
        locale={locale}
        titre={t('vendeurs_titre')}
        intro={t('vendeurs_intro')}
        roles={['vendeur']}
        vide={t('vendeurs_vide')}
      />
    </div>
  )
}
