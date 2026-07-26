# Skill 20 — UX Details & Micro-interactions

## Principes
- Chaque interaction doit INFORMER (pas juste décorer)
- Durées courtes : 150-300ms pour hover, 400-700ms pour reveal
- Courbes d'easing naturelles : ease-out pour apparition, ease-in-out pour transitions
- Pas d'animation si `prefers-reduced-motion` est activé

---

## Interactions validées pour KO-LAB

### Hover ligne de capacité (effet "avance")
```css
.cap-item {
  transition: padding-left 250ms ease;
}
.cap-item:hover {
  padding-left: 16px;
  background: var(--ko-cream);
}
```

### Hover flèche ronde
```css
.cap-arrow {
  transition: background 200ms ease, color 200ms ease, border-color 200ms ease;
}
.cap-item:hover .cap-arrow {
  background: var(--ko-blue);
  color: white;
  border-color: var(--ko-blue);
}
```

### Hover carte réalisation (légère shrink)
```css
.real-thumb {
  transition: transform 300ms ease;
}
.real-card:hover .real-thumb {
  transform: scale(0.98);
}
```

### Hover carte offre (bordure bleue)
```css
.offre {
  transition: border-color 250ms ease;
}
.offre:hover {
  border-color: var(--ko-blue);
}
```

### Lien texte avec flèche qui avance
```css
.btn-text {
  transition: gap 200ms ease, color 200ms ease, border-color 200ms ease;
}
.btn-text:hover {
  gap: 14px;
  color: var(--ko-ink);
  border-color: var(--ko-ink);
}
```

### Nav — bordure apparaît au scroll
```typescript
// useScrolled hook
'use client'
import { useEffect, useState } from 'react'

export function useScrolled(threshold = 30) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > threshold)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [threshold])
  return scrolled
}
```

---

## Reveal au scroll (sections)
```css
/* globals.css */
.reveal {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 650ms ease, transform 650ms ease;
}
.reveal.in {
  opacity: 1;
  transform: none;
}

/* Délai pour effets en cascade */
.reveal:nth-child(2) { transition-delay: 80ms; }
.reveal:nth-child(3) { transition-delay: 160ms; }
.reveal:nth-child(4) { transition-delay: 240ms; }
```

---

## États de formulaire

### Loading state bouton
```tsx
<button
  type="submit"
  disabled={isLoading}
  className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
>
  {isLoading ? (
    <span className="inline-flex items-center gap-2">
      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      Envoi en cours...
    </span>
  ) : 'Envoyer la demande'}
</button>
```

### Message de succès
```tsx
{submitted && (
  <div className="border border-ko-line bg-ko-cream rounded-sm p-5 mt-4">
    <p className="font-mono text-xs uppercase tracking-widest text-ko-blue mb-1">
      Message envoyé
    </p>
    <p className="text-ko-muted text-sm">
      On revient vers vous dans les 48 heures.
    </p>
  </div>
)}
```

---

## Ce qui est INTERDIT (voir aussi skill 08)
- Animations de chargement "flashy" au premier rendu
- Skeleton loaders avec shimmer animé (trop générique IA)
- Parallax excessif
- Transitions > 500ms pour les hovers
- Cursor personnalisé
- Boutons qui "rebondissent"
