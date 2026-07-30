/**
 * Adresse IP du client, pour les compteurs de limitation de débit.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI UN SEUL ENDROIT
 *
 * Cette logique existait en trois exemplaires — route de contact, action de
 * connexion, actions de compte — avec trois formulations légèrement
 * différentes. Une divergence y est invisible et coûteuse : un compteur qui
 * retombe sur `'inconnue'` met tous les visiteurs dans le même seau, et le
 * premier robot venu épuise le quota de tout le monde.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI CET ORDRE D'EN-TÊTES
 *
 * `cf-connecting-ip` d'abord : c'est le seul que Cloudflare réécrit
 * systématiquement, un client ne peut donc pas le falsifier une fois le proxy
 * en place.
 *
 * `x-forwarded-for` ensuite, PREMIÈRE entrée seulement — c'est une liste
 * (`client, proxy1, proxy2`), et prendre la chaîne entière donnerait une clé
 * différente à chaque saut intermédiaire.
 *
 * ⚠️ Tant que Cloudflare n'est pas devant le site, `x-forwarded-for` reste
 * fournissable par le client. Un attaquant qui le fait varier contourne le
 * compteur. C'est une limite connue et assumée : ce mécanisme est un
 * ralentisseur, la vraie défense est le WAF — voir l'avertissement en tête de
 * rateLimit.ts.
 * ---------------------------------------------------------------------------
 */
export function adresseDepuis(entetes: {
  get(nom: string): string | null
}): string {
  const cf = entetes.get('cf-connecting-ip')?.trim()
  if (cf) return cf

  const premier = entetes.get('x-forwarded-for')?.split(',')[0]?.trim()
  return premier && premier.length > 0 ? premier : 'inconnue'
}
