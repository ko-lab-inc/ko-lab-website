# SKILL — Sécurité Production (Stack React / Next.js / Vercel / Supabase / Resend / GitHub)

> Skill générique applicable à toute app web, SaaS, site, plateforme ou logiciel utilisant cette stack.
> À suivre avant chaque déploiement en production.

---

## 0. Principe directeur

**Ne jamais faire confiance au client.** Tout ce qui vient du navigateur (inputs, headers, tokens, IDs) est potentiellement falsifié. Toute vérification qui compte se fait côté serveur.

**Règle du moindre privilège.** Chaque clé, rôle, policy et permission accorde le strict minimum nécessaire.

---

## 1. Secrets & variables d'environnement

- [ ] Clés serveur (`*_SERVICE_ROLE_KEY`, `*_API_KEY`, secrets Resend/Stripe/etc.) **jamais** préfixées `NEXT_PUBLIC_`
- [ ] Seules les valeurs réellement publiques utilisent `NEXT_PUBLIC_` (URL Supabase, clé `anon`, domaine)
- [ ] Aucun secret en dur dans le code source
- [ ] `.env*` (sauf `.env.example`) présents dans `.gitignore`
- [ ] Variables configurées dans Vercel (Production / Preview / Development séparés)
- [ ] Rotation prévue si une clé a déjà fuité (Git history compris)

```bash
# Détecter des secrets committés par erreur
git grep -nEI "(service_role|sk-ant-|sk_live_|re_[A-Za-z0-9]{20,}|BEGIN (RSA|EC|OPENSSH) PRIVATE KEY)"

# Vérifier l'historique complet (pas juste le HEAD)
git log -p | grep -nE "(service_role|sk-ant-|sk_live_|re_[A-Za-z0-9]{20,})"
```

> Un secret committé même une fois est compromis : le retirer du code ne suffit pas, il faut le **révoquer et régénérer**.

---

## 2. Supabase

### Row Level Security (RLS)
- [ ] RLS **activé sur toutes les tables** exposées (aucune table sans policy)
- [ ] Policies testées avec des utilisateurs de différentes organisations / tenants
- [ ] Séparation lecture / écriture / suppression selon les rôles
- [ ] La clé `service_role` (qui bypass RLS) reste **exclusivement** côté serveur (Server Components, Route Handlers, Edge Functions)

```sql
-- Activer RLS
alter table public.items enable row level security;

-- Exemple : un user ne voit que les lignes de son organisation
create policy "org members can read their items"
on public.items for select
using ( org_id = (select org_id from public.members where user_id = auth.uid()) );

create policy "org members can insert their items"
on public.items for insert
with check ( org_id = (select org_id from public.members where user_id = auth.uid()) );
```

### Storage
- [ ] Buckets contenant des données sensibles en **privé** (jamais public)
- [ ] Accès via **Signed URLs** à expiration courte
- [ ] Policies Storage alignées sur les policies des tables

```typescript
// URL signée, expiration 1h
const { data, error } = await supabase.storage
  .from('private-files')
  .createSignedUrl(filePath, 3600)
```

### Clients Supabase
- [ ] Client navigateur → clé `anon` uniquement
- [ ] Client serveur admin → `service_role`, jamais importé dans un composant client

```typescript
// lib/supabase/server.ts — usage serveur uniquement
import 'server-only'
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // bypass RLS — serveur seulement
)
```

---

## 3. Authentification & autorisation

- [ ] Vérification de la session sur **chaque** route API et Server Action
- [ ] Distinction claire authentification (qui es-tu) vs autorisation (as-tu le droit)
- [ ] Vérification d'appartenance sur chaque ressource accédée par ID (`resource.owner_id === session.user.id`)
- [ ] Pas de logique d'autorisation côté client comme seule barrière (le masquage UI n'est pas de la sécurité)
- [ ] Middleware protégeant les routes sensibles

```typescript
// Garde réutilisable
export async function requireUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Response('Unauthorized', { status: 401 })
  return user
}
```

---

## 4. Routes API & Server Actions

- [ ] Auth vérifiée en premier
- [ ] **Validation Zod** (ou équivalent) sur tous les inputs, y compris query params
- [ ] Rate limiting sur les routes coûteuses (IA, email, upload, auth)
- [ ] Réponses d'erreur génériques (ne pas fuiter stack traces ou détails internes en prod)
- [ ] Taille max des payloads limitée

```typescript
// app/api/action/route.ts
import { z } from 'zod'

const Schema = z.object({
  title: z.string().min(1).max(200),
  amount: z.number().int().positive(),
})

export async function POST(req: Request) {
  const user = await requireUser()                 // 1. auth
  await checkRateLimit(`action:${user.id}`, 20, 3600) // 2. rate limit
  const body = Schema.parse(await req.json())        // 3. validation
  // 4. logique métier avec vérif d'ownership
  return Response.json({ ok: true })
}
```

```typescript
// Rate limit simple avec Upstash Redis (free tier)
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, '1 h'),
})

async function checkRateLimit(key: string) {
  const { success } = await ratelimit.limit(key)
  if (!success) throw new Response('Too Many Requests', { status: 429 })
}
```

---

## 5. Resend (emails transactionnels)

- [ ] Clé API Resend côté serveur uniquement
- [ ] Domaine vérifié + enregistrements **SPF, DKIM, DMARC** configurés
- [ ] Adresses destinataires validées (Zod) avant envoi
- [ ] Rate limiting anti-abus (formulaires de contact, reset password, invitations)
- [ ] Aucune donnée sensible en clair dans les emails ; liens d'action à token expirable
- [ ] Contenu utilisateur échappé dans les templates HTML (anti-injection)

```typescript
import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY) // serveur uniquement

await resend.emails.send({
  from: 'App <noreply@votre-domaine.com>',
  to: validatedEmail,
  subject: 'Confirmation',
  react: EmailTemplate({ /* données échappées */ }),
})
```

---

## 6. Frontend React / Next.js

- [ ] Pas de `dangerouslySetInnerHTML` sans sanitisation (DOMPurify si indispensable)
- [ ] Aucune donnée sensible dans le bundle client ou dans les props envoyées au client
- [ ] Server Components pour tout ce qui touche des secrets ou données privées
- [ ] Content Security Policy stricte
- [ ] Dépendances tenues à jour, `npm audit` sans vulnérabilité critique

```typescript
// next.config.js — headers de sécurité
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

module.exports = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}
```

---

## 7. CORS

- [ ] Origines autorisées explicitement listées (jamais `*` sur une route authentifiée)
- [ ] Distinction domaine de prod / preview / localhost

```typescript
const ALLOWED_ORIGINS = [
  'https://votre-app.com',
  'https://votre-app.vercel.app',
  'http://localhost:3000',
]

function corsHeaders(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ''
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}
```

---

## 8. GitHub & CI/CD

- [ ] Secret scanning + push protection activés sur le repo
- [ ] Dependabot / alertes de vulnérabilités activés
- [ ] Branche `main` protégée (PR obligatoire, review, checks verts)
- [ ] Secrets stockés dans GitHub Actions Secrets / Vercel, jamais en clair dans les workflows
- [ ] Permissions du `GITHUB_TOKEN` réduites au minimum dans les workflows
- [ ] Aucun repo privé rendu public sans audit préalable de l'historique

```yaml
# .github/workflows/ci.yml
permissions:
  contents: read   # minimum nécessaire

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint && npm run typecheck
      - run: npm audit --audit-level=high
```

---

## 9. Vercel (déploiement)

- [ ] Variables d'environnement séparées par environnement
- [ ] Preview deployments protégés si le contenu est sensible (Vercel Authentication)
- [ ] HTTPS forcé (par défaut)
- [ ] Domaine custom avec certificat valide
- [ ] Logs runtime surveillés

---

## 10. Monitoring & observabilité (options gratuites)

- [ ] Vercel Analytics / Logs (inclus)
- [ ] Supabase Dashboard (logs, métriques, requêtes lentes)
- [ ] Sentry (free tier) pour les erreurs client et serveur
- [ ] Alertes sur pics d'erreurs ou de coûts (IA, email)
- [ ] Aucune donnée personnelle (PII) ni secret envoyé dans les logs

---

## 11. Données personnelles & conformité (si applicable)

- [ ] Minimisation : ne collecter que le nécessaire
- [ ] Chiffrement au repos (Supabase) et en transit (HTTPS partout)
- [ ] Politique de suppression / export des données utilisateur
- [ ] Consentement cookies si tracking

---

## Checklist rapide « go / no-go » avant `git push` → prod

1. Aucun secret dans le diff ni l'historique
2. RLS actif et testé sur toute nouvelle table
3. Toute nouvelle route : auth + validation + rate limit si coûteuse
4. `npm audit` sans critique, types et lint OK
5. Headers de sécurité en place
6. Variables d'env configurées côté Vercel
7. Test avec un compte d'une autre org : rien ne fuite
