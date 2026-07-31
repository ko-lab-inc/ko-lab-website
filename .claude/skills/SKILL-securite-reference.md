---
name: securite-reference
description: Référence sécurité pour toute app React/Next.js sur Vercel + Supabase + Resend + GitHub. À charger PENDANT l'écriture de code (routes API, RLS, formulaires, secrets, headers) pour appliquer les bons patterns. Pour VÉRIFIER une app avant déploiement, utiliser plutôt le skill « securite-audit ».
---

# Référence sécurité — Stack React / Next.js / Vercel / Supabase / Resend / GitHub

> Patterns à appliquer au moment d'écrire le code. Générique : applicable à toute app, SaaS, site, plateforme ou logiciel de cette stack.

---

## 0. Principe directeur

**Ne jamais faire confiance au client.** Tout ce qui vient du navigateur (inputs, headers, tokens, IDs) est potentiellement falsifié. Toute vérification qui compte se fait côté serveur.

**Règle du moindre privilège.** Chaque clé, rôle, policy et permission accorde le strict minimum nécessaire.

**Le code écrit ne prouve pas le comportement.** Une migration peut ne jamais avoir pris effet ; une policy peut être masquée par un `GRANT` trop large. Ce skill dit quoi écrire ; le skill `securite-audit` dit comment prouver que ça marche. Ne jamais conclure « c'est sécurisé » à partir de la seule lecture du code.

---

## 1. Secrets & variables d'environnement

- [ ] Clés serveur (`*_SERVICE_ROLE_KEY`, `*_API_KEY`, secrets Resend/Stripe/etc.) **jamais** préfixées `NEXT_PUBLIC_`
- [ ] Seules les valeurs réellement publiques utilisent `NEXT_PUBLIC_` (URL Supabase, clé `anon`, domaine)
- [ ] Aucun secret en dur dans le code source
- [ ] `.env*` (sauf `.env.example`) présents dans `.gitignore`
- [ ] Variables configurées dans Vercel (Production / Preview / Development séparés)
- [ ] Ne **jamais** marquer une variable `NEXT_PUBLIC_*` comme « Sensitive » sur Vercel : sa valeur part dans le bundle navigateur de toute façon, le marquage n'apporte rien et bloque la relecture

```bash
# Détecter des secrets committés — HEAD ET tout l'historique
git grep -nEI "(service_role|sk-ant-|sk_live_|re_[A-Za-z0-9]{20,}|BEGIN (RSA|EC|OPENSSH) PRIVATE KEY)"
git log -p --all | grep -nE "(service_role|sk-ant-|sk_live_|re_[A-Za-z0-9]{20,})"
```

> Un secret committé même une fois est compromis : le retirer du code ne suffit pas, il faut le **révoquer et régénérer**.

---

## 2. Supabase

### Row Level Security (RLS)
- [ ] RLS **activé sur toutes les tables** exposées (aucune table sans policy)
- [ ] Policies séparées lecture / écriture / suppression selon les rôles
- [ ] La clé `service_role` (bypass RLS) reste **exclusivement** côté serveur

```sql
alter table public.items enable row level security;

-- Un user ne voit que les lignes de son organisation
create policy "org members read their items"
on public.items for select
using ( org_id = (select org_id from public.members where user_id = auth.uid()) );

create policy "org members insert their items"
on public.items for insert
with check ( org_id = (select org_id from public.members where user_id = auth.uid()) );
```

> **Piège d'escalade classique.** Si l'insertion dans la table des profils passe par un trigger `handle_new_user`, ce trigger doit être `SECURITY DEFINER` et **ne jamais** lire le rôle depuis les métadonnées fournies par l'utilisateur. Sinon n'importe qui s'auto-promeut admin en passant `role: 'admin'` à l'inscription. Le rôle par défaut doit être le moins privilégié (`invite`/`client`), jamais `editor`/`admin`.

### GRANT vs RLS — deux couches distinctes
La RLS filtre les lignes ; le `GRANT` autorise l'opération. `anon` ne devrait avoir aucun `GRANT UPDATE`/`DELETE`. Une policy restrictive ne compense pas un GRANT trop large — retirer les deux.

### Storage
- [ ] Buckets sensibles en **privé** (jamais public)
- [ ] Accès via **Signed URLs** à expiration courte
- [ ] Policies Storage alignées sur celles des tables (préfixe, format, taille contrôlés à l'upload)

```typescript
const { data } = await supabase.storage
  .from('private-files')
  .createSignedUrl(filePath, 3600) // expire en 1h
```

### Clients Supabase
```typescript
// lib/supabase/server.ts — usage serveur uniquement
import 'server-only'
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // bypass RLS — serveur seulement
)
```

> La clé `anon` dans le bundle client est **normale et sans danger — à condition que la RLS soit réellement étanche.** C'est la RLS qui protège, pas l'absence de clé. Supprimer les clients Supabase non importés (code mort).

---

## 3. Authentification & autorisation

- [ ] Vérifier la session sur **chaque** route API et Server Action
- [ ] Utiliser `getUser()` (revalidé serveur), jamais `getSession()` pour décider d'un droit
- [ ] Distinguer authentification (qui es-tu) et autorisation (as-tu le droit)
- [ ] Vérifier l'appartenance sur chaque ressource accédée par ID (`resource.owner_id === user.id`) — anti-IDOR
- [ ] Le masquage d'interface n'est **jamais** une barrière de sécurité
- [ ] Revérifier le rôle côté serveur (proxy/middleware **et** layout protégé)

```typescript
export async function requireUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Response('Unauthorized', { status: 401 })
  return user
}
```

---

## 4. Routes API & Server Actions

Ordre imposé : **auth → rate limit → validation → logique avec vérif d'ownership.**

```typescript
// app/api/action/route.ts
import { z } from 'zod'

const Schema = z.object({
  title: z.string().min(1).max(200),
  amount: z.number().int().positive(),
})

export async function POST(req: Request) {
  const user = await requireUser()                    // 1. auth
  await checkRateLimit(`action:${user.id}`)           // 2. rate limit
  const body = Schema.parse(await req.json())         // 3. validation
  // 4. logique métier + vérif ownership
  return Response.json({ ok: true })
}
```

- [ ] Validation Zod sur **tous** les inputs, query params compris
- [ ] Réponses d'erreur génériques en prod (détails aux journaux serveur, jamais au client)
- [ ] Taille max des payloads limitée
- [ ] Honeypot sur les formulaires publics (champ caché ; si rempli → répondre 200 sans rien faire)

```typescript
// ✅ générique          ❌ divulgue l'infra
return Response.json({ error: 'Erreur serveur' }, { status: 500 })
// return Response.json({ error: err.message }, { status: 500 })
```

### Rate limiting — attention au piège serverless
Un compteur en `Map` mémoire **ne tient pas** sur Vercel : chaque instance a le sien (limite réelle = N × plafond) et tout repart à zéro au démarrage à froid. Acceptable pour un formulaire de contact ; **insuffisant pour les endpoints d'auth** (login, reset password). Pour ceux-là, store partagé obligatoire.

```typescript
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

> La clé de rate limit dérivée de `x-forwarded-for` est falsifiable tant qu'un WAF (Cloudflare) n'est pas strictement en frontal. Ne pas s'y fier seule.

---

## 5. Resend (emails transactionnels)

- [ ] Clé API côté serveur uniquement
- [ ] Domaine vérifié + **SPF, DKIM, DMARC** configurés
- [ ] Destinataires validés (Zod) avant envoi
- [ ] Rate limiting anti-abus (contact, reset, invitations)
- [ ] Aucune donnée sensible en clair ; liens d'action à token expirable
- [ ] Contenu utilisateur échappé dans les templates (anti-injection)

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

> **Panne silencieuse à éviter.** Une clé Resend vide ou un quota SMTP épuisé casse la confirmation d'adresse, le reset password et les notifications — sans erreur visible : l'UI dit « vérifiez votre courriel » et rien n'arrive. Tester l'envoi réel, pas seulement le code.

---

## 6. Frontend React / Next.js

- [ ] Pas de `dangerouslySetInnerHTML` sans sanitisation (DOMPurify si indispensable)
- [ ] Aucune donnée sensible dans le bundle ni dans les props envoyées au client
- [ ] Server Components pour tout ce qui touche secrets ou données privées
- [ ] Content Security Policy stricte
- [ ] `npm audit` sans vulnérabilité critique

```typescript
// next.config.ts
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // requis par Next.js
      "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
      "font-src 'self' fonts.gstatic.com",
      "img-src 'self' data: blob: *.supabase.co",
      "connect-src 'self' *.supabase.co *.supabase.io",
    ].join('; '),
  },
]

export default {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}
```

> Retirer des `remotePatterns` les domaines d'images de développement (ex. `images.unsplash.com`) avant la production.

---

## 7. CORS

Origines listées explicitement, jamais `*` sur une route authentifiée.

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

- [ ] Secret scanning + push protection activés
- [ ] Dependabot / alertes de vulnérabilités activés
- [ ] Branche `main` protégée (PR obligatoire, review, checks verts)
- [ ] Secrets dans GitHub Actions Secrets / Vercel, jamais en clair dans les workflows
- [ ] Permissions du `GITHUB_TOKEN` réduites au minimum
- [ ] Aucun repo privé rendu public sans audit préalable de l'historique

```yaml
# .github/workflows/ci.yml
permissions:
  contents: read

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

## 9. Vercel & Cloudflare (déploiement)

- [ ] Variables d'env séparées par environnement, présentes en Production **et** Preview
- [ ] Preview deployments protégés si le contenu est sensible
- [ ] HTTPS forcé, domaine custom avec certificat valide
- [ ] Si Cloudflare : Bot Fight Mode ON, SSL Full (strict), HSTS, Security Level Medium
- [ ] WAF strictement en frontal si le rate limiting dépend de l'IP client

---

## 10. Monitoring (options gratuites)

- [ ] Vercel Analytics / Logs
- [ ] Supabase Dashboard (logs, requêtes lentes)
- [ ] Sentry free tier (erreurs client + serveur)
- [ ] Alertes sur pics d'erreurs ou de coûts (IA, email)
- [ ] Aucune PII ni secret dans les logs

---

## 11. Données personnelles (si applicable)

- [ ] Minimisation : ne collecter que le nécessaire
- [ ] Chiffrement au repos (Supabase) et en transit (HTTPS partout)
- [ ] Suppression / export des données utilisateur
- [ ] Consentement cookies si tracking

---

## Checklist « go / no-go » avant `git push` → prod

1. Aucun secret dans le diff ni l'historique
2. RLS active **et prouvée** sur toute nouvelle table (voir skill `securite-audit`)
3. Toute nouvelle route : auth + validation + rate limit adapté
4. `npm audit` sans critique, types et lint OK
5. Headers de sécurité en place
6. Variables d'env configurées côté Vercel
7. Envois d'email réellement testés
8. Test avec un compte d'une autre org/rôle : rien ne fuite
