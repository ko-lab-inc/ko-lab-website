# Photos montrant des clients réels identifiables, 21 août 2026

Origine du chantier : en vérifiant un doute sur l'orientation EXIF d'un lot
de photos déjà en ligne (`medias/installations/`, `medias/operations/`,
`medias/deployment/`, mises en ligne le 20 août 2026), les fichiers ont été
rouverts un par un. L'orientation était bonne partout — mais deux d'entre
eux se sont révélés montrer, en toutes lettres, l'enseigne d'un restaurant
et la numérotation d'un projet immobilier, alors qu'ils étaient présentés
sur le site comme des exemples génériques anonymes.

Ces deux mandats avaient déjà été identifiés et écartés le 20 août 2026 en
préparant la réalisation « Réfection et réinstallation d'enseignes » — mais
seulement pour cette réalisation-là. Le même dossier source avait servi
plus tôt, le même jour, à alimenter des pages de marketing différentes,
sans que cette exclusion soit reportée sur cet usage antérieur.

---

## Retirées du site le 21 août 2026

| Ancienne clé (`lib/images.ts`) | Fichier Storage | Client identifiable | Utilisée où |
|---|---|---|---|
| `enseigneCommerciale2026` | `medias/installations/enseigne-commerciale-2026.webp` | **Pacini** — logo et slogan « Amour. Bouffe. Italie. », bandeau « La terrasse est ouverte! » entièrement lisibles | Galerie `/nos-capacites/installations`, alt générique « Enseigne commerciale installée en façade » |
| `signalisation2026` | `medias/installations/signalisation-2026.webp` | **Village Transition** — plaque « 700 Village Transition » lisible | Galerie `/nos-capacites/installations`, alt générique « Signalisation numérotée installée sur un bâtiment » |
| `signalisationAlt2026` | `medias/installations/signalisation-alt-2026.webp` | **Village Transition** — plaque « 100 Village Transition » lisible | **Hero pleine page** de `/nos-capacites/operations-terrain` — l'emplacement le plus exposé du site pour cette page |

Aucune des deux entreprises n'a été sollicitée pour figurer sur le site de
KO-LAB. Le problème n'est pas la présence du travail de KO-LAB sur ces
photos — c'est probablement bien leur travail — mais leur présentation
comme exemples anonymes (« une enseigne commerciale », « un bâtiment
numéroté ») sans consentement du client réellement montré.

## Remplacement

Les trois clés pointent maintenant vers trois photos du lot « terrasse
2021 » (réalisation Terrasse LPG, déjà vérifiées sans marque tierce lisible
ni personne identifiable au premier plan lors du traitement de cette
réalisation le 20 août 2026) :

- `terrasseStructure2021` → hero d'`/nos-capacites/operations-terrain`
- `terrasseAmenagee2021` et `terrasseLivraison2021` → galerie
  d'`/nos-capacites/installations`

Vérifié à l'écran, desktop (1280px) et mobile (375px), sur les deux pages.

## Fichiers Storage — conservés, pas supprimés

`enseigne-commerciale-2026.webp`, `signalisation-2026.webp` et
`signalisation-alt-2026.webp` restent dans le bucket `medias`. Ce sont de
vrais mandats KO-LAB ; ils redeviennent utilisables si Christian obtient
l'accord de Pacini et de Village Transition pour apparaître sur le site.
Ne pas les supprimer sans instruction explicite.

---

## Signalé en cours de remplacement, gardé tel quel — même lot « terrasse 2021 »

En cherchant des photos de remplacement neutres dans ce même lot, 4 des 10
photos déjà publiées dans la réalisation **Terrasse LPG — construction sur
mesure** (`realisations`, slug `terrasse-lpg-construction-sur-mesure`) se
sont révélées montrer, en arrière-plan, l'enseigne d'un commerce voisin du
chantier :

| Ordre | Fichier | Constat |
|---|---|---|
| 10 | `...-pxl-20210621-085537...webp` (nommage source : `20210621_085537.jpg`) | « LE MARCHÉ DU STORE » lisible en arrière-plan ; plusieurs visages identifiables au premier plan |
| 20 | `20210621_120459.jpg` | « LE MARCHÉ DU STORE » lisible en arrière-plan |
| 30 | `20210621_134239.jpg` | « LE MARCHÉ DU STORE » lisible en arrière-plan |
| — | `20210621_171412.jpg` (non publiée — vérifiée en cherchant un remplacement, écartée pour cette raison) | « LA BAIE » lisible en arrière-plan |

Contrairement à Pacini/Village Transition, l'enseigne est ici incidente
(le sujet du chantier n'a aucun rapport avec ces commerces — KO-LAB
travaillait dans leur stationnement, pas pour eux) — un risque de nature
différente, probablement moindre, mais pas nul : ce sont quand même des
noms de commerces réels, lisibles, non floutés.

**Décision (21 août 2026) : gardées telles quelles.** Le critère appliqué
depuis le début des lots photo n'est pas « une marque tierce est-elle
visible » mais « la marque domine-t-elle la composition et suggère-t-elle
un mandat » (§3, règles photo établies). Ici, non aux deux : le sujet du
chantier n'a aucun rapport avec ces commerces, l'enseigne est une enseigne
de rue en arrière-plan, pas une référence client mise en scène — à la
différence de Pacini/Village Transition ci-dessus, où l'enseigne du client
ÉTAIT le sujet photographié. Christian reste libre de trancher autrement
s'il n'est pas à l'aise en les revoyant — c'est le rôle de cet audit.

Les 6 autres photos de cette réalisation n'ont pas été revérifiées avec ce
niveau d'attention (seul le besoin de trouver des remplacements a motivé
cette relecture partielle des 4 premières).

---

## Méthode, pour la prochaine fois

Voir ETAT-DU-PROJET.md, section « Pièges rencontrés » — règle ajoutée le
21 août 2026 : quand un dossier source a déjà servi plus tôt dans un
chantier, revérifier les images déjà en ligne qui en proviennent avant de
traiter un nouveau lot du même dossier.
