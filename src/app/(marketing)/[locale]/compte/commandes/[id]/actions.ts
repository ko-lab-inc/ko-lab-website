'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { lireProduitsPublies } from '@/lib/produits'
import { createClient } from '@/lib/supabase/server'
import { adresseDepuis } from '@/lib/utils/adresseClient'
import { estUuid } from '@/lib/utils/identifiant'
import { rateLimit } from '@/lib/utils/rateLimit'
import { schemaLigneCommande } from '@/lib/validation'
import { STATUTS_MODIFIABLES, type StatutCommande } from '@/types'

/**
 * Modification d'une commande dans la fenêtre de 48h — migration 0021.
 *
 * ---------------------------------------------------------------------------
 * RLS DÉCIDE QUI, L'APPLICATION DÉCIDE QUOI
 *
 * La politique `lignes_commande_insertion_client` (0021) vérifie DÉJÀ, ligne
 * par ligne, que la commande appartient à l'appelant, que son statut est
 * encore modifiable et que la fenêtre de 48h n'est pas dépassée — la
 * relecture ci-dessous n'est pas une seconde source de vérité, c'est ce qui
 * permet de répondre `{ erreur: 'fenetre_fermee' }` plutôt que de laisser
 * l'INSERT échouer avec un message Postgres générique.
 *
 * Ce que RLS NE PEUT PAS vérifier : que `nom_produit`/`prix_indicatif`
 * correspondent au catalogue. C'est pour ça que seul le SLUG vient du
 * formulaire — exactement la même discipline que creerCommande.
 * ---------------------------------------------------------------------------
 */

export type EtatModification = {
  erreur?: 'donnees' | 'lignes' | 'refuse' | 'fenetre_fermee' | 'trop_de_requetes' | 'serveur'
  succes?: boolean
}

export async function modifierCommande(
  _precedent: EtatModification,
  donnees: FormData,
): Promise<EtatModification> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const id = String(donnees.get('id') ?? '')
  if (!estUuid(id)) return { erreur: 'donnees' }

  const ip = adresseDepuis(await headers())
  if (rateLimit(`modif-commande:${ip}`, { max: 10, windowMs: 600_000 })) {
    return { erreur: 'trop_de_requetes' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { erreur: 'refuse' }

  let lignesBrutes: unknown
  try {
    lignesBrutes = JSON.parse(String(donnees.get('lignes') ?? '[]'))
  } catch {
    return { erreur: 'donnees' }
  }

  const analyse = z.array(schemaLigneCommande).min(1).max(50).safeParse(lignesBrutes)
  if (!analyse.success) return { erreur: 'donnees' }

  /**
   * Relecture SOUS RLS — si la commande n'est pas la sienne, ou n'existe pas,
   * `commandes_lecture_client` la rend invisible : `maybeSingle()` renvoie
   * alors `null`, indiscernable d'un id inventé. C'est voulu, voir la note
   * d'en-tête de 0021 sur pourquoi RLS ne doit jamais laisser deviner qu'une
   * ligne existe.
   */
  const { data: commande } = await supabase
    .from('commandes')
    .select('statut, fenetre_modification_expire_at')
    .eq('id', id)
    .maybeSingle()

  if (!commande) return { erreur: 'refuse' }

  const modifiable =
    STATUTS_MODIFIABLES.some((s) => s === (commande.statut as StatutCommande)) &&
    new Date(commande.fenetre_modification_expire_at) > new Date()

  if (!modifiable) return { erreur: 'fenetre_fermee' }

  const catalogue = await lireProduitsPublies()
  const parSlug = new Map(catalogue.map((p) => [p.slug, p]))

  const lignesValidees = analyse.data.flatMap((l) => {
    const produit = parSlug.get(l.slug)
    if (!produit) return []
    const quantite = Math.min(l.quantite, produit.quantiteDisponible)
    if (quantite <= 0) return []
    return [
      {
        commande_id: id,
        produit_id: produit.id,
        nom_produit: produit.nom,
        categorie: produit.categorie,
        quantite,
        prix_indicatif: produit.prixIndicatif,
      },
    ]
  })

  if (lignesValidees.length === 0) return { erreur: 'lignes' }

  try {
    // Les anciennes lignes sont retirées APRÈS que les nouvelles soient
    // écrites avec succès — jamais avant. Si l'insertion échoue, la commande
    // garde son contenu d'origine ; si c'est la suppression qui échoue, la
    // commande se retrouve avec un doublon visible — une anomalie qu'un
    // humain corrige, plutôt qu'une commande vidée sans que personne ne s'en
    // aperçoive.
    const { data: anciennes } = await supabase
      .from('lignes_commande')
      .select('id')
      .eq('commande_id', id)
    const idsAncien = (anciennes ?? []).map((l) => l.id)

    const { error: erreurInsert } = await supabase.from('lignes_commande').insert(lignesValidees)
    if (erreurInsert) throw erreurInsert

    if (idsAncien.length > 0) {
      const { error: erreurSuppr } = await supabase
        .from('lignes_commande')
        .delete()
        .in('id', idsAncien)
      if (erreurSuppr) {
        console.error('[compte/commandes] anciennes lignes non nettoyées', erreurSuppr.message)
      }
    }
  } catch (err) {
    console.error('[compte/commandes] échec modification', err)
    return { erreur: 'serveur' }
  }

  revalidatePath(`/${locale}/compte/commandes/${id}`)
  return { succes: true }
}
