'use server'

import { headers } from 'next/headers'
import { z } from 'zod'

import { ROUTES } from '@/lib/routes'
import { createClient } from '@/lib/supabase/server'
import { adresseDepuis } from '@/lib/utils/adresseClient'
import { rateLimit } from '@/lib/utils/rateLimit'
import { schemaInscription } from '@/lib/validation'

/**
 * Connexion / inscription DEPUIS LA MODALE DE COMMANDE — migration 0021.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI PAS connecter()/inscrire() (connexion/actions.ts, actions-compte.ts)
 *
 * Ces deux actions terminent TOUJOURS par un `redirect()` — c'est ce que veut
 * la page de connexion autonome. Ici, l'exigence est l'inverse : rester sur
 * /boutique/demande, panier intact, pour enchaîner directement sur
 * FormulaireCommande sans quitter l'écran. Un `redirect()` réussi interromprait
 * le rendu avant que ce composant ne voie jamais l'état de succès.
 *
 * `connecter()` a une seconde raison de ne pas convenir : elle envoie tout
 * compte SANS rôle d'équipe vers `/compte`, quel que soit `suivant` — correct
 * pour la page de connexion générale, inutilisable ici où la destination
 * voulue est toujours « rester sur cette page ».
 *
 * Reproduire la validation plutôt que la partager est un choix assumé,
 * cohérent avec le reste du projet : `destination()` (garde anti-redirection
 * ouverte) est déjà dupliquée trois fois pour la même raison — des contextes
 * distincts qui ne doivent pas se mettre à dépendre les uns des autres.
 * ---------------------------------------------------------------------------
 */

export type EtatAuthModale = {
  erreur?:
    | 'identifiants'
    | 'donnees'
    | 'confirmation'
    | 'faible'
    | 'trop_de_tentatives'
    | 'refuse'
    | 'courriel'
    | 'serveur'
  succes?: boolean
  /**
   * Inscription seulement : Supabase exige la confirmation par courriel avant
   * d'ouvrir une session (voir /api/auth/confirmer) — `succes` sans session
   * immédiate le signale au composant, qui affiche « vérifiez votre boîte »
   * plutôt que d'enchaîner sur le formulaire de commande.
   */
  attenteConfirmation?: boolean
}

const schemaConnexionModale = z.object({
  email: z.string().trim().email().max(200),
  motDePasse: z.string().min(1).max(200),
})

/** URL de base pour le lien envoyé par courriel — même helper que actions-compte.ts. */
function origine(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}

export async function connecterPourCommande(
  _precedent: EtatAuthModale,
  donnees: FormData,
): Promise<EtatAuthModale> {
  const ip = adresseDepuis(await headers())
  // Même compteur que la page de connexion autonome (`connexion:${ip}`) :
  // deux entrées vers le même signInWithPassword ne doivent pas doubler le
  // budget d'essais disponible pour bourrer un compte.
  if (rateLimit(`connexion:${ip}`, { max: 8, windowMs: 300_000 })) {
    return { erreur: 'trop_de_tentatives' }
  }

  const analyse = schemaConnexionModale.safeParse({
    email: donnees.get('email'),
    motDePasse: donnees.get('motDePasse'),
  })
  // Message indifférencié, même raison que connexion/actions.ts : distinguer
  // « courriel mal formé » d'« identifiants invalides » révélerait déjà
  // quelles adresses ont un compte.
  if (!analyse.success) return { erreur: 'identifiants' }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: analyse.data.email,
      password: analyse.data.motDePasse,
    })
    if (error || !data.user) return { erreur: 'identifiants' }
  } catch (err) {
    console.error('[boutique/demande] échec connexion modale', err)
    return { erreur: 'serveur' }
  }

  return { succes: true }
}

export async function inscrirePourCommande(
  _precedent: EtatAuthModale,
  donnees: FormData,
): Promise<EtatAuthModale> {
  const locale = String(donnees.get('locale') ?? 'fr')
  const ip = adresseDepuis(await headers())
  // Même compteur que /inscription (`inscription:${ip}`).
  if (rateLimit(`inscription:${ip}`, { max: 5, windowMs: 3_600_000 })) {
    return { erreur: 'trop_de_tentatives' }
  }

  const analyse = schemaInscription.safeParse({
    email: donnees.get('email'),
    motDePasse: donnees.get('motDePasse'),
    confirmation: donnees.get('confirmation'),
  })

  if (!analyse.success) {
    const codes = analyse.error.issues.map((i) => i.message)
    if (analyse.error.issues.some((i) => i.path[0] === 'confirmation')) {
      return { erreur: 'confirmation' }
    }
    if (codes.includes('courant') || codes.includes('reprend_courriel')) {
      return { erreur: 'faible' }
    }
    return { erreur: 'donnees' }
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signUp({
      email: analyse.data.email,
      password: analyse.data.motDePasse,
      options: {
        // Retour sur la page de commande, panier repris tel quel : voir
        // PanierContext (une sélection commencée avant connexion survit à
        // localStorage). La personne devra recliquer « Confirmer » une fois
        // revenue — c'est la confirmation d'adresse de Supabase qui l'impose,
        // pas ce composant : voir /api/auth/confirmer.
        emailRedirectTo: `${origine()}/api/auth/confirmer?suivant=${encodeURIComponent(`/${locale}${ROUTES.boutiqueDemande}`)}`,
      },
    })

    if (error) {
      if (/not allowed|disabled/i.test(error.message)) return { erreur: 'refuse' }
      // 429 — quota du mailer Supabase épuisé, pas une faute de saisie. Même
      // distinction que actions-compte.ts.
      if (error.status === 429 || /rate limit/i.test(error.message)) {
        console.error('[boutique/demande] quota de courriels Supabase épuisé —', error.message)
        return { erreur: 'courriel' }
      }
      return { erreur: 'donnees' }
    }

    // Session immédiate : possible si la confirmation par courriel est
    // désactivée côté Supabase (aucune raison de le supposer aujourd'hui,
    // mais rien n'empêche ce réglage de changer). Dans ce cas seulement,
    // enchaîner tout de suite sur le formulaire de commande a un sens.
    if (data.session) return { succes: true }
  } catch (err) {
    console.error('[boutique/demande] échec inscription modale', err)
    return { erreur: 'serveur' }
  }

  return { succes: true, attenteConfirmation: true }
}
