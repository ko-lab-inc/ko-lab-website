import 'server-only'

import { EMAILS } from '@/lib/constantes'

/**
 * Envoi d'un courriel transactionnel — point de passage unique.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI CE MODULE EXISTE
 *
 * Chaque point d'envoi construisait son propre `new Resend(...).emails.send()`
 * dans son propre `try/catch`, et chacun traitait l'échec à sa façon. Dans
 * `api/contact/route.ts`, « à sa façon » voulait dire : écrire l'erreur dans la
 * console du serveur et répondre quand même `{ succes: true }`. Résultat
 * constaté le 1er octobre 2026 : une demande dont la notification n'est jamais
 * partie ne laisse aucune trace visible — ni pour le visiteur, qui lit
 * « message envoyé », ni pour l'équipe, qui ne reçoit rien.
 *
 * Cette fonction NE LANCE JAMAIS. Elle rend un résultat que l'appelant est
 * obligé de regarder s'il veut savoir. C'est la différence entre un échec
 * avalé et un échec enregistré : les colonnes `notification_erreur` de la
 * migration 0049 existent pour recevoir ce que cette fonction renvoie.
 * ---------------------------------------------------------------------------
 */

export type ResultatEnvoi =
  | { ok: true; id: string | null }
  | { ok: false; raison: string }

export type Courriel = {
  /** Destinataire, ou liste de destinataires. */
  a: string | string[]
  sujet: string
  html?: string
  texte: string
  /**
   * À qui répond le destinataire quand il clique sur « Répondre ».
   * Par défaut `info@ko-lab.ca`, la boîte réellement consultée par l'équipe.
   * Pour une notification interne, c'est l'adresse du demandeur qu'on veut
   * ici — répondre doit écrire au prospect, pas à soi-même.
   */
  repondreA?: string
}

/**
 * ⚠️ L'expéditeur n'est PAS un paramètre, volontairement.
 *
 * `site@ko-lab-center.ca` est la seule adresse d'un domaine vérifié chez
 * Resend. Tout envoi depuis `ko-lab.ca` échouerait (« Domain not verified »),
 * et ce domaine ne peut pas être vérifié : KO-LAB n'en a pas le DNS. Rendre
 * l'expéditeur réglable, c'est offrir un moyen de casser tous les envois d'un
 * seul réglage. Voir EMAILS dans lib/constantes.ts.
 */
function expediteur(): string {
  return `KO-LAB <${EMAILS.envoiTransactionnel}>`
}

export async function envoyerCourriel(courriel: Courriel): Promise<ResultatEnvoi> {
  const cle = process.env.RESEND_API_KEY
  if (!cle) {
    // Pas une erreur technique : une configuration manquante. Le message le
    // dit, parce qu'il finira affiché dans /admin/demandes devant quelqu'un
    // qui n'a pas accès aux journaux du serveur.
    return { ok: false, raison: 'RESEND_API_KEY absente de la configuration du serveur' }
  }

  try {
    const { Resend } = await import('resend')
    const envoi = await new Resend(cle).emails.send({
      from: expediteur(),
      to: courriel.a,
      replyTo: courriel.repondreA ?? EMAILS.info,
      subject: courriel.sujet,
      ...(courriel.html ? { html: courriel.html } : {}),
      text: courriel.texte,
    })

    // Resend ne lève pas sur un refus métier (adresse invalide, domaine non
    // vérifié, quota) : il renvoie un objet `error`. Sans ce test, un envoi
    // refusé passerait pour un succès — exactement le genre d'échec muet que
    // ce module est censé supprimer.
    if (envoi.error) {
      return { ok: false, raison: `${envoi.error.name ?? 'erreur'} : ${envoi.error.message}` }
    }
    return { ok: true, id: envoi.data?.id ?? null }
  } catch (err) {
    return { ok: false, raison: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Tronque un message d'échec avant de l'écrire en base.
 *
 * `notification_erreur` est un `text` sans limite côté PostgreSQL, mais une
 * pile d'appels de plusieurs kilo-octets dans une colonne affichée dans un
 * tableau d'administration ne sert personne. 300 caractères suffisent à
 * reconnaître la cause.
 */
export function raisonCourte(raison: string): string {
  const r = raison.replace(/\s+/g, ' ').trim()
  return r.length > 300 ? `${r.slice(0, 297)}…` : r
}
