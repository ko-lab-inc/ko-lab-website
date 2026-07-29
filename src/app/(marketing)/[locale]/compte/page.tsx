import { hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { notFound, redirect } from 'next/navigation'

import { CadreAuth, EncartAuth } from '@/components/sections/CadreAuth'
import { buttonVariants } from '@/components/ui/Button'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { ROLES_EQUIPE } from '@/types'

import type { Metadata } from 'next'

type Props = { params: Promise<{ locale: string }> }

/**
 * Où atterrit un compte ordinaire après connexion ou validation d'adresse.
 *
 * Sans cette page, un compte 'invite' — c'est-à-dire tout compte fraîchement
 * créé — n'avait nulle part où aller : /admin le refuse, et le renvoyer sur la
 * page de connexion alors qu'il vient de se connecter se lit comme une panne.
 * Il voit ici que son compte fonctionne, et ce qui lui manque.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations({ locale, namespace: 'Compte' })
  return { title: t('titre'), robots: { index: false, follow: false } }
}

export default async function ComptePage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations('Compte')
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/${locale}/connexion?suivant=/${locale}/compte`)

  const { data: profil } = await supabase
    .from('profils')
    .select('role')
    .eq('id', user.id)
    .single()

  const equipe = !!profil && ROLES_EQUIPE.some((r) => r === profil.role)

  return (
    <CadreAuth titre={t('titre')} intro={t('intro')}>
      <EncartAuth titre={t('courriel')} texte={user.email ?? ''} />
      <EncartAuth
        titre={t('statut')}
        texte={equipe ? t('statut_equipe') : t('statut_invite')}
      />

      <div className="mt-8 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-8">
        {equipe && (
          <Link href="/admin" className={buttonVariants({ variant: 'primary' })}>
            {t('aller_admin')}
            <span aria-hidden="true">→</span>
          </Link>
        )}

        {/* Server Action en ligne : la déconnexion n'a besoin d'aucun état
            client, un <form> suffit et fonctionne sans JavaScript. */}
        <form
          action={async () => {
            'use server'
            const client = await createClient()
            await client.auth.signOut()
            redirect(`/${locale}${ROUTES.connexion}`)
          }}
        >
          <button type="submit" className={buttonVariants({ variant: 'text' })}>
            {t('deconnexion')}
            <span aria-hidden="true">→</span>
          </button>
        </form>
      </div>

      <Link
        href={ROUTES.accueil}
        className="mt-8 inline-flex min-h-[44px] items-center gap-2 text-sm text-ko-muted transition-colors duration-200 hover:text-ko-ink"
      >
        {t('retour')}
        <span aria-hidden="true">→</span>
      </Link>
    </CadreAuth>
  )
}
