import { NextResponse, type NextRequest } from 'next/server'

import { VERSION_POLITIQUES } from '@/lib/constantes'
import { lireDestinataires } from '@/lib/destinataires'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { lireReglages, messageAbsence } from '@/lib/reglages'
import { adresseDepuis } from '@/lib/utils/adresseClient'
import { envoyerCourriel, raisonCourte } from '@/lib/email/envoyer'
import { gabaritAccuseReception } from '@/lib/email/gabaritsNotifications'
import { rateLimit } from '@/lib/utils/rateLimit'
import { schemaContact } from '@/lib/validation'

/**
 * Réception du formulaire de contact — skills 05, 09 et 15.
 *
 * Ordre des contrôles, du moins coûteux au plus coûteux : type de contenu,
 * limite de débit, honeypot, validation, puis écriture. Un robot ne doit
 * jamais atteindre la base de données ni le service de courriel.
 */

/** Cette route écrit en base : elle ne doit jamais être mise en cache. */
export const dynamic = 'force-dynamic'

/** Séparateur de lignes du corps texte des courriels. */
const SAUT = String.fromCharCode(10)

export async function POST(req: NextRequest) {
  // Un formulaire légitime envoie du JSON. Refuser autre chose élimine
  // d'emblée les soumissions cross-origin en form-encoded.
  if (!req.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ erreur: 'Type de contenu invalide' }, { status: 415 })
  }

  // Clé préfixée par la route : sans ça, toutes les routes partageraient
  // le même compteur et le budget de la boutique serait vidé par le contact.
  if (rateLimit(`contact:${adresseDepuis(req.headers)}`, { max: 5, windowMs: 60_000 })) {
    return NextResponse.json({ erreur: 'trop_de_requetes' }, { status: 429 })
  }

  let brut: unknown
  try {
    brut = await req.json()
  } catch {
    return NextResponse.json({ erreur: 'JSON invalide' }, { status: 400 })
  }

  const analyse = schemaContact.safeParse(brut)
  if (!analyse.success) {
    return NextResponse.json({ erreur: 'Données invalides' }, { status: 400 })
  }

  const { _hp, ...donnees } = analyse.data

  // Honeypot rempli : robot. On répond 200 SANS RIEN FAIRE — un 4xx apprendrait
  // au robot que le piège existe et l'inciterait à s'adapter (skill 15).
  if (_hp) {
    return NextResponse.json({ succes: true })
  }

  let idDemande: string | null = null
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('demandes_contact')
      .insert({
        type: donnees.type,
        nom: donnees.nom,
        email: donnees.email,
        telephone: donnees.telephone ?? null,
        organisation: donnees.organisation ?? null,
        message: donnees.message,
        // Migration 0049 — langue de la page du demandeur, pas celle de
        // l'équipe. Décide de la langue de l'accusé ci-dessous.
        locale: donnees.locale,
        // Loi 25 (audit du 23 août 2026, migration 0041) — `donnees.consentement`
        // vaut forcément `true` ici : schemaContact.safeParse a déjà rejeté toute
        // autre valeur plus haut (z.literal(true)) avant d'atteindre ce bloc.
        consentement_le: new Date().toISOString(),
        consentement_version: VERSION_POLITIQUES,
      })
      .select('id')
      .single()

    if (error) throw error
    idDemande = data?.id ?? null
  } catch (err) {
    // Message générique côté client : divulguer err.message exposerait la
    // structure de la base et les noms de tables (skill 15).
    console.error('[api/contact] échec insertion', err)
    return NextResponse.json({ erreur: 'serveur' }, { status: 500 })
  }

  // ------------------------------------------------------------ Courriels
  //
  // DÉGRADATION VOLONTAIRE, MAIS PLUS SILENCIEUSE (2 octobre 2026).
  //
  // La demande est déjà enregistrée. Un échec d'envoi ne doit pas faire
  // échouer la requête : le message du visiteur n'est pas perdu, et lui
  // demander de le renvoyer serait absurde.
  //
  // Ce qui change : l'échec était jusqu'ici écrit dans la console du serveur
  // et nulle part ailleurs. Le visiteur lisait « message envoyé », l'équipe
  // ne recevait rien, et personne ne l'apprenait. Le résultat est désormais
  // inscrit sur la ligne (`notification_envoyee`, `notification_erreur`,
  // migration 0049) et /admin/demandes l'affiche.
  const reglages = await lireReglages()
  const { delaiReponseHeures } = reglages

  /**
   * Destinataires lus à part (migration 0053) : la liste n'est pas dans
   * `lireReglages()`, qui lit avec la clé `anon` et ne voit pas les clés
   * marquées non publiques. Les adresses de l'équipe ne sont pas affichables.
   *
   * `demandes` ne revient JAMAIS vide — voir lib/destinataires.ts : un tableau
   * vide passé à Resend produirait une demande reçue dont personne n'est
   * averti.
   */
  const destinataires = await lireDestinataires()

  const notification = await envoyerCourriel({
    a: destinataires.demandes,
    // Répondre écrit au DEMANDEUR, pas à soi-même.
    repondreA: donnees.email,
    sujet: `Nouvelle demande (${donnees.type})`,
    texte: [
      `Type         : ${donnees.type}`,
      `Nom          : ${donnees.nom}`,
      `Courriel     : ${donnees.email}`,
      `Téléphone    : ${donnees.telephone ?? 'non précisé'}`,
      `Organisation : ${donnees.organisation ?? 'non précisée'}`,
      `Langue       : ${donnees.locale}`,
      '',
      donnees.message,
    ].join(SAUT),
  })
  if (!notification.ok) {
    console.error('[api/contact] notification équipe non envoyée :', notification.raison)
  }

  // Accusé de réception au demandeur. La page de contact promet « On revient
  // vers vous dans les 48 heures » — jusqu'ici, rien ne le confirmait au
  // visiteur une fois l'onglet fermé.
  const accuse = gabaritAccuseReception({
    nom: donnees.nom,
    locale: donnees.locale,
    delaiHeures: delaiReponseHeures,
    // Pendant une fermeture, le message d'absence PREND LA PLACE de la
    // promesse de délai — sinon ce courriel annoncerait 48 heures à quelqu'un
    // qui n'aura de réponse qu'au retour de l'équipe. La langue suit celle de
    // la DEMANDE, pas celle d'un éventuel écran d'administration.
    absence: messageAbsence(reglages, donnees.locale),
  })
  const envoiAccuse = await envoyerCourriel({
    a: donnees.email,
    sujet: accuse.sujet,
    texte: accuse.texte,
  })
  if (!envoiAccuse.ok) {
    console.error('[api/contact] accusé de réception non envoyé :', envoiAccuse.raison)
  }

  // Une seule écriture pour les deux résultats. `idDemande` est null si
  // l'insertion n'a pas rendu d'identifiant — on ne tente alors rien plutôt
  // que d'écrire au hasard.
  if (idDemande) {
    await getSupabaseAdmin()
      .from('demandes_contact')
      .update({
        notification_envoyee: notification.ok,
        notification_erreur: notification.ok ? null : raisonCourte(notification.raison),
        accuse_envoye: envoiAccuse.ok,
      })
      .eq('id', idDemande)
  }

  return NextResponse.json({ succes: true })
}
