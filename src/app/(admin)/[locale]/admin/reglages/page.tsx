import { hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { EnteteAdmin, SectionAVenir } from '@/components/layout/CadreAdmin'
import { routing } from '@/i18n/routing'

type Props = { params: Promise<{ locale: string }> }

/**
 * Section non construite — écran d'attente honnête.
 *
 * Il nomme la décision ou la donnée qui bloque, plutôt que d'afficher un
 * tableau vide qui se lirait comme une panne. Les trois points sont ce qu'il
 * faut trancher avant d'écrire la moindre ligne.
 *
 * Clés numérotées plutôt qu'un tableau : `AbstractIntlMessages` de next-intl
 * n'accepte que des chaînes ou des objets imbriqués, jamais un `string[]`.
 */
export default async function Page({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations('Admin')

  return (
    <>
      <EnteteAdmin titre={t('reglages_titre')} />
      <SectionAVenir
        etiquette={t('a_construire')}
        texte={t('reglages_texte')}
        points={[t('reglages_point_1'), t('reglages_point_2'), t('reglages_point_3')]}
      />
    </>
  )
}
