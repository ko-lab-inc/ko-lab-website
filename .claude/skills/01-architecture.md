# Skill 01 — Architecture technique

## Stack
Next.js 16 App Router + React 19 + TypeScript + Tailwind CSS + Supabase + Vercel + Cloudflare

## Structure des dossiers
```
src/
  app/
    (marketing)/
      [locale]/          ← toutes les pages publiques ici
        page.tsx         ← accueil
        layout.tsx       ← layout avec nav + footer
        nos-capacites/
        realisations/
        location/
        boutique/
        a-propos/
        carrieres/
        contact/
    api/                 ← API routes Next.js
      contact/route.ts
      boutique/route.ts
  components/
    ui/                  ← composants atomiques (Button, Badge, Card...)
    layout/              ← Nav, Footer, Layout
    sections/            ← blocs de page (Hero, Stats, Besoins...)
    boutique/            ← composants spécifiques boutique
  lib/
    supabase/
      client.ts          ← client Supabase côté navigateur
      server.ts          ← client Supabase côté serveur (Server Components)
      admin.ts           ← client admin (service role — backend only)
    utils/
      cn.ts              ← utilitaire className (clsx + tailwind-merge)
      formatters.ts      ← formatage dates, prix, etc.
  hooks/                 ← hooks React custom
  styles/
    globals.css          ← CSS custom properties KO-LAB
  types/
    index.ts             ← types TypeScript globaux
    supabase.ts          ← types générés Supabase
  i18n/                  ← next-intl 4 : responsabilités séparées
    routing.ts           ← locales, defaultLocale, localePrefix
    request.ts           ← chargement des messages par requête (cible du plugin)
    navigation.ts        ← Link / redirect / usePathname localisés
messages/
  fr.json                ← toutes les chaînes FR
  en.json                ← toutes les chaînes EN
supabase/
  migrations/            ← fichiers SQL de migration
tests/
  unit/                  ← tests Vitest
  e2e/                   ← tests Playwright
```

## Patterns à suivre

### Server Components par défaut
Utiliser les Server Components pour tout ce qui peut l'être.
N'ajouter `'use client'` que si nécessaire (interactivité, hooks).

### Fetching de données

⚠️ **Next 16** : `createClient()` de `server.ts` est **async** (il attend `cookies()`).
Il bascule aussi la route en rendu dynamique — pour le contenu public mis en cache
par ISR, utiliser `createStaticClient()` de `static.ts` (voir skill 12).

```typescript
// ✅ Contenu PUBLIC — sans session, compatible ISR
import { createStaticClient } from '@/lib/supabase/static'

export const revalidate = 3600

export default async function Page() {
  const supabase = createStaticClient()
  const { data } = await supabase.from('realisations').select('*')
  return <RealisationsGrid items={data} />
}

// ✅ Contenu dépendant de la SESSION (/admin) — await obligatoire
import { createClient } from '@/lib/supabase/server'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('realisations').select('*')
  return <RealisationsGrid items={data} />
}
```

### Params et searchParams — Promises depuis Next 15
```typescript
// ❌ Next 14
export default function Page({ params }: { params: { locale: string } }) {
  const { locale } = params
}

// ✅ Next 16
type Props = { params: Promise<{ locale: string }> }

export default async function Page({ params }: Props) {
  const { locale } = await params
}
```

Idem pour `searchParams`, et pour `cookies()`, `headers()`, `draftMode()`.

### Composants UI — structure type
```typescript
// src/components/ui/Button.tsx
import { cn } from '@/lib/utils/cn'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'text'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
```

### i18n — next-intl
```typescript
// Dans les Server Components
import { getTranslations } from 'next-intl/server'

export default async function Page() {
  const t = await getTranslations('Home')
  return <h1>{t('hero.title')}</h1>
}

// Dans les Client Components
import { useTranslations } from 'next-intl'

export function ClientComp() {
  const t = useTranslations('Home')
  return <p>{t('hero.subtitle')}</p>
}
```

## Interdits architecturaux
- Pas de `any` TypeScript — toujours typer proprement
- Pas de fetch côté client pour des données qui peuvent être server-side
- Pas de logique métier dans les composants UI
- Pas de secrets dans le code — toujours en variables d'env
