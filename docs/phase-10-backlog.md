# Phase 10 — reste à faire

Fichier de dépôt pour ce qui a été volontairement reporté pendant la Phase
10 plutôt que traité sur le moment. Pas un plan de phase — juste la liste,
pour ne rien perdre entre deux conversations.

---

## 404 générique sur `/boutique` désactivée

Constaté le 20 août 2026, en vérifiant `boutiqueActive` (réglage,
migration 0029) : quand la boutique est désactivée, `boutique/layout.tsx`
appelle `notFound()`, et Next.js affiche sa page 404 par défaut
(« This page could not be found », non stylée, en anglais) plutôt que la
404 du site (`Commun.page_introuvable_titre` / `page_introuvable_texte`,
déjà traduite dans les deux langues).

Pas spécifique à `boutiqueActive` : c'est l'absence d'un `not-found.tsx`
personnalisé au bon niveau dans l'arborescence `app/`, donc probablement
vrai pour n'importe quelle route introuvable du site, pas seulement la
boutique désactivée. À vérifier en le corrigeant.

Non corrigé sur consigne explicite (Christian, 20 août 2026) : à traiter
en Phase 10, pas avant.
