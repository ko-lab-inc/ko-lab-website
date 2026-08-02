/**
 * URL de base du site — pour les liens envoyés par courriel (confirmation
 * de compte, réinitialisation de mot de passe, confirmation de commande).
 *
 * ---------------------------------------------------------------------------
 * POURQUOI CE FICHIER EXISTE
 *
 * Dupliqué avant dans connexion/actions-compte.ts et
 * boutique/commande/details/actions.ts, chacun avec le même repli codé en
 * dur sur `http://localhost:3000`. Constaté sur le déploiement Vercel de
 * prévisualisation, dont `NEXT_PUBLIC_SITE_URL` n'était pas configurée : un
 * testeur a reçu, sur son téléphone, un courriel de confirmation de compte
 * dont le lien pointait vers `localhost:3000` — injoignable depuis n'importe
 * quel appareil autre que celui qui fait tourner le serveur.
 *
 * `VERCEL_URL` est injectée AUTOMATIQUEMENT par Vercel sur CHAQUE
 * déploiement (production comme prévisualisation), sans configuration —
 * contrairement à `NEXT_PUBLIC_SITE_URL`, qui doit être posée à la main par
 * environnement (voir .env.local). En s'en servant comme repli, une preview
 * produit un lien qui pointe au moins vers le bon déploiement, sans
 * intervention. `NEXT_PUBLIC_SITE_URL` reste néanmoins la source à
 * PRIVILÉGIER en production : `VERCEL_URL` y vaut le nom `*.vercel.app`
 * généré automatiquement, jamais ko-lab-center.ca.
 * ---------------------------------------------------------------------------
 */
export function origine(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}
