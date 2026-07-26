# Skill 07 — Déploiement

## Stack d'hébergement
- **Vercel** : deploy Next.js (plan Hobby → Pro au go-live)
- **Cloudflare** : DNS + CDN + WAF + DDoS (plan Free permanent)
- **GitHub** : dépôt du code, déclenche les déploiements

## Branches
```
main     → production (ko-lab.ca) — deploy automatique sur merge
develop  → preview (develop.ko-lab.ca) — pour validation avant merge
feature/* → preview par branche — pour chaque nouvelle section
```

## Workflow de déploiement
```
1. Coder sur feature/nom-section
2. Push → Vercel génère une preview URL
3. Christian valide sur la preview URL
4. Merge dans develop → preview stable
5. Moussa audite le code si changement technique important
6. Merge dans main → deploy production automatique
```

## Variables d'environnement Vercel
À configurer dans le dashboard Vercel (jamais dans le code) :
```
NEXT_PUBLIC_SUPABASE_URL      (toutes les branches)
NEXT_PUBLIC_SUPABASE_ANON_KEY (toutes les branches)
SUPABASE_SERVICE_ROLE_KEY     (production + preview seulement)
RESEND_API_KEY                (production + preview seulement)
```

## Configuration Cloudflare
```
DNS : A record ko-lab.ca → IP Vercel
      CNAME www → ko-lab.ca
Proxy : activé (nuage orange) sur tous les records
SSL : Full (strict)
Cache : Standard (pages statiques mises en cache automatiquement)
WAF : règles managées activées (plan Free)
```

## next.config.ts production

⚠️ **Next 16** : `images.domains` a été **supprimé** — utiliser `remotePatterns`.
Le fichier est bien un `.ts` (supporté nativement depuis Next 15 ; en Next 14 il
fallait un `.mjs`, sans quoi la config était silencieusement ignorée).

L'hôte Supabase est déduit de `NEXT_PUBLIC_SUPABASE_URL` plutôt que codé en dur :
un placeholder oublié ne se manifesterait que par des images cassées en production.

```typescript
import type { NextConfig } from 'next'

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null

const nextConfig: NextConfig = {
  poweredByHeader: false, // ne pas divulguer l'infrastructure (skill 15)
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [375, 640, 768, 1024, 1280, 1920],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: supabaseHost ?? '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',       value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
          // + Permissions-Policy, HSTS et CSP — voir skill 14
        ],
      },
    ]
  },
}

export default nextConfig
```

## Version de Node sur Vercel
Next 16 exige **Node ≥ 20.9.0** (`engines.node` dans package.json).
Vérifier le réglage Node dans Vercel > Project Settings > General.

## Checklist avant mise en production
- [ ] Variables d'env configurées sur Vercel
- [ ] Domaine ko-lab.ca pointé sur Vercel via Cloudflare
- [ ] SSL actif sur Cloudflare (Full strict)
- [ ] Tests E2E passent sur la branche develop
- [ ] Core Web Vitals : LCP < 2.5s, FID < 100ms, CLS < 0.1
- [ ] Sitemap accessible sur /sitemap.xml
- [ ] robots.txt configuré
- [ ] Métadonnées vérifiées (FR et EN)
