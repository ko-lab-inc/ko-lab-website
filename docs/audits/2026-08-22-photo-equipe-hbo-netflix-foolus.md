# Photo d'équipe écartée — logos HBO/Netflix/Fool Us, 22 août 2026

Origine du chantier : reconnaissance de la page `/a-propos`, qui n'affichait
qu'un `<PhotoPlaceholder>` (« Photo terrain KO-LAB ») dans sa section
« Positionnement ». Deux photos d'équipe existaient en local, hors dépôt
(`KO-LAB-PHOTOS/equipe/`, dossier ignoré par git), destinées à cet
emplacement d'après le handoff. Moussa les avait déjà regardées et validées ;
un second regard contre les critères d'exclusion de ce dossier a été fait
avant tout téléversement.

## Écartée

| Fichier local | Motif | Décision |
|---|---|---|
| `Copie de 241214-164358-@antonyphoto.jpg` | Quatre membres de l'équipe posant avec du matériel caméra devant un écran d'événement affichant, en toutes lettres et sur une bonne partie du cadre, le texte « MAGIE & GASTRONOMIE » suivi des logos **HBO**, **NETFLIX** et **FOOL US** — trois marques tierces majeures, lisibles, non floutées, juste derrière les sujets | **Écartée** — logos tiers dominants, même famille de problème que Pacini/Village Transition (voir `2026-08-21-photos-clients-non-autorisees.md`) : rien n'indique un accord de ces marques pour apparaître, même en arrière-plan, sur le site KO-LAB |

## Retenue

| Fichier local | Vérification | Décision |
|---|---|---|
| `241102-223501-@antonyphoto.jpg` | Six membres de l'équipe en tenue de soirée sur une scène à décor de cartes à jouer (événement, pas un chantier). Aucun logo de client/partenaire, aucun nom de personne lisible, aucun filigrane, aucune mention lumivalli/LumiTurbo3D, pas de flou ni de déformation. Un mot « OBEY » lisible sur un t-shirt — marque de vêtement personnelle, pas un logo de client ou partenaire, jugée non disqualifiante | **Retenue** — convertie en webp, téléversée sous `medias/equipe/equipe-kolab-2024.webp`, référencée par `medias_emplacements.apropos_1` (migration 0036) |

## Fichiers locaux — ni l'un ni l'autre dans le dépôt ou le bucket avant ce chantier

Les deux fichiers vivaient uniquement sous `KO-LAB-PHOTOS/equipe/`, exclu du
dépôt par `.gitignore` (ligne 90) — confirmé par `git ls-files` (aucune
entrée) avant ce chantier. Seule la photo retenue a depuis été téléversée
dans le bucket Storage `medias/equipe/`. La photo écartée reste uniquement
en local ; ne pas la téléverser sans un accord explicite d'HBO, Netflix et
Fool Us — hors de portée de ce projet.

## Méthode

Même règle que les audits précédents (§3, règles photo établies) : le
critère n'est pas « une marque tierce est-elle visible » mais « la marque
domine-t-elle la composition ET suggère-t-elle un mandat ou une association ».
Ici, oui aux deux — l'écran affiche ces marques en grand, au centre du cadre,
directement associé aux personnes photographiées.
