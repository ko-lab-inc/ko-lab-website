import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { Fraunces, Instrument_Sans, JetBrains_Mono } from 'next/font/google'
import { notFound } from 'next/navigation'

import { Footer } from '@/components/layout/Footer'
import { Nav } from '@/components/layout/Nav'
import { ChatCrisp } from '@/components/ui/ChatCrisp'
import { PanierProvider } from '@/lib/panier/PanierContext'
import { routing } from '@/i18n/routing'

import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import '@/styles/globals.css'

/**
 * ROOT LAYOUT du site vitrine — rend <html> et <body>.
 *
 * ---------------------------------------------------------------------------
 * Pourquoi le root layout est ICI et non dans src/app/layout.tsx
 *
 * Il existait auparavant un src/app/layout.tsx qui portait <html lang>. Comme
 * il se trouve AU-DESSUS du segment [locale], Next le considère partagé entre
 * /fr et /en : lors d'une bascule de langue côté client, il n'est pas re-rendu
 * et `lang` restait figé à la langue d'arrivée initiale. Le <title> se mettait
 * à jour, pas l'attribut de langue — un lecteur d'écran prononçait donc le
 * contenu anglais avec la phonétique française.
 *
 * Next autorise un root layout à l'intérieur d'un groupe de routes. En le
 * plaçant dans [locale], il est re-rendu à chaque changement de langue et
 * `lang` suit. Cela supprime aussi l'appel fragile à getLocale(), qui
 * s'exécutait avant tout setRequestLocale et figeait la langue de la requête.
 *
 * Conséquence : une future section hors marketing (ex. /admin) devra définir
 * son propre root layout dans son propre groupe de routes.
 * ---------------------------------------------------------------------------
 *
 * Polices via next/font/google (skill 12) : les fichiers sont téléchargés AU
 * BUILD et servis depuis notre origine. C'est pour ça que la CSP de
 * next.config.ts n'autorise pas fonts.googleapis.com.
 *
 * globals.css ne redéfinit surtout pas les variables --font-* : il écraserait
 * les noms de familles générés et l'auto-hébergement ne servirait à rien.
 */

const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['opsz'],
  variable: '--font-serif',
  display: 'swap',
})

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

// `||` et non `??` : une variable déclarée mais non renseignée dans .env.local
// vaut la CHAÎNE VIDE, pas undefined. `??` la laisserait passer et
// `new URL('')` lèverait ERR_INVALID_URL au chargement du module — donc un 500
// sur toutes les pages, y compris en production si la variable est oubliée
// sur Vercel.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ko-lab.ca'

type Props = {
  children: ReactNode
  // ⚠️ Next 15+ : params est une Promise (voir CLAUDE.md, tableau de migration).
  params: Promise<{ locale: string }>
}

/**
 * Pré-génère /fr et /en au build plutôt qu'à la demande — condition d'un vrai
 * rendu statique et de l'ISR du skill 12.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params

  // Même garde que dans le layout : le segment [locale] capture n'importe quelle
  // URL inconnue. Le typage des messages (global.d.ts) rend cette validation
  // obligatoire — getTranslations n'accepte plus un `string` quelconque.
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  const t = await getTranslations({ locale, namespace: 'Metadata.home' })

  return {
    // Base des URL relatives des canonical et images Open Graph (skill 10).
    metadataBase: new URL(siteUrl),
    title: {
      default: t('title'),
      // Les pages enfants ne fournissent que leur nom : « Le LAB — KO-LAB ».
      template: '%s — KO-LAB',
    },
    description: t('description'),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        fr: '/fr',
        en: '/en',
        'x-default': '/fr',
      },
    },
    openGraph: {
      type: 'website',
      siteName: 'KO-LAB Inc.',
      locale: locale === 'fr' ? 'fr_CA' : 'en_CA',
      title: t('title'),
      description: t('description'),
    },
  }
}

export default async function MarketingLayout({ children, params }: Props) {
  const { locale } = await params

  // Le segment [locale] capture n'importe quelle URL inconnue. request.ts
  // retombe silencieusement sur le français pour ne pas casser le rendu ;
  // c'est ici qu'on refuse réellement une langue invalide, sinon /de/ servirait
  // la page d'accueil française sous une URL qui n'existe pas — contenu
  // dupliqué à l'infini pour les moteurs de recherche.
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  // Autorise le rendu statique des composants serveur de cet arbre.
  // Sans cet appel, toute lecture de traduction bascule la page en dynamique.
  setRequestLocale(locale)

  const t = await getTranslations('Commun')

  /**
   * Messages envoyés au navigateur — LISTE BLANCHE explicite.
   *
   * Sans le prop `messages`, NextIntlClientProvider sérialise le catalogue
   * ENTIER dans le HTML de chaque page. Deux conséquences :
   *
   * 1. Fuite de contenu non publié. Les noms des produits « Solutions
   *    modulaires » apparaissaient dans le code source de la boutique alors
   *    que le drapeau NEXT_PUBLIC_SOLUTIONS_MODULAIRES les masque — le
   *    document de cadrage interdit toute publication avant signature.
   * 2. Poids inutile : plus de 360 clés transmises pour en utiliser une trentaine.
   *
   * ⚠️ À TENIR À JOUR. Tout composant client appelant useTranslations() doit
   * voir son espace de noms ajouté ici, sinon il lève à l'exécution. Les seuls
   * concernés aujourd'hui :
   *
   *   Nav.tsx                  → Nav, Panier
   *   FormulaireContact.tsx    → Contact, Panier
   *   GalerieRealisations.tsx  → Realisations
   *   CatalogueBoutique.tsx    → Panier, Boutique
   *   PagePanier.tsx           → Panier
   *
   * CatalogueBoutique reçoit ses chaînes en props, résolues côté serveur —
   * c'est le modèle à privilégier pour tout nouveau composant.
   */
  const tousLesMessages = await getMessages()

  const boutique = tousLesMessages.Boutique


  const messagesClient = {
    Nav: tousLesMessages.Nav,
    Contact: tousLesMessages.Contact,
    Realisations: tousLesMessages.Realisations,
    // Ajouté explicitement, PAS en élargissant au catalogue entier : le panier
    // vit côté client, ses libellés doivent y être — mais rien d'autre.
    Panier: tousLesMessages.Panier,
    // ⚠️ SOUS-ENSEMBLE, pas l'espace de noms entier. `Boutique` contient les
    // noms des produits « Solutions modulaires », que le drapeau masque et que
    // le document de cadrage interdit de publier. Transmettre le namespace
    // complet rouvrirait exactement la fuite fermée précédemment.
    // Seules les clés lues par CatalogueBoutique passent.
    Boutique: {
      recherche_placeholder: boutique.recherche_placeholder,
      recherche_label: boutique.recherche_label,
      aucun_resultat_recherche: boutique.aucun_resultat_recherche,
      a_partir_de: boutique.a_partir_de,
    },
  }

  return (
    <html
      lang={locale}
      className={`${fraunces.variable} ${instrumentSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-sans antialiased">
        <NextIntlClientProvider messages={messagesClient}>
          <PanierProvider>
          {/* Lien d'évitement — première cible de tabulation, invisible tant
              qu'il n'a pas le focus (accessibilité clavier). */}
          <a
            href="#contenu"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-ko-white focus:px-4 focus:py-3 focus:text-sm focus:text-ko-ink focus:shadow-card"
          >
            {t('aller_au_contenu')}
          </a>

          <Nav />

          <main id="contenu">{children}</main>

          <Footer />

          {/* Bulle de chat — hors du <main>, présente sur toutes les pages
              publiques. Ne rend rien si NEXT_PUBLIC_CRISP_WEBSITE_ID est vide. */}
          <ChatCrisp />
          </PanierProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
