import { hasLocale } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { routing } from '@/i18n/routing'

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

export default async function FourreTout({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)
  notFound()
}
