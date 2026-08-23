import { unstable_cache } from 'next/cache'

import { ETIQUETTE_CARRIERES } from '@/lib/carrieres'
import { DOMAINE } from '@/lib/constantes'
import { ETIQUETTE_EMPLACEMENTS_MEDIAS } from '@/lib/medias-emplacements'
import { ETIQUETTE_PRODUITS, lireProduitsPublies } from '@/lib/produits'
import { lireReglages } from '@/lib/reglages'
import { ETIQUETTE_REALISATIONS } from '@/lib/realisations'
import { ROUTES, ROUTES_CAPACITES } from '@/lib/routes'
import { createStaticClient } from '@/lib/supabase/static'

import type { MetadataRoute } from 'next'

/**
 * Sitemap XML — n'existait pas du tout avant ce fichier.
 *
 * Même repli que `metadataBase` dans le layout marketing
 * (`(marketing)/[locale]/layout.tsx`) : `NEXT_PUBLIC_SITE_URL` en priorité,
 * `ko-lab-center.ca` sinon (voir lib/constantes.ts). Un sitemap qui
 * pointerait vers `localhost:3000` en production serait pire que son
 * absence.
 */
const siteUrl = DOMAINE

/**
 * ⚠️ Le sitemap doit rester servi depuis le cache ISR, pas régénéré à
 * chaque exploration par un robot — les fonctions de date ci-dessous
 * touchent Supabase, et sans ce `revalidate` explicite, une route qui lit
 * une base de données peut basculer en rendu dynamique selon le contexte.
 * Chaque fonction de date est de toute façon SON PROPRE `unstable_cache`
 * (revalidate 3600, comme le reste du site) : même si ce fichier devait un
 * jour redevenir dynamique pour une autre raison, ça n'ouvrirait pas une
 * série de requêtes base à chaque appel — juste une lecture de cache.
 */
export const revalidate = 3600

/**
 * Date fixe pour les pages sans contenu venant de la base — À METTRE À
 * JOUR À LA MAIN quand le texte de ces pages change réellement (hub
 * capacités, operations-terrain, equipements, location, contact, pages
 * légales). Remplace l'ancien `new Date()` : ça datait TOUTES les entrées
 * à l'heure de la requête, un signal que Google finit par ignorer — voir
 * l'audit SEO du 23 août 2026. Mieux vaut une date honnête et figée qu'une
 * date fausse et mouvante.
 */
const DATE_CONTENU_STATIQUE = new Date('2026-08-23')

/** `ROUTES.accueil` ('/') devient `/fr` ou `/en` sans segment de chemin en plus. */
function url(chemin: string, locale: 'fr' | 'en'): string {
  return `${siteUrl}/${locale}${chemin === ROUTES.accueil ? '' : chemin}`
}

function plusRecente(dates: readonly Date[]): Date | null {
  return dates.length === 0 ? null : new Date(Math.max(...dates.map((d) => d.getTime())))
}

/**
 * Date de modification la plus récente parmi les emplacements donnés —
 * pour toute page dont le contenu vient de `medias_emplacements` (accueil,
 * installations, le-lab, à propos). Repli sur `DATE_CONTENU_STATIQUE` si la
 * requête échoue ou si aucune ligne ne correspond, jamais une erreur qui
 * viderait le sitemap.
 */
async function lireDateEmplacements(cles: readonly string[]): Promise<Date> {
  try {
    const supabase = createStaticClient()
    const { data, error } = await supabase.from('medias_emplacements').select('updated_at').in('cle', cles)
    if (error || !data) return DATE_CONTENU_STATIQUE
    return plusRecente(data.map((r) => new Date(r.updated_at))) ?? DATE_CONTENU_STATIQUE
  } catch {
    return DATE_CONTENU_STATIQUE
  }
}
// Même étiquette que `obtenirEmplacement` (medias-emplacements.ts) : sans
// elle, modifier un emplacement depuis l'admin invaliderait bien le cache
// PUBLIC de la page, mais pas celui-ci — la date du sitemap resterait
// figée jusqu'à l'expiration naturelle (3600 s), pas jusqu'au prochain
// changement réel.
const dateEmplacements = unstable_cache(lireDateEmplacements, ['sitemap-date-emplacements'], {
  revalidate: 3600,
  tags: [ETIQUETTE_EMPLACEMENTS_MEDIAS],
})

/**
 * ⚠️ `postes_carrieres` N'A PAS de colonne `updated_at` — vérifié en
 * sondant l'API (PostgREST renvoie 42703, « column does not exist »), pas
 * supposé. `created_at` est le seul signal temporel réel disponible : une
 * édition de texte sur un poste existant ne le fera pas bouger. C'est une
 * limite de la table, pas de ce fichier — reste plus honnête qu'une date
 * figée pour une liste qui change réellement (nouveaux postes). Filtré sur
 * `actif` : un poste retiré ne doit pas faire vieillir artificiellement la
 * page en gardant une vieille date, ni la rajeunir s'il vient d'être
 * dépublié sans rapport avec le contenu affiché.
 */
async function lireDateCarrieres(): Promise<Date> {
  try {
    const supabase = createStaticClient()
    const { data, error } = await supabase
      .from('postes_carrieres')
      .select('created_at')
      .eq('actif', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error || !data) return DATE_CONTENU_STATIQUE
    return new Date(data.created_at)
  } catch {
    return DATE_CONTENU_STATIQUE
  }
}
const dateCarrieres = unstable_cache(lireDateCarrieres, ['sitemap-date-carrieres'], {
  revalidate: 3600,
  tags: [ETIQUETTE_CARRIERES],
})

/** `realisations`, elle, a bien `updated_at` — vérifié, contrairement à postes_carrieres ci-dessus. */
async function lireDateRealisations(): Promise<Date> {
  try {
    const supabase = createStaticClient()
    const { data, error } = await supabase
      .from('realisations')
      .select('updated_at')
      .eq('publie', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error || !data) return DATE_CONTENU_STATIQUE
    return new Date(data.updated_at)
  } catch {
    return DATE_CONTENU_STATIQUE
  }
}
const dateRealisations = unstable_cache(lireDateRealisations, ['sitemap-date-realisations'], {
  revalidate: 3600,
  tags: [ETIQUETTE_REALISATIONS],
})

/**
 * Une date par produit publié — même limite que postes_carrieres :
 * `produits_boutique` n'a pas non plus de colonne `updated_at` (vérifié),
 * `created_at` sert de repli. Requête à part de `lireProduitsPublies()`
 * (lib/produits.ts) plutôt que d'étendre son SELECT pour un besoin propre
 * au sitemap — ce fichier reste le seul modifié par ce chantier.
 */
async function lireDatesProduits(): Promise<Record<string, Date>> {
  try {
    const supabase = createStaticClient()
    const { data, error } = await supabase.from('produits_boutique').select('slug, created_at').eq('publie', true)
    if (error || !data) return {}
    return Object.fromEntries(data.map((p) => [p.slug, new Date(p.created_at)]))
  } catch {
    return {}
  }
}
const datesProduits = unstable_cache(lireDatesProduits, ['sitemap-dates-produits'], {
  revalidate: 3600,
  tags: [ETIQUETTE_PRODUITS],
})

/**
 * Une fonction de date par route qui lit réellement la base — toute route
 * absente de cette table retombe sur `DATE_CONTENU_STATIQUE`. Séparée de
 * `ROUTES_BILINGUES` plus bas : « a du contenu en anglais » et « a une
 * vraie date de modification » sont deux questions indépendantes.
 */
const DATES_PAR_ROUTE: Partial<Record<string, () => Promise<Date>>> = {
  [ROUTES.accueil]: () =>
    dateEmplacements(['besoin_1', 'besoin_2', 'besoin_3', 'besoin_4', 'operations_terrain', 'deployment_camion']),
  [ROUTES.installations]: () => dateEmplacements(['capacite_installations']),
  [ROUTES.lab]: () => dateEmplacements(['lab_1', 'lab_2', 'lab_3', 'lab_4', 'lab_5', 'lab_6', 'lab_7']),
  [ROUTES.apropos]: () => dateEmplacements(['apropos_1']),
  [ROUTES.carrieres]: dateCarrieres,
  [ROUTES.realisations]: dateRealisations,
  [ROUTES.boutique]: async () => plusRecente(Object.values(await datesProduits())) ?? DATE_CONTENU_STATIQUE,
}

async function dateDeLaRoute(chemin: string): Promise<Date> {
  const lire = DATES_PAR_ROUTE[chemin]
  return lire ? lire() : DATE_CONTENU_STATIQUE
}

/**
 * Pages de contenu public, exclusion volontaire des pages utilitaires
 * (connexion, inscription, panier, étapes de commande) : aucune valeur de
 * référencement propre, et certaines dépendent d'une session — les mêmes
 * chemins sont bloqués dans `robots.ts`.
 */
const ROUTES_STATIQUES = [
  ROUTES.accueil,
  ROUTES.capacites,
  ...ROUTES_CAPACITES.map((r) => r.href),
  ROUTES.realisations,
  ROUTES.location,
  ROUTES.boutique,
  ROUTES.apropos,
  ROUTES.carrieres,
  ROUTES.contact,
  ROUTES.politiqueConfidentialite,
  ROUTES.conditionsUtilisation,
]

/**
 * Phase 9 : SEULES ces routes ont un contenu anglais réel aujourd'hui. Leur
 * donner un hreflang vers /en/... est vrai. En donner un à une page dont
 * /en/... sert encore le texte français serait un mensonge de référencement
 * — Google indexerait un « alternate » qui n'en est pas un. Cette liste
 * s'allonge au fur et à mesure que chaque page est réellement traduite —
 * restent hors de cette liste (checkpoint 2, pas encore fait) : pages
 * légales, Panier, Commande, Compte, Inscription, Connexion, Mot de passe,
 * Aide.
 */
const ROUTES_BILINGUES = new Set<string>([
  ROUTES.accueil,
  ROUTES.capacites,
  ...ROUTES_CAPACITES.map((r) => r.href),
  // Phase 9, checkpoint 2 — priorité a) et b).
  ROUTES.carrieres,
  ROUTES.apropos,
  ROUTES.contact,
  ROUTES.location,
  // Priorité c).
  ROUTES.realisations,
  ROUTES.boutique,
  // Priorité d).
  ROUTES.politiqueConfidentialite,
  ROUTES.conditionsUtilisation,
])

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const reglages = await lireReglages()

  // Boutique désactivée (0029) : ni la page catalogue ni ses fiches produit
  // n'existent plus (boutique/layout.tsx répond 404) — les lister ici
  // enverrait Google indexer des pages introuvables.
  const routesStatiques = reglages.boutiqueActive
    ? ROUTES_STATIQUES
    : ROUTES_STATIQUES.filter((chemin) => chemin !== ROUTES.boutique)

  // Une fiche produit par produit PUBLIÉ — un produit incomplet ou hors
  // ligne ne doit pas apparaître dans le sitemap, même règle que sur la page
  // boutique elle-même (lireProduitsPublies filtre déjà `publie = true`).
  // Locale arbitraire : seul p.slug est utilisé plus bas, jamais nom/texte.
  const produits = reglages.boutiqueActive ? await lireProduitsPublies('fr') : []
  const datesProduitsResolues = reglages.boutiqueActive ? await datesProduits() : {}

  const pagesStatiques: MetadataRoute.Sitemap = await Promise.all(
    routesStatiques.map(async (chemin) => {
      const lastModified = await dateDeLaRoute(chemin)

      if (ROUTES_BILINGUES.has(chemin)) {
        return {
          url: url(chemin, 'fr'),
          lastModified,
          alternates: {
            languages: {
              fr: url(chemin, 'fr'),
              en: url(chemin, 'en'),
            },
          },
        }
      }
      // Pas encore traduite : une seule entrée FR, pas de variante /en tant
      // que son contenu réel n'existe pas.
      return { url: url(chemin, 'fr'), lastModified }
    }),
  )

  // Fiches produit : les treize produits publiés ont tous nom_en/description_en
  // remplis (vérifié en direct, un seul manquait et a été traduit pendant
  // cette phase) — hreflang vrai pour chacune.
  const pagesProduits: MetadataRoute.Sitemap = produits.map((p) => ({
    url: url(`${ROUTES.boutique}/${p.slug}`, 'fr'),
    lastModified: datesProduitsResolues[p.slug] ?? DATE_CONTENU_STATIQUE,
    alternates: {
      languages: {
        fr: url(`${ROUTES.boutique}/${p.slug}`, 'fr'),
        en: url(`${ROUTES.boutique}/${p.slug}`, 'en'),
      },
    },
  }))

  return [...pagesStatiques, ...pagesProduits]
}
