'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { headers } from 'next/headers'
import { z } from 'zod'

import { exigerRole } from '@/lib/auth/garde'
import { ETIQUETTE_CONCOURS } from '@/lib/concours'
import { adresseDepuis } from '@/lib/utils/adresseClient'
import { estUuid } from '@/lib/utils/identifiant'
import { rateLimit } from '@/lib/utils/rateLimit'
import { ROLES_EQUIPE } from '@/types'

import type { createClient } from '@/lib/supabase/server'

/**
 * CRUD des concours — tables `concours`, `concours_photos`, `concours_liens`
 * (migration 0040).
 *
 * ---------------------------------------------------------------------------
 * QUI PEUT QUOI, ET OÙ C'EST DÉCIDÉ
 *
 * Les politiques de 0040 font foi :
 *   concours_insertion_equipe / concours_maj_equipe    admin + editor
 *   concours_suppression_admin                          ADMIN SEUL
 *   concours_photos_*, concours_liens_* (insert/maj/suppr)   admin + editor
 *
 * Ces actions ne re-vérifient donc pas le rôle au-delà d'`exigerRole()` :
 * elles passent par le client de SESSION, et RLS refuse ce qui doit l'être.
 * La suppression du concours principal appelle `exigerRole(['admin'])`
 * explicitement — même si un editor ne pourrait de toute façon rien
 * supprimer (RLS renvoie 200 avec un tableau vide, pas une erreur),
 * l'interface ne doit jamais proposer un bouton qui échoue en silence :
 * voir supprimerConcours.
 *
 * ---------------------------------------------------------------------------
 * SLUG — MODIFIABLE, À LA DIFFÉRENCE DE realisations/produits_boutique
 *
 * Ces deux-là dérivent et cachent le slug (décision de Christian : « le slug
 * doit être automatique »). Concours demande explicitement l'inverse : une
 * proposition dérivée du titre FR, mais un champ visible et modifiable — le
 * format est donc validé ici (mêmes règles que `slugifier` produit), la
 * collision gérée comme une erreur normale du formulaire plutôt que par une
 * boucle de suffixes automatique.
 * ---------------------------------------------------------------------------
 */

type ClientSession = Awaited<ReturnType<typeof createClient>>

export type EtatConcours = {
  erreur?: 'donnees' | 'slug' | 'refuse' | 'serveur'
  succes?: boolean
}

const REGEX_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/

const champTexteOptionnel = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null)

const champDateOptionnelle = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || null)
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), { message: 'date-invalide' })

const schemaConcours = z.object({
  slug: z.string().trim().min(1).max(80).regex(REGEX_SLUG),
  titre_fr: z.string().trim().min(2).max(150),
  titre_en: champTexteOptionnel(150),
  accroche_fr: champTexteOptionnel(300),
  accroche_en: champTexteOptionnel(300),
  description_fr: z.string().trim().min(2).max(3000),
  description_en: champTexteOptionnel(3000),
  reglement_fr: champTexteOptionnel(8000),
  reglement_en: champTexteOptionnel(8000),
  date_debut: champDateOptionnelle,
  date_fin: champDateOptionnelle,
  publie: z.boolean(),
})

function lireChamps(donnees: FormData) {
  return schemaConcours.safeParse({
    slug: String(donnees.get('slug') ?? '').trim(),
    titre_fr: donnees.get('titre_fr'),
    titre_en: donnees.get('titre_en'),
    accroche_fr: donnees.get('accroche_fr'),
    accroche_en: donnees.get('accroche_en'),
    description_fr: donnees.get('description_fr'),
    description_en: donnees.get('description_en'),
    reglement_fr: donnees.get('reglement_fr'),
    reglement_en: donnees.get('reglement_en'),
    date_debut: donnees.get('date_debut'),
    date_fin: donnees.get('date_fin'),
    publie: donnees.get('publie') === 'true',
  })
}

/** 23505 = violation d'unicité — le seul index unique ici porte sur `slug`. */
const slugDejaPris = (code?: string) => code === '23505'

export async function creerConcours(_precedent: EtatConcours, donnees: FormData): Promise<EtatConcours> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const analyse = lireChamps(donnees)
  if (!analyse.success) return { erreur: 'donnees' }

  try {
    const acces = await exigerRole(ROLES_EQUIPE)
    if (!acces) return { erreur: 'refuse' }
    const { supabase } = acces

    const { error } = await supabase.from('concours').insert(analyse.data)

    if (error) {
      if (slugDejaPris(error.code)) return { erreur: 'slug' }
      console.error('[concours] création refusée', error.message)
      return { erreur: 'refuse' }
    }
  } catch (err) {
    console.error('[concours] échec création', err)
    return { erreur: 'serveur' }
  }

  updateTag(ETIQUETTE_CONCOURS)
  revalidatePath(`/${locale}/admin/concours`)
  return { succes: true }
}

export async function modifierConcours(_precedent: EtatConcours, donnees: FormData): Promise<EtatConcours> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const id = String(donnees.get('id') ?? '')
  if (!estUuid(id)) return { erreur: 'donnees' }

  const analyse = lireChamps(donnees)
  if (!analyse.success) return { erreur: 'donnees' }

  try {
    const acces = await exigerRole(ROLES_EQUIPE)
    if (!acces) return { erreur: 'refuse' }
    const { supabase } = acces

    const { error } = await supabase.from('concours').update(analyse.data).eq('id', id)

    if (error) {
      if (slugDejaPris(error.code)) return { erreur: 'slug' }
      console.error('[concours] mise à jour refusée', error.message)
      return { erreur: 'refuse' }
    }
  } catch (err) {
    console.error('[concours] échec mise à jour', err)
    return { erreur: 'serveur' }
  }

  updateTag(ETIQUETTE_CONCOURS)
  revalidatePath(`/${locale}/admin/concours`)
  return { succes: true }
}

/** Publication / retrait — geste séparé du formulaire complet, le plus fréquent. */
export async function basculerPublicationConcours(donnees: FormData): Promise<void> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const id = String(donnees.get('id') ?? '')
  const publie = donnees.get('publie') === 'true'
  if (!estUuid(id)) return

  try {
    const acces = await exigerRole(ROLES_EQUIPE)
    if (!acces) return
    const { supabase } = acces
    const { error } = await supabase.from('concours').update({ publie: !publie }).eq('id', id)
    if (error) console.error('[concours] bascule refusée', error.message)
  } catch (err) {
    console.error('[concours] échec bascule', err)
  }

  updateTag(ETIQUETTE_CONCOURS)
  revalidatePath(`/${locale}/admin/concours`)
}

/**
 * Suppression du concours — réservée à l'ADMIN (concours_suppression_admin),
 * à la différence de ses photos et liens. `exigerRole(['admin'])` explicite,
 * pas seulement ROLES_EQUIPE : sans ce contrôle, un editor verrait le bouton
 * répondre « rien ne s'est passé » sans un mot d'explication — RLS renvoie un
 * tableau vide sur un DELETE filtré, jamais une erreur (voir la note
 * d'en-tête de ce fichier). L'interface (TableauConcours) n'affiche déjà le
 * bouton qu'à `estAdmin`, cette vérification est le second verrou, pas le
 * premier — un masquage d'interface n'a jamais été une barrière de sécurité.
 */
export async function supprimerConcours(donnees: FormData): Promise<void> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const id = String(donnees.get('id') ?? '')
  if (!estUuid(id)) return

  try {
    const acces = await exigerRole(['admin'])
    if (!acces) return
    const { supabase } = acces
    // `on delete cascade` (0040) retire aussi ses photos et liens — les
    // fichiers du bucket, eux, ne sont pas nettoyés : même choix que
    // supprimerRealisation, un orphelin coûte de l'espace, pas une panne.
    const { data, error } = await supabase.from('concours').delete().eq('id', id).select('id')

    if (error) console.error('[concours] suppression refusée', error.message)
    else if (!data || data.length === 0) {
      console.warn('[concours] suppression sans effet — RLS a filtré, rôle insuffisant ?')
    }
  } catch (err) {
    console.error('[concours] échec suppression', err)
  }

  updateTag(ETIQUETTE_CONCOURS)
  revalidatePath(`/${locale}/admin/concours`)
}

/* ============================================================================
 * PHOTOS — concours_photos
 * ========================================================================== */

export type EtatPhotoConcours = {
  erreur?: 'donnees' | 'refuse' | 'fichier' | 'serveur'
  succes?: boolean
}

// 4 Mo, pas 5 — voir next.config.ts (plafond Vercel de 4,5 Mo par requête).
const TAILLE_PHOTO_MAX = 4 * 1024 * 1024
const TYPES_PHOTO = ['image/webp', 'image/jpeg', 'image/png', 'image/avif']

const schemaPhoto = z.object({
  concours_id: z.string().uuid(),
  alt_fr: z.string().trim().min(1).max(200),
  alt_en: champTexteOptionnel(200),
})

export async function ajouterPhotoConcours(
  _precedent: EtatPhotoConcours,
  donnees: FormData,
): Promise<EtatPhotoConcours> {
  const analyse = schemaPhoto.safeParse({
    concours_id: donnees.get('concours_id'),
    alt_fr: donnees.get('alt_fr'),
    alt_en: donnees.get('alt_en'),
  })
  if (!analyse.success) return { erreur: 'donnees' }

  const fichier = donnees.get('fichier')
  if (!(fichier instanceof File) || fichier.size === 0) return { erreur: 'fichier' }
  if (fichier.size > TAILLE_PHOTO_MAX || !TYPES_PHOTO.includes(fichier.type)) return { erreur: 'fichier' }

  // Même plafond que les photos de réalisations, sous une clé séparée : les
  // deux écrans ne doivent pas partager le même budget.
  if (rateLimit(`photo-concours:${adresseDepuis(await headers())}`, { max: 30, windowMs: 600_000 })) {
    return { erreur: 'serveur' }
  }

  try {
    const acces = await exigerRole(ROLES_EQUIPE)
    if (!acces) return { erreur: 'refuse' }
    const { supabase } = acces

    const extension = fichier.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'webp'
    const chemin = `${analyse.data.concours_id}/${Date.now()}.${extension}`

    const { error: erreurUpload } = await supabase.storage
      .from('concours')
      .upload(chemin, fichier, { contentType: fichier.type, upsert: false })

    if (erreurUpload) {
      console.error('[concours] téléversement refusé', erreurUpload.message)
      return { erreur: 'fichier' }
    }

    const { data: urlPublique } = supabase.storage.from('concours').getPublicUrl(chemin)

    const ordre = await prochainOrdre(supabase, 'concours_photos', analyse.data.concours_id)

    const { error } = await supabase.from('concours_photos').insert({
      concours_id: analyse.data.concours_id,
      url_stockage: urlPublique.publicUrl,
      alt_fr: analyse.data.alt_fr,
      alt_en: analyse.data.alt_en,
      ordre,
    })

    if (error) {
      console.error('[concours] enregistrement de la photo refusé', error.message)
      // Le fichier est déjà déposé : on le retire pour ne pas laisser un
      // orphelin dans le stockage.
      await supabase.storage.from('concours').remove([chemin])
      return { erreur: 'refuse' }
    }
  } catch (err) {
    console.error('[concours] échec ajout photo', err)
    return { erreur: 'serveur' }
  }

  updateTag(ETIQUETTE_CONCOURS)
  return { succes: true }
}

/**
 * Préfixe des URL publiques du bucket `concours` — sert à retrouver le
 * chemin de stockage à partir de l'URL persistée, pour le supprimer.
 */
const PREFIXE_PUBLIC_CONCOURS = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/concours/`

function cheminDepuisUrl(url: string): string | null {
  if (!url.startsWith(PREFIXE_PUBLIC_CONCOURS)) return null
  const chemin = url.slice(PREFIXE_PUBLIC_CONCOURS.length)
  return chemin === '' || chemin.includes('..') ? null : chemin
}

export async function supprimerPhotoConcours(donnees: FormData): Promise<void> {
  const id = String(donnees.get('photo_id') ?? '')
  if (!estUuid(id)) return

  try {
    const acces = await exigerRole(ROLES_EQUIPE)
    if (!acces) return
    const { supabase } = acces

    const { data: photo } = await supabase
      .from('concours_photos')
      .select('url_stockage')
      .eq('id', id)
      .maybeSingle()

    const { error } = await supabase.from('concours_photos').delete().eq('id', id)
    if (error) {
      console.error('[concours] suppression de photo refusée', error.message)
      return
    }

    const chemin = photo ? cheminDepuisUrl(photo.url_stockage) : null
    if (chemin) {
      const { error: erreurStockage } = await supabase.storage.from('concours').remove([chemin])
      if (erreurStockage) console.error('[concours] fichier orphelin non nettoyé', erreurStockage.message)
    }
  } catch (err) {
    console.error('[concours] échec suppression de photo', err)
  }

  updateTag(ETIQUETTE_CONCOURS)
}

export async function deplacerPhotoConcours(donnees: FormData): Promise<void> {
  const id = String(donnees.get('photo_id') ?? '')
  const sens = String(donnees.get('sens') ?? '')
  if (!estUuid(id) || (sens !== 'haut' && sens !== 'bas')) return

  try {
    const acces = await exigerRole(ROLES_EQUIPE)
    if (!acces) return
    await deplacerDansSerie(acces.supabase, 'concours_photos', id, sens)
  } catch (err) {
    console.error('[concours] échec déplacement de photo', err)
  }

  updateTag(ETIQUETTE_CONCOURS)
}

/* ============================================================================
 * LIENS — concours_liens
 * ========================================================================== */

export type EtatLienConcours = {
  erreur?: 'donnees' | 'url' | 'refuse' | 'serveur'
  succes?: boolean
}

const schemaLien = z.object({
  concours_id: z.string().uuid(),
  libelle_fr: z.string().trim().min(1).max(120),
  libelle_en: champTexteOptionnel(120),
  // Libre par ailleurs (Facebook, YouTube, site externe...) : aucune
  // contrainte de domaine voulue, seul le protocole est vérifié.
  url: z.string().trim().max(500).startsWith('https://'),
})

export async function ajouterLienConcours(
  _precedent: EtatLienConcours,
  donnees: FormData,
): Promise<EtatLienConcours> {
  const analyse = schemaLien.safeParse({
    concours_id: donnees.get('concours_id'),
    libelle_fr: donnees.get('libelle_fr'),
    libelle_en: donnees.get('libelle_en'),
    url: String(donnees.get('url') ?? '').trim(),
  })
  if (!analyse.success) {
    const urlEnCause = analyse.error.issues.some((i) => i.path[0] === 'url')
    return { erreur: urlEnCause ? 'url' : 'donnees' }
  }

  try {
    const acces = await exigerRole(ROLES_EQUIPE)
    if (!acces) return { erreur: 'refuse' }
    const { supabase } = acces

    const ordre = await prochainOrdre(supabase, 'concours_liens', analyse.data.concours_id)

    const { error } = await supabase.from('concours_liens').insert({ ...analyse.data, ordre })

    if (error) {
      console.error('[concours] ajout de lien refusé', error.message)
      return { erreur: 'refuse' }
    }
  } catch (err) {
    console.error('[concours] échec ajout de lien', err)
    return { erreur: 'serveur' }
  }

  updateTag(ETIQUETTE_CONCOURS)
  return { succes: true }
}

export async function supprimerLienConcours(donnees: FormData): Promise<void> {
  const id = String(donnees.get('lien_id') ?? '')
  if (!estUuid(id)) return

  try {
    const acces = await exigerRole(ROLES_EQUIPE)
    if (!acces) return
    const { error } = await acces.supabase.from('concours_liens').delete().eq('id', id)
    if (error) console.error('[concours] suppression de lien refusée', error.message)
  } catch (err) {
    console.error('[concours] échec suppression de lien', err)
  }

  updateTag(ETIQUETTE_CONCOURS)
}

export async function deplacerLienConcours(donnees: FormData): Promise<void> {
  const id = String(donnees.get('lien_id') ?? '')
  const sens = String(donnees.get('sens') ?? '')
  if (!estUuid(id) || (sens !== 'haut' && sens !== 'bas')) return

  try {
    const acces = await exigerRole(ROLES_EQUIPE)
    if (!acces) return
    await deplacerDansSerie(acces.supabase, 'concours_liens', id, sens)
  } catch (err) {
    console.error('[concours] échec déplacement de lien', err)
  }

  updateTag(ETIQUETTE_CONCOURS)
}

/* ============================================================================
 * Utilitaires communs aux deux séries (photos, liens)
 * ========================================================================== */

/** Le plus GRAND `ordre` existant + 10 : un ajout apparaît à la fin de la série. */
async function prochainOrdre(
  supabase: ClientSession,
  table: 'concours_photos' | 'concours_liens',
  concoursId: string,
): Promise<number> {
  const { data } = await supabase
    .from(table)
    .select('ordre')
    .eq('concours_id', concoursId)
    .order('ordre', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data?.ordre ?? -10) + 10
}

/**
 * Échange la position d'une ligne avec sa voisine immédiate DANS LE MÊME
 * concours — même mécanique que `deplacerVideo` (admin/videos/actions.ts),
 * bornée par `concours_id` pour ne jamais mélanger la série de deux concours
 * différents.
 */
async function deplacerDansSerie(
  supabase: ClientSession,
  table: 'concours_photos' | 'concours_liens',
  id: string,
  sens: 'haut' | 'bas',
): Promise<void> {
  const { data: courante } = await supabase
    .from(table)
    .select('id, ordre, concours_id')
    .eq('id', id)
    .maybeSingle()
  if (!courante) return

  const { data: voisine } = await supabase
    .from(table)
    .select('id, ordre')
    .eq('concours_id', courante.concours_id)
    .order('ordre', { ascending: sens === 'bas' })
    [sens === 'bas' ? 'gt' : 'lt']('ordre', courante.ordre)
    .limit(1)
    .maybeSingle()

  if (!voisine) return

  await supabase.from(table).update({ ordre: voisine.ordre }).eq('id', courante.id)
  await supabase.from(table).update({ ordre: courante.ordre }).eq('id', voisine.id)
}
