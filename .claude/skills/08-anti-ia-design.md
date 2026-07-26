# Skill 08 — Anti-IA Design
## À lire EN PREMIER avant tout travail de design/frontend

Ce skill liste tout ce qui est INTERDIT dans ce projet.
KO-LAB est un site premium. Ces patterns trahissent immédiatement une génération IA générique.

---

## ❌ INTERDITS ABSOLUS — visuels

### Formes et arrière-plans
- Blobs / formes organiques flottantes en arrière-plan
- Dégradés décoratifs (radial, mesh, aurora)
- Fond en dégradé animé (ne jamais utiliser `animate-gradient`)
- Particules animées en arrière-plan
- Lignes de grille ou points en pattern sur fond
- Ondulations / vagues SVG décoratives
- Cercles concentriques comme élément décoratif
- Glassmorphism abusif (uniquement autorisé pour la carte flottante du hero)

### Icônes
- Icônes 3D génériques (style Flaticon coloré)
- Emojis dans l'interface
- Icônes "illustrations" avec dégradés multicolores
- Icons en bulle colorée avec fond pastel (style Notion)

### Couleurs
- Plus de 3 couleurs dans la palette (noir, blanc/crème, bleu KO-LAB)
- Couleurs pastel (rose, mauve, pêche, vert sauge)
- Fond crème + terracotta + serif = pattern IA immédiatement reconnaissable
- Fond sombre + néon violet/cyan = pattern gaming générique
- Dégradés bleu→violet sur boutons ou headers

### Typographie
- Police condensée type "chantier" (Anton, Bebas Neue, Impact) utilisée seule
- Texte ALL CAPS pour les paragraphes entiers
- Shadow text / text-stroke décoratif
- Polices multiples (max 3 : Fraunces + Instrument Sans + JetBrains Mono)
- Hiérarchie typographique écrasée (tout à la même taille)

---

## ❌ INTERDITS — composants UI

### Cartes
- Cartes avec hover "lift" + shadow exagéré (transform: translateY(-8px) + box-shadow énorme)
- Cartes avec bordure colorée en dégradé
- Cartes avec illustration IA générique en header

### Hero sections
- Hero avec image en cercle / ovale
- Hero avec mockup d'appareil (téléphone, laptop) flottant
- Hero avec confetti ou shapes décoratives
- Bouton CTA avec flèche animée (bounce)
- Compteur animé au chargement de page

### Sections
- Section "Comment ça marche" avec icônes numérotées dans des cercles colorés
- Timeline verticale avec points colorés alternés
- Témoignages avec avatar en cercle + étoiles + guillemets géants stylisés
- FAQ avec accordion coloré
- Section pricing avec "POPULAIRE" en badge coloré

### Navigation
- Nav avec mega menu en dégradé
- Logo animé au hover
- Barre de progression de scroll colorée

---

## ✅ CE QUI EST AUTORISÉ et premium

### Esthétique KO-LAB validée
- Fond uni blanc/crème avec beaucoup d'espace négatif
- Numéro géant en filigrane de couleur crème sur fond crème
- Typographie serif élégante fine (Fraunces) avec italiques
- Lignes fines de 1px comme séparateurs
- Grilles propres avec gap de 1-2px (effet "joint")
- Photo plein cadre avec dégradé sombre naturel
- Carte flottante minimaliste (fond blanc, bordure 1px, ombre légère)
- Texte en colonnes éditoriales
- Listes à tiret horizontal (— item)

### Interactions autorisées
- Hover : changement de couleur de fond subtil (+10% luminosité)
- Hover sur lien : padding-left += 12px avec transition (effet "avance")
- Hover sur flèche ronde : remplissage bleu (bg-ko-blue text-white)
- Scroll reveal : opacity 0→1 + translateY(20px)→0
- Nav : border-bottom apparaît au scroll

---

## Test rapide — poser ces questions avant de coder
1. Est-ce que ça ressemble à un site Webflow template gratuit ? → REFAIRE
2. Est-ce qu'il y a plus de 3 couleurs ? → SUPPRIMER
3. Y a-t-il un élément décoratif qui ne transmet pas d'information ? → SUPPRIMER
4. Est-ce que le design fonctionnerait avec uniquement du noir et blanc ? → CRITÈRE DE BASE
5. Est-ce que Fraunces + Instrument Sans + JetBrains Mono sont les seules polices ? → VÉRIFIER
