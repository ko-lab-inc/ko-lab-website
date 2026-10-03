import 'server-only'

import { EMAILS } from '@/lib/constantes'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

/**
 * Qui reçoit les notifications internes — migration 0053.
 *
 * ---------------------------------------------------------------------------
 * ⚠️ POURQUOI UN MODULE À PART, ET PAS DEUX CHAMPS DANS `lib/reglages.ts`
 *
 * `lireReglages()` lit avec la clé `anon`, et la politique
 * `reglages_lecture_publique` de 0011 est `using (publique = true)`. Les deux
 * clés lues ici sont marquées `publique = false` : elles sont donc INVISIBLES
 * de ce module-là.
 *
 * Ce n'est pas une contrainte subie, c'est le but. Ces valeurs contiennent les
 * adresses personnelles de l'équipe. Dans une table lisible avec la clé
 * `anon` — qui est publiée dans le bundle de chaque page — elles seraient
 * moissonnables par n'importe qui en une requête. Les coordonnées affichées
 * (`contact_courriel`, `courriel_rh`) sont déjà publiques de toute façon ;
 * celles-ci n'ont aucune raison de l'être.
 *
 * Le piège qu'il faut connaître : si on les avait mises en `publique = true`
 * par commodité, tout aurait semblé fonctionner. Et si on les avait laissées
 * en `publique = false` SANS ce module, le champ serait resté vide dans
 * l'écran d'administration et les notifications auraient continué de partir
 * vers le repli, sans un seul message d'erreur.
 *
 * ---------------------------------------------------------------------------
 * LA SERVICE ROLE KEY ICI EST-ELLE LÉGITIME
 *
 * `lib/supabase/admin.ts` la réserve aux API routes serveur. Les deux seuls
 * appelants de ce module sont `/api/contact/route.ts` (une API route) et
 * `carrieres/postuler/actions.ts` (une Server Action, qui importe DÉJÀ
 * `getSupabaseAdmin` pour écrire `notification_envoyee`). Aucun composant
 * n'importe ce fichier, et `server-only` le fait échouer à la compilation si
 * cela devait changer.
 *
 * L'écran d'administration, lui, n'utilise PAS ce module : il lit ces deux
 * clés avec le client de SESSION, que la politique `reglages_lecture_equipe`
 * autorise à tout voir. Aucun contournement du RLS dans un composant.
 * ---------------------------------------------------------------------------
 */

/**
 * Découpe une liste saisie à la main en adresses.
 *
 * Tolérante par nécessité : ce champ est rempli par un humain dans un écran
 * d'administration, qui collera « info@ko-lab.ca, christian@… » avec un espace
 * de trop, un point-virgule au lieu d'une virgule, ou un retour à la ligne.
 * Refuser la saisie pour un séparateur serait absurde ; l'accepter et envoyer
 * à « christian@… » avec un espace devant ne marcherait pas non plus.
 *
 * ⚠️ Le `@` est la SEULE validation, et c'est volontaire. Ce n'est pas le
 * moment de juger une adresse : la Server Action le fait déjà à
 * l'enregistrement, avec Zod, et c'est là que l'erreur peut être montrée à
 * quelqu'un. Ici, à l'envoi, écarter une entrée douteuse enlèverait
 * silencieusement un destinataire. Le filtre ne retire donc que ce qui ne
 * PEUT PAS être une adresse — un fragment vide laissé par « a@b.ca,, c@d.ca ».
 */
export function decouperAdresses(brut: string): string[] {
  return brut
    .split(/[,;\n]/)
    .map((a) => a.trim())
    .filter((a) => a.includes('@'))
}

type Destinataires = {
  /** Notifications de nouvelle demande de contact. Jamais vide. */
  demandes: string[]
  /** Notifications de nouvelle candidature. Jamais vide. */
  candidatures: string[]
}

/**
 * Destinataires en vigueur.
 *
 * ⚠️ NI L'UNE NI L'AUTRE LISTE NE PEUT REVENIR VIDE.
 *
 * Un tableau vide passé à Resend produit un envoi refusé, donc une demande
 * reçue dont personne n'est averti — précisément le défaut du 1er octobre
 * 2026 que les colonnes `notification_erreur` ont servi à rendre visible.
 * Chaque liste retombe donc sur l'adresse affichée correspondante, et en
 * dernier recours sur le repli du code.
 *
 * Pas de `unstable_cache` : les deux appelants sont un POST d'API et une
 * Server Action, jamais rendus statiquement. Une requête de plus sur un
 * formulaire soumis quelques fois par jour ne se mesure pas, et un cache
 * ajouterait une fenêtre où un changement de destinataire ne serait pas
 * encore pris en compte — pour ce réglage-là, c'est le mauvais compromis.
 */
export async function lireDestinataires(): Promise<Destinataires> {
  // Replis calculés, jamais copiés : voir la note de 0053. Une copie en base
  // divergerait dès que l'adresse affichée changerait.
  let replisDemandes: string = EMAILS.info
  let replisCandidatures: string = EMAILS.rh
  let demandes: string[] = []
  let candidatures: string[] = []

  try {
    const { data } = await getSupabaseAdmin()
      .from('reglages')
      .select('cle, valeur')
      .in('cle', [
        'notifications_demandes',
        'notifications_candidatures',
        'contact_courriel',
        'courriel_rh',
      ])

    for (const ligne of data ?? []) {
      const v = ligne.valeur.trim()
      if (ligne.cle === 'notifications_demandes') demandes = decouperAdresses(v)
      else if (ligne.cle === 'notifications_candidatures') candidatures = decouperAdresses(v)
      // Les deux adresses affichées servent de repli. Lues dans la même
      // requête : un aller-retour de plus pour une valeur dont on a besoin
      // dans la moitié des cas n'aurait pas de sens.
      else if (ligne.cle === 'contact_courriel' && v !== '') replisDemandes = v
      else if (ligne.cle === 'courriel_rh' && v !== '') replisCandidatures = v
    }
  } catch (err) {
    // Base injoignable : on part sur les replis du code plutôt que de ne
    // prévenir personne. Tracé, parce qu'un échec ici est silencieux par
    // nature — le visiteur, lui, voit son formulaire réussir.
    console.error('[destinataires] lecture impossible, repli sur les constantes', err)
  }

  return {
    demandes: demandes.length > 0 ? demandes : [replisDemandes],
    candidatures: candidatures.length > 0 ? candidatures : [replisCandidatures],
  }
}
