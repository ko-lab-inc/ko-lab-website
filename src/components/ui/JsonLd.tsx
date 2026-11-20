import { serialiserJsonLd } from '@/lib/geo/json-ld'

/**
 * Bloc de données structurées schema.org.
 *
 * Server Component, aucun JavaScript envoyé. `dangerouslySetInnerHTML` est
 * le seul moyen d'écrire dans un <script> avec React ; le contenu est du
 * JSON sérialisé par nos soins, chevrons échappés (voir serialiserJsonLd),
 * jamais une chaîne venue telle quelle d'un visiteur.
 */
export function JsonLd({ donnees }: { donnees: Record<string, unknown> | null }) {
  if (!donnees) return null
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialiserJsonLd(donnees) }}
    />
  )
}
