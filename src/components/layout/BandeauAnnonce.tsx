/**
 * Bandeau d'annonce — migration 0053.
 *
 * ---------------------------------------------------------------------------
 * COMPOSANT SERVEUR, ET PAS DE BOUTON « FERMER »
 *
 * Un bandeau refermable demanderait un composant client, du `localStorage` et
 * une décision sur la durée de l'oubli. Ce bandeau sert à annoncer une
 * fermeture ou un avis de service : il reste quelques semaines, puis
 * l'administration l'éteint. Pouvoir le masquer irait contre sa seule raison
 * d'être, et ajouterait du JavaScript sur toutes les pages du site pour ça.
 *
 * ---------------------------------------------------------------------------
 * FOND SOMBRE — CE N'EST PAS UN CHOIX ESTHÉTIQUE
 *
 * La nav est en `bg-ko-cream`, le hero en `#ffffff`. Un bandeau clair au-dessus
 * d'une nav claire ne se verrait pas — or un avis qu'on ne remarque pas ne
 * sert à rien. Le fond noir le détache, et c'est aussi la seule façon
 * d'utiliser le bleu : sur `--ko-black`, `--ko-blue` mesure 8,10:1 ; sur fond
 * clair il tombe à 2,32:1 et échoue tout seuil AA (CLAUDE.md, règle d'usage du
 * bleu). Le filet bleu en bas marque l'accent sans jamais mettre de texte bleu
 * sur du clair.
 *
 * ---------------------------------------------------------------------------
 * POSITION — DANS LE FLUX, AU-DESSUS DE LA NAV STICKY
 *
 * La nav est `sticky top-0 z-50`. Placé avant elle dans le flux normal, le
 * bandeau défile puis disparaît, et la nav vient se coller en haut comme avant.
 * Aucun décalage à compenser. Le rendre `sticky` lui aussi mangerait de la
 * hauteur d'écran en permanence — sur un téléphone de 390 px de large, c'est
 * une ligne de contenu perdue sur chaque page.
 */
export function BandeauAnnonce({ texte }: { texte: string }) {
  return (
    /* `<aside>` et non `role="alert"` : `alert` interrompt un lecteur d'écran
       en pleine lecture, ce qui se justifie pour une erreur de formulaire, pas
       pour un avis permanent présent sur chaque page. Pas d'`aria-label` non
       plus — il ferait lire le texte deux fois, une fois comme nom de la
       région puis une fois comme contenu. */
    <aside className="border-b-2 border-ko-blue bg-ko-black px-4 py-2.5 text-center sm:px-6">
      {/* `text-ko-frost` et non `text-ko-white` : c'est le token du blanc sur
          fond sombre, et il reste blanc même si ce composant se retrouvait un
          jour sous la couche sombre, qui remappe `.text-ko-white`. */}
      <p className="mx-auto max-w-[70ch] text-sm leading-relaxed text-ko-frost">{texte}</p>
    </aside>
  )
}
