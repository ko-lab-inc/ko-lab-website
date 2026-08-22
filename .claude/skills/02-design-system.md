# Skill 02 — Design System KO-LAB

## Palette de couleurs — STRICTE
```css
/* globals.css */
:root {
  --ko-black:    #111210;   /* fond sombre dominant */
  --ko-ink:      #2a2b28;   /* texte principal sur fond clair */
  --ko-white:    #ffffff;   /* fond de page — blanc franc depuis le 22 août 2026 (correction « deux tons neutres ») */
  --ko-cream:    #f5f5f5;   /* surfaces/blocs — gris neutre depuis le 22 août 2026, même correction */
  --ko-cream-2:  #ebebeb;   /* fond clair tertiaire */
  --ko-blue:     #61b4db;   /* accent UNIQUE — depuis le 18 août 2026 */
  --ko-blue-2:   #37a0d2;   /* plus foncé que --ko-blue — hover, états actifs */
  --ko-muted:    #7a7b76;   /* texte secondaire */
  --ko-line:     #e0ddd6;   /* bordures sur fond clair */
  --ko-line-d:   rgba(255,255,255,0.12); /* bordures sur fond sombre */
}
```

## Typographie
```css
/* Polices à importer depuis Google Fonts */
/* Fraunces: opsz 9..144, italic, weight 300+400 */
/* Instrument Sans: weight 400+500+600 */
/* JetBrains Mono: weight 400+500 */

/* Tokens */
--font-serif: 'Fraunces', Georgia, serif;
--font-sans:  'Instrument Sans', system-ui, sans-serif;
--font-mono:  'JetBrains Mono', 'Courier New', monospace;

/* Hiérarchie des titres */
/* ⚠️ Le préfixe `ko-` est obligatoire et ne doit jamais être retiré.
   Les noms courts (.h-1, .h-2, .h-3) entrent en collision avec les utilitaires
   de hauteur Tailwind homonymes : dès qu'on écrit className="h-2", le JIT émet
   aussi `.h-2 { height: 0.5rem }` et le titre est écrasé à 8px, sans erreur
   de build. */
.ko-display { font-family: var(--font-serif); font-weight: 300; font-size: clamp(38px, 5.5vw, 80px); line-height: 1.04; letter-spacing: -0.025em; }
.ko-h1      { font-family: var(--font-serif); font-weight: 300; font-size: clamp(30px, 4vw, 58px);   line-height: 1.06; letter-spacing: -0.02em; }
.ko-h2      { font-family: var(--font-serif); font-weight: 400; font-size: clamp(22px, 2.8vw, 38px); line-height: 1.12; letter-spacing: -0.015em; }
.ko-h3      { font-family: var(--font-serif); font-weight: 400; font-size: clamp(18px, 2vw, 26px);   line-height: 1.2; }

/* Italiques en accent — bleu KO-LAB, réservé aux GROS titres (h1/h2) :
   sur fond clair, le bleu ne passe qu'en gros élément graphique (voir
   règle d'usage du bleu, CLAUDE.md). Jamais dans du texte courant. */
em { font-style: italic; color: var(--ko-blue); }

/* Labels mono — --ko-muted, PAS --ko-blue : à 11px sur fond clair, le bleu
   ne fait que 2,15:1, sous tout seuil AA. Sur fond sombre, utiliser
   .label-mono-d (--ko-blue-2, 6,37:1) — le bleu y reste libre. */
.label-mono {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ko-muted);
}
```

## Composants UI — tokens Tailwind
```javascript
// tailwind.config.ts
colors: {
  'ko-black':  '#111210',
  'ko-ink':    '#2a2b28',
  'ko-white':  '#ffffff',
  'ko-cream':  '#f5f5f5',
  'ko-cream2': '#ebebeb',
  'ko-blue':   '#2f7fc9',
  'ko-blue2':  '#5aa3e4',
  'ko-muted':  '#7a7b76',
  'ko-line':   '#e0ddd6',
},
fontFamily: {
  serif: ['Fraunces', 'Georgia', 'serif'],
  sans:  ['Instrument Sans', 'system-ui', 'sans-serif'],
  mono:  ['JetBrains Mono', 'Courier New', 'monospace'],
},
```

## Boutons
```tsx
/* Primaire — fond bleu KO-LAB, texte NOIR (pas blanc : blanc sur bleu ne
   fait que 2,32:1, voir règle d'usage du bleu, CLAUDE.md) */
<button className="bg-ko-blue text-ko-black font-medium text-sm px-7 py-4 rounded-sm
  hover:bg-ko-blue2 transition-colors duration-200 inline-flex items-center gap-2.5">
  Discuter d'un mandat →
</button>

/* Ghost — bordure fine */
<button className="border border-ko-line text-ko-ink text-sm px-7 py-4 rounded-sm
  hover:border-ko-ink transition-colors duration-200">
  Voir nos capacités
</button>

/* Texte — souligné */
<a className="text-sm text-ko-muted border-b border-ko-line pb-0.5
  hover:text-ko-ink hover:border-ko-ink transition-colors duration-200 inline-flex gap-2">
  En savoir plus →
</a>
```

## Sections — alternance fond
```
Section clair principal  → bg-ko-white    (hero, besoins, réalisations, CTA)
Section clair secondaire → bg-ko-cream    (capacités, offres)
Section sombre           → bg-ko-black    (stats bar, écosystème, footer)
```

## Espacement standard
```
Section padding vertical : py-28 (112px) desktop, py-16 (64px) mobile
Conteneur max-width      : max-w-[1280px] mx-auto px-12 (desktop) px-6 (mobile)
Gap grille               : gap-5 ou gap-6
```

## Filigrane numérique (style Davici)
```tsx
/* Numéro géant en fond de section */
<span className="absolute right-[-2%] bottom-[-8%] font-serif font-light
  text-[clamp(200px,30vw,520px)] text-ko-cream2 leading-none
  pointer-events-none select-none tracking-[-0.04em] z-0">
  01
</span>
```

## Carte flottante glassmorphism (hero)
```tsx
<div className="absolute top-6 left-[-28px] bg-white border border-ko-line rounded
  p-4 min-w-[170px] shadow-[0_4px_20px_rgba(0,0,0,0.06)] z-10">
  <p className="text-[9px] font-mono uppercase tracking-widest text-ko-muted mb-1.5">
    Heures terrain
  </p>
  <p className="font-serif text-[22px] text-ko-ink leading-none">20 000+</p>
  <p className="text-[10px] font-mono uppercase tracking-wider text-ko-blue mt-1">
    Mandats réalisés
  </p>
</div>
```

## Animations au scroll
```typescript
// useReveal hook — src/hooks/useReveal.ts
'use client'
import { useEffect, useRef } from 'react'

export function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target) }},
      { threshold: 0.12 }
    )
    if (ref.current) io.observe(ref.current)
    return () => io.disconnect()
  }, [])
  return ref
}

/* CSS globals.css */
.reveal { opacity: 0; transform: translateY(20px); transition: opacity .65s ease, transform .65s ease; }
.reveal.in { opacity: 1; transform: none; }
```
