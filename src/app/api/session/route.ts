import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

/**
 * Identifiant de la personne connectée, et rien d'autre.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI UNE ROUTE PLUTÔT QU'UNE PROP
 *
 * Le panier vit côté client et doit savoir À QUI il appartient. Trois façons
 * d'obtenir cet identifiant, deux mauvaises :
 *
 *   - le passer en prop depuis le layout du site vitrine imposerait d'y lire
 *     les cookies, ce qui bascule TOUTES les pages publiques en rendu
 *     dynamique et supprime l'ISR du skill 12 ;
 *   - instancier le client Supabase dans le navigateur ajouterait sa
 *     bibliothèque au bundle de chaque page, pour un seul identifiant ;
 *   - cette route coûte un appel au montage du panier, et laisse le reste du
 *     site statique.
 *
 * ---------------------------------------------------------------------------
 * CE QU'ELLE NE RENVOIE PAS
 *
 * Ni courriel, ni rôle, ni métadonnées. Un identifiant opaque suffit à
 * séparer deux paniers, et tout le reste serait exposé sans raison à
 * n'importe quel script de la page.
 *
 * ⚠️ Ce n'est PAS une route d'autorisation. Elle dit « voici l'identifiant du
 * porteur du cookie », pas « cette personne a le droit de ». Toute décision
 * d'accès reste prise côté serveur — proxy, layout admin, politiques RLS.
 * ---------------------------------------------------------------------------
 */

/** Lit un cookie de session : jamais mise en cache, ni par Next ni par le CDN. */
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    return NextResponse.json(
      { userId: user?.id ?? null },
      // `private` : la réponse dépend du cookie. Sans cet en-tête, Cloudflare
      // pourrait servir l'identifiant d'une personne à une autre — le même
      // risque que celui traité dans le proxy.
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch {
    // Supabase non configuré ou injoignable : on répond « personne » plutôt
    // que de faire échouer le panier, qui doit continuer de fonctionner en
    // mode anonyme.
    return NextResponse.json({ userId: null }, { headers: { 'Cache-Control': 'no-store' } })
  }
}
