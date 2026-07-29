import { z } from 'zod'

import { TYPES_DEMANDE } from '@/types'

/**
 * Schéma du formulaire de contact — skills 05 et 09.
 *
 * PARTAGÉ entre le navigateur et l'API route, volontairement : deux schémas
 * séparés finissent toujours par diverger, et c'est côté serveur que la
 * divergence devient une faille. Le client valide pour le confort, le serveur
 * valide parce que rien de ce qui vient du réseau n'est digne de confiance.
 *
 * Les bornes reprennent celles du skill 05 : nom 2-100, message 10-2000.
 */
export const schemaContact = z.object({
  // z.enum sur la constante de src/types : ajouter un type de demande là-bas
  // le propage ici et dans la base, sans liste à maintenir en double.
  type: z.enum(TYPES_DEMANDE),

  nom: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(200),

  // Optionnels : la chaîne vide est normalisée en undefined pour éviter
  // d'insérer des '' en base là où NULL est la bonne valeur.
  telephone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  organisation: z
    .string()
    .trim()
    .max(150)
    .optional()
    .transform((v) => (v === '' ? undefined : v)),

  message: z.string().trim().min(10).max(2000),

  /**
   * Honeypot — skill 15. Champ masqué que seul un robot remplit.
   *
   * ⚠️ AUCUNE contrainte de longueur ici, volontairement. Un `.max(0)` ferait
   * échouer la validation dès qu'il est rempli et renverrait un 400 : le robot
   * apprendrait que le champ est surveillé et s'adapterait au prochain passage.
   *
   * Le piège doit être invisible. La valeur est donc acceptée, puis testée dans
   * la route, qui répond 200 sans rien enregistrer.
   */
  _hp: z.string().max(200).optional(),
})

export type DonneesContact = z.infer<typeof schemaContact>

/**
 * Mots de passe les plus utilisés au monde, et leurs variantes « conformes ».
 *
 * Liste courte et volontairement ciblée : ce sont les premières entrées de
 * tout dictionnaire d'attaque. Une liste exhaustive se charge côté service
 * (Supabase sait interroger HaveIBeenPwned, à activer dans Authentication →
 * Password Security) ; celle-ci couvre le cas où ce réglage serait oublié.
 */
const MOTS_DE_PASSE_COURANTS = new Set([
  'password', 'password1', 'password123', 'motdepasse', 'motdepasse1',
  'azertyuiop', 'qwertyuiop', 'azerty123', 'qwerty123', '123456789',
  '1234567890', 'iloveyou', 'welcome1', 'admin123', 'abc123456',
  'kolab123', 'ko-lab123', 'bonjour123', 'soleil123', 'chocolat1',
])

/**
 * Mot de passe — 8 caractères minimum (choix de Christian).
 *
 * ---------------------------------------------------------------------------
 * POURQUOI PAS « UNE MAJUSCULE, UN CHIFFRE, UN SYMBOLE »
 *
 * C'est la règle qu'on attend, et les recommandations actuelles la
 * déconseillent (NIST SP 800-63B, § 5.1.1.2). Imposer des classes de
 * caractères produit « Password1! » : huit caractères devinables, conformes à
 * la règle, et présents dans tous les dictionnaires. La longueur et
 * l'imprévisibilité comptent, la composition non.
 *
 * Ce qui est vérifié à la place, et qui bloque réellement des attaques :
 *   1. huit caractères au moins ;
 *   2. le mot de passe n'est pas dans la liste des plus courants ;
 *   3. il ne contient pas la partie locale du courriel — « moussa2026 » pour
 *      moussa@…, premier essai de quiconque connaît l'adresse.
 * ---------------------------------------------------------------------------
 *
 * Plafond à 200 : sans limite haute, une chaîne de plusieurs mégaoctets fait
 * travailler bcrypt pour rien — un déni de service à un seul octet près.
 */
export const schemaMotDePasse = z
  .string()
  .min(8)
  .max(200)
  .refine((v) => !MOTS_DE_PASSE_COURANTS.has(v.toLowerCase()), { message: 'courant' })

/** Le mot de passe reprend-il le courriel ? Vérifié à part : il faut les deux. */
export function motDePasseReprendCourriel(motDePasse: string, email: string): boolean {
  const local = email.split('@')[0]?.toLowerCase().trim()
  // Sous quatre caractères, la coïncidence l'emporte sur le signal : « ana »
  // rejetterait « bananeverte » pour ana@…
  if (!local || local.length < 4) return false
  return motDePasse.toLowerCase().includes(local)
}

export const schemaInscription = z
  .object({
    email: z.string().trim().email().max(200),
    motDePasse: schemaMotDePasse,
    confirmation: z.string().max(200),
  })
  // Vérifié côté serveur AUSSI, pas seulement dans le navigateur : la
  // confirmation évite une faute de frappe qui rendrait le compte
  // inaccessible, et rien de ce qui vient du réseau n'est digne de confiance.
  .refine((d) => d.motDePasse === d.confirmation, { path: ['confirmation'] })
  .refine((d) => !motDePasseReprendCourriel(d.motDePasse, d.email), {
    path: ['motDePasse'],
    message: 'reprend_courriel',
  })
