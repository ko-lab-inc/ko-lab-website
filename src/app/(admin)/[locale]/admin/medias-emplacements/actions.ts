'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { headers } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { z } from 'zod'

import { routing } from '@/i18n/routing'
import { exigerRole } from '@/lib/auth/garde'
import { ETIQUETTE_GALERIES, PAGES_GALERIE, type PageGalerie } from '@/lib/galeries-photos'
import { DOSSIERS_MEDIAS } from '@/lib/medias-disponibles'
import { ETIQUETTE_EMPLACEMENTS_MEDIAS } from '@/lib/medias-emplacements'
import { adresseDepuis } from '@/lib/utils/adresseClient'
import { estUuid } from '@/lib/utils/identifiant'
import { rateLimit } from '@/lib/utils/rateLimit'
import { ROLES_EQUIPE } from '@/types'

import type { createClient } from '@/lib/supabase/server'

/**
 * Mise à jour d'un emplacement média — table medias_emplacements
 * (migration 0031, route A de l'architecture média).
 *
 * Pas de création ni de suppression : les neuf clés sont posées une fois par
 * la migration, cette action ne fait que REMPLACER url_stockage/alt_text_fr/
 * alt_text_en pour une clé existante. `cle` n'est jamais écrite — c'est la
 * clé primaire logique de la ligne, elle sert uniquement au WHERE.
 *
 * ⚠️ `exigerRole(['admin'])`, pas ROLES_EQUIPE. La politique medias_maj_admin
 * (0031) réserve l'UPDATE à l'admin, contrairement à la plupart des autres
 * tables de l'admin où admin et editor écrivent tous les deux — même
 * raisonnement que reglages/actions.ts : un emplacement gouverne une section
 * entière du site public, pas une seule fiche.
 *
 * Signature en arguments positionnels plutôt que (prevState, FormData) :
 * appelée directement depuis le composant client (TableauEmplacements),
 * pas via <form action={...}>/useActionState — l'édition inline n'a pas
 * besoin de ce détour, voir le composant pour le patron d'appel
 * (useTransition + await direct).
 */

export type ResultatEmplacement = { success: boolean; error?: string }

/**
 * Préfixe des fichiers publics du bucket `medias` — seule origine acceptée
 * depuis la refonte en grille de sélection (plus de saisie libre d'URL).
 *
 * ⚠️ Le client envoie une URL choisie dans une grille déjà filtrée par
 * `listerFichiersDisponibles`, mais une Server Action ne peut pas supposer
 * que la requête vient forcément de ce composant — n'importe quel appelant
 * peut poster n'importe quelle chaîne. Vérifier le PRÉFIXE ici, pas
 * seulement `https://`/`/` comme avant : accepter une URL externe
 * arbitraire aurait permis d'afficher, sous une clé du site KO-LAB,
 * n'importe quelle image hébergée ailleurs.
 */
function prefixeBucketMedias(): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  return `${base}/storage/v1/object/public/medias/`
}

/**
 * `urlStockage` accepte `null` depuis la migration 0037 (colonne devenue
 * nullable) — c'est le bouton « Retirer la photo » de SelecteurPhotoEmplacement
 * qui l'envoie. Chaîne vide traitée comme `null` : un champ vidé à la main
 * ne doit jamais finir en `''` dans une colonne qui distingue maintenant
 * « vide assumé » (NULL) d'une vraie valeur — voir resoudreEmplacement.
 */
export async function mettreAJourEmplacement(
  cle: string,
  urlStockage: string | null,
  altFr: string,
  altEn?: string | null,
): Promise<ResultatEmplacement> {
  const t = await getTranslations('Admin')

  const url = urlStockage?.trim() || null

  if (url !== null && !url.startsWith(prefixeBucketMedias())) {
    return { success: false, error: t('erreur_photo_invalide') }
  }

  try {
    const acces = await exigerRole(['admin'])
    if (!acces) return { success: false, error: t('erreur_refuse_emplacement') }
    const { supabase } = acces

    const { data: existe } = await supabase
      .from('medias_emplacements')
      .select('cle')
      .eq('cle', cle)
      .maybeSingle()

    if (!existe) return { success: false, error: t('erreur_emplacement_introuvable') }

    const { error } = await supabase
      .from('medias_emplacements')
      .update({
        url_stockage: url,
        alt_text_fr: altFr.trim(),
        alt_text_en: altEn?.trim() || null,
      })
      .eq('cle', cle)

    if (error) {
      console.error('[medias-emplacements] mise à jour refusée', error.message)
      return { success: false, error: t('erreur_serveur_emplacement') }
    }
  } catch (err) {
    console.error('[medias-emplacements] échec mise à jour', err)
    return { success: false, error: t('erreur_serveur_emplacement') }
  }

  updateTag(ETIQUETTE_EMPLACEMENTS_MEDIAS)

  // Pas de paramètre `locale` dans cette signature (demandée en 4 arguments
  // positionnels) : les deux locales admin sont revalidées explicitement
  // plutôt que d'ajouter un cinquième argument pour un besoin purement
  // technique que l'appelant n'a pas à connaître.
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/admin/medias-emplacements`)
  }

  return { success: true }
}

/**
 * Téléversement d'une nouvelle photo dans le bucket `medias`, pour
 * SelecteurPhotoEmplacement — geste distinct de `mettreAJourEmplacement` :
 * celui-ci dépose un FICHIER dans le Storage et renvoie son URL publique,
 * l'enregistrement de cette URL sur la ligne `medias_emplacements` reste le
 * rôle de `mettreAJourEmplacement` (bouton Enregistrer de la modale). Ne
 * touche donc ni la table ni son cache — pas de `updateTag`/`revalidatePath`
 * ici, rien n'a encore changé côté lecture publique tant que la ligne n'est
 * pas enregistrée.
 *
 * ---------------------------------------------------------------------------
 * MÊMES CONTRAINTES QUE /admin/realisations (construireImages, actions.ts),
 * PAS RÉINVENTÉES
 *
 * Taille et types acceptés identiques au bucket `realisations` — le bucket
 * `medias`, lui, les impose en plus au niveau de storage.buckets depuis la
 * migration 0030 (`file_size_limit`, `allowed_mime_types`) : cette
 * vérification applicative est un second filet, lisible pour l'utilisateur
 * AVANT l'aller-retour Storage, pas une redite inutile.
 *
 * Même nommage que `construireImages` : `<descriptif>-<Date.now()>.<ext>`,
 * pas un horodatage brut SEUL — `descriptif` vient ici de la clé
 * d'emplacement (`besoin-1`, `lab-3`, ...), qui joue le même rôle que `slug`
 * côté réalisations.
 *
 * ---------------------------------------------------------------------------
 * `dossier` : LISTE BLANCHE, JAMAIS LE CHEMIN LIBRE ENVOYÉ PAR LE CLIENT
 *
 * Le sélecteur de dossier côté client n'offre que les entrées de
 * `DOSSIERS_MEDIAS` — mais une Server Action reste appelable directement,
 * avec n'importe quelle chaîne. Sans cette revérification, un `dossier`
 * arbitraire (`../`, ou un nom hors liste) déposerait hors de l'arborescence
 * connue du bucket, exactement ce que le point 3 de la demande interdit
 * (« Ne dépose pas à la racine »).
 * ---------------------------------------------------------------------------
 */
export type ResultatTeleversementEmplacement =
  | { success: true; fichier: { chemin: string; url: string } }
  | { success: false; error: string }

const TAILLE_MAX_PHOTO_EMPLACEMENT = 5 * 1024 * 1024
const TYPES_IMAGE_EMPLACEMENT = ['image/webp', 'image/jpeg', 'image/png', 'image/avif']

export async function televerserPhotoEmplacement(
  donnees: FormData,
): Promise<ResultatTeleversementEmplacement> {
  const t = await getTranslations('Admin')

  const cle = String(donnees.get('cle') ?? '').trim()
  const dossier = String(donnees.get('dossier') ?? '')
  const fichier = donnees.get('fichier')

  if (
    !cle ||
    !(DOSSIERS_MEDIAS as readonly string[]).includes(dossier) ||
    !(fichier instanceof File) ||
    fichier.size === 0
  ) {
    return { success: false, error: t('erreur_photo') }
  }

  if (fichier.size > TAILLE_MAX_PHOTO_EMPLACEMENT || !TYPES_IMAGE_EMPLACEMENT.includes(fichier.type)) {
    return { success: false, error: t('erreur_photo') }
  }

  try {
    // ⚠️ `exigerRole(['admin'])`, même garde-fou que `mettreAJourEmplacement`
    // ci-dessus, pour la même raison documentée sur cette action : un
    // emplacement gouverne une section entière du site public. Le bucket
    // `medias` autorise `editor` à téléverser en général (migration 0030,
    // policy `medias_televersement_equipe`) — mais CE geste précis choisit la
    // photo d'un emplacement public, réservé à l'admin de bout en bout dans
    // cet écran, comme le reste de la fonctionnalité.
    const acces = await exigerRole(['admin'])
    if (!acces) return { success: false, error: t('erreur_refuse_emplacement') }
    const { supabase } = acces

    if (rateLimit(`photo-emplacement:${adresseDepuis(await headers())}`, { max: 30, windowMs: 600_000 })) {
      return { success: false, error: t('erreur_photo') }
    }

    const extension = fichier.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'webp'
    // `Date.now()` : même technique que `construireImages` (realisations) —
    // deux téléversements sur le même emplacement à la même milliseconde ne
    // doivent pas s'écraser l'un l'autre.
    const chemin = `${dossier}/${cle.replace(/_/g, '-')}-${Date.now()}.${extension}`

    const { error } = await supabase.storage
      .from('medias')
      .upload(chemin, fichier, { contentType: fichier.type, upsert: false })

    if (error) {
      console.error('[medias-emplacements] téléversement refusé', error.message)
      return { success: false, error: t('erreur_serveur_emplacement') }
    }

    const base = process.env.NEXT_PUBLIC_SUPABASE_URL
    return { success: true, fichier: { chemin, url: `${base}/storage/v1/object/public/medias/${chemin}` } }
  } catch (err) {
    console.error('[medias-emplacements] échec téléversement', err)
    return { success: false, error: t('erreur_serveur_emplacement') }
  }
}

/* ============================================================================
 * GALERIES DE PAGES — table galeries_photos (migration 0043, étape 2/3)
 * ----------------------------------------------------------------------------
 * Patron suivi : GestionPhotosConcours.tsx / concours/actions.ts
 * (ajouterPhotoConcours, supprimerPhotoConcours, deplacerPhotoConcours) —
 * mêmes mécaniques (prochain ordre, échange avec la voisine), adaptées à
 * `page` comme clé de regroupement plutôt que `concours_id`.
 *
 * ⚠️ DEUX ÉCARTS ASSUMÉS PAR RAPPORT AU PATRON CONCOURS
 *
 * 1. `exigerRole(ROLES_EQUIPE)` sur les quatre actions, jamais
 *    `exigerRole(['admin'])` — à la différence de mettreAJourEmplacement/
 *    televerserPhotoEmplacement plus haut dans ce fichier. Les emplacements
 *    fixes sont admin seul parce qu'un emplacement gouverne une section
 *    entière du site public ; une galerie « En photos » est un geste
 *    d'édition courant (ajouter/retirer une photo), demandé explicitement
 *    ouvert à l'équipe — RLS (0043, `galeries_photos_*_equipe`) fait
 *    d'ailleurs déjà foi dans ce sens, ces `exigerRole` ne font que refuser
 *    tôt plutôt que de laisser Postgres le faire.
 *
 * 2. `supprimerPhotoGalerie` NE SUPPRIME PAS le fichier du bucket —
 *    `supprimerPhotoConcours`, lui, le fait (une photo de concours n'a pas
 *    d'autre usage). Une photo de galerie peut être PARTAGÉE avec le site
 *    public par ailleurs (ex. la même image reprise sur une autre page) :
 *    supprimer la ligne retire la photo de CETTE galerie, jamais le fichier
 *    lui-même — voir GestionGaleriesPhotos.tsx pour le message affiché.
 * ============================================================================ */

type ClientSession = Awaited<ReturnType<typeof createClient>>

export type EtatPhotoGalerie = {
  erreur?: 'donnees' | 'refuse' | 'fichier' | 'serveur'
  succes?: boolean
}

export type ResultatGalerie = { success: boolean; error?: string }

const TAILLE_MAX_PHOTO_GALERIE = 5 * 1024 * 1024
const TYPES_PHOTO_GALERIE = ['image/webp', 'image/jpeg', 'image/png', 'image/avif']

/**
 * Dossier de destination — STABLE, jamais demandé à l'utilisateur (à la
 * différence du sélecteur de dossier de SelecteurPhotoEmplacement, où la clé
 * ne prédit pas fiablement le dossier). Une page de galerie, elle, a
 * toujours déposé ses photos existantes dans un seul dossier — voir la
 * migration 0043 pour la vérification faite avant de fixer cette
 * correspondance.
 */
const DOSSIER_PAR_PAGE: Record<PageGalerie, string> = {
  'operations-terrain': 'operations',
  installations: 'installations',
  'le-lab': 'lab',
  equipements: 'deployment',
  location: 'rental',
}

/** Même conversion « chaîne vide → null » que partout ailleurs dans l'admin (concours/actions.ts). */
const champTexteOptionnel = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null)

const schemaPhotoGalerie = z.object({
  page: z.enum(PAGES_GALERIE),
  alt_fr: z.string().trim().min(1).max(200),
  alt_en: champTexteOptionnel(200),
})

/** Le plus GRAND `ordre` existant pour cette page + 10 : un ajout apparaît en fin de liste. */
async function prochainOrdreGalerie(supabase: ClientSession, page: PageGalerie): Promise<number> {
  const { data } = await supabase
    .from('galeries_photos')
    .select('ordre')
    .eq('page', page)
    .order('ordre', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data?.ordre ?? -10) + 10
}

/**
 * Échange la position d'une ligne avec sa voisine immédiate DANS LA MÊME
 * PAGE — même mécanique que `deplacerDansSerie` (concours/actions.ts) et
 * `deplacerVideo` (admin/videos/actions.ts), bornée par `page` pour ne
 * jamais mélanger l'ordre de deux galeries différentes.
 */
async function deplacerDansGalerie(
  supabase: ClientSession,
  id: string,
  sens: 'haut' | 'bas',
): Promise<void> {
  const { data: courante } = await supabase
    .from('galeries_photos')
    .select('id, ordre, page')
    .eq('id', id)
    .maybeSingle()
  if (!courante) return

  const { data: voisine } = await supabase
    .from('galeries_photos')
    .select('id, ordre')
    .eq('page', courante.page)
    .order('ordre', { ascending: sens === 'bas' })
    [sens === 'bas' ? 'gt' : 'lt']('ordre', courante.ordre)
    .limit(1)
    .maybeSingle()
  if (!voisine) return

  await supabase.from('galeries_photos').update({ ordre: voisine.ordre }).eq('id', courante.id)
  await supabase.from('galeries_photos').update({ ordre: courante.ordre }).eq('id', voisine.id)
}

/**
 * Ajoute une photo à la galerie d'une page — dépôt dans le bucket `medias`
 * (dossier déterminé par `page`, jamais par le client) puis insertion dans
 * `galeries_photos`. `alt_fr` est exigé ICI, au moment du téléversement,
 * jamais laissé à remplir plus tard (demande explicite — un alt qu'on
 * remplit plus tard ne se remplit jamais).
 *
 * Signature `(prevState, FormData)` : appelée via `useActionState` +
 * `<form action={...}>`, comme `ajouterPhotoConcours` — GestionGaleriesPhotos
 * enchaîne `router.refresh()` côté client après un succès, cette action ne
 * fait donc pas de `revalidatePath` sur la page ADMIN (seulement
 * `updateTag` pour la lecture PUBLIQUE, qui n'existe pas encore — étape 3).
 */
export async function ajouterPhotoGalerie(
  _precedent: EtatPhotoGalerie,
  donnees: FormData,
): Promise<EtatPhotoGalerie> {
  const analyse = schemaPhotoGalerie.safeParse({
    page: donnees.get('page'),
    alt_fr: donnees.get('alt_fr'),
    alt_en: donnees.get('alt_en'),
  })
  if (!analyse.success) return { erreur: 'donnees' }

  const fichier = donnees.get('fichier')
  if (!(fichier instanceof File) || fichier.size === 0) return { erreur: 'fichier' }
  if (fichier.size > TAILLE_MAX_PHOTO_GALERIE || !TYPES_PHOTO_GALERIE.includes(fichier.type)) {
    return { erreur: 'fichier' }
  }

  // Même plafond que les emplacements et les réalisations, sous une clé
  // séparée : les trois écrans ne doivent pas partager le même budget.
  if (rateLimit(`photo-galerie:${adresseDepuis(await headers())}`, { max: 30, windowMs: 600_000 })) {
    return { erreur: 'serveur' }
  }

  try {
    const acces = await exigerRole(ROLES_EQUIPE)
    if (!acces) return { erreur: 'refuse' }
    const { supabase } = acces

    const dossier = DOSSIER_PAR_PAGE[analyse.data.page]
    const extension = fichier.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'webp'
    // `<page>-<Date.now()>.<ext>` : même technique que
    // televerserPhotoEmplacement — la page joue le même rôle descriptif
    // que la clé d'emplacement, Date.now() évite toute collision.
    const chemin = `${dossier}/${analyse.data.page}-${Date.now()}.${extension}`

    const { error: erreurUpload } = await supabase.storage
      .from('medias')
      .upload(chemin, fichier, { contentType: fichier.type, upsert: false })

    if (erreurUpload) {
      console.error('[galeries-photos] téléversement refusé', erreurUpload.message)
      return { erreur: 'fichier' }
    }

    const { data: urlPublique } = supabase.storage.from('medias').getPublicUrl(chemin)
    const ordre = await prochainOrdreGalerie(supabase, analyse.data.page)

    const { error } = await supabase.from('galeries_photos').insert({
      page: analyse.data.page,
      url_stockage: urlPublique.publicUrl,
      alt_fr: analyse.data.alt_fr,
      alt_en: analyse.data.alt_en,
      ordre,
    })

    if (error) {
      console.error('[galeries-photos] enregistrement de la photo refusé', error.message)
      // Le fichier est déjà déposé : on le retire pour ne pas laisser un
      // orphelin dans le stockage.
      await supabase.storage.from('medias').remove([chemin])
      return { erreur: 'refuse' }
    }
  } catch (err) {
    console.error('[galeries-photos] échec ajout photo', err)
    return { erreur: 'serveur' }
  }

  updateTag(ETIQUETTE_GALERIES)
  return { succes: true }
}

/**
 * Modifie les textes alternatifs d'une photo déjà en galerie — geste
 * distinct de l'ajout, l'unique façon d'éditer alt_fr/alt_en après coup
 * (l'ajout ne les fixe qu'une fois). Signature en arguments positionnels,
 * comme `mettreAJourEmplacement` : appelée directement depuis le composant
 * client (édition inline au blur d'un champ), pas via `useActionState`.
 */
export async function modifierAltGalerie(
  id: string,
  altFr: string,
  altEn?: string | null,
): Promise<ResultatGalerie> {
  const t = await getTranslations('Admin')

  if (!estUuid(id)) return { success: false, error: t('erreur_donnees_galerie') }
  const fr = altFr.trim()
  if (!fr) return { success: false, error: t('erreur_alt_requis_galerie') }

  try {
    const acces = await exigerRole(ROLES_EQUIPE)
    if (!acces) return { success: false, error: t('erreur_refuse_galerie') }
    const { supabase } = acces

    const { error } = await supabase
      .from('galeries_photos')
      .update({ alt_fr: fr, alt_en: altEn?.trim() || null })
      .eq('id', id)

    if (error) {
      console.error('[galeries-photos] mise à jour de l’alt refusée', error.message)
      return { success: false, error: t('erreur_serveur_galerie') }
    }
  } catch (err) {
    console.error('[galeries-photos] échec mise à jour de l’alt', err)
    return { success: false, error: t('erreur_serveur_galerie') }
  }

  updateTag(ETIQUETTE_GALERIES)
  return { success: true }
}

/**
 * Déplace une photo d'un cran dans sa galerie — geste direct (pas de
 * confirmation), même patron que `deplacerPhotoConcours`/`deplacerVideo`.
 * Silencieux en cas de refus (id invalide, rôle insuffisant, extrémité de
 * la liste) : aucun de ces cas n'a besoin d'un message, l'interface ne
 * propose le geste que quand il a un sens.
 */
export async function deplacerPhotoGalerie(donnees: FormData): Promise<void> {
  const id = String(donnees.get('photo_id') ?? '')
  const sens = String(donnees.get('sens') ?? '')
  if (!estUuid(id) || (sens !== 'haut' && sens !== 'bas')) return

  try {
    const acces = await exigerRole(ROLES_EQUIPE)
    if (!acces) return
    await deplacerDansGalerie(acces.supabase, id, sens)
  } catch (err) {
    console.error('[galeries-photos] échec déplacement de photo', err)
  }

  updateTag(ETIQUETTE_GALERIES)
}

/**
 * Retire une photo d'une galerie — supprime la LIGNE, jamais le fichier du
 * bucket. Voir la note d'en-tête de cette section : une photo de galerie
 * peut servir ailleurs, contrairement à une photo de concours.
 */
export async function supprimerPhotoGalerie(donnees: FormData): Promise<void> {
  const id = String(donnees.get('photo_id') ?? '')
  if (!estUuid(id)) return

  try {
    const acces = await exigerRole(ROLES_EQUIPE)
    if (!acces) return
    const { error } = await acces.supabase.from('galeries_photos').delete().eq('id', id)
    if (error) console.error('[galeries-photos] suppression de photo refusée', error.message)
  } catch (err) {
    console.error('[galeries-photos] échec suppression de photo', err)
  }

  updateTag(ETIQUETTE_GALERIES)
}
