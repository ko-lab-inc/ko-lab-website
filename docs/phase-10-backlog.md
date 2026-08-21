# Phase 10 — reste à faire

Fichier de dépôt pour ce qui a été volontairement reporté pendant la Phase
10 plutôt que traité sur le moment. Pas un plan de phase — juste la liste,
pour ne rien perdre entre deux conversations.

---

## 404 générique sur `/boutique` désactivée — RÉSOLU (20 août 2026, étape 3)

Constaté le 20 août 2026, en vérifiant `boutiqueActive` (réglage,
migration 0029) : quand la boutique est désactivée, `boutique/layout.tsx`
appelle `notFound()`, et Next.js affichait sa page 404 par défaut
(« This page could not be found », non stylée, en anglais) plutôt que la
404 du site.

Corrigé en deux temps : `(marketing)/[locale]/not-found.tsx` (gère les
appels `notFound()` explicites, dont celui-ci) + `(marketing)/[locale]/
[...rest]/page.tsx` (route fourre-tout — une URL vraiment inconnue ne
traversait aucun `notFound()` explicite et retombait quand même sur la
page générique). Vérifié à l'écran, FR et EN, plus un chemin profond
(`/fr/a/b/c`).

---

## Bundle JS commun — react-hook-form, Crisp, deux chunks non identifiés

Constaté le 20 août 2026 (étape 2) : le socle JS chargé sur CHAQUE page,
même celles sans formulaire ni panier, pèse ~232 Ko contre 180 Ko visés
(mesuré via CDP, `encodedDataLength`, en isolant le vrai chargement
initial du bruit de préchargement de Next). Dans ce socle :

- **`react-hook-form`** (le hook `useForm`, pas seulement son intégration
  zod) apparaît dans deux chunks du socle commun (~23 Ko à eux deux) alors
  qu'Accueil, Réalisations et les quatre pages capacités n'ont aucun
  formulaire. À investiguer : qu'est-ce qui l'importe en dehors des pages
  qui en ont réellement besoin (Contact, Candidature, Connexion,
  Inscription, admin) ?
- **Crisp** (widget de clavardage tiers) : 14 Ko chargés dès le premier
  rendu sur chaque page. Candidat à différer après le premier affichage —
  ce n'est pas une ressource critique du premier écran.
- **Deux chunks de ~54 Ko au total** n'ont montré aucune signature
  identifiable avec `grep` sur du JS miniifié — un vrai bundle-analyzer
  (`@next/bundle-analyzer`, absent du projet, pas ajouté sans consigne)
  serait nécessaire pour les identifier proprement.

Décision de Christian (20 août 2026) : ne pas y toucher maintenant — LCP
mobile fonctionnel mais pas optimal (4,4 s en production contre 2,5 s
visés), le site n'est bloqué pour personne. À regrouper avec le prochain
chantier (refonte de la gestion des médias en admin), qui va de toute
façon toucher à ce code.

---

## Image Open Graph — recadrage temporaire, image de marque à demander

Ajoutée le 20 août 2026 (étape 3) : avant ce jour, aucune image Open
Graph n'existait nulle part sur le site — un partage sur Slack, iMessage
ou LinkedIn produisait une carte sans visuel. Réglé avec un recadrage
1200×630 (`public/images/og/og-defaut.jpg`) de la photo hero réelle
(Canada Day 2026, déjà sous droits) — fonctionnel, mais ce n'est qu'un
recadrage, pas une image pensée pour ce format.

Décision de Christian (20 août 2026) : garder ce recadrage pour
l'instant. Une image de marque dédiée (logo KO-LAB lisible même en
miniature, dans les aperçus de lien) est à demander directement à
Christian — pas à fabriquer sans lui.
