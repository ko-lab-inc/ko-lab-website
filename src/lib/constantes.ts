/**
 * Constantes globales — domaine, courriels, liens externes.
 *
 * Phase 3 de la refonte (18 août 2026). Avant ce fichier, ces valeurs
 * étaient répétées en dur dans plusieurs fichiers (métadonnées, gabarits
 * de courriel, Server Actions d'envoi, réglages de repli). Objectif :
 * un seul endroit à changer quand le domaine bascule, qu'une adresse
 * change, ou qu'un lien externe est mis à jour.
 *
 * ---------------------------------------------------------------------------
 * DEUX DOMAINES, DEUX RÔLES — NE JAMAIS LES CONFONDRE (voir CLAUDE.md)
 *
 * - ko-lab-center.ca : le SITE WEB, et le seul domaine vérifié par Resend
 *   pour ENVOYER des courriels (`from:`). Personne n'y reçoit rien.
 * - ko-lab.ca : la vraie boîte que l'équipe consulte, confirmée par
 *   Christian. KO-LAB n'a pas le DNS de ce domaine — impossible de le
 *   vérifier chez Resend, donc impossible d'y ENVOYER depuis le code.
 *   D'où `from:` sur ko-lab-center.ca et `replyTo:`/affichage public sur
 *   ko-lab.ca.
 *
 * Ne JAMAIS remplacer une adresse @ko-lab.ca par @ko-lab-center.ca : les
 * boîtes ko-lab.ca fonctionnent réellement.
 * ---------------------------------------------------------------------------
 */

/**
 * Domaine du site — pour les métadonnées générées au build (sitemap,
 * robots.txt, canonicals, Open Graph) où un repli littéral vers la
 * production est correct par nature.
 *
 * ⚠️ PAS pour un lien envoyé par courriel à l'EXÉCUTION : voir
 * `lib/utils/origine.ts`, qui résout différemment (repli sur `VERCEL_URL`,
 * jamais sur ce domaine) pour qu'un environnement de prévisualisation ne
 * produise jamais un lien qui prétend être la production — bug réel, déjà
 * corrigé une fois (voir l'en-tête de ce fichier-là). Les deux existent
 * pour deux besoins différents ; ce n'est pas une duplication à fusionner.
 */
export const DOMAINE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ko-lab-center.ca'

/**
 * Adresses courriel. Valeurs vérifiées dans le code au moment d'écrire ce
 * fichier (18 août 2026) — reglages.ts, gabaritCommande.ts,
 * gabaritStatutCommande.ts et les trois Server Actions d'envoi de
 * commande partageaient déjà ces mêmes valeurs, dupliquées.
 */
export const EMAILS = {
  /** Boîte réellement consultée par l'équipe — reply-to et affichage public. */
  info: 'info@ko-lab.ca',
  /** Ressources humaines — section RH de /carrieres. */
  rh: 'rh@ko-lab.ca',
  /**
   * Expéditeur technique des courriels transactionnels — le seul domaine
   * vérifié par Resend pour ENVOYER. Le `from:` des gabarits de commande
   * et de `/api/contact` doit rester ici, jamais sur ko-lab.ca (non
   * vérifié chez Resend : l'envoi échouerait).
   */
  envoiTransactionnel: 'site@ko-lab-center.ca',
  /**
   * ⚠️ Configuré dans le tableau de bord Supabase (Authentication → Emails
   * → SMTP Settings), PAS dans ce dépôt — aucun fichier de code ne
   * l'utilise. Documentée ici pour qu'une bascule de domaine sache qu'il
   * faut AUSSI mettre à jour ce réglage côté Supabase, une étape qu'un
   * grep sur le code ne révélerait jamais (voir la procédure dans
   * docs/bascule-domaine.md).
   */
  expediteurAuthSupabase: 'notifications@ko-lab-center.ca',
} as const

/**
 * ⚠️ CES QUATRE CLÉS DE messages/fr.json CONTIENNENT ENCORE UNE ADRESSE EN
 * DUR — volontairement non centralisées ici (18 août 2026) : ce sont des
 * phrases complètes destinées à l'affichage, pas de la logique, et créer
 * un système d'interpolation pour les en extraire serait un changement
 * d'architecture disproportionné pour ce chantier.
 *
 * Elles doivent néanmoins être mises à jour À LA MAIN si une adresse change
 * — un grep sur ce fichier ne les trouvera jamais :
 *
 *   Carrieres.form.erreur_serveur   → rh@ko-lab.ca
 *   Aide.erreur                     → info@ko-lab.ca
 *   Inscription.erreur_courriel     → info@ko-lab.ca
 *   Connexion.refus_role_texte      → info@ko-lab.ca
 */

/**
 * Formulaire de candidature externe (Google Form) — canal secondaire prévu
 * en plus du parcours interne (/carrieres/postuler) le temps que Christian
 * tranche définitivement (Phase 6 de la refonte). Pas encore consommé par
 * le code au moment d'écrire ce fichier — ajouté ici pour que Phase 6
 * n'ait qu'à l'importer, jamais à le saisir en dur dans un composant.
 */
export const LIEN_CANDIDATURE_EXTERNE = 'https://forms.gle/s3wDqWFj3UQU13Q57'

/**
 * ⚠️ INCONNU — l'URL réelle de l'inventaire Rentman n'a jamais été
 * transmise. `location/page.tsx` utilisait déjà `'#'` en repli explicite
 * (jamais une URL inventée, pour qu'un lien mort reste facile à repérer) ;
 * reporté tel quel ici. Remplacer dès que Christian la communique — un
 * seul endroit à changer.
 */
export const LIEN_RENTMAN = '#'
