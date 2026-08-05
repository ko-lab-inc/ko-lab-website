/**
 * Marqueur « j'ajoute des produits à une commande existante » — sessionStorage,
 * pas localStorage : ne doit pas survivre au-delà de la session en cours ni
 * suivre sur un autre appareil, contrairement au panier de demande de prix
 * (PanierContext).
 *
 * ---------------------------------------------------------------------------
 * POURQUOI CE FICHIER EXISTE
 *
 * « Ajouter un produit » depuis une commande existante (EditeurLignesCommande)
 * renvoie vers la VRAIE boutique — décision de Christian, un sélecteur plat ne
 * montre ni photo ni prix. Mais la boutique alimente normalement le panier de
 * demande de prix (PanierContext), qui débouche sur une commande NEUVE : sans
 * ce marqueur, un produit ajouté depuis là créait une seconde commande
 * séparée au lieu de rejoindre celle qu'on était en train de compléter.
 *
 * BandeauPourCommande (posé par boutique/layout.tsx) écrit ce marqueur en
 * arrivant avec `?pourCommande=<id>&numero=<numero>`, et l'affiche tant qu'il
 * est présent. EditeurLignesCommande le lit à son propre montage : s'il
 * correspond à LA commande affichée, il fusionne le panier dans ses lignes et
 * l'efface — le panier redevient un panier de demande de prix ordinaire pour
 * la suite.
 * ---------------------------------------------------------------------------
 */

const CLE = 'kolab_pour_commande'

export type MarquePourCommande = { id: string; numero: string }

function estMarqueValide(valeur: unknown): valeur is MarquePourCommande {
  if (typeof valeur !== 'object' || valeur === null) return false
  const o = valeur as Record<string, unknown>
  return typeof o.id === 'string' && typeof o.numero === 'string'
}

export function marquerPourCommande(marque: MarquePourCommande): void {
  try {
    window.sessionStorage.setItem(CLE, JSON.stringify(marque))
  } catch {
    // sessionStorage indisponible (navigation privée) : le mode ajout ne
    // persiste simplement pas au changement de page — dégradation acceptable.
  }
}

export function lireMarquePourCommande(): MarquePourCommande | null {
  try {
    const brut = window.sessionStorage.getItem(CLE)
    if (!brut) return null
    const analyse: unknown = JSON.parse(brut)
    return estMarqueValide(analyse) ? analyse : null
  } catch {
    return null
  }
}

export function effacerMarquePourCommande(): void {
  try {
    window.sessionStorage.removeItem(CLE)
  } catch {
    // Rien à faire : au pire le marqueur périmé reste, sans conséquence tant
    // qu'aucune commande future ne partage le même id.
  }
}
