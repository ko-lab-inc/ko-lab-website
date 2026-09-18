import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { routing } from '@/i18n/routing'

import type { Metadata, Viewport } from 'next'

/**
 * Fourre-tout — n'existait pas avant ce fichier (Phase 10, étape 3).
 *
 * ---------------------------------------------------------------------------
 * POURQUOI CE FICHIER, EN PLUS DE not-found.tsx
 *
 * `not-found.tsx` n'intercepte QUE les appels explicites à `notFound()` faits
 * DEPUIS un segment déjà apparié (ex. `boutique/layout.tsx` quand
 * `boutiqueActive` est à faux). Une URL qui ne correspond à AUCUNE route
 * existante — `/fr/ceci-nexiste-pas` — n'entre jamais dans l'arborescence
 * `[locale]` : Next la déclare introuvable au niveau du routage lui-même,
 * avant d'atteindre le moindre layout, et retombe sur son `/_not-found`
 * générique à la racine (non stylé, non traduit — vérifié à l'écran, c'était
 * encore le cas malgré `not-found.tsx`).
 *
 * Ce fourre-tout (`[...rest]`) donne à CE cas précis une route qui MATCHE
 * réellement — n'importe quel segment restant, un ou plusieurs niveaux. Une
 * fois apparié, il appelle `notFound()` lui-même, ce qui, cette fois, se
 * produit bien À L'INTÉRIEUR du segment `[locale]` : `not-found.tsx` prend
 * alors le relais normalement, Nav et Footer compris.
 *
 * Motif recommandé pour next-intl précisément pour ce cas — voir la
 * documentation du paquet sur le routage des 404 localisées.
 * ---------------------------------------------------------------------------
 */
type Props = { params: Promise<{ locale: string }> }

/**
 * THÈME SOMBRE — theme-color des URL inconnues. La 404 (not-found.tsx) n'a
 * pas le droit d'exporter `viewport` ; c'est ce fourre-tout, la page qui
 * déclenche notFound(), qui le porte pour elle. Barre mobile assortie.
 */
export const viewport: Viewport = {
  themeColor: '#111210',
}

/**
 * Métadonnées de la 404, MOITIÉ CLIENT (17 septembre 2026). Les mêmes sont
 * exportées par not-found.tsx, qui alimente le HTML serveur (ce que lisent
 * Googlebot et curl). Mais après hydratation, Next réapplique les
 * métadonnées de la PAGE — sans celles-ci, l'onglet retombait sur le titre
 * par défaut du layout, « KO-LAB Inc. — De l'idée au terrain », 2 s après le
 * chargement (mesuré). Les deux exports doivent dire la même chose.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) return {}
  const t = await getTranslations({ locale, namespace: 'Metadata.introuvable' })
  return { title: t('title'), description: t('description'), robots: { index: false, follow: true } }
}

export default async function FourreTout({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)
  notFound()
}
