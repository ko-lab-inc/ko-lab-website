'use server'

import { headers } from 'next/headers'

import { lireProduitsPublies } from '@/lib/produits'
import { routeCommande } from '@/lib/routes'
import { createClient } from '@/lib/supabase/server'
import { adresseDepuis } from '@/lib/utils/adresseClient'
import { rateLimit } from '@/lib/utils/rateLimit'
import { schemaCommande } from '@/lib/validation'

/**
 * Confirmation de commande — migration 0021.
 *
 * ---------------------------------------------------------------------------
 * REMPLACE L'ENVOI VERS demandes_contact POUR CE PARCOURS
 *
 * Avant cette tâche, « Confirmer ma sélection » menait à /contact?type=boutique
 * et le panier finissait en texte libre dans demandes_contact.message. Ça
 * reste le chemin des AUTRES types de demande (mandat, location, carrière,
 * autre) — inchangé. Ici seulement, le panier écrit désormais des lignes
 * réelles dans `commandes` / `lignes_commande`.
 *
 * ---------------------------------------------------------------------------
 * CLIENT DE SESSION, PAS LA SERVICE ROLE KEY
 *
 * Décision de Christian : une vraie session (Supabase Auth), pas un lien à
 * token. `client_id = auth.uid()` est vérifié PAR LA POLITIQUE RLS de 0021 à
 * l'écriture — le client de session est donc le bon choix ici, exactement
 * comme candidatures ou videos : c'est RLS qui décide qui peut écrire, pas un
 * rôle qui la contourne.
 *
 * Ce que RLS NE PEUT PAS vérifier, en revanche, c'est que `nom_produit` et
 * `prix_indicatif` correspondent vraiment au catalogue — RLS ne raisonne que
 * sur QUI écrit, jamais sur CE QUI est écrit. C'est donc l'application qui
 * s'en charge ci-dessous, en relisant produits_boutique avant d'insérer :
 * seul le SLUG vient du formulaire, jamais un nom ou un prix.
 * ---------------------------------------------------------------------------
 */

export type EtatCommande = {
  erreur?: 'donnees' | 'lignes' | 'refuse' | 'trop_de_requetes' | 'serveur'
  succes?: boolean
  id?: string
}

/** URL de base pour le lien envoyé par courriel — même helper que actions-compte.ts. */
function origine(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}

export async function creerCommande(
  _precedent: EtatCommande,
  donnees: FormData,
): Promise<EtatCommande> {
  const locale = String(donnees.get('locale') ?? 'fr')

  // Honeypot avant tout traitement — même motif que postuler/actions.ts : on
  // répond « succès » sans rien écrire, pour ne pas apprendre au robot qu'il
  // a été repéré.
  if (String(donnees.get('_hp') ?? '') !== '') return { succes: true }

  const ip = adresseDepuis(await headers())
  if (rateLimit(`commande:${ip}`, { max: 5, windowMs: 600_000 })) {
    return { erreur: 'trop_de_requetes' }
  }

  /**
   * ⚠️ SESSION VÉRIFIÉE ICI — PAS SEULEMENT SUPPOSÉE PAR L'ÉCRAN.
   *
   * PagePanier ne montre ce formulaire qu'une fois `connecte === true`, mais
   * une Server Action reste invocable indépendamment de l'écran qui la
   * déclare (voir lib/auth/garde.ts pour le même principe côté admin) : rien
   * de ce qui vient du client n'est digne de confiance, y compris « cet écran
   * ne s'affiche que si ». Sans session, la politique RLS `commandes_
   * insertion_client` aurait de toute façon refusé l'écriture — ce contrôle
   * ne fait que répondre proprement plutôt que de laisser échouer l'insertion
   * plus bas avec un message technique.
   */
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

  const analyse = schemaCommande.safeParse({
    nom: donnees.get('nom'),
    email: donnees.get('email'),
    telephone: donnees.get('telephone'),
    organisation: donnees.get('organisation'),
    modeLivraison: donnees.get('modeLivraison'),
    adresseLivraison: donnees.get('adresseLivraison'),
    lignes: lignesBrutes,
    _hp: donnees.get('_hp'),
  })

  if (!analyse.success) return { erreur: 'donnees' }

  // -------------------------------------------------------- re-dérivation
  // Seul le SLUG vient du client. Nom, catégorie, prix et disponibilité sont
  // relus ici depuis le catalogue PUBLIÉ — jamais ce que le formulaire
  // prétend. Un slug retiré ou dépublié depuis l'ajout au panier est
  // simplement écarté, pas de blocage sur le reste de la commande : c'est la
  // même tolérance que PagePanier applique déjà (`fiches[a.slug]?.prix`).
  const catalogue = await lireProduitsPublies()
  const parSlug = new Map(catalogue.map((p) => [p.slug, p]))

  const lignesValidees = analyse.data.lignes.flatMap((l) => {
    const produit = parSlug.get(l.slug)
    if (!produit) return []
    const quantite = Math.min(l.quantite, produit.quantiteDisponible)
    if (quantite <= 0) return []
    return [
      {
        produit_id: produit.id,
        nom_produit: produit.nom,
        categorie: produit.categorie,
        quantite,
        prix_indicatif: produit.prixIndicatif,
      },
    ]
  })

  if (lignesValidees.length === 0) return { erreur: 'lignes' }

  let idCommande: string | null = null

  try {
    const { data, error } = await supabase
      .from('commandes')
      .insert({
        client_id: user.id,
        nom: analyse.data.nom,
        email: analyse.data.email,
        telephone: analyse.data.telephone ?? null,
        organisation: analyse.data.organisation ?? null,
        mode_livraison: analyse.data.modeLivraison,
        adresse_livraison: analyse.data.adresseLivraison ?? null,
      })
      .select('id, numero')
      .single()

    if (error || !data) throw error ?? new Error('insertion sans ligne renvoyée')
    idCommande = data.id

    const { error: erreurLignes } = await supabase
      .from('lignes_commande')
      .insert(lignesValidees.map((l) => ({ ...l, commande_id: idCommande! })))

    if (erreurLignes) {
      // La commande existe déjà sans ses lignes : mieux vaut la marquer
      // annulée que laisser une commande vide traîner, invisible pour le
      // client comme pour l'équipe. Un DELETE serait plus propre, mais 0021
      // ne pose aucune politique de suppression, y compris pour son
      // propriétaire — « annulee » reste un UPDATE, que
      // `commandes_maj_client` autorise ici : la commande vient d'être créée,
      // donc `statut = 'nouvelle'` et la fenêtre de 48h vient de s'ouvrir.
      await supabase.from('commandes').update({ statut: 'annulee' }).eq('id', idCommande)
      throw erreurLignes
    }

    // ------------------------------------------------- courriel de confirmation
    // DÉGRADATION VOLONTAIRE — même motif que api/contact/route.ts. La
    // commande est déjà en base à ce stade ; si Resend n'est pas configuré ou
    // échoue, le client doit quand même voir sa confirmation à l'écran. Le
    // numéro et le lien restent consultables depuis /compte/commandes même
    // sans courriel.
    const cleResend = process.env.RESEND_API_KEY

    if (!cleResend) {
      console.warn('[boutique/demande] RESEND_API_KEY absente — confirmation non envoyée')
    } else {
      try {
        const { Resend } = await import('resend')

        const lienCommande = `${origine()}/${locale}${routeCommande(idCommande)}`
        const resumeLignes = lignesValidees
          .map((l) => `— ${l.nom_produit} × ${l.quantite}`)
          .join('\n')
        const libelleLivraison =
          analyse.data.modeLivraison === 'expedition' ? 'Expédition' : 'Ramassage sur place'

        await new Resend(cleResend).emails.send({
          from: 'KO-LAB <site@ko-lab.ca>',
          to: analyse.data.email,
          subject: `Confirmation de commande — ${data.numero}`,
          text: [
            `Commande ${data.numero}`,
            '',
            resumeLignes,
            '',
            `Mode de livraison : ${libelleLivraison}`,
            '',
            `Vous pouvez ajouter des articles ou modifier les quantités pendant`,
            `48 heures depuis votre compte — les prix ne sont pas encore`,
            `finaux, on revient vers vous pour les confirmer :`,
            lienCommande,
            '',
            `Si vous n'étiez pas connecté au moment d'ouvrir ce lien, on vous`,
            `demandera de vous connecter avant d'afficher la commande.`,
          ].join('\n'),
        })
      } catch (err) {
        console.error('[boutique/demande] échec envoi confirmation', err)
      }
    }
  } catch (err) {
    console.error('[boutique/demande] échec création commande', err)
    return { erreur: 'serveur' }
  }

  return { succes: true, id: idCommande }
}
