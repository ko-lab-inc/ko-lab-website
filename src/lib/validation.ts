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
