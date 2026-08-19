'use server'

import { headers } from 'next/headers'
import { z } from 'zod'

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

/** 10 Mo — même plafond que le bucket (0017) et que le formulaire d'origine. */
const TAILLE_CV_MAX = 10 * 1024 * 1024

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
    const { error } = await supabase.from('candidatures').insert({
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
    })

    if (error) {
      // Le CV est déjà déposé : on le retire pour ne pas laisser un document
      // personnel orphelin dans le stockage.
      if (cvChemin) await supabase.storage.from('cv').remove([cvChemin])
      console.error('[candidature] enregistrement refusé', error.message)
      return { erreur: 'serveur' }
    }
  } catch (err) {
    console.error('[candidature] échec', err)
    return { erreur: 'serveur' }
  }

  return { succes: true }
}
