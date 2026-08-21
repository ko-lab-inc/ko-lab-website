# État du projet — KO-LAB Inc.

Document de reprise, pour quelqu'un qui n'a rien suivi. Écrit à la clôture
de la Phase 10 (20 août 2026). Factuel : ce qui suit est vérifiable dans le
code, les migrations, ou les fichiers `docs/` cités — pas une reconstitution
de mémoire.

Site vitrine bilingue FR/EN pour KO-LAB Inc. (déploiement terrain,
fabrication, logistique — Outaouais, Québec). Next.js 16 + React 19 +
Supabase + Vercel + Cloudflare. Détails techniques complets dans
`.claude/CLAUDE.md` — ce document-ci ne les répète pas, il donne le fil
narratif et l'état des choses.

---

## 1. Les phases, en une ligne chacune

Les phases 1 à 3 précèdent la période couverte en détail par les
conversations dont ce document est tiré ; leur description s'appuie sur
l'historique git et les commentaires du code, pas sur un suivi en direct.

| Phase | État | Résumé |
|---|---|---|
| 1 | Fait | Fondation complète : les 11 pages marketing, l'espace admin (auth, rôles, CRUD catalogue/réalisations/carrières/vidéos/demandes), le système de commandes sans paiement en ligne, panier anonyme, gestion de stock, courriels transactionnels (Resend), domaine `ko-lab-center.ca`, premier audit sécurité. |
| 2 | Fait (18 août 2026) | Changement de l'accent bleu `#2f7fc9` → `#61b4db` + règle de contraste mesurée (bleu libre sur fond sombre, réservé aux gros éléments graphiques sur fond clair — jamais de texte courant bleu sur fond clair). |
| 3 | Fait (18 août 2026) | Centralisation technique : `lib/constantes.ts` (domaine, replis), fondations pour le routage localisé. |
| 4 | Fait (19 août 2026) | Intro animée de l'accueil (`IntroAnimee.tsx`) — signature de marque au premier chargement, respecte `prefers-reduced-motion`, une fois par session (`sessionStorage`). |
| 5 | Fait | Reconstruction des 13 sections de l'accueil (Hero, Besoins, Crédibilité terrain, Opérations, Installations, Le LAB, Équipements, GM Locations, Réalisations, Écosystème, Location, Boutique, CTA final), traitement colorimétrique centralisé (`FILTRE_TERRAIN`/`FILTRE_TERRAIN_CHAUD`). |
| 6 | Fait | Carrières : 9 postes réels en base (`postes_carrieres`), formulaire de candidature unique, deux canaux de candidature (voir §2). |
| 7 | Fait | Positionnement élargi — KO-LAB présenté autant comme entreprise de fabrication/logistique/exécution terrain que comme atelier créatif, deux regroupements transversaux sur le hub `/nos-capacites`. |
| 8 | Fait, dette identifiée | Boutique catalogue (produits, panier, commandes manuelles). Rendus produits Bambu Lab/xTool utilisés comme images officielles puis identifiés comme non autorisés (voir §4) et retirés en Phase 10. |
| 9 | Fait | Site réellement bilingue FR/EN (avant : retrait complet de l'anglais à un moment de l'historique, puis réintroduction réelle page par page). Traductions complètes, `alt` et hiérarchie de titres vérifiés. |
| 10 | Close (20 août 2026) | Passe finale : responsive (6 largeurs), performance/accessibilité, SEO. Détail en §6-7. |

---

## 2. Décisions structurantes

**Palette bleue et sa règle de contraste** — `#61b4db` remplace `#2f7fc9`
depuis la Phase 2 : mesuré, pas supposé (8,10:1 sur fond noir, 2,15:1 sur
fond clair — échoue). D'où la règle : texte bleu permis seulement sur fond
sombre ; sur fond clair, le bleu est réservé aux gros éléments graphiques
(filets, chiffres XXL) et les boutons y sont toujours noir/blanc, jamais
bleu à texte blanc.

**Deux domaines, deux rôles, jamais confondus** — `ko-lab-center.ca` est le
site web et le seul domaine vérifié pour ENVOYER des courriels (Resend).
`ko-lab.ca` est la vraie boîte courriel consultée par l'équipe
(`info@ko-lab.ca`), affichée partout où on s'adresse à un humain (pied de
page, pages légales, `reply-to`). KO-LAB ne contrôle pas le DNS de
`ko-lab.ca`, d'où l'impossibilité de l'utiliser comme expéditeur.

**Deux canaux de candidature, tous deux gardés délibérément** — un
formulaire interne (`/carrieres/postuler`, le même pour les 9 postes,
sélection par cases à cocher) et un canal externe (Google Form, provisoire)
via `/api/carrieres/candidature-externe` pour rester traçable.

**Boutique désactivable entièrement, distincte du panier** — `boutiqueActive`
(réglage, migration 0029) retire la boutique de la navigation, de l'accueil,
du sitemap, de robots.txt, et rend ses routes introuvables (404). Distinct
de `panierActif`, plus ancien, qui laisse la boutique visible mais sans
panier (repli « demander un prix »). Aucun paiement en ligne nulle part :
une commande est une demande, confirmée manuellement par l'équipe.

**Titres neutres quand un client n'a pas confirmé être nommable** — une
réalisation reste publiable avec un titre décrivant le type de mandat
plutôt que le client, tant que « client\_nommable » n'a pas été confirmé
explicitement pour ce mandat précis.

---

## 3. Règles photo établies

Construites au fil de plusieurs lots traités (Canada Day, DEVFEST, HAP
2023, Feux sur glace 2024, créations 2025, enseignes, terrasse LPG) —
chaque photo est **ouverte et regardée individuellement**, jamais jugée sur
une vignette ou une liste fournie. Critères d'exclusion :

- Logo tiers **dominant** dans le cadre (pas incident — un logo de
  fabricant sur de l'équipement utilisé, ex. Bambu Lab, Peterbilt, en
  arrière-plan d'un chantier, n'est pas un problème en soi)
- Un filigrane visible sur une photo = signe d'une épreuve non livrée par
  le photographe → exclusion automatique, sans exception
- Visage identifiable **au premier plan** d'une personne du public/un
  invité — **exemption explicite pour l'équipe KO-LAB visiblement au
  travail**, y compris posée/souriante face caméra
- Nom de personne lisible (carte professionnelle, étiquette) — trouvé une
  fois dans un lot « Le LAB », photo écartée
- Flou, sous-exposition, distorsion grand-angle qui nuit à la lisibilité
- Mélange de mandats dans un même dossier source : vérifié explicitement
  avant d'attribuer des photos à une réalisation — un dossier nommé pour
  un client peut contenir des photos d'un mandat différent
- Le mot « Lumivalli » ne doit **jamais** apparaître — titre, description,
  ou nom de fichier téléversé, sans exception

Traitement standard : 1600 px pour les sections pleine largeur, 1200 px
pour les vignettes de galerie, WebP q80. **Toujours appliquer `.rotate()`
avant redimensionnement** (voir piège EXIF, §7) — sinon une photo prise
téléphone à la verticale ressort de travers.

---

## 4. Dette technique

| Élément | État |
|---|---|
| `commandes.locale` | Absent — la langue réelle du client à la commande n'est pas connue. Conséquence : `gabaritStatutCommande.ts` (courriel de changement de statut) reste volontairement français uniquement, faute de savoir quelle langue le client a réellement utilisée. |
| Bundle JS commun | ~232 Ko chargés sur CHAQUE page contre 180 Ko visés. `react-hook-form` présent dans le socle commun alors que la plupart des pages n'ont aucun formulaire ; Crisp (14 Ko) chargé dès le premier rendu ; deux chunks de ~54 Ko non identifiés faute d'un bundle-analyzer. Détail dans `docs/phase-10-backlog.md`. Regroupé volontairement avec le prochain chantier (refonte de la gestion des médias en admin). |
| LCP mobile | 4,4 s (accueil, production réelle) contre 2,5 s visés — probablement lié au bundle JS ci-dessus. Non bloquant (site fonctionnel, a11y à 96), laissé de côté sur décision de Christian. |
| 4 visuels produits à droits incertains | Toujours en place (Atlas Copco, DEKO, conteneur Saman Portable, `deploiementCamion` orphelin en Storage) — décision explicite de Christian de les traiter plus tard. Inventaire complet : `docs/audits/2026-08-20-visuels-produits.md`. |
| 4 photos de la réalisation Terrasse LPG montrent une enseigne de commerce voisin en arrière-plan (« Le Marché du Store » ×3, « La Baie » ×1, cette dernière non publiée) | Tranché le 21 août 2026 : gardées telles quelles — l'enseigne est incidente, ne domine pas la composition et ne suggère aucun mandat, contrairement à Pacini/Village Transition ci-dessus. Voir `docs/audits/2026-08-21-photos-clients-non-autorisees.md`. |
| `IMAGES.soudeur` / `IMAGES.realisationLab` | Deux clés, la même photo Unsplash — aucune photo de soudure reçue dans aucun des cinq lots traités, revérifié à chaque fois. Partiront quand une vraie photo de soudeur au travail existera. |
| Image Open Graph | Un recadrage de la photo hero existante fait le travail, mais ce n'est pas une image pensée pour ce format. Une image de marque dédiée (logo lisible en miniature) est à demander à Christian. |
| GRANT UPDATE/DELETE sur `anon` | Indéterminé — la sonde REST ne distingue pas l'absence de GRANT du blocage par RLS. Voir `SKILL-securite-audit.md`. |
| `rls_auto_enable` | Fonction d'origine inconnue, exposée par PostgREST. Ne jamais l'appeler sans avoir lu sa définition en premier. |
| Outillage absent | ESLint installé mais sans config exploitable (`next lint` retiré de Next 16) ; gitleaks/trufflehog/semgrep absents ; aucune CI — tout audit reste manuel. |
| Cloudflare pas en frontal | `ko-lab-center.ca` est en DNS only (nuage gris), nécessaire pour le certificat SSL de Vercel — `cf-connecting-ip` n'est donc jamais présent. |
| Titre `<title>` de la page 404 | Hérite du titre par défaut du site plutôt que d'avoir le sien — mineur, le code HTTP 404 protège déjà le référencement. |

---

## 5. En attente d'une décision de Christian

- Bundle JS / LCP mobile — regroupé avec le prochain chantier (médias en admin)
- Image Open Graph de marque, avec logo lisible en miniature
- Les 4 visuels produits à droits incertains (§4) — retirer le fichier ou non
- Pacini et Village Transition (§4) — contacter pour obtenir l'accord avant
  de réutiliser leurs photos, ou les laisser hors ligne
- Mentions légales et politique de retour — en attente d'informations
  corporatives qui n'ont pas été confirmées (nom légal exact, adresse
  d'affaires, NEQ) ; ne pas rédiger ces pages en devinant ces informations
- Prix réels et images officielles pour une partie du catalogue Bambu
  Lab/xTool (déjà partiellement retiré pour droits, voir §4)

---

## 6. Ce qui a été mesuré en Phase 10 (pour référence)

- **Accessibilité** : 96/100 (Lighthouse) sur toutes les pages testées, FR et EN
- **Desktop** : 96/100, LCP 0,9 s — cible atteinte
- **Mobile, en production réelle** : Accueil 72/100 (LCP 4,4 s), Réalisations
  79/100 (LCP 3,6 s), Contact 88/100 (LCP 2,6 s) — sous la cible partout,
  cause probable détaillée en §4
- **Alt text** : 0 image sans attribut sur tout le site public (36 pages vérifiées, FR+EN)
- Trois bugs réels trouvés et corrigés cette phase : double préchargement
  d'image sur l'accueil, saut de hiérarchie de titres sur `/realisations`,
  contraste insuffisant d'une pastille sur une photo précise

---

## 7. Pièges rencontrés et solutions

**Le cache (`unstable_cache`, ISR) ne voit pas une écriture REST directe.**
Toute sonde ou tout script qui écrit dans Supabase en contournant les
Server Actions du site (utile pour tester un état sans passer par l'admin)
laisse le site local afficher l'ancien contenu tant que `.next` n'est pas
reconstruit. Réflexe établi : `rm -rf .next && npm run build` après
n'importe quelle écriture directe en base, avant de vérifier quoi que ce
soit à l'écran.

**L'orientation EXIF n'est pas appliquée automatiquement par `sharp`.**
Une photo de téléphone prise à la verticale mais stockée avec une
orientation EXIF (rotation 90°) ressort pivotée si le pipeline de
traitement ne comprend pas `.rotate()` explicitement — le fichier source
s'affiche pourtant à l'endroit dans un lecteur d'image normal, ce qui rend
le bug invisible tant qu'on ne regarde pas le résultat réellement
téléversé. Trouvé en vérifiant une réalisation à l'écran après
téléversement, pas en lisant le code du script.

**Liste blanche de traductions client (`messagesClient` dans
`(marketing)/[locale]/layout.tsx`).** Un composant CLIENT qui appelle
`useTranslations()` sur un espace de noms absent de cette liste explicite
affiche littéralement `Namespace.cle` en production, sans erreur ni
avertissement au build. Un nouveau composant client avec du texte traduit
doit systématiquement être ajouté à cette liste — vérifié à chaque fois
qu'un nouveau composant client apparaît.

**L'intro animée de l'accueil masque les captures Playwright.** Elle
rejoue à chaque nouveau contexte de navigateur (elle se souvient par
`sessionStorage`, vide dans un contexte de test fraîchement lancé) et reste
à l'écran ~2,7 secondes. Une capture d'écran automatisée qui ne la
contourne pas capture l'overlay au lieu du contenu réel. Solution : cliquer
le bouton « Passer l'introduction » (ou son équivalent anglais) juste après
la navigation, avant toute autre interaction.

**Le filtre colorimétrique « chaud » appliqué par erreur à une vraie
photo.** `FILTRE_TERRAIN_CHAUD` a été conçu pour compenser le ciel doré des
photos de banque Unsplash — appliqué à une vraie photo KO-LAB (sans ce
même contre-jour), il la rend orangée et délavée. Ce bug est réapparu
plusieurs fois : à chaque remplacement d'une clé `IMAGES.*` d'Unsplash vers
une vraie photo, il faut vérifier TOUS les consommateurs de cette clé (et
toute clé sœur partageant le même fichier) pour ce filtre résiduel.

**PostgREST exclut les fonctions `RETURNS TRIGGER` de son catalogue RPC.**
Un `proacl NULL` (EXECUTE accordé à PUBLIC par défaut) sur une fonction
trigger donne un 404 via `/rpc/`, pas un 401/403 — sonder avant de conclure
à une faille exploitable.

**`next dev` ne fait pas de vérification de type.** Une erreur TypeScript
réelle (variable inutilisée, incompatibilité de type) peut passer inaperçue
en développement et casser le build de production. Toujours lancer
`npm run build` avant de considérer un changement terminé, pas seulement
`npm run dev`.

**Traduire une page avec Google Translate casse le chargement des images
Next.js.** Constaté une fois — `translate.goog` interfère avec le
mécanisme de `next/image`. Ne pas utiliser la traduction automatique du
navigateur pour vérifier le rendu d'une page ; comparer plutôt les vraies
routes `/fr` et `/en`.

**Un dossier source déjà utilisé une fois n'est pas acquis pour la suite.**
Trouvé le 21 août 2026 : le dossier « enseignes install » avait servi le 20
août à la fois pour alimenter des clés `IMAGES.*` publiées directement sur
des pages marketing, et — plus tard le même jour — pour la réalisation
« Réfection et réinstallation d'enseignes ». La vérification faite pour la
réalisation (écarter les photos Pacini et Village Transition, mandats
différents mélangés dans le dossier) n'a jamais été reportée sur l'usage
antérieur, déjà en ligne, du même dossier — ces deux photos y sont restées
présentées comme des exemples génériques anonymes jusqu'à leur découverte
fortuite le lendemain. Voir
`docs/audits/2026-08-21-photos-clients-non-autorisees.md`.

Règle à appliquer désormais : **quand un dossier source a déjà servi plus
tôt dans le chantier, revérifier les images déjà publiées qui en
proviennent avant de traiter un nouveau lot du même dossier** — pas
seulement vérifier le nouveau lot avec les critères à jour.
