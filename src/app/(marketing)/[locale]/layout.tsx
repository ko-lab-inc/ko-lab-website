import { SpeedInsights } from '@vercel/speed-insights/next'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { Fraunces, Instrument_Sans, JetBrains_Mono } from 'next/font/google'
import { notFound } from 'next/navigation'

import { Footer } from '@/components/layout/Footer'
import { Nav } from '@/components/layout/Nav'
import { BoutonRetourHaut } from '@/components/ui/BoutonRetourHaut'
import { ChatCrisp } from '@/components/ui/ChatCrisp'
import { WidgetAide } from '@/components/ui/WidgetAide'
import { DOMAINE } from '@/lib/constantes'
import { PanierProvider } from '@/lib/panier/PanierContext'
import { lireReglages } from '@/lib/reglages'
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

// Repli littéral géré par lib/constantes.ts (Phase 3) — `||` et non `??` :
// une variable déclarée mais non renseignée dans .env.local vaut la CHAÎNE
// VIDE, pas undefined. `??` la laisserait passer et `new URL('')` lèverait
// ERR_INVALID_URL au chargement du module — donc un 500 sur toutes les
// pages, y compris en production si la variable est oubliée sur Vercel.
const siteUrl = DOMAINE

// Accès littéral à process.env, comme dans ChatCrisp : Next substitue ces
// expressions au build par analyse statique du texte, un accès dynamique
// vaudrait undefined dans le bundle client.
const CRISP_CONFIGURE = Boolean(process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID)

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
      // hreflang — l'accueil est bilingue réel depuis la Phase 9, donc vrai
      // dans les deux sens. `x-default` pointe sur le français : c'est la
      // langue de référence du site (routing.ts).
      languages: {
        fr: '/fr',
        en: '/en',
        'x-default': '/fr',
      },
    },
    openGraph: {
      type: 'website',
      siteName: 'KO-LAB Inc.',
      // Locale de la page courante, pas figée en français : un visiteur qui
      // partage /en/... sur les réseaux doit voir l'anglais confirmé dans
      // les métadonnées de la carte de partage.
      locale: locale === 'en' ? 'en_CA' : 'fr_CA',
      title: t('title'),
      description: t('description'),
      // Image sociale ajoutée le 20 août 2026 (Phase 10, étape 3) — avant ce
      // jour, AUCUNE image Open Graph n'existait nulle part sur le site : un
      // partage sur Slack, iMessage ou LinkedIn produisait une carte sans
      // visuel. Recadrage 1200×630 (attention crop, sharp) de la photo hero
      // réelle (Canada Day 2026, déjà utilisée et déjà sous droits) — pas une
      // création graphique, un recadrage d'une photo déjà approuvée. Sert de
      // repli pour toute page qui ne fournit pas la sienne ; chaque page
      // enfant qui définit SON PROPRE bloc `openGraph` doit répéter cette
      // image ou la sienne — Next ne fusionne pas les sous-clés d'un objet
      // déjà redéfini par un segment enfant.
      images: [{ url: '/images/og/og-defaut.jpg', width: 1200, height: 630 }],
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

  /**
   * Réglages du site, lus une fois par rendu de layout.
   *
   * ⚠️ Passe par `lireReglages()`, qui utilise `createStaticClient()` et
   * `unstable_cache` : aucun cookie n'est lu, le layout reste donc
   * prégénérable et l'ISR du skill 12 tient. Un `createClient()` ici
   * basculerait TOUT le site vitrine en rendu dynamique.
   */
  const reglages = await lireReglages()

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
   *   ModaleConnexion.tsx      → Connexion  (montée par Nav.tsx)
   *   FormulaireContact.tsx    → Contact, Panier
   *   GalerieRealisations.tsx  → Realisations
   *   CatalogueBoutique.tsx    → Panier, Boutique
   *   PagePanier.tsx           → Panier
   *   WidgetAide.tsx           → Aide
   *   FormulaireDetailsCommande.tsx, EditeurLignesCommande.tsx
   *                            → Commande (migration 0021 ; la première montée
   *                              par /boutique/commande/details, la seconde
   *                              par /compte/commandes/[id])
   *   IntroAnimee.tsx          → Home.intro, Home.hero.title (Phase 4, 19 août
   *                              2026) — l'intro reprend le titre du hero pour
   *                              la dernière phrase, jamais une copie séparée
   *   GaleriePhotos.tsx        → Commun.galerie_* (20 août 2026) — montée par
   *                              PageCapacite.tsx et /location ; seuls les cinq
   *                              libellés de la bande/visionneuse passent, pas
   *                              tout Commun (photo_placeholder etc. restent
   *                              résolus côté serveur, PhotoPlaceholder n'est
   *                              pas un composant client)
   *   BoutonRetourHaut.tsx     → Commun.retour_haut (23 août 2026)
   *   error.tsx (ce dossier)   → Commun.erreur_* (27 août 2026) — filet
   *                              d'erreur admin-wide répliqué côté public,
   *                              après le 413 Vercel repéré sur le
   *                              formulaire de candidature (aucun error.tsx
   *                              ne couvrait le site public avant ce jour)
   *
   * CatalogueBoutique reçoit ses chaînes en props, résolues côté serveur —
   * c'est le modèle à privilégier pour tout nouveau composant.
   */
  const tousLesMessages = await getMessages()

  const boutique = tousLesMessages.Boutique
  const commun = tousLesMessages.Commun


  const messagesClient = {
    Nav: tousLesMessages.Nav,
    Contact: tousLesMessages.Contact,
    Realisations: tousLesMessages.Realisations,
    // Sous-ensemble pour GaleriePhotos.tsx (BandeauImages + SlideImages) —
    // pas tout Commun, même discipline que Boutique plus bas.
    Commun: {
      galerie_groupe: commun.galerie_groupe,
      galerie_position: commun.galerie_position,
      galerie_precedent: commun.galerie_precedent,
      galerie_suivant: commun.galerie_suivant,
      galerie_fermer: commun.galerie_fermer,
      // BoutonRetourHaut.tsx (23 août 2026) — un seul libellé, l'aria-label
      // du bouton.
      retour_haut: commun.retour_haut,
      // error.tsx (27 août 2026) — filet d'erreur public, voir plus haut.
      erreur_titre: commun.erreur_titre,
      erreur_texte: commun.erreur_texte,
      erreur_reessayer: commun.erreur_reessayer,
    },
    // Ajouté explicitement, PAS en élargissant au catalogue entier : le panier
    // vit côté client, ses libellés doivent y être — mais rien d'autre.
    Panier: tousLesMessages.Panier,
    // Formulaire de commande, modale de connexion/inscription déclenchée à la
    // confirmation, et éditeur de lignes de /compte/commandes/[id] — 0021.
    Commande: tousLesMessages.Commande,
    // Namespace entier : ce ne sont que des libellés d'interface du widget
    // d'aide, aucun contenu non publié ne s'y trouve.
    Aide: tousLesMessages.Aide,
    // Idem pour le modal de connexion ouvert depuis la nav : libellés de
    // formulaire uniquement. Les pages /connexion et /inscription, elles,
    // résolvent leurs textes côté serveur et ne passent pas par ici.
    Connexion: tousLesMessages.Connexion,
    // Le modal bascule entre connexion et création sans naviguer : il lui faut
    // les deux jeux de libellés.
    Inscription: tousLesMessages.Inscription,
    // Intro animée de l'accueil (Phase 4) — sous-ensemble : le titre du hero
    // est repris tel quel (pas de copie séparée qui pourrait diverger), le
    // reste de Home.hero (sous-titre, CTA…) n'a rien à faire côté client ici.
    Home: {
      intro: tousLesMessages.Home.intro,
      hero: { title: tousLesMessages.Home.hero.title },
    },
    // ⚠️ SOUS-ENSEMBLE, pas l'espace de noms entier. `Boutique` contient les
    // noms des produits « Solutions modulaires », que le drapeau masque et que
    // le document de cadrage interdit de publier. Transmettre le namespace
    // complet rouvrirait exactement la fuite fermée précédemment.
    // Seules les clés lues par CatalogueBoutique passent.
    Boutique: {
      recherche_placeholder: boutique.recherche_placeholder,
      recherche_label: boutique.recherche_label,
      aucun_resultat_recherche: boutique.aucun_resultat_recherche,
      voir_produit: boutique.voir_produit,
      rupture_stock: boutique.rupture_stock,
    },
  }

  /**
   * Organization — schema.org, une seule fois pour tout le site.
   *
   * Absent avant ce correctif (audit SEO du 5 août 2026) : sans ça, Google n'a
   * aucune donnée structurée pour construire un panneau de connaissance sur
   * l'entreprise. Champs limités à ce qui est réellement confirmé — pas
   * d'adresse postale précise (pas encore fournie pour les mentions légales),
   * pas de `logo` (aucun visuel carré exploitable dans les assets actuels).
   * Le `replace` ci-dessous échappe les chevrons ouvrants du JSON sérialisé :
   * sans lui, une valeur de réglage contenant la séquence de fermeture du
   * script couperait la balise en plein milieu.
   */
  const organisationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'KO-LAB Inc.',
    url: siteUrl,
    // Décision de marque du 19 août 2026 : « From idea to ground. » — les
    // deux langues se répondent par « ground »/« terrain », plus une
    // proposition. Jusqu'ici ce slogan restait toujours en français, même
    // sur /en — Phase 9 l'a rendu sensible à la locale, comme le reste du
    // JSON-LD n'en avait pas besoin avant que l'anglais n'existe.
    slogan: locale === 'en' ? 'From idea to ground.' : "De l'idée au terrain.",
    email: reglages.contactCourriel,
    ...(reglages.contactTelephone ? { telephone: reglages.contactTelephone } : {}),
    areaServed: reglages.contactRegion,
  }

  return (
    <html
      lang={locale}
      className={`${fraunces.variable} ${instrumentSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organisationJsonLd).replace(/</g, '\\u003c'),
          }}
        />
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

          <Nav
            panierActif={reglages.panierActif}
            boutiqueActive={reglages.boutiqueActive}
            concoursActif={reglages.concoursActif}
          />

          <main id="contenu">{children}</main>

          <Footer />

          {/*
            Bulle d'aide — hors du <main>, présente sur toutes les pages
            publiques. UNE SEULE des deux s'affiche, jamais les deux : deux
            bulles superposées dans le même coin seraient un défaut visible.

            Crisp s'il est configuré (vrai clavardage en direct, mais compte
            tiers, script externe et iframe hors de portée de nos tokens) ;
            sinon notre widget, qui poste dans /api/contact sans charger quoi
            que ce soit de l'extérieur. Renseigner
            NEXT_PUBLIC_CRISP_WEBSITE_ID bascule de l'un à l'autre.
          */}
          {CRISP_CONFIGURE ? <ChatCrisp /> : <WidgetAide />}

          <BoutonRetourHaut />
          </PanierProvider>
        </NextIntlClientProvider>

        {/*
          Données de terrain réelles (LCP au 75e percentile mobile, etc.) —
          absentes jusqu'ici (chantier LCP du 22-23 août 2026 : diagnostiqué
          à l'aveugle, Lighthouse ponctuel contre la prod comme seul thermomètre).
          Beacon envoyé à /_vercel/speed-insights/vitals, même origine —
          couvert par `connect-src 'self'` de la CSP (next.config.ts), rien à
          y ajouter. Hors du <NextIntlClientProvider> : ce composant ne lit
          aucune traduction.
        */}
        <SpeedInsights />
      </body>
    </html>
  )
}
