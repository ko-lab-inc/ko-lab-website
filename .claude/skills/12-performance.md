# Skill 12 — Performance & Caching

## Objectifs Core Web Vitals
- LCP (Largest Contentful Paint) < 2.5s
- FID / INP < 100ms
- CLS (Cumulative Layout Shift) < 0.1
- TTFB (Time to First Byte) < 800ms

---

## Caching — 3 couches

### 1. Next.js ISR (Incremental Static Regeneration)
Pages régénérées en arrière-plan — jamais de temps d'attente pour le visiteur.
```typescript
// Page d'accueil — régénérée toutes les heures
export const revalidate = 3600

// Page réalisations — régénérée toutes les 30 min
export const revalidate = 1800

// Page boutique — régénérée toutes les heures
export const revalidate = 3600
```

### 2. Supabase — cache des requêtes fréquentes

🔴 **Utiliser `createStaticClient()`, jamais `createClient()` de `server.ts`.**

`createClient()` appelle `cookies()`, ce qui a deux conséquences fatales ici :
1. Next **lève une erreur** si `cookies()` est appelé dans `unstable_cache`.
2. Hors cache, `cookies()` bascule la route en rendu dynamique et annule
   purement et simplement le `export const revalidate`.

Le contenu du site vitrine est public et identique pour tous : il n'a aucun
besoin de session. Le RLS (skill 03) reste la protection.

```typescript
import { unstable_cache } from 'next/cache'
import { createStaticClient } from '@/lib/supabase/static'

export const getRealisations = unstable_cache(
  async () => {
    const supabase = createStaticClient() // ← sans cookies, synchrone
    const { data } = await supabase
      .from('realisations')
      .select('*')
      .eq('publie', true)
      .order('ordre')
    return data
  },
  ['realisations'],
  { revalidate: 3600, tags: ['realisations'] }
)
```

⚠️ Ne jamais forcer `cache: 'no-store'` sur ces requêtes : ça basculerait
la route en dynamique et annulerait l'ISR.

### 3. Cloudflare — cache CDN
```
Cache-Control: public, max-age=31536000, immutable  → assets statiques (/_next/static/*)
Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400  → pages HTML
```

---

## Images — optimisation Next.js

```typescript
// Toujours utiliser next/image
import Image from 'next/image'

// Hero — priorité maximale
<Image
  src="/images/hero/terrain.jpg"
  alt="Équipe KO-LAB"
  fill
  className="object-cover"
  priority        // preload
  quality={85}
  sizes="100vw"
/>

// Grille — lazy load
<Image
  src={realisation.image}
  alt={realisation.titre_fr}
  width={800}
  height={600}
  className="object-cover"
  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
/>
```

### Configuration next.config.ts
```typescript
images: {
  formats: ['image/avif', 'image/webp'],
  deviceSizes: [375, 640, 768, 1024, 1280, 1920],
  domains: ['votre-projet.supabase.co'],
}
```

---

## Fonts — pas de FOUT (Flash of Unstyled Text)

```typescript
// src/app/layout.tsx
import { Fraunces, Instrument_Sans, JetBrains_Mono } from 'next/font/google'

const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['opsz'],
  variable: '--font-serif',
  display: 'swap',  // évite le blocage du rendu
})

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500'],
})
```

---

## Bundle — éviter les imports inutiles

```typescript
// ✅ Import nommé (tree-shakable)
import { formatDate } from '@/lib/utils/formatters'

// ❌ Import de tout le module
import * as utils from '@/lib/utils'

// ✅ Dynamic import pour les composants lourds
const RealisationsMap = dynamic(() => import('@/components/RealisationsMap'), {
  loading: () => <div className="animate-pulse bg-ko-cream2 h-64" />,
  ssr: false,
})
```

---

## Lazy loading sections

```typescript
// Sections below-the-fold → chargement différé
import dynamic from 'next/dynamic'

const EcosystemeSection = dynamic(() => import('@/components/sections/Ecosysteme'))
const OffresSection     = dynamic(() => import('@/components/sections/Offres'))
```

---

## Script d'analyse performance
```bash
# Analyser le bundle
ANALYZE=true npm run build

# Lighthouse en CLI
npx lighthouse https://ko-lab.ca --output=json --output-path=./lighthouse-report.json
```
