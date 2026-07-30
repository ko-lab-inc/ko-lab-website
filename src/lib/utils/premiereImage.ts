/**
 * Première image d'un produit, chemin local OU URL Supabase Storage.
 *
 * ⚠️ Deux origines légitimes, et deux seulement. Les douze produits d'origine
 * (migration 0007) portent un chemin local (`/images/produits/...`) ; ceux
 * ajoutés depuis /admin/catalogue portent l'URL publique du bucket Supabase.
 * Ce qui n'est ni l'un ni l'autre est écarté — `next/image` refuserait de
 * toute façon un hôte absent de `remotePatterns`, mais l'échec arriverait au
 * rendu, cassant la carte entière plutôt que de retomber sur l'emplacement
 * réservé.
 *
 * Sans `server-only` ni `'use client'` : utilisée à la fois par lib/produits.ts
 * (lecture publique, serveur) et TableauProduits.tsx (aperçu admin, client) —
 * un module neutre évite de dupliquer cette règle une troisième fois, et
 * importer lib/produits.ts (server-only) depuis un composant client ferait
 * échouer le build.
 */
export function premiereImage(images: unknown, hoteStockage: string): string | null {
  if (!Array.isArray(images)) return null
  const premiere = images[0]
  if (typeof premiere !== 'string') return null

  if (premiere.startsWith('/')) return premiere
  if (hoteStockage && premiere.startsWith(`${hoteStockage}/storage/v1/object/public/`)) {
    return premiere
  }
  return null
}
