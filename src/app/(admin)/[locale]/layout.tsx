import { hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { Fraunces, Instrument_Sans, JetBrains_Mono } from 'next/font/google'
import { notFound, redirect } from 'next/navigation'

import { NavAdmin } from '@/components/layout/NavAdmin'
import {
  IconeBadgeStock,
  IconeCamion,
  IconeEquipe,
  IconeEtiquette,
  IconeGalerie,
  IconeReglages,
  IconeTableauBord,
} from '@/components/ui/Icones'
import { routing } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import { ROLES_EQUIPE } from '@/types'

import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import '@/styles/globals.css'

/**
 * ROOT LAYOUT de l'espace équipe — rend son propre <html>.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI UN SECOND ROOT LAYOUT
 *
 * Le layout du site vitrine ((marketing)/[locale]/layout.tsx) porte la nav, le
 * pied de page, le panier et la bulle d'aide. Rien de tout ça n'a sa place
 * dans un outil de gestion : le fournisseur de panier chargerait du code
 * client inutile, et une nav publique inviterait à sortir de l'espace au
 * milieu d'une saisie.
 *
 * Sa propre note l'annonçait déjà : « une future section hors marketing
 * (ex. /admin) devra définir son propre root layout dans son propre groupe de
 * routes ». C'est celui-ci.
 * ---------------------------------------------------------------------------
 *
 * ⚠️ DOUBLE VÉRIFICATION DU RÔLE, ici ET dans le proxy.
 *
 * Ce n'est pas une redondance inutile. Le proxy ne s'exécute pas sur toutes
 * les invocations — rendus en cache, requêtes internes, et surtout toute
 * évolution future du `matcher` qui laisserait passer un chemin. Faire reposer
 * l'unique contrôle d'accès sur une expression régulière de configuration,
 * c'est accepter qu'une faute de frappe ouvre l'espace de gestion. Le proxy
 * offre la redirection propre ; ce layout offre la garantie.
 */

const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['opsz'],
  variable: '--font-serif',
  display: 'swap',
})
const instrumentSans = Instrument_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' })

type Props = { children: ReactNode; params: Promise<{ locale: string }> }

export const metadata: Metadata = {
  title: 'Espace équipe — KO-LAB',
  // Un outil interne n'a rien à faire dans un index. `nofollow` en plus :
  // inutile d'exposer la structure des écrans de gestion.
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const supabase = await createClient()

  // getUser() valide le jeton auprès de Supabase. getSession() se contenterait
  // de lire un cookie que le client peut fabriquer.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/${locale}/connexion?suivant=/${locale}/admin`)

  const { data: profil } = await supabase
    .from('profils')
    .select('role, email')
    .eq('id', user.id)
    .single()

  if (!profil || !ROLES_EQUIPE.some((r) => r === profil.role)) {
    redirect(`/${locale}/connexion?refus=role`)
  }

  const t = await getTranslations('Admin')

  const GROUPES = [
    {
      titre: t('section_gestion'),
      entrees: [
        {
          href: `/${locale}/admin`,
          label: t('nav_tableau'),
          icone: <IconeTableauBord taille={17} />,
        },
        {
          href: `/${locale}/admin/catalogue`,
          label: t('nav_catalogue'),
          icone: <IconeBadgeStock taille={17} />,
        },
        {
          href: `/${locale}/admin/realisations`,
          label: t('nav_realisations'),
          icone: <IconeGalerie taille={17} />,
        },
      ],
    },
    {
      titre: t('section_equipe'),
      entrees: [
        {
          href: `/${locale}/admin/utilisateurs`,
          label: t('nav_utilisateurs'),
          icone: <IconeEquipe taille={17} />,
        },
        {
          href: `/${locale}/admin/vendeurs`,
          label: t('nav_vendeurs'),
          icone: <IconeEtiquette taille={17} />,
        },
        {
          href: `/${locale}/admin/livreurs`,
          label: t('nav_livreurs'),
          icone: <IconeCamion taille={17} />,
        },
      ],
    },
    {
      titre: t('section_compte'),
      entrees: [
        {
          href: `/${locale}/admin/reglages`,
          label: t('nav_reglages'),
          icone: <IconeReglages taille={17} />,
        },
      ],
    },
  ]

  return (
    <html
      lang={locale}
      className={`${fraunces.variable} ${instrumentSans.variable} ${jetbrainsMono.variable}`}
    >
      {/*
        Barre latérale COLLÉE au bord gauche, sur toute la hauteur, et en-tête
        pleine largeur à sa droite. La version précédente enfermait les deux
        dans un `max-w-container` centré : la barre flottait au milieu du fond
        crème et laissait des marges vides partout, ce que Christian a relevé.

        Un outil de gestion prend toute la fenêtre — la colonne de lecture
        confortable du site vitrine n'a pas de sens devant un tableau.
      */}
      {/*
        `h-svh overflow-hidden` sur le body : la fenêtre ne défile plus, ce
        sont les deux colonnes qui gèrent leur propre défilement. Sans ça, la
        barre et l'en-tête remontaient avec la page et disparaissaient dès
        qu'on descendait dans le tableau de bord — relevé par Christian.

        Uniquement à partir de lg. Sous cette largeur la barre passe au-dessus
        du contenu et le document défile normalement : figer une colonne de
        240 px sur un téléphone ne laisserait rien à lire.
      */}
      <body className="flex min-h-svh flex-col bg-ko-cream font-sans antialiased lg:h-svh lg:flex-row lg:overflow-hidden">
        <aside className="shrink-0 border-b border-ko-line bg-ko-white lg:h-svh lg:w-60 lg:overflow-y-auto lg:border-b-0 lg:border-r">
          {/* Bloc d'identité en tête de la barre, comme la référence. */}
          <div className="flex items-baseline gap-3 border-b border-ko-line px-5 py-[19px]">
            <span className="font-mono text-sm font-medium uppercase tracking-[0.18em] text-ko-ink">
              KO-LAB
            </span>
            <span className="label-mono text-ko-blue">{t('espace')}</span>
          </div>

          <div className="px-4 py-6">
            {/* Href préfixés ICI, côté serveur : NavAdmin utilise le
                `next/link` natif, qui ne connaît pas la langue courante. */}
            <NavAdmin
              racine={`/${locale}/admin`}
              groupes={GROUPES}
            />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col lg:h-svh lg:overflow-hidden">
          <header className="shrink-0 border-b border-ko-line bg-ko-white">
            <div className="flex items-center justify-end gap-6 px-6 py-4 lg:px-8">
              {/* Le rôle est affiché : un editor qui ne comprend pas pourquoi
                  un bouton de suppression lui est refusé doit pouvoir le
                  constater sans ouvrir la base. Sur deux lignes plutôt qu'une
                  suite séparée par un point médian — une adresse longue et un
                  rôle collés se lisaient comme une seule chaîne. */}
              <span className="hidden text-right leading-tight sm:block">
                <span className="block text-sm text-ko-ink">{profil.email}</span>
                <span className="label-mono text-ko-blue">
                  {t(`role_${profil.role === 'admin' ? 'admin' : 'editor'}`)}
                </span>
              </span>

              {/* Server Action en ligne : la déconnexion n'a besoin d'aucun
                  état client, un <form> suffit et fonctionne sans JavaScript. */}
              <form
                action={async () => {
                  'use server'
                  const client = await createClient()
                  await client.auth.signOut()
                  redirect(`/${locale}/connexion`)
                }}
              >
                <button
                  type="submit"
                  className="min-h-[44px] border-b border-ko-line pb-0.5 text-sm text-ko-muted transition-colors duration-200 hover:border-ko-ink hover:text-ko-ink"
                >
                  {t('deconnexion')}
                </button>
              </form>
            </div>
          </header>

          {/* Seule zone qui défile : l'en-tête au-dessus et la barre à gauche
              restent en place. */}
          <main className="min-w-0 flex-1 px-6 py-8 lg:overflow-y-auto lg:px-8 lg:py-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
