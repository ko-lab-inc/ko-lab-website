'use server'

import { headers } from 'next/headers'

import { gabaritConfirmationCommande } from '@/lib/email/gabaritCommande'
import { lireProduitsPublies } from '@/lib/produits'
import { routeCommande } from '@/lib/routes'
import { createClient } from '@/lib/supabase/server'
import { adresseDepuis } from '@/lib/utils/adresseClient'
import { rateLimit } from '@/lib/utils/rateLimit'
import { schemaCommande } from '@/lib/validation'

/**
 * Confirmation de commande — migration 0021, déplacée ici lors de la
 * simplification du parcours (Christian, 1er août 2026).
 *
 * ---------------------------------------------------------------------------
 * POURQUOI CE FICHIER A DÉMÉNAGÉ DE boutique/demande/
 *
 * /boutique/demande ne montre plus qu'un récapitulatif et un bouton — le
 * formulaire (autrefois FormulaireCommande.tsx, supprimé) vit désormais sur
 * CETTE route, /boutique/commande/details, une fois la connexion faite. Cette
 * Server Action suit la page qui l'appelle réellement.
 *
 * ---------------------------------------------------------------------------
 * NOM ET COURRIEL : LUS DEPUIS LA SESSION, PLUS DEPUIS LE FORMULAIRE
 *
 * FormulaireDetailsCommande ne les demande plus — ils viennent de
 * `auth.getUser()`. Le nom est capturé UNE SEULE FOIS, à l'inscription
 * (`user_metadata.nom`, voir connexion/actions-compte.ts) ; le courriel est
 * celui du compte, immuable ici. Un compte créé AVANT ce changement n'a pas
 * ce metadata — `nomClient()` s'en tire par le préfixe du courriel plutôt que
 * de bloquer la commande pour un problème qui ne concerne aujourd'hui qu'un
 * seul compte existant (voir le rapport de tâche).
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

/**
 * Nom à écrire dans commandes.nom (contrainte : 2 à 120 caractères).
 *
 * `user_metadata.nom` est la source normale depuis l'ajout du champ à
 * l'inscription. Le repli sur la partie locale du courriel ne sert qu'aux
 * comptes créés avant ce changement — un seul à ce jour.
 */
function nomClient(user: { email?: string; user_metadata?: Record<string, unknown> }): string {
  const nom = user.user_metadata?.nom
  if (typeof nom === 'string' && nom.trim().length >= 2) return nom.trim()

  const local = user.email?.split('@')[0]?.trim()
  return local && local.length >= 2 ? local : 'Client'
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
   * /boutique/commande/details redirige déjà vers /connexion si personne
   * n'est authentifié (voir son page.tsx), mais une Server Action reste
   * invocable indépendamment de l'écran qui la déclare (voir lib/auth/garde.ts
   * pour le même principe côté admin) : rien de ce qui vient du client n'est
   * digne de confiance, y compris « cette page ne s'affiche que si ». Sans
   * session, la politique RLS `commandes_insertion_client` aurait de toute
   * façon refusé l'écriture — ce contrôle ne fait que répondre proprement
   * plutôt que de laisser échouer l'insertion plus bas avec un message
   * technique.
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
    telephone: donnees.get('telephone'),
    organisation: donnees.get('organisation'),
    modeLivraison: donnees.get('modeLivraison'),
    adresse: donnees.get('adresse'),
    appartement: donnees.get('appartement'),
    ville: donnees.get('ville'),
    codePostal: donnees.get('codePostal'),
    province: donnees.get('province'),
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
        // Uniquement pour le courriel de confirmation ci-dessous — pas une
        // colonne de lignes_commande, exclue explicitement avant l'insertion.
        image: produit.src,
      },
    ]
  })

  if (lignesValidees.length === 0) return { erreur: 'lignes' }

  // Quatre champs distincts dans le formulaire, une seule colonne texte en
  // base (commandes.adresse_livraison, 0021) — composée ici, jamais côté
  // client, pour ne dépendre d'aucun format que le navigateur prétendrait
  // avoir déjà assemblé.
  const rue = analyse.data.appartement
    ? `${analyse.data.adresse}, app. ${analyse.data.appartement}`
    : analyse.data.adresse

  const adresseLivraison =
    analyse.data.modeLivraison === 'expedition'
      ? `${rue}, ${analyse.data.ville} (${analyse.data.province}) ${analyse.data.codePostal}`
      : null

  const nom = nomClient(user)
  const email = user.email ?? ''

  let idCommande: string | null = null

  try {
    const { data, error } = await supabase
      .from('commandes')
      .insert({
        client_id: user.id,
        nom,
        email,
        telephone: analyse.data.telephone ?? null,
        organisation: analyse.data.organisation ?? null,
        mode_livraison: analyse.data.modeLivraison,
        adresse_livraison: adresseLivraison,
      })
      .select('id, numero, created_at, fenetre_modification_expire_at')
      .single()

    if (error || !data) throw error ?? new Error('insertion sans ligne renvoyée')
    idCommande = data.id

    const { error: erreurLignes } = await supabase
      .from('lignes_commande')
      // `image` retiré ici : c'est un champ pour le courriel plus bas, pas
      // une colonne de la table — un insert qui la porterait échouerait
      // (PostgREST refuse une colonne inconnue).
      .insert(lignesValidees.map(({ image: _image, ...l }) => ({ ...l, commande_id: idCommande! })))

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

    /**
     * ⚠️ PASSAGE À 'confirmee' ICI — décision de Christian.
     *
     * L'INSERT reste bridé à `statut = 'nouvelle'` par la politique
     * `commandes_insertion_client` (0021) — voir sa note : jamais laisser un
     * statut fabriqué sauter la file d'attente dès l'écriture. Mais il n'y a
     * plus, dans ce parcours, d'étape distincte où le client « confirmerait »
     * une seconde fois après coup : le clic sur « Valider ma commande » EST
     * la confirmation. « Nouvelle » ne doit donc pas rester affichée dans
     * /admin/commandes une fois la commande réellement passée — ce UPDATE
     * l'y fait passer tout de suite, autorisé par `commandes_maj_client`
     * (`statut in ('nouvelle','confirmee')`, encore vrai à cet instant).
     *
     * Échec ici : dégradation propre, comme le courriel plus bas — la
     * commande existe et reste consultable, seul le statut affiché resterait
     * « Nouvelle » au lieu de « Confirmée ».
     */
    const { error: erreurConfirmation } = await supabase
      .from('commandes')
      .update({ statut: 'confirmee' })
      .eq('id', idCommande)
    if (erreurConfirmation) {
      console.error('[boutique/commande/details] passage à confirmee échoué', erreurConfirmation.message)
    }

    // ------------------------------------------------- courriel de confirmation
    // DÉGRADATION VOLONTAIRE — même motif que api/contact/route.ts. La
    // commande est déjà en base à ce stade ; si Resend n'est pas configuré ou
    // échoue, le client doit quand même voir sa confirmation à l'écran. Le
    // numéro et le lien restent consultables depuis /compte/commandes même
    // sans courriel.
    const cleResend = process.env.RESEND_API_KEY

    if (!cleResend) {
      console.warn('[boutique/commande/details] RESEND_API_KEY absente — confirmation non envoyée')
    } else {
      try {
        const { Resend } = await import('resend')

        const lienCommande = `${origine()}/${locale}${routeCommande(idCommande)}`

        // Gabarit illustré (produits, images, prix, politique de 48h) —
        // demande de Christian après le premier courriel en texte brut.
        const { html, text } = gabaritConfirmationCommande({
          numero: data.numero,
          creeLe: new Date(data.created_at),
          fenetreExpireLe: new Date(data.fenetre_modification_expire_at),
          lignes: lignesValidees.map((l) => ({
            nom: l.nom_produit,
            categorie: l.categorie,
            quantite: l.quantite,
            prix: l.prix_indicatif,
            image: l.image,
          })),
          modeLivraison: analyse.data.modeLivraison,
          adresseLivraison,
          lienCommande,
          origine: origine(),
        })

        await new Resend(cleResend).emails.send({
          from: 'KO-LAB <site@ko-lab.ca>',
          to: email,
          subject: `Confirmation de commande — ${data.numero}`,
          html,
          text,
        })
      } catch (err) {
        console.error('[boutique/commande/details] échec envoi confirmation', err)
      }
    }
  } catch (err) {
    console.error('[boutique/commande/details] échec création commande', err)
    return { erreur: 'serveur' }
  }

  return { succes: true, id: idCommande }
}
