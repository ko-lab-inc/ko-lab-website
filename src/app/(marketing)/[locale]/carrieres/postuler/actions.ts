'use server'

import { randomUUID } from 'node:crypto'

import { headers } from 'next/headers'
import { z } from 'zod'

import { DOMAINE, VERSION_POLITIQUES } from '@/lib/constantes'
import { lireDestinataires } from '@/lib/destinataires'
import { envoyerCourriel, raisonCourte } from '@/lib/email/envoyer'
import {
  gabaritAccuseCandidature,
  gabaritNouvelleCandidature,
} from '@/lib/email/gabaritsNotifications'
import { lireReglages, messageAbsence } from '@/lib/reglages'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { adresseDepuis } from '@/lib/utils/adresseClient'
import { rateLimit } from '@/lib/utils/rateLimit'

/**
 * Réception d'une candidature — table candidatures, migration 0017.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI UNE SERVER ACTION ET NON UNE ROUTE D'API
 *
 * Le formulaire de contact passe par /api/contact parce qu'il est soumis en
 * `fetch` depuis react-hook-form. Celui-ci est un `<form action={…}>` natif :
 * il fonctionne même sans JavaScript, ce qui compte pour un formulaire de
 * candidature — on ne refuse pas un candidat parce que son navigateur a
 * bloqué un script.
 *
 * ---------------------------------------------------------------------------
 * CLIENT DE SESSION, PAS LA SERVICE ROLE KEY
 *
 * Le visiteur est anonyme. Les politiques de 0017 l'autorisent à INSÉRER une
 * candidature et à DÉPOSER un fichier dans le bucket `cv`, rien d'autre : il
 * ne peut ni relire ni lister quoi que ce soit. Passer par la service role
 * key contournerait ces garde-fous sans rien apporter.
 * ---------------------------------------------------------------------------
 */

export type EtatCandidature = {
  erreur?: 'donnees' | 'cv' | 'trop_de_requetes' | 'serveur'
  succes?: boolean
}

/**
 * 4 Mo, pas 10 — corrigé le 27 août 2026. Le bucket (migration 0017)
 * autorise toujours 10 Mo, aucune migration nécessaire : un plafond de
 * BUCKET plus haut que ce que l'app envoie jamais est sans effet. Mais
 * Vercel plafonne le corps de toute Function serverless à 4,5 Mo, EN AMONT
 * de ce code (voir next.config.ts) — les 10 Mo annoncés ici n'ont jamais
 * été atteignables en production, et rien ne les validait côté client
 * avant ce correctif.
 */
const TAILLE_CV_MAX = 4 * 1024 * 1024

const TYPES_CV = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const schemaCandidature = z.object({
  nom: z.string().trim().min(2).max(120),
  telephone: z.string().trim().min(6).max(40),
  email: z.string().trim().email().max(200),
  ville: z.string().trim().min(2).max(120),
  // Au moins un poste : c'est une question obligatoire du formulaire.
  postes: z.array(z.string().trim().max(200)).min(1).max(20),
  disponibilites: z.string().trim().min(2).max(500),
  travail_exterieur: z.enum(['oui', 'non']),
  a_experience: z.enum(['oui', 'non']),
  experience_texte: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => v || null),
  source: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => v || null),
  // Case « Je confirme que les informations fournies sont exactes ».
  confirmation: z.literal('oui'),
  // Loi 25 (audit du 23 août 2026, migration 0041) — case DISTINCTE de
  // `confirmation` ci-dessus : l'une porte sur l'exactitude des données,
  // l'autre sur le consentement à leur collecte. Ne jamais les fusionner —
  // ce sont deux déclarations différentes, chacune doit rester vérifiable
  // séparément.
  consentement: z.literal('true'),
  /**
   * Langue de la page d'où part la candidature — migration 0054.
   *
   * ⚠️ STOCKÉE, pas seulement utilisée pour l'accusé qui part dans la seconde.
   * La réponse de refus, elle, part des semaines plus tard depuis
   * /admin/candidatures : à ce moment-là, la seule langue à portée serait
   * celle de l'écran qu'un membre de l'équipe a ouvert. Un refus en anglais à
   * un candidat francophone serait le seul message qu'il recevra de KO-LAB.
   *
   * `optional().default('fr')` et pas obligatoire : une valeur manquante ne
   * doit jamais faire échouer une candidature. Elle ne coûterait qu'un
   * courriel dans la mauvaise langue — une candidature perdue coûte bien plus.
   */
  locale: z.enum(['fr', 'en']).optional().default('fr'),
})

/**
 * Un fichier réellement téléversé, ou null.
 *
 * Teste la FORME de l'objet plutôt que son ascendance (`instanceof File`) :
 * c'est ce qu'on utilise réellement de lui juste après, et un champ de
 * fichier vide arrive comme une chaîne vide plutôt que comme un `File` de
 * taille zéro selon les navigateurs.
 *
 * ⚠️ Mesuré, pas supposé : dans ce runtime, la FormData d'une Server Action
 * renvoie bien un objet de constructeur `File`, donc `instanceof` aurait
 * marché ici. Ce contrôle structurel est une ceinture de sécurité, pas le
 * correctif d'un bug observé — le vrai bug était ailleurs (voir `cv_chemin`
 * dans l'insertion plus bas).
 */
function fichierTeleverse(valeur: FormDataEntryValue | null): File | null {
  if (!valeur || typeof valeur === 'string') return null
  const f = valeur as File
  return typeof f.size === 'number' && f.size > 0 && typeof f.arrayBuffer === 'function' ? f : null
}

/**
 * Nom de fichier fabriqué ICI, jamais celui fourni par le visiteur.
 *
 * ⚠️ Un nom de fichier est une entrée utilisateur comme une autre : il peut
 * contenir des séparateurs de chemin, des caractères de contrôle, ou faire
 * 300 caractères. On ne garde que l'extension, et encore, déduite du TYPE
 * MIME que le bucket a déjà validé.
 */
function cheminCv(nom: string, type: string): string {
  const extension =
    type === 'application/pdf' ? 'pdf' : type === 'application/msword' ? 'doc' : 'docx'

  const base =
    nom
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'candidat'

  return `${base}-${Date.now()}.${extension}`
}

export async function envoyerCandidature(
  _precedent: EtatCandidature,
  donnees: FormData,
): Promise<EtatCandidature> {
  // Honeypot : rempli = robot. On répond « succès » sans rien écrire, pour ne
  // pas lui apprendre qu'il a été repéré. Même motif que /api/contact.
  if (String(donnees.get('_hp') ?? '') !== '') return { succes: true }

  const ip = adresseDepuis(await headers())
  // Plus serré que le formulaire de contact (5/min) : une candidature
  // s'accompagne d'un fichier de 10 Mo, et personne n'en dépose cinq à la
  // minute de bonne foi.
  if (rateLimit(`candidature:${ip}`, { max: 3, windowMs: 600_000 })) {
    return { erreur: 'trop_de_requetes' }
  }

  const analyse = schemaCandidature.safeParse({
    nom: donnees.get('nom'),
    telephone: donnees.get('telephone'),
    email: donnees.get('email'),
    ville: donnees.get('ville'),
    postes: donnees.getAll('postes').map(String),
    disponibilites: donnees.get('disponibilites'),
    travail_exterieur: donnees.get('travail_exterieur'),
    a_experience: donnees.get('a_experience'),
    experience_texte: donnees.get('experience_texte'),
    source: donnees.get('source'),
    confirmation: donnees.get('confirmation'),
    consentement: donnees.get('consentement'),
    locale: donnees.get('locale') ?? 'fr',
  })

  if (!analyse.success) return { erreur: 'donnees' }

  try {
    const supabase = await createClient()

    // ------------------------------------------------------------------ CV
    let cvChemin: string | null = null
    const fichier = fichierTeleverse(donnees.get('cv'))

    if (fichier) {
      if (fichier.size > TAILLE_CV_MAX || !TYPES_CV.includes(fichier.type)) {
        return { erreur: 'cv' }
      }

      const chemin = cheminCv(analyse.data.nom, fichier.type)
      const { error } = await supabase.storage
        .from('cv')
        .upload(chemin, fichier, { contentType: fichier.type, upsert: false })

      if (error) {
        console.error('[candidature] téléversement du CV refusé', error.message)
        return { erreur: 'cv' }
      }
      cvChemin = chemin
    }

    // --------------------------------------------------------- Candidature
    // ⚠️ L'IDENTIFIANT EST POSÉ ICI, et surtout PAS relu après l'insertion.
    //
    // La migration 0019 révoque explicitement SELECT sur `candidatures` pour
    // `anon`, afin de protéger les coordonnées des candidats. Or PostgREST
    // traduit un `.select()` enchaîné à un `.insert()` en
    // `INSERT ... RETURNING`, qui exige ce privilège EN PLUS du droit
    // d'écrire — le même piège que `Prefer: return=representation`, décrit
    // dans CLAUDE.md à propos des sondes REST.
    //
    // Première version de cette notification : `.insert(...).select('id')`.
    // Le formulaire de candidature a cessé de fonctionner en production le
    // 2 octobre 2026, le temps d'un déploiement, pour cette seule raison —
    // et personne n'aurait pu le deviner depuis le code, puisque la requête
    // réussit pour un membre de l'équipe et échoue pour un visiteur.
    //
    // Générer l'identifiant nous-mêmes le rend connu sans rien relire.
    const idCandidature = randomUUID()

    const { error } = await supabase.from('candidatures').insert({
      id: idCandidature,
      nom: analyse.data.nom,
      telephone: analyse.data.telephone,
      email: analyse.data.email,
      ville: analyse.data.ville,
      postes: analyse.data.postes,
      disponibilites: analyse.data.disponibilites,
      travail_exterieur: analyse.data.travail_exterieur === 'oui',
      a_experience: analyse.data.a_experience === 'oui',
      experience_texte: analyse.data.experience_texte,
      source: analyse.data.source,
      // Explicite plutôt que de compter sur le défaut de la colonne
      // (migration 0028) — cette Server Action est le SEUL point d'écriture
      // de cette table, donc toujours 'interne' ; le Google Form externe
      // (LIEN_CANDIDATURE_EXTERNE) n'écrit jamais ici, voir la migration.
      canal: 'interne',
      // ⚠️ Ne pas oublier cette ligne. Sans elle, le CV part bien dans le
      // stockage mais la candidature s'enregistre avec `cv_chemin` à NULL :
      // le fichier existe, plus personne ne sait à qui il appartient, et
      // rien ne signale l'anomalie. C'est exactement ce qui s'est produit
      // ici, repéré par un envoi de test de bout en bout.
      cv_chemin: cvChemin,
      // Loi 25 (audit du 23 août 2026, migration 0041).
      consentement_le: new Date().toISOString(),
      consentement_version: VERSION_POLITIQUES,
      // Migration 0054 — voir la note du schéma plus haut.
      locale: analyse.data.locale,
    })

    if (error) {
      // Le CV est déjà déposé : on le retire pour ne pas laisser un document
      // personnel orphelin dans le stockage.
      if (cvChemin) await supabase.storage.from('cv').remove([cvChemin])
      console.error('[candidature] enregistrement refusé', error.message)
      return { erreur: 'serveur' }
    }

    // ------------------------------------------------- Notification équipe
    //
    // Ajoutée le 2 octobre 2026. Jusque-là, une candidature n'avertissait
    // PERSONNE : le CV partait dans le stockage et le dossier attendait que
    // quelqu'un ouvre /admin/candidatures de lui-même.
    //
    // Après l'enregistrement, jamais avant : si l'envoi échoue, la
    // candidature est déjà sauvée. L'inverse perdrait un candidat pour une
    // panne de messagerie.
    //
    // L'échec n'interrompt rien et n'est pas renvoyé au candidat — il n'y
    // peut rien et son dossier est bien enregistré. Il est écrit sur la
    // ligne, où l'équipe peut le voir.
    const { sujet, texte } = gabaritNouvelleCandidature({
      nom: analyse.data.nom,
      email: analyse.data.email,
      telephone: analyse.data.telephone,
      ville: analyse.data.ville,
      postes: analyse.data.postes,
      disponibilites: analyse.data.disponibilites,
      aExperience: analyse.data.a_experience === 'oui',
      travailExterieur: analyse.data.travail_exterieur === 'oui',
      avecCv: cvChemin !== null,
      lienAdmin: `${DOMAINE}/fr/admin/candidatures`,
    })

    const envoi = await envoyerCourriel({
      // Les candidatures vont aux RH, pas à la boîte générale.
      //
      // Réglage `notifications_candidatures` depuis 0053, plus la constante
      // EMAILS.rh : plusieurs personnes peuvent avoir à voir passer les
      // candidatures, et la liste se change sans déploiement. Elle ne revient
      // jamais vide (repli sur l'adresse RH, puis sur la constante) — voir
      // lib/destinataires.ts.
      a: (await lireDestinataires()).candidatures,
      sujet,
      texte,
      // Répondre écrit au CANDIDAT, pas à soi-même.
      repondreA: analyse.data.email,
    })

    // Client de service : la politique RLS de `candidatures` n'accorde
    // l'UPDATE qu'à l'équipe authentifiée, et ce code s'exécute pour un
    // visiteur anonyme. Portée volontairement minuscule — ces deux colonnes,
    // cette ligne-là.
    await getSupabaseAdmin()
      .from('candidatures')
      .update(
        envoi.ok
          ? { notification_envoyee: true, notification_erreur: null }
          : { notification_envoyee: false, notification_erreur: raisonCourte(envoi.raison) },
      )
      .eq('id', idCandidature)

    if (!envoi.ok) console.error('[candidature] notification RH non envoyée :', envoi.raison)

    /* ------------------------------------------------------------------
     * Accusé de réception AU CANDIDAT — migration 0054.
     *
     * Jusqu'ici, un candidat ne recevait jamais rien : il joignait son CV,
     * lisait « nous revenons vers vous dans les 48 heures ouvrables », et
     * plus aucun signe de vie. Les demandes de contact avaient leur accusé
     * depuis 0049 ; les candidatures, non.
     *
     * Envoyé APRÈS la notification de l'équipe, et son échec n'empêche rien :
     * les deux envois sont indépendants, et la candidature est déjà
     * enregistrée. Le résultat est inscrit sur la ligne — un envoi raté qui
     * ne laisse pas de trace est le défaut que 0049 a servi à supprimer.
     * ------------------------------------------------------------------ */
    const reglages = await lireReglages()
    const accuse = gabaritAccuseCandidature({
      nom: analyse.data.nom,
      locale: analyse.data.locale,
      delaiHeures: reglages.delaiReponseHeures,
      // Pendant une fermeture (0053), le message d'absence remplace la phrase
      // de délai — sinon ce courriel promettrait 48 heures ouvrables à
      // quelqu'un qui n'aura de nouvelles qu'au retour de l'équipe.
      absence: messageAbsence(reglages, analyse.data.locale),
    })
    const envoiAccuse = await envoyerCourriel({
      a: analyse.data.email,
      sujet: accuse.sujet,
      texte: accuse.texte,
    })

    await getSupabaseAdmin()
      .from('candidatures')
      .update(
        envoiAccuse.ok
          ? { accuse_envoye: true, accuse_erreur: null }
          : { accuse_envoye: false, accuse_erreur: raisonCourte(envoiAccuse.raison) },
      )
      .eq('id', idCandidature)

    if (!envoiAccuse.ok) {
      console.error('[candidature] accusé au candidat non envoyé :', envoiAccuse.raison)
    }
  } catch (err) {
    console.error('[candidature] échec', err)
    return { erreur: 'serveur' }
  }

  return { succes: true }
}
