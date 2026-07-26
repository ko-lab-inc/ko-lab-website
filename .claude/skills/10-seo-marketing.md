# Skill 10 — SEO & Marketing bilingue

## Metadata par page (Next.js 16)

⚠️ **`params` est une `Promise` depuis Next 15.** La déstructuration directe
dans la signature (`{ params: { locale } }`) ne compile plus — il faut `await`.

```typescript
// app/(marketing)/[locale]/page.tsx
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Metadata' })
  return {
    title:       t('home.title'),        // KO-LAB Inc. — De l'idée au terrain
    description: t('home.description'),  // KO-LAB réunit les équipes...
    openGraph: {
      title:  t('home.title'),
      images: [{ url: '/og/home.jpg', width: 1200, height: 630 }],
    },
    alternates: {
      canonical:  `https://ko-lab.ca/${locale}`,
      languages: {
        'fr': 'https://ko-lab.ca/fr',
        'en': 'https://ko-lab.ca/en',
      },
    },
  }
}
```

## Sitemap automatique
```typescript
// app/sitemap.ts
export default function sitemap() {
  return [
    { url: 'https://ko-lab.ca/fr',               lastModified: new Date() },
    { url: 'https://ko-lab.ca/en',               lastModified: new Date() },
    { url: 'https://ko-lab.ca/fr/nos-capacites', lastModified: new Date() },
    // ... toutes les pages
  ]
}
```

## hreflang — balises langue
```html
<link rel="alternate" hreflang="fr" href="https://ko-lab.ca/fr" />
<link rel="alternate" hreflang="en" href="https://ko-lab.ca/en" />
<link rel="alternate" hreflang="x-default" href="https://ko-lab.ca/fr" />
```

## Messages i18n — structure
```json
// messages/fr.json
{
  "Metadata": {
    "home": {
      "title": "KO-LAB Inc. — De l'idée au terrain",
      "description": "KO-LAB réunit les équipes, l'expertise et les équipements pour transformer une idée en opération concrète."
    }
  },
  "Nav": {
    "capacites": "Nos capacités",
    "realisations": "Réalisations",
    "location": "Location",
    "boutique": "Boutique",
    "apropos": "À propos",
    "carrieres": "Carrières",
    "cta": "Démarrer un projet"
  },
  "Home": {
    "hero": {
      "tag": "De l'idée au terrain",
      "title": "Qu'est-ce qu'on met sur le terrain aujourd'hui ?",
      "subtitle": "KO-LAB réunit les équipes, l'expertise, les équipements et les partenaires pour transformer une idée en opération concrète.",
      "cta_primary": "Discuter d'un mandat",
      "cta_secondary": "Voir nos capacités"
    }
  }
}
```
