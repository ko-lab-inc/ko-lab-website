import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { adresseDepuis } from '@/lib/utils/adresseClient'
import { rateLimit } from '@/lib/utils/rateLimit'

import type { NextRequest } from 'next/server'

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

export async function GET(req: NextRequest) {
  /**
   * Plafond très large, et c'est délibéré.
   *
   * Ce qu'on arrête : la boucle. Avec un cookie forgé, getUser() sort sur le
   * réseau pour faire valider le jeton par le serveur d'authentification — et
   * ce quota-là est facturé au projet KO-LAB.
   *
   * ⚠️ POURQUOI PAS PLUS SERRÉ. Le compteur est indexé par adresse IP, et un
   * bureau entier sort derrière une seule adresse publique. Une limite de 60
   * par minute — un premier réglage, mesuré comme trop bas — aurait refusé la
   * route à des collègues d'un même chantier partageant une connexion. Or un
   * refus n'est pas neutre ici : le panier ne sait plus qui est là.
   *
   * 240 par minute reste dérisoire face à une boucle automatisée, tout en
   * laissant largement de la place à une dizaine de personnes qui naviguent
   * ensemble.
   *
   * ⚠️ Compteur en mémoire de processus : voir la portée réelle en tête de
   * rateLimit.ts. C'est un ralentisseur, pas une barrière.
   */
  if (rateLimit(`session:${adresseDepuis(req.headers)}`, { max: 240, windowMs: 60_000 })) {
    return NextResponse.json(
      { userId: null },
      { status: 429, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }

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
