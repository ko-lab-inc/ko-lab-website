# KO-LAB Inc. — Guide Claude Code

## Identité du projet
Site vitrine premium bilingue FR/EN pour KO-LAB Inc., entreprise de déploiement
terrain, fabrication et logistique basée à Outaouais, Québec.

Signature : **De l'idée au terrain.**
Question principale : *Qu'est-ce qu'on met sur le terrain aujourd'hui ?*

---

## Stack technique validée
- **Frontend** : Next.js 16 (App Router) + React 19 + TypeScript
- **Runtime** : Node.js ≥ 20.9.0 (exigé par Next 16)
- **Style** : Tailwind CSS 3.4 + CSS custom properties (design tokens KO-LAB)
- **Base de données** : Supabase (PostgreSQL + Auth + Storage) — `@supabase/ssr` 0.12
- **Hébergement** : Vercel (deploy) + Cloudflare (CDN + WAF + DNS)
- **Versioning** : GitHub (branches : main → production, develop → preview)
- **i18n** : next-intl 4 (FR en premier, EN secondaire)
- **Tests** : Vitest 4 (unit) + Playwright (E2E)

### ⚠️ Migration Next 14 → 16 (2026-07-25)
Le projet a démarré sur Next 14, abandonné avant la première page : `npm audit`
relevait 21 avis de sécurité couvrant **toutes** les versions de Next 14 et 15
(cache poisoning, SSRF, XSS via nonces CSP). Correctif publié : `next@16.2.11`.

**Les exemples de code des skills datent de Next 14.** Quatre API ont changé —
ne pas les recopier telles quelles :

| Sujet | Skill concerné | Ce qui a changé |
|---|---|---|
| `cookies()`, `headers()`, `draftMode()` | 03, 24 | Renvoient une `Promise` → `await cookies()`. Par effet de cascade, `createClient()` de `server.ts` est `async`. |
| `params`, `searchParams` | 01, 10 | Devenus des `Promise` dans les pages et layouts → `const { locale } = await params` |
| `images.domains` | 07, 12 | Supprimé. Utiliser `remotePatterns` (déjà le cas dans `next.config.ts`). |
| `setAll(cookies)` Supabase | 03 | Reçoit un 2ᵉ argument `headers` (en-têtes anti-cache CDN). |
| `revalidateTag(tag)` | 05, 12 | Exige un 2ᵉ argument (profil de durée de vie). Depuis une Server Action, utiliser `updateTag(tag)` — expiration immédiate. |

`next.config.ts` est de nouveau un fichier TypeScript : Next 15+ le supporte
nativement, contrairement à Next 14.

---

## Skills disponibles — TOUJOURS lire le skill concerné avant de coder

Avant toute action, lire le(s) skill(s) pertinent(s) dans `.claude/skills/` :

| Fichier | Quand l'utiliser |
|---|---|
| `01-architecture.md` | Structure de code, organisation des fichiers, patterns |
| `02-design-system.md` | Couleurs, typo, tokens, composants UI |
| `03-database.md` | Schéma Supabase, migrations, requêtes |
| `05-api-business-logic.md` | API routes, formulaires, logique métier |
| `07-deployment.md` | Vercel, Cloudflare, CI/CD, variables d'env |
| `08-anti-ia-design.md` | CE QU'IL NE FAUT PAS FAIRE — lire en premier |
| `09-security.md` | Auth, RBAC, validation, sanitisation |
| `10-seo-marketing.md` | Metadata, sitemap, i18n SEO, OG images |
| `11-responsive-mobile.md` | Mobile-first, breakpoints, touch |
| `12-performance.md` | Core Web Vitals, images, lazy loading, cache |
| `19-core-workflow.md` | Méthode de build page par page |
| `20-ux-details.md` | Micro-interactions, transitions, finitions |
| `22-photos-media.md` | Gestion photos, placeholders, optimisation |
| `24-roles-permissions.md` | RBAC admin/Moussa/KO-LAB |
| `26-tests.md` | Unit Test, E2E, TDD, Automated test |

---

## Règles absolues

### Design — ZERO pattern IA générique
- Pas de blobs, pas de dégradés décoratifs, pas d'icônes 3D génériques
- Pas de fond crème + serif + terracotta (pattern IA par défaut)
- Voir `08-anti-ia-design.md` pour la liste complète des interdits

### Palette stricte (3 couleurs MAXIMUM)
```
--ko-black:   #111210   (dominant, fond sombre)
--ko-white:   #f8f6f1   (fond clair, texte sur noir)
--ko-cream:   #f0ede6   (sections claires, arrière-plans)
--ko-blue:    #2f7fc9   (accent UNIQUE — boutons, liens, labels)
--ko-blue-2:  #5aa3e4   (hover du bleu)
--ko-muted:   #7a7b76   (texte secondaire)
--ko-line:    #e0ddd6   (bordures)
```

### Typographie
- Titres : `Fraunces` (serif, weight 300/400, avec italiques en accent)
- Corps : `Instrument Sans` (weight 400/500)
- Labels/données : `JetBrains Mono` (uppercase, letter-spacing)

### Structure de page (alternance clair/sombre)
1. Nav sticky (fond crème)
2. Hero → fond clair (#f8f6f1) plein écran
3. Stats bar → fond sombre (#111210) — contraste
4. Sections contenu → fond clair alternant (#f8f6f1 / #f0ede6)
5. Écosystème → fond sombre (#111210)
6. CTA final → fond clair
7. Footer → fond sombre (#111210)

---

## Méthode de travail
1. Lire le skill concerné
2. Coder UNIQUEMENT la section demandée
3. Ne pas modifier ce qui n'est pas demandé
4. Tester en mobile ET desktop avant de valider
5. Valider avec Christian avant de passer à la suivante

---

## Pages à construire (dans l'ordre)
- [ ] Page d'accueil (13 sections)
- [ ] Opérations terrain
- [ ] Installations saisonnières
- [ ] Le LAB
- [ ] Équipements & déploiement
- [ ] Réalisations (galerie filtrable)
- [ ] Location (redirect Rentman)
- [ ] Boutique (catalogue sur commande)
- [ ] À propos
- [ ] Carrières
- [ ] Contact

---

## Contacts projet
- **Christian** : propriétaire, validation design et contenu
- **Moussa** : développeur principal, architecture et technique
- **Tous les comptes** (GitHub, Vercel, Cloudflare, Supabase) appartiennent à KO-LAB

## Domaine
ko-lab.ca (production) | develop.ko-lab.ca (preview)
