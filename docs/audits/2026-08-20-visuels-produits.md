# Visuels boutique — droits d'usage incertains, 20 août 2026

Origine du chantier : les rendus Bambu Lab du catalogue venaient de
Pinterest — un agrégateur, pas le détenteur des droits. Même situation que
les 16 photos purgées précédemment. Chaque image ci-dessous a été **ouverte
et regardée**, pas seulement listée par nom de fichier.

Avant toute suppression : vérification des `lignes_commande` référençant le
produit (une fiche supprimée casserait l'historique de commande — mais dans
tous les cas ci-dessous, seul le **visuel** a été retiré, jamais la fiche).

---

## Traités le 20 août 2026 — PhotoPlaceholder, fichier retiré du dépôt

| Produit | Fichier retiré | Constat visuel | Commandes référençant le produit |
|---|---|---|---|
| Bambu Lab X1-Carbon | `bambu-lab-x1-carbon.webp` | Rendu studio de marque | CMD-2026-0005 (complétée), CMD-2026-0038 (expédiée) |
| Bambu Lab AMS | `bambu-lab-ams.webp` | Rendu studio de marque | aucune |
| Bambu Lab P1S | `bambu-lab-p1s-v2.webp` | Rendu studio de marque | aucune |
| Conteneur 40 pieds high cube | `conteneur-40-pieds-high-cube.webp` | **Filigrane tiers incrusté** sur la porte du conteneur — même signal que le dossier « FLORIDA Watermarked » déjà écarté ailleurs : un filigrane indique une épreuve non livrée | aucune |
| xTool F1 | `xtool-f1-v2.webp` | Rendu studio de marque, logo « XTOOL » visible | aucune |
| xTool P2 | `xtool-p2-v2.webp` | Rendu studio de marque, logo « XTOOL » visible | CMD-2026-0038 (expédiée), CMD-2026-0043 (confirmée), CMD-2026-0053 (annulée) |
| xTool S1 | `xtool-s1-v2.webp` | Rendu studio de marque, logo « XTOOL » visible | CMD-2026-0043 (confirmée), CMD-2026-0053 (annulée) |

⚠️ **Conséquence acceptée, pas évitable** : `gabaritCommande.ts` transforme un
chemin local en URL absolue au moment de l'envoi (`origine + src`) — les
confirmations déjà envoyées pour CMD-2026-0005, -0038, -0043 et -0053
contiennent l'URL en dur. Rouvrir un de ces courriels affichera une image
cassée à la place du visuel retiré. Un courriel déjà envoyé ne se corrige
pas rétroactivement ; l'arbitrage retenu (Christian, 20 août 2026) est qu'un
lien mort dans un vieux courriel pèse moins qu'un visuel sous droits servi
indéfiniment.

CMD-2026-0038 perd maintenant DEUX visuels (X1-Carbon et xTool P2) dans son
courriel de confirmation déjà envoyé.

---

## Signalés, non traités — marque réelle visible, origine douteuse

Décision de Christian (20 août 2026) : à traiter, mais après — produits
moins exposés que ceux ci-dessus.

| Produit | Fichier / emplacement | Constat visuel |
|---|---|---|
| Éclairage temporaire de chantier | `public/images/produits/eclairage-temporaire.webp` | Tour d'éclairage **Atlas Copco « HiLight V5+ »** — marque et modèle réels, lisibles |
| Outillage d'installation | `public/images/produits/outillage-installation.webp` | Coffret d'outils **DEKO** — marque réelle visible sur plusieurs outils à l'intérieur |
| Conteneur 2 pieds | Bucket Storage `produits/conteneur-2-pieds-1785431399245.jpg` | Rendu 3D professionnel (bureau meublé dans un conteneur) — cohérent avec la mention « Saman Portable, Bangalore » déjà présente dans la description du produit |
| Équipements et déploiement (accueil, section 7) — `deploiementCamion` | Storage `medias/deployment/deploiement-camion-2026.webp` (`images.ts`) | Caisse de camionnette pleine de bouteilles **Gatorade** et **Eska**, logos dominants — retirée de la section le 20 août 2026 (revue visuelle, point 3), remplacée par `transportRemorque2026`. Fichier resté dans Storage, plus aucun consommateur dans le code. |

## Signalés, laissés en place — risque jugé faible

Aucune marque ni filigrane visible à l'examen. Probablement pas des photos
KO-LAB non plus, mais rien d'identifiable à un tiers précis.

| Produit | Fichier |
|---|---|
| Conteneur 20 pieds standard | `public/images/produits/conteneur-20-pieds.webp` |
| Conteneur bureau aménagé | `public/images/produits/conteneur-bureau-amenage.webp` |
| Équipement de manutention | `public/images/produits/equipement-manutention.webp` |

---

## Méthode, pour la prochaine fois

1. Lister `produits_boutique.images` (ou l'équivalent du moment) et ouvrir
   **chaque** fichier — un nom de fichier ne dit rien de son contenu.
2. Chercher un filigrane, un logo de marque, un nom de fabricant lisible.
3. Avant de toucher une fiche : vérifier `lignes_commande` pour ce
   `produit_id`. Une commande existante interdit de supprimer la fiche,
   jamais le visuel.
4. Retirer le visuel (`images: []` en base, fallback `PhotoPlaceholder`
   automatique) plutôt que la fiche.
5. Si le fichier est local (`public/images/produits/`), le retrait du
   dépôt casse l'image dans tout courriel déjà envoyé qui la référençait en
   URL absolue — accepté, pas une raison de renoncer.
