# Skill 14 — Sécurité Production

## Checklist avant go-live

### Variables d'environnement
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — jamais dans le code, jamais dans les logs
- [ ] `RESEND_API_KEY` — backend uniquement
- [ ] Toutes les clés rotées avant la mise en production
- [ ] Variables configurées dans Vercel Dashboard (pas dans .env commité)

### Headers HTTP (next.config.ts)
```typescript
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'X-DNS-Prefetch-Control',  value: 'on' },
      { key: 'X-Frame-Options',         value: 'DENY' },
      { key: 'X-Content-Type-Options',  value: 'nosniff' },
      { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy',      value: 'camera=(), microphone=(), geolocation=()' },
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js en a besoin
          "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
          "font-src 'self' fonts.gstatic.com",
          "img-src 'self' data: blob: *.supabase.co",
          "connect-src 'self' *.supabase.co *.supabase.io",
        ].join('; ')
      },
    ]
  }]
}
```

### Supabase en production
- [ ] RLS activé sur TOUTES les tables
- [ ] Service Role Key UNIQUEMENT dans les API routes serveur
- [ ] Anon Key : permissions minimales (lecture publique seulement)
- [ ] Auth emails configurés (confirmation, reset)
- [ ] Backup automatique activé

### Cloudflare WAF (plan Free)
- [ ] Rules managées activées
- [ ] Bot Fight Mode : ON
- [ ] Security Level : Medium
- [ ] SSL : Full (strict)
- [ ] HSTS activé

### Rate Limiting API
- [ ] /api/contact : max 5 req/min par IP
- [ ] /api/boutique/demande : max 3 req/min par IP
- [ ] Réponse 429 avec message clair

### Validation stricte
- [ ] Tous les inputs validés avec Zod côté serveur
- [ ] Sanitisation HTML si nécessaire (pas de dangerouslySetInnerHTML sans purification)
- [ ] Pas de secrets dans les réponses d'API (filtrer les champs sensibles)

## Surveillance post-lancement
- Activer les alertes d'erreur Vercel (email)
- Vérifier les logs Supabase régulièrement
- Dashboard Cloudflare : surveiller les requêtes bloquées
