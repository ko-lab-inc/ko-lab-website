/**
 * Fabrique un slug d'URL à partir d'un nom lisible.
 *
 *     « Conteneur bureau aménagé »  →  conteneur-bureau-amenage
 *     « xTool P2 »                  →  xtool-p2
 *     « Outillage d'installation »  →  outillage-d-installation
 *
 * ---------------------------------------------------------------------------
 * CE QU'IL NE REPRODUIT PAS
 *
 * Les douze slugs d'origine ont été écrits à la main et prennent des libertés
 * qu'aucune règle ne peut deviner : « Conteneur 20 pieds standard » a donné
 * `conteneur-20-pieds` — « standard » a sauté — et « Outillage
 * d'installation » a donné `outillage-installation`, sans le « d ».
 *
 * Cette fonction applique donc la règle RÉGULIÈRE, et le champ reste
 * modifiable : c'est une proposition, pas une contrainte. Sur les cas simples
 * elle tombe juste — `conteneur-bureau-amenage` est exactement ce qu'elle
 * produit.
 *
 * ⚠️ À la CRÉATION seulement. Le slug d'un produit publié vit dans une URL
 * publique (/boutique/<slug>) : le régénérer parce qu'on corrige une faute
 * dans le nom casserait tout lien déjà partagé et l'indexation.
 * ---------------------------------------------------------------------------
 */
export function slugifier(texte: string): string {
  return (
    texte
      .toLowerCase()
      // NFD sépare les lettres de leurs accents, la plage ̀-ͯ les
      // retire : « é » devient « e » plutôt que de disparaître, ce que ferait
      // un simple filtre alphanumérique.
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      // Tout ce qui n'est ni lettre latine ni chiffre devient un séparateur —
      // apostrophes, espaces, ponctuation, symboles.
      .replace(/[^a-z0-9]+/g, '-')
      // Tirets multiples réduits, et ceux des extrémités retirés : « xTool —
      // P2 » donnerait sinon `xtool---p2`.
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '')
      // Même plafond que le champ en base et que le schéma Zod.
      .slice(0, 80)
      // Un `slice` peut retomber en plein milieu et laisser un tiret final.
      .replace(/-+$/g, '')
  )
}
