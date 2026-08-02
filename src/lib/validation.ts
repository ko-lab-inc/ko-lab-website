import { z } from 'zod'

import { MODES_LIVRAISON, TYPES_DEMANDE } from '@/types'

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
 * Une ligne de commande TELLE QUE LE CLIENT LA DÉCRIT — un slug et une
 * quantité, rien de plus.
 *
 * ⚠️ Ni nom, ni catégorie, ni prix ici. C'est le principe même de la
 * migration 0021 : `nom_produit`/`categorie`/`prix_indicatif` sont RE-DÉRIVÉS
 * côté serveur depuis `produits_boutique` au moment de l'écriture (voir
 * creerCommande), jamais pris tels quels du navigateur. Un client qui
 * soumettrait un nom ou un prix ici verrait simplement ces champs ignorés —
 * ils ne font pas partie du schéma.
 */
export const schemaLigneCommande = z.object({
  slug: z.string().trim().min(1).max(200),
  quantite: z.number().int().min(1).max(99),
})

/**
 * Schéma de la confirmation de commande — skill 05, migration 0021.
 *
 * Même discipline que schemaContact : partagé entre le formulaire et la
 * Server Action, bornes appliquées aux deux bouts.
 */
/**
 * ⚠️ NOM ET COURRIEL NE FONT PLUS PARTIE DE CE SCHÉMA.
 *
 * Depuis la simplification du parcours (Christian) : /boutique/commande/details
 * ne les demande plus, creerCommande les lit directement depuis
 * `auth.getUser()` — la session authentifiée, jamais un champ de formulaire
 * que le navigateur pourrait omettre ou falsifier. Voir schemaInscription
 * ci-dessus pour où le nom est désormais capturé (une seule fois, à
 * l'inscription).
 */
export const schemaCommande = z
  .object({
    telephone: z
      .string()
      .trim()
      .max(40)
      .optional()
      .transform((v) => (v === '' ? undefined : v)),
    organisation: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((v) => (v === '' ? undefined : v)),

    modeLivraison: z.enum(MODES_LIVRAISON),

    /**
     * Quatre champs distincts plutôt qu'un seul bloc libre — meilleure
     * validation (un champ manquant se signale précisément) et meilleure UX
     * qu'un pavé de texte. `creerCommande` les recompose en une seule chaîne
     * avant l'écriture : `commandes.adresse_livraison` reste une colonne
     * texte unique (0021), aucune migration nécessaire pour ce découpage
     * côté formulaire.
     *
     * ⚠️ `.nullish()` sur les quatre, pas `.optional()` — même raison que
     * l'ancien champ adresseLivraison unique (voir historique) :
     * FormulaireDetailsCommande ne les rend dans le DOM QUE si
     * `modeLivraison === 'expedition'`. En ramassage, `FormData.get()` sur un
     * champ absent renvoie `null`, jamais `undefined` — `.optional()` seul
     * rejette `null` et ferait échouer TOUTE commande en ramassage, le mode
     * par défaut, exactement le bug déjà corrigé une fois sur l'ancien champ.
     */
    adresse: z
      .string()
      .trim()
      .max(200)
      .nullish()
      .transform((v) => (v === '' || v === null ? undefined : v)),
    ville: z
      .string()
      .trim()
      .max(100)
      .nullish()
      .transform((v) => (v === '' || v === null ? undefined : v)),
    codePostal: z
      .string()
      .trim()
      .max(20)
      .nullish()
      .transform((v) => (v === '' || v === null ? undefined : v)),
    province: z
      .string()
      .trim()
      .max(100)
      .nullish()
      .transform((v) => (v === '' || v === null ? undefined : v)),

    // Au moins une ligne : une commande vide n'a pas de sens, et le panier
    // affiche déjà son propre état « vide » avant d'en arriver là.
    lignes: z.array(schemaLigneCommande).min(1).max(50),

    // Honeypot — même motif que schemaContact : accepté sans borne stricte,
    // testé dans l'action, jamais annoncé par un refus de validation.
    _hp: z.string().max(200).optional(),
  })
  // Chacun des quatre champs d'adresse est exigé, mais SEULEMENT en
  // expédition — un `.refine()` par champ pour que l'erreur pointe le champ
  // précis (`path`) plutôt qu'un message générique sur toute l'adresse.
  .refine((d) => d.modeLivraison !== 'expedition' || (d.adresse?.length ?? 0) >= 3, {
    path: ['adresse'],
    message: 'adresse_requise',
  })
  .refine((d) => d.modeLivraison !== 'expedition' || (d.ville?.length ?? 0) >= 2, {
    path: ['ville'],
    message: 'ville_requise',
  })
  .refine((d) => d.modeLivraison !== 'expedition' || (d.codePostal?.length ?? 0) >= 3, {
    path: ['codePostal'],
    message: 'code_postal_requis',
  })
  .refine((d) => d.modeLivraison !== 'expedition' || (d.province?.length ?? 0) >= 2, {
    path: ['province'],
    message: 'province_requise',
  })

export type DonneesCommande = z.infer<typeof schemaCommande>

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
    // Requis depuis la simplification du parcours commande (Christian) :
    // creerCommande lit désormais nom/email depuis la session plutôt que
    // depuis un formulaire de commande, donc le nom doit exister quelque part
    // AVANT ce moment-là — nulle part ailleurs qu'ici, puisqu'il n'existe pas
    // de page « profil » distincte pour le demander après coup.
    nom: z.string().trim().min(2).max(120),
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
