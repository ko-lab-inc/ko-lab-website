# Skill 22 — Photos & Médias

## Directive principale
Les vraies photos KO-LAB 2025-2026 remplacent les placeholders progressivement.
NE PAS utiliser de photos de stock génériques — elles trahissent immédiatement
un site template.

---

## Photos à prioriser (selon le document KO-LAB)

### ✅ Priorité haute (2025-2026)
- Équipes en action sur le terrain
- Équipements déployés (camions KO-LAB, nacelles, remorques)
- Installations en cours (décors, signalétique, structures)
- Atelier du LAB (impression 3D, laser, CNC en fonctionnement)
- Détails de fabrication (pièces, soudures, assemblage)

### ✅ Utilisables même si avant 2025
- Flo Rida 2023
- Feux sur glace 2024
- Alex au pays des merveilles
- Les Soirées illuminées d'Alex
(sans nécessairement nommer les événements)

### ❌ À éviter
- Photos où les logos des clients dominent
- Photos génériques de stock (Unsplash, Pexels)
- Photos avant 2025 sauf les exceptions ci-dessus

---

## ⚠️ Images temporaires à remplacer avant production

**Écart assumé à la règle ci-dessus**, validé par Christian pour la phase de
maquette uniquement : des emplacements réservés ne permettent pas de juger le
rythme et la respiration d'une page. Les photos Unsplash servent à valider la
mise en page, **pas le contenu**.

Toutes les URL sont centralisées dans **`src/lib/images.ts`**. C'est le seul
fichier à modifier le jour du remplacement.

| Emplacement | Sujet actuel | Photo KO-LAB attendue |
|---|---|---|
| `hero` | Chantier de nuit, 3 ouvriers, lampes de travail | Équipe KO-LAB en déploiement nocturne |
| `besoinDeployer` | Silhouettes sur dalle + grue, ciel ambré | Équipe terrain en action |
| `besoinInstaller` | Silhouettes sur échafaudage, contre-jour | Installation de décor ou signalétique |
| `besoinFabriquer` | Étincelles de meuleuse, fond noir | Atelier du LAB en fonctionnement |
| `besoinLouer` | Semi-remorque de nuit | Camions et remorques KO-LAB |
| `lab` | Soudeur, arc blanc-bleu | Impression 3D, laser ou CNC du LAB |
| `preuveTerrain` | **Duplication du hero** | Grand déploiement, vue large |
| `realisationTerrain` | **Duplication de besoinDeployer** | Réalisation réelle |
| `realisationInstallation` | **Duplication de besoinInstaller** | Réalisation réelle |
| `realisationLab` | **Duplication de lab** | Réalisation réelle |

### Critères ayant servi à la sélection
Reprendre les mêmes pour les vraies photos, ils tiennent la cohérence :
- **La lumière vient de l'outil ou à contre-jour**, jamais du plein jour — c'est
  le filtre le plus discriminant, et celui qui donne l'unité à la page
- Aucun visage face à l'objectif, aucune pose
- Palette noir + ambre ; aucun ciel bleu, aucune surface pâle dominante
- Aucun logo de client lisible

### À faire au moment du remplacement
1. Remplacer les URL dans `src/lib/images.ts`
2. Retirer `images.unsplash.com` de `next.config.ts` — **deux endroits** :
   `remotePatterns` et la directive `img-src` de la CSP
3. Supprimer les commentaires `⚠️ TEMPORAIRE` des composants de section
4. Supprimer cette section du skill

---

## Placeholders — pendant la phase de build

```tsx
// Composant placeholder réutilisable
// src/components/ui/PhotoPlaceholder.tsx
interface PhotoPlaceholderProps {
  label?: string
  className?: string
  ratio?: string
}

export function PhotoPlaceholder({
  label = 'Photo KO-LAB',
  className = '',
  ratio = 'aspect-[16/9]'
}: PhotoPlaceholderProps) {
  return (
    <div className={`${ratio} bg-ko-cream2 flex items-center justify-center ${className}`}>
      <div className="text-center">
        <div className="w-8 h-8 border border-ko-line mx-auto mb-3" />
        <p className="font-mono text-[10px] uppercase tracking-widest text-ko-muted">
          {label}
        </p>
      </div>
    </div>
  )
}
```

---

## Organisation dans Supabase Storage

```
bucket: ko-lab-media/
  hero/
    hero-principal.jpg          ← photo principale du hero
    hero-principal-mobile.jpg   ← version recadrée mobile
  realisations/
    [slug-realisation]/
      principale.jpg
      detail-01.jpg
      detail-02.jpg
  equipe/
    terrain-01.jpg
    atelier-lab-01.jpg
  boutique/
    [slug-produit]/
      principale.jpg
```

---

## Optimisation obligatoire

### Formats et tailles cibles
```
Hero :          2400×1600px, WebP, qualité 85
Réalisations :  1600×1200px, WebP, qualité 80
Vignettes :     800×600px,   WebP, qualité 75
```

### Nommage des fichiers
```
✅ ko-lab-equipe-terrain-festival-2025.jpg
✅ ko-lab-lab-impression-3d-piece-sur-mesure.jpg
❌ IMG_20251024_143521.jpg
❌ photo.jpg
```

### Alt text bilingue — toujours descriptif
```tsx
alt="Équipe KO-LAB déployant des équipements lors d'un festival à Gatineau"
// EN: "KO-LAB team deploying equipment at a festival in Gatineau"
```

---

## Workflow d'ajout de photo
1. Optimiser avec Squoosh ou ImageOptim → WebP
2. Nommer selon la convention
3. Uploader dans Supabase Storage
4. Mettre à jour la table `realisations.images` si nécessaire
5. Remplacer le composant `PhotoPlaceholder` par `next/image`
