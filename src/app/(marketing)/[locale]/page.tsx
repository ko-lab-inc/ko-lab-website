import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { Besoins } from '@/components/sections/Besoins'
import { Boutique } from '@/components/sections/Boutique'
import { CredibiliteTerrain } from '@/components/sections/CredibiliteTerrain'
import { CtaFinal } from '@/components/sections/CtaFinal'
import { Ecosysteme } from '@/components/sections/Ecosysteme'
import { EquipementsDeploiement } from '@/components/sections/EquipementsDeploiement'
import { GmLocations } from '@/components/sections/GmLocations'
import { Hero } from '@/components/sections/Hero'
import { Installations } from '@/components/sections/Installations'
import { Lab } from '@/components/sections/Lab'
import { Location } from '@/components/sections/Location'
import { OperationsTerrain } from '@/components/sections/OperationsTerrain'
import { Realisations } from '@/components/sections/Realisations'
import { IntroAnimee } from '@/components/ui/IntroAnimee'
import { routing } from '@/i18n/routing'
import { alternatesLangues, ROUTES } from '@/lib/routes'

import type { Metadata, Viewport } from 'next'

/**
 * THÈME SOMBRE — première page migrée (15 septembre 2026, variante B du
 * prototype, décision de design close).
 *
 * Importé ICI et non dans le layout : App Router ne charge le CSS d'une
 * page que sur sa route. Les 26 autres pages ne le reçoivent pas. Ses
 * règles sont en outre toutes préfixées par `body:has([data-theme-sombre])`,
 * le marqueur rendu plus bas — voir theme-sombre.css pour pourquoi ce
 * double verrou, et comment migrer la page suivante.
 */
import '@/styles/theme-sombre.css'

type Props = {
  params: Promise<{ locale: string }>
}

/**
 * Page d'accueil.
 *
 * ISR toutes les heures (skill 12). Ne fonctionne que parce qu'aucune section
 * n'appelle cookies() : les futures sections alimentées par Supabase devront
 * utiliser createStaticClient(), jamais createClient() de server.ts.
 */
export const revalidate = 3600

/**
 * Barre du navigateur mobile assortie au fond sombre — sans theme-color
 * elle resterait blanche au-dessus d'une page noire. Export statique : ne
 * touche pas au rendu ISR ci-dessus. Le layout marketing n'exporte aucun
 * viewport, donc aucun conflit : cette valeur ne vaut que pour l'accueil.
 */
export const viewport: Viewport = {
  themeColor: '#111210',
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations({ locale, namespace: 'Metadata.home' })

  return {
    // `absolute` court-circuite le gabarit « %s — KO-LAB » défini dans le
    // layout : sans lui, le titre deviendrait « KO-LAB Inc. — De l'idée au
    // terrain — KO-LAB ».
    title: { absolute: t('title') },
    description: t('description'),
    alternates: {
      canonical: `/${locale}`,
      languages: alternatesLangues(ROUTES.accueil),
    },
    openGraph: {
      type: 'website',
      siteName: 'KO-LAB Inc.',
      locale: locale === 'en' ? 'en_CA' : 'fr_CA',
      url: `/${locale}`,
      title: t('title'),
      description: t('description'),
      // Répétée depuis le layout (Phase 10, étape 3) : ce bloc `openGraph`
      // redéfini ici REMPLACE entièrement celui du layout, image comprise —
      // sans cette ligne, l'accueil (la page la plus partagée) se
      // retrouverait sans image alors que toutes les autres pages en
      // hériteraient. Voir images.ts non concerné : ce fichier vit hors
      // Storage, dans public/images/og/.
      images: [{ url: '/images/og/og-defaut.jpg', width: 1200, height: 630 }],
    },
  }
}

export default async function AccueilPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  // Indispensable au rendu statique : sans cet appel, la première lecture de
  // traduction bascule la page en dynamique et annule le revalidate ci-dessus.
  setRequestLocale(locale)

  /*
   * Ordre de la révision « Priorité Location » de Joe, §6 (lot 2,
   * 17 septembre 2026) : sections repositionnées, aucune supprimée ni
   * dupliquée — consigne de Joe. Remplace l'ordre du document de cadrage
   * Phase 5 (lui-même issu du skill 19 : StatsBar et PreuveTerrain fusionnées
   * en CredibiliteTerrain, Capacites dissoute dans Operations/Installations/
   * Equipements, Offres séparée en Location/Boutique). Les « section N »
   * citées en tête des composants suivent encore la numérotation Phase 5,
   * rappelée entre parenthèses.
   *
   *   rang  composant               Phase 5  fond en thème sombre
   *   1     Hero                    (1)      carte photo encartée
   *   2     Besoins                 (2)      #111210
   *   3     Location                (11)     #0e1116, sans filet
   *   —     Boutique                (12)     #0e1116, sans filet — AUCUNE marge
   *                                          intérieure haute : prolonge Location
   *                                          et doit la suivre (rendue seulement
   *                                          si boutique_active)
   *   4     Lab                     (6)      #0e1116 + filet
   *   5     CredibiliteTerrain      (3)      photo + voile, filet
   *   6     Installations           (5)      #111210
   *   7     EquipementsDeploiement  (7)      #0e1116 + filet
   *   8     GmLocations             (8)      #0e1116, sans filet — absente de la
   *                                          liste du §6 : laissée contre
   *                                          Équipements, dont elle prolonge
   *                                          l'inventaire
   *   9     OperationsTerrain       (4)      photo + voile, filet
   *   10    Realisations            (9)      #111210
   *   11    Ecosysteme              (10)     #0e1116 + filet
   *   12    CtaFinal                (13)     #111210
   *   (Footer)                               #0e1116 + filet
   *
   * Jointures mesurées au pixel (1440 et 390 px) : deux zones #0e1116 se
   * touchent sans aucun séparateur en Équipements → GmLocations (déjà le cas
   * dans l'ordre Phase 5) ; Location → Lab n'est séparé que par le filet et,
   * à 1440, par la photo du LAB sur la moitié de la largeur. Tout nouveau
   * déplacement se revérifie de la même façon, bords de section compris.
   */
  return (
    // Marqueur du thème sombre — voir theme-sombre.css. Un <div> sans style
    // propre : il ne change rien au flux des sections, il existe pour que
    // `body:has([data-theme-sombre])` soit vrai sur cette page et fausse
    // partout ailleurs, nav et pied de page compris.
    <div data-theme-sombre>
      {/* Overlay client, position: fixed — ne retarde ni ne remplace rien
          en dessous (voir IntroAnimee.tsx). Uniquement l'accueil : la séquence
          se clôt sur sa propre phrase (Home.intro.phrase), juste au-dessus
          du hero de cette page. */}
      <IntroAnimee />
      <Hero />
      <Besoins locale={locale} />
      <Location />
      <Boutique />
      <Lab />
      <CredibiliteTerrain />
      <Installations />
      <EquipementsDeploiement locale={locale} />
      <GmLocations />
      <OperationsTerrain locale={locale} />
      <Realisations />
      <Ecosysteme />
      <CtaFinal />
    </div>
  )
}
