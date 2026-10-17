import 'server-only'

import { createHash } from 'node:crypto'

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * La table `evenements_visite` (0058) n'existe pas encore dans le type
 * `Database` généré : on accède donc via un `SupabaseClient` générique. Le cast
 * ne change que le typage — le client sous-jacent, son auth et la RLS sont
 * inchangés (même motif `as unknown as` que lib/location-produits.ts).
 */
const TABLE = 'evenements_visite'

/**
 * Analytique interne — capture et lecture des visites (table
 * `evenements_visite`, migration 0058).
 *
 * ---------------------------------------------------------------------------
 * DEUX CHEMINS, DEUX CLIENTS SUPABASE
 *
 * - ÉCRITURE (`enregistrerVisite`) : service role (`getSupabaseAdmin`), appelé
 *   seulement par /api/vue. Le public n'a aucun accès direct à la table
 *   (RLS + grants révoqués, 0058). Ne lève jamais : une visite manquée ne doit
 *   pas casser une requête de page.
 * - LECTURE (`lireStatistiques`) : client de SESSION sous RLS, comme toutes les
 *   pages d'admin. La policy « équipe » de 0058 décide. Jamais le service role
 *   pour l'affichage — même discipline que /admin/demandes.
 *
 * ---------------------------------------------------------------------------
 * VIE PRIVÉE
 *
 * Aucune donnée personnelle : pas de cookie, pas d'IP stockée, pas d'URL
 * complète. `visiteur_jour` est un hash journalier non réversible ; il compte
 * les visiteurs uniques d'une journée sans suivre personne dans le temps.
 */

/**
 * Robots à ne PAS compter comme visiteurs : crawlers d'indexation, aperçus de
 * lien (Facebook, WhatsApp...), moniteurs de disponibilité, navigateurs sans
 * tête (tests, scraping). Un user-agent VIDE est traité comme suspect — un vrai
 * navigateur en envoie toujours un. Filtrage à la CAPTURE : la ligne n'est
 * jamais écrite, donc jamais affichée dans le tableau de bord.
 *
 * Tokens volontairement spécifiques pour ne jamais frapper un vrai navigateur :
 * « applebot » (pas « apple », présent dans tout Safari via AppleWebKit),
 * « facebot » (pas « facebook », présent dans l'app mobile d'un vrai usager).
 */
function estRobot(ua: string | null): boolean {
  if (!ua || ua.trim() === '') return true
  return /bot|crawl|spider|slurp|mediapartners|facebookexternalhit|facebot|bingpreview|crawler|whatsapp|telegram|discord|embedly|pinterest|redditbot|applebot|yandex|baidu|duckduckbot|semrush|ahrefs|mj12|dotbot|petalbot|bytespider|gptbot|claudebot|ccbot|chrome-lighthouse|headless|phantom|puppeteer|playwright|python-requests|curl|wget|axios|go-http|node-fetch|okhttp|monitor|uptime|pingdom|statuscake|site24x7|newrelic|datadog|vercel/i.test(
    ua,
  )
}

/** 'mobile' | 'tablette' | 'bureau' à partir du user-agent. */
function appareilDepuisUA(ua: string | null): string | null {
  if (!ua) return null
  const u = ua.toLowerCase()
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(u)) return 'tablette'
  if (/mobi|iphone|ipod|android|blackberry|phone/.test(u)) return 'mobile'
  return 'bureau'
}

/** Domaine de provenance, ou 'direct'. Jamais l'URL complète (vie privée). */
function domaineReferrer(ref: unknown): string {
  if (typeof ref !== 'string' || ref.trim() === '') return 'direct'
  try {
    const hote = new URL(ref).hostname.replace(/^www\./, '')
    const site = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ko-lab.ca').hostname.replace(
      /^www\./,
      '',
    )
    if (hote === '' || hote === site) return 'direct'
    return hote.slice(0, 120)
  } catch {
    return 'direct'
  }
}

/**
 * Hash journalier anonyme. sha256(ip | user-agent | jour | secret), tronqué.
 * Le jour en UTC (Vercel tourne en UTC) pour que « aujourd'hui » soit cohérent
 * entre l'écriture et la lecture. Le secret empêche de reconstruire le hash à
 * partir d'une IP devinée ; il n'est jamais stocké, l'IP non plus.
 */
function hashVisiteurJour(ip: string, ua: string | null): string {
  const jour = new Date().toISOString().slice(0, 10)
  const sel = process.env.REVALIDATION_TOKEN ?? process.env.CRON_SECRET ?? 'ko-lab-analytique'
  return createHash('sha256').update(`${ip}|${ua ?? ''}|${jour}|${sel}`).digest('hex').slice(0, 32)
}

/** Chemin sûr : sans query ni ancre, borné, sans caractère douteux. `null` si invalide. */
function nettoyerChemin(brut: unknown): string | null {
  if (typeof brut !== 'string') return null
  const chemin = (brut.split('?')[0] ?? '').split('#')[0]?.trim() ?? ''
  if (!chemin.startsWith('/') || chemin.length > 300) return null
  // Pas d'espaces ni de chevrons/guillemets : un chemin d'URL n'en contient pas,
  // et ça ferme la porte à une valeur bricolée.
  if (/[\s<>"'`\\]/.test(chemin)) return null
  return chemin
}

/**
 * Enregistre une visite. Toute entrée invalide est ignorée silencieusement
 * (on ne renvoie pas d'erreur exploitable à un appelant anonyme). Ne lève jamais.
 */
export async function enregistrerVisite(params: {
  chemin: unknown
  referrer: unknown
  locale: unknown
  ip: string
  ua: string | null
  pays: string | null
}): Promise<void> {
  // Robots : jamais comptés (crawlers, aperçus de lien, moniteurs, headless).
  if (estRobot(params.ua)) return

  const chemin = nettoyerChemin(params.chemin)
  if (!chemin) return

  const locale = params.locale === 'fr' || params.locale === 'en' ? params.locale : null
  const pays =
    typeof params.pays === 'string' && /^[A-Za-z]{2}$/.test(params.pays)
      ? params.pays.toUpperCase()
      : null

  try {
    const supabase = getSupabaseAdmin() as unknown as SupabaseClient
    await supabase.from(TABLE).insert({
      chemin,
      referrer: domaineReferrer(params.referrer),
      pays,
      appareil: appareilDepuisUA(params.ua),
      locale,
      visiteur_jour: hashVisiteurJour(params.ip, params.ua),
    })
  } catch (e) {
    console.error('[analytique] insertion visite échouée :', e instanceof Error ? e.message : e)
  }
}

export type Classement = { libelle: string; valeur: number }

export type Statistiques = {
  pagesVues: number
  visiteurs: number
  pagesVuesAujourdhui: number
  visiteursAujourdhui: number
  /** Une valeur par jour, du plus ancien au plus récent (longueur = jours). */
  serie: number[]
  topPages: Classement[]
  topReferrers: Classement[]
  topPays: Classement[]
  appareils: Classement[]
  /** `true` si la fenêtre a été plafonnée (volume au-delà de la limite lue). */
  tronque: boolean
}

type LigneVisite = {
  chemin: string
  referrer: string | null
  pays: string | null
  appareil: string | null
  cree_le: string
  visiteur_jour: string
}

/** Agrège les N premières entrées d'un comptage, triées décroissant. */
function classer(compte: Map<string, number>, n: number): Classement[] {
  return [...compte.entries()]
    .map(([libelle, valeur]) => ({ libelle, valeur }))
    .sort((a, b) => b.valeur - a.valeur)
    .slice(0, n)
}

/** Clé de jour UTC (AAAA-MM-JJ) d'un horodatage ISO. */
function jourDe(iso: string): string {
  return iso.slice(0, 10)
}

const LIMITE_LECTURE = 50_000

/**
 * Statistiques des `jours` derniers jours. Lit les lignes de la fenêtre sous
 * RLS (équipe) et agrège en mémoire — suffisant pour le volume d'un site qui
 * démarre, et sans RPC SQL à maintenir. Plafonné à `LIMITE_LECTURE` lignes :
 * au-delà, on marque `tronque` et le jour le plus ancien peut être partiel.
 *
 * Table absente (0058 pas encore jouée) ou base injoignable : renvoie des
 * compteurs à zéro, le tableau de bord affiche « aucune donnée » sans planter.
 */
export async function lireStatistiques(jours = 30): Promise<Statistiques> {
  const vide: Statistiques = {
    pagesVues: 0,
    visiteurs: 0,
    pagesVuesAujourdhui: 0,
    visiteursAujourdhui: 0,
    serie: Array.from({ length: jours }, () => 0),
    topPages: [],
    topReferrers: [],
    topPays: [],
    appareils: [],
    tronque: false,
  }

  try {
    const supabase = (await createClient()) as unknown as SupabaseClient
    const depuis = new Date(Date.now() - jours * 86_400_000).toISOString()

    const { data, error } = await supabase
      .from(TABLE)
      .select('chemin, referrer, pays, appareil, cree_le, visiteur_jour')
      .gte('cree_le', depuis)
      .order('cree_le', { ascending: false })
      .limit(LIMITE_LECTURE)

    if (error || !data) return vide
    const lignes = data as unknown as LigneVisite[]
    if (lignes.length === 0) return vide

    const aujourdhui = new Date().toISOString().slice(0, 10)

    const parPage = new Map<string, number>()
    const parReferrer = new Map<string, number>()
    const parPays = new Map<string, number>()
    const parAppareil = new Map<string, number>()
    const visiteursUniques = new Set<string>()
    const visiteursJour = new Set<string>()
    let pagesVuesAujourdhui = 0

    // Série : un seau par jour, du plus ancien (index 0) au plus récent.
    const seaux = new Map<string, number>()
    for (let i = 0; i < jours; i += 1) {
      const d = new Date(Date.now() - (jours - 1 - i) * 86_400_000).toISOString().slice(0, 10)
      seaux.set(d, 0)
    }

    for (const l of lignes) {
      parPage.set(l.chemin, (parPage.get(l.chemin) ?? 0) + 1)
      const ref = l.referrer ?? 'direct'
      parReferrer.set(ref, (parReferrer.get(ref) ?? 0) + 1)
      const pays = l.pays ?? 'Inconnu'
      parPays.set(pays, (parPays.get(pays) ?? 0) + 1)
      const app = l.appareil ?? 'Inconnu'
      parAppareil.set(app, (parAppareil.get(app) ?? 0) + 1)
      visiteursUniques.add(l.visiteur_jour)

      const jour = jourDe(l.cree_le)
      if (seaux.has(jour)) seaux.set(jour, (seaux.get(jour) ?? 0) + 1)
      if (jour === aujourdhui) {
        pagesVuesAujourdhui += 1
        visiteursJour.add(l.visiteur_jour)
      }
    }

    return {
      pagesVues: lignes.length,
      visiteurs: visiteursUniques.size,
      pagesVuesAujourdhui,
      visiteursAujourdhui: visiteursJour.size,
      serie: [...seaux.values()],
      topPages: classer(parPage, 8),
      topReferrers: classer(parReferrer, 8),
      topPays: classer(parPays, 6),
      appareils: classer(parAppareil, 4),
      tronque: lignes.length >= LIMITE_LECTURE,
    }
  } catch {
    return vide
  }
}
