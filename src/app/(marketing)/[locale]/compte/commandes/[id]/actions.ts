'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { gabaritConfirmationCommande } from '@/lib/email/gabaritCommande'
import { lireProduitsPublies } from '@/lib/produits'
import { routeCommande } from '@/lib/routes'
import { createClient } from '@/lib/supabase/server'
import { adresseDepuis } from '@/lib/utils/adresseClient'
import { estUuid } from '@/lib/utils/identifiant'
import { origine } from '@/lib/utils/origine'
import { rateLimit } from '@/lib/utils/rateLimit'
import { schemaLigneCommande, schemaLivraison } from '@/lib/validation'
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

  const analyseLivraison = schemaLivraison.safeParse({
    modeLivraison: donnees.get('modeLivraison'),
    adresse: donnees.get('adresse'),
    appartement: donnees.get('appartement'),
    ville: donnees.get('ville'),
    codePostal: donnees.get('codePostal'),
    province: donnees.get('province'),
  })
  if (!analyseLivraison.success) return { erreur: 'donnees' }

  /**
   * Relecture SOUS RLS — si la commande n'est pas la sienne, ou n'existe pas,
   * `commandes_lecture_client` la rend invisible : `maybeSingle()` renvoie
   * alors `null`, indiscernable d'un id inventé. C'est voulu, voir la note
   * d'en-tête de 0021 sur pourquoi RLS ne doit jamais laisser deviner qu'une
   * ligne existe.
   */
  const { data: commande } = await supabase
    .from('commandes')
    .select('numero, statut, mode_livraison, adresse_livraison, created_at, fenetre_modification_expire_at')
    .eq('id', id)
    .maybeSingle()

  if (!commande) return { erreur: 'refuse' }

  const modifiable =
    STATUTS_MODIFIABLES.some((s) => s === (commande.statut as StatutCommande)) &&
    new Date(commande.fenetre_modification_expire_at) > new Date()

  if (!modifiable) return { erreur: 'fenetre_fermee' }

  /**
   * Garder l'adresse actuelle, ou la remplacer — jamais l'exiger à nouveau.
   *
   * ChampsLivraison rend les champs d'adresse FACULTATIFS ici (contrairement
   * à la création) : une commande déjà en expédition a déjà une adresse, la
   * retaper pour juste ajouter un produit serait absurde. `adresse` vide veut
   * donc dire « garder l'actuelle », pas « adresse manquante » — sauf s'il
   * n'y en a pas à garder (commande initialement en ramassage qui bascule en
   * expédition sans rien fournir), seul cas où c'est vraiment une erreur.
   */
  let adresseLivraison: string | null
  if (analyseLivraison.data.modeLivraison === 'ramassage') {
    adresseLivraison = null
  } else if (analyseLivraison.data.adresse) {
    if (!analyseLivraison.data.ville || !analyseLivraison.data.province || !analyseLivraison.data.codePostal) {
      return { erreur: 'donnees' }
    }
    const rue = analyseLivraison.data.appartement
      ? `${analyseLivraison.data.adresse}, app. ${analyseLivraison.data.appartement}`
      : analyseLivraison.data.adresse
    adresseLivraison = `${rue}, ${analyseLivraison.data.ville} (${analyseLivraison.data.province}) ${analyseLivraison.data.codePostal}`
  } else if (commande.mode_livraison === 'expedition' && commande.adresse_livraison) {
    adresseLivraison = commande.adresse_livraison
  } else {
    return { erreur: 'donnees' }
  }

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
        // Uniquement pour le courriel plus bas, jamais une colonne de
        // lignes_commande — même exclusion que creerCommande avant l'insert.
        image: produit.src,
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

    const { error: erreurInsert } = await supabase
      .from('lignes_commande')
      .insert(lignesValidees.map(({ image: _image, ...l }) => l))
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

    const { error: erreurLivraison } = await supabase
      .from('commandes')
      .update({ mode_livraison: analyseLivraison.data.modeLivraison, adresse_livraison: adresseLivraison })
      .eq('id', id)
    if (erreurLivraison) {
      console.error('[compte/commandes] mode de livraison non mis à jour', erreurLivraison.message)
    }
  } catch (err) {
    console.error('[compte/commandes] échec modification', err)
    return { erreur: 'serveur' }
  }

  // --------------------------------------------- nouveau courriel de confirmation
  // DÉGRADATION VOLONTAIRE — même motif que creerCommande : la modification
  // est déjà enregistrée à ce stade, un échec d'envoi ne doit pas faire
  // échouer l'enregistrement lui-même. Sujet distinct de la création
  // (« mise à jour », pas « confirmation ») pour ne pas laisser croire qu'une
  // seconde commande vient d'être passée.
  const cleResend = process.env.RESEND_API_KEY
  if (!cleResend) {
    console.warn('[compte/commandes] RESEND_API_KEY absente — courriel de mise à jour non envoyé')
  } else if (user.email) {
    try {
      const { Resend } = await import('resend')
      const lienCommande = `${origine()}/${locale}${routeCommande(id)}`

      const { html, text } = gabaritConfirmationCommande({
        numero: commande.numero,
        creeLe: new Date(commande.created_at),
        fenetreExpireLe: new Date(commande.fenetre_modification_expire_at),
        lignes: lignesValidees.map((l) => ({
          nom: l.nom_produit,
          categorie: l.categorie,
          quantite: l.quantite,
          prix: l.prix_indicatif,
          image: l.image,
        })),
        modeLivraison: analyseLivraison.data.modeLivraison,
        adresseLivraison,
        lienCommande,
        origine: origine(),
      })

      await new Resend(cleResend).emails.send({
        from: 'KO-LAB <site@ko-lab-center.ca>',
        to: user.email,
        subject: `Commande mise à jour — ${commande.numero}`,
        html,
        text,
      })
    } catch (err) {
      console.error('[compte/commandes] échec envoi du courriel de mise à jour', err)
    }
  }

  revalidatePath(`/${locale}/compte/commandes/${id}`)
  return { succes: true }
}

export type EtatAnnulation = {
  erreur?: 'refuse' | 'fenetre_fermee' | 'trop_de_requetes' | 'serveur'
  succes?: boolean
}

/**
 * Annulation par le client — même fenêtre que la modification (48h, statuts
 * 'nouvelle'/'confirmee'). Demande de Christian : le client doit pouvoir
 * annuler lui-même, et le statut doit refléter cette annulation — pas de
 * suppression, `annulee` est un UPDATE comme tout autre changement de
 * statut, déjà couvert par `commandes_maj_client` (0021).
 */
export async function annulerCommande(
  _precedent: EtatAnnulation,
  donnees: FormData,
): Promise<EtatAnnulation> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const id = String(donnees.get('id') ?? '')
  if (!estUuid(id)) return { erreur: 'refuse' }

  const ip = adresseDepuis(await headers())
  if (rateLimit(`annuler-commande:${ip}`, { max: 10, windowMs: 600_000 })) {
    return { erreur: 'trop_de_requetes' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { erreur: 'refuse' }

  // Relecture SOUS RLS — même raison que modifierCommande : distinguer un id
  // inventé d'une commande qui n'est pas la sienne n'a pas de sens ici, RLS
  // rend les deux également invisibles.
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

  const { error } = await supabase.from('commandes').update({ statut: 'annulee' }).eq('id', id)
  if (error) {
    console.error('[compte/commandes] échec annulation', error.message)
    return { erreur: 'serveur' }
  }

  revalidatePath(`/${locale}/compte/commandes/${id}`)
  return { succes: true }
}
