import { hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { Fraunces, Instrument_Sans, JetBrains_Mono } from 'next/font/google'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { NavAdmin } from '@/components/layout/NavAdmin'
import {
  IconeAccompagnement,
  IconeBadgeStock,
  IconeCamion,
  IconeEquipe,
  IconeEtiquette,
  IconeGalerie,
  IconeLecture,
  IconeMallette,
  IconePanier,
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
          href: `/${locale}/admin/demandes`,
          label: t('nav_demandes'),
          icone: <IconeAccompagnement taille={17} />,
        },
        {
          href: `/${locale}/admin/commandes`,
          label: t('nav_commandes'),
          icone: <IconePanier taille={17} />,
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
        {
          // Fusion de « Vidéos » et « Emplacements médias » (chacun un écran
          // séparé jusqu'ici) en un seul point d'entrée « Médias » à deux
          // sous-entrées — les deux gèrent le même genre de ressource
          // (photo/vidéo servie sur le site public), et neuf lignes de nav à
          // plat pour huit écrans + deux médias devenait dense.
          label: t('nav_medias'),
          icone: <IconeGalerie taille={17} />,
          sousEntrees: [
            {
              href: `/${locale}/admin/medias-emplacements`,
              label: t('nav_medias_emplacements'),
              icone: <IconeGalerie taille={17} />,
            },
            {
              href: `/${locale}/admin/videos`,
              label: t('nav_videos'),
              icone: <IconeLecture taille={17} />,
            },
          ],
        },
        {
          href: `/${locale}/admin/carrieres`,
          label: t('nav_carrieres'),
          icone: <IconeMallette taille={17} />,
        },
        {
          href: `/${locale}/admin/candidatures`,
          label: t('nav_candidatures'),
          icone: <IconeEquipe taille={17} />,
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
      {/*
        ⚠️ SEULE LA BARRE LATÉRALE EST SOMBRE — demande de Christian, « je
        trouve que c'est trop clair l'espace admin », puis, après un premier
        essai qui assombrissait aussi l'en-tête : « juste le menu doit être
        noir ».

        La colonne de gauche passe en ko-black ; l'en-tête et tout le contenu
        (tableaux, formulaires, fenêtres) restent clairs. Un seul bloc sombre
        vertical suffit à porter la structure — le bandeau horizontal en plus
        écrasait le contenu, et de longs tableaux de données restent lisibles
        sur la durée, ce qu'un fond sombre généralisé rend pénible.

        Les tokens `-d` existent déjà pour ça (ko-line-d, ko-muted-d,
        label-mono-d, ko-blue2) : aucune couleur nouvelle n'entre dans la
        palette, et leurs ratios de contraste sont documentés dans
        globals.css.
      */}
      {/*
        `pt-[60px]` compense la barre `fixed` de NavAdmin (identité +
        hamburger) sous `lg` : cette barre est sortie du flux normal pour
        rester visible au défilement (voir sa docstring), donc plus rien
        n'occupe sa hauteur — sans ce padding, le sous-menu déplié et
        « Voir le site » commenceraient masqués dessous. Neutralisé à partir
        de `lg`, où la barre redevient un bloc normal en tête de la colonne
        fixe.
      */}
      <body className="flex min-h-svh flex-col bg-ko-cream pt-[60px] font-sans antialiased lg:h-svh lg:flex-row lg:overflow-hidden lg:pt-0">
        <aside className="scrollbar-fine shrink-0 bg-ko-black lg:h-svh lg:w-60 lg:overflow-y-auto lg:border-r lg:border-ko-line-d">
          {/* Href préfixés ICI, côté serveur : NavAdmin utilise le
              `next/link` natif, qui ne connaît pas la langue courante.

              Le bloc d'identité (KO-LAB / Espace équipe) est passé en prop,
              pas gardé ici : sous `lg`, il doit vivre SUR LA MÊME LIGNE que
              le bouton hamburger de NavAdmin, dans une barre qui reste
              visible au défilement — voir la docstring de NavAdmin.tsx pour
              le détail. */}
          <NavAdmin
            identite={
              <div className="flex items-baseline gap-3 lg:border-b lg:border-ko-line-d lg:px-5 lg:py-[19px]">
                <span className="font-mono text-sm font-medium uppercase tracking-[0.18em] text-ko-white">
                  KO-LAB
                </span>
                <span className="label-mono label-mono-d">{t('espace')}</span>
              </div>
            }
            racine={`/${locale}/admin`}
            groupes={GROUPES}
            labelMenu={t('menu_ouvrir')}
            labelFermer={t('menu_fermer')}
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col lg:h-svh lg:overflow-hidden">
          {/* ⚠️ L'en-tête reste CLAIRE — seule la barre latérale est sombre.
              Elle est passée en ko-black2 un temps ; Christian a tranché :
              « enlève le sombre au niveau de la barre d'en haut, juste le
              menu doit être noir ». Le bandeau sombre pleine largeur écrasait
              le contenu, alors que la seule colonne de gauche suffit à porter
              la structure. */}
          <header className="shrink-0 border-b border-ko-line bg-ko-white">
            <div className="flex items-center justify-between gap-6 px-6 py-4 lg:px-8">
              {/* Onglet séparé, mais TOUJOURS LE MÊME : la session équipe reste
                  ouverte et le travail en cours (un formulaire à moitié
                  rempli, par exemple) n'est jamais perdu. `target="_blank"`
                  seul rouvrait un nouvel onglet à CHAQUE clic — relevé par
                  Christian, trois onglets après trois clics. Un nom de cible
                  fixe fait que le navigateur réutilise le même onglet nommé
                  s'il existe déjà, exactement comme un lien HTML classique
                  vers une fenêtre nommée. */}
              <Link
                href={`/${locale}`}
                target="ko-lab-site"
                rel="noopener noreferrer"
                className="text-sm text-ko-muted transition-colors duration-200 hover:text-ko-ink"
              >
                {t('voir_site')}
              </Link>

              <div className="flex items-center gap-6">
              {/* Le rôle est affiché : un editor qui ne comprend pas pourquoi
                  un bouton de suppression lui est refusé doit pouvoir le
                  constater sans ouvrir la base. Sur deux lignes plutôt qu'une
                  suite séparée par un point médian — une adresse longue et un
                  rôle collés se lisaient comme une seule chaîne.

                  ⚠️ Visible dès mobile, plus seulement à partir de `sm:` — un
                  compte équipe resté connecté par erreur sur un téléphone
                  personnel passait inaperçu, l'adresse n'apparaissant que sur
                  écran large. Signalé par Christian après un mélange de
                  comptes découvert seulement en creusant jusqu'à un autre
                  écran. `max-w-[38vw] truncate` évite qu'une adresse longue
                  ne pousse « Se déconnecter » hors de l'écran sur mobile. */}
              <span className="max-w-[38vw] text-right leading-tight sm:max-w-none">
                <span className="block truncate text-sm text-ko-ink">{profil.email}</span>
                <span className="label-mono">
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
