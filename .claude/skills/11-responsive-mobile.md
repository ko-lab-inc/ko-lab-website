# Skill 11 — Responsive & Mobile

## Approche : Mobile-First TOUJOURS
Coder d'abord pour 375px, puis élargir avec les breakpoints.
Ne jamais coder desktop d'abord puis "adapter" le mobile.

## Breakpoints Tailwind (à utiliser)
```
défaut (mobile)  →  < 640px   →  375px cible
sm               →  640px+
md               →  768px+
lg               →  1024px+
xl               →  1280px+   →  cible desktop principale
2xl              →  1536px+
```

## Patterns récurrents KO-LAB

### Grilles responsives
```tsx
{/* 4 colonnes desktop → 2 mobile */}
<div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-ko-line">

{/* 2 colonnes desktop → 1 mobile */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-5">

{/* Split 50/50 desktop → empilé mobile */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
```

### Navigation mobile
```tsx
{/* Menu hamburger mobile — caché desktop */}
<button className="lg:hidden" aria-label="Menu">
  <span className="block w-6 h-px bg-ko-ink mb-1.5 transition-transform" />
  <span className="block w-6 h-px bg-ko-ink mb-1.5" />
  <span className="block w-4 h-px bg-ko-ink" />
</button>

{/* Liens nav — cachés mobile, visibles desktop */}
<nav className="hidden lg:flex gap-8">
```

### Typographie responsive
```tsx
{/* Titres : clamp pour fluidité */}
<h1 className="text-[clamp(32px,5vw,72px)] font-serif font-light leading-[1.06]">

{/* Sous-titres */}
<h2 className="text-[clamp(24px,3.8vw,50px)] font-serif font-light">
```

### Espacements responsives
```tsx
{/* Sections */}
<section className="py-16 lg:py-28">

{/* Conteneur */}
<div className="max-w-[1280px] mx-auto px-6 lg:px-12">

{/* Hero */}
<div className="min-h-[100svh] pt-24 pb-16 lg:pt-0">
```

### Images responsives
```tsx
import Image from 'next/image'

<div className="relative aspect-[4/3] lg:aspect-[16/9]">
  <Image
    src="/images/hero/terrain.jpg"
    alt="Équipe KO-LAB sur le terrain"
    fill
    className="object-cover object-center"
    sizes="(max-width: 768px) 100vw, 50vw"
    priority  {/* seulement pour les images above-the-fold */}
  />
</div>
```

## Éléments à masquer/modifier sur mobile
```tsx
{/* Carte flottante hero — cachée mobile */}
<div className="hidden lg:block absolute top-6 left-[-28px] ...">

{/* Colonne sticky — désactivée mobile */}
<div className="lg:sticky lg:top-28">

{/* Description dans la liste capacités — cachée mobile */}
<p className="hidden md:block text-ko-muted">
```

## Touch targets — minimum 44px
```tsx
{/* Tout lien ou bouton cliquable : min 44px de hauteur */}
<button className="min-h-[44px] px-6 ...">
<a className="min-h-[44px] flex items-center ...">
```

## Test mobile obligatoire
Avant de valider chaque section :
- [ ] 375px (iPhone SE) — le plus contraignant
- [ ] 390px (iPhone 14)
- [ ] 768px (iPad)
- [ ] 1280px (desktop)
- [ ] Pas de débordement horizontal
- [ ] Texte lisible sans zoom
- [ ] Boutons suffisamment grands
