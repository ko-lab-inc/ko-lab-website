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

**Les exemples de code des skills datent de Next 14.** Cinq points ont changé —
ne pas les recopier tels quels :

| Sujet | Skill concerné | Ce qui a changé |
|---|---|---|
| `cookies()`, `headers()`, `draftMode()` | 03, 24 | Renvoient une `Promise` → `await cookies()`. Par effet de cascade, `createClient()` de `server.ts` est `async`. |
| `params`, `searchParams` | 01, 10 | Devenus des `Promise` dans les pages et layouts → `const { locale } = await params` |
| `images.domains` | 07, 12 | Supprimé. Utiliser `remotePatterns` (déjà le cas dans `next.config.ts`). |
| `setAll(cookies)` Supabase | 03 | Reçoit un 2ᵉ argument `headers` (en-têtes anti-cache CDN). |
| `revalidateTag(tag)` | 05, 12 | Exige un 2ᵉ argument (profil de durée de vie). Depuis une Server Action, utiliser `updateTag(tag)` — expiration immédiate. |
| `next lint` | 26, sécurité | Retiré de Next 16 → flat config ESLint (`eslint.config.mjs` avec `eslint-config-next` + `typescript-eslint`). |

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
| `SKILL-securite-reference.md` | Auth, RBAC, validation, sanitisation, secrets, en-têtes — pendant l'écriture du code |
| `10-seo-marketing.md` | Metadata, sitemap, i18n SEO, OG images |
| `11-responsive-mobile.md` | Mobile-first, breakpoints, touch |
| `12-performance.md` | Core Web Vitals, images, lazy loading, cache |
| `19-core-workflow.md` | Méthode de build page par page |
| `20-ux-details.md` | Micro-interactions, transitions, finitions |
| `21-features-avancees.md` | Solutions modulaires, évolution boutique, filtrage galerie |
| `22-photos-media.md` | Gestion photos, placeholders, optimisation |
| `24-roles-permissions.md` | RBAC admin/Moussa/KO-LAB |
| `26-tests.md` | Unit Test, E2E, TDD, Automated test |
| `SKILL-securite-audit.md` | Avant toute mise en production, après toute migration Supabase, après tout ajout de Server Action ou d'endpoint API |

**Ne pas confondre les trois skills voisins** : `SKILL-securite-reference.md` dit
comment **construire** la sécurité, `26-tests.md` comment **tester**,
`SKILL-securite-audit.md` comment **prouver** — sondes réelles, chiffres,
tableau de conformité.

---

## Règles absolues

### Design — ZERO pattern IA générique
- Pas de blobs, pas de dégradés décoratifs, pas d'icônes 3D génériques
- Pas de fond crème + serif + terracotta (pattern IA par défaut)
- Voir `08-anti-ia-design.md` pour la liste complète des interdits

### Palette stricte — 3 couleurs de marque + 4 neutres, aucune autre
```
--ko-black:   #111210   (dominant, fond sombre)
--ko-white:   #f8f6f1   (fond clair, texte sur noir)
--ko-cream:   #f0ede6   (sections claires, arrière-plans)
--ko-blue:    #2f7fc9   (accent UNIQUE — boutons, liens, labels)
--ko-blue-2:  #5aa3e4   (hover du bleu)
--ko-muted:   #7a7b76   (texte secondaire)
--ko-line:    #e0ddd6   (bordures)
```
Ces 7 tokens sont la palette complète. N'en ajouter aucun, n'en retirer aucun.

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

## Règle d'or — la preuve, pas l'affirmation

Une affirmation de sécurité sans test qui la prouve n'est pas valide.
Je ne dis jamais « la RLS est en place », « c'est sécurisé », « le rate limit fonctionne ».
Je montre la requête, le code HTTP reçu, et le test qui échoue si la protection saute.

**Lire un fichier de migration ne prouve rien.** La migration 0008 était écrite
et n'a jamais pris effet en base. La vérité est ce que la base répond, pas ce que
le `.sql` déclare. Tout constat de sécurité vient d'une sonde réelle ou de
`pg_policies` dans l'éditeur SQL — jamais d'une lecture du dépôt.

De même : je n'optimise pas vers un adjectif (« léger », « rapide »).
J'optimise vers un nombre, et je reporte le nombre mesuré.

---

## Cibles chiffrées

**Sécurité** (échec = étape non close)
- Tables exposées sans RLS : 0
- Policies `using (true)` sur SELECT/UPDATE/DELETE : 0
- GRANT UPDATE ou DELETE accordé à `anon` : 0
- Valeur de `SUPABASE_SERVICE_ROLE_KEY` dans `.next/static/` : 0 occurrence
- Findings gitleaks : 0
- Tests d'accès croisé A/B : ≥ 12, tous verts
- Server Actions couvertes par un test de rôle : 23 / 23
- Escalade de rôle à l'inscription publique : impossible, prouvé par test
- 429 prouvé sous charge sur les 9 points plafonnés : oui

**Performance** (baseline mesurée le 2026-07-31 sur `/fr`)
- Bundle JS initial : 220 Ko gzip → cible < 180 Ko, viser 150
- Polices `.woff2` : 268 Ko → cible < 150 Ko
- Lighthouse Performance : non mesuré → cible ≥ 90 mobile, ≥ 95 desktop
- LCP < 2,5 s · CLS < 0,1 · INP < 200 ms
- API p95 < 300 ms

---

## Base unique — règles non négociables

Il n'existe pas d'environnement de test séparé. Toute sonde touche les données du client.

- Sondes en lecture seule par défaut (GET, HEAD, PATCH no-op à valeur identique).
- Toute écriture de test est préfixée `AUDIT_<timestamp>` et supprimée dans un `finally`.
- Les comptes de test utilisent `audit+<timestamp>@ko-lab.test` et sont détruits en fin de run.
- Ne jamais appeler `/rpc/rls_auto_enable` : fonction exposée par PostgREST, absente des
  19 migrations, origine inconnue, nom suggérant une modification d'état.
- Vérifier qu'aucun `npm run start` ne tourne avant Playwright (port 3000 occupé).

---

## Outillage & points ouverts — état au 2026-07-31

> Cette section décrit un état daté, pas un invariant. **Vérifier avant de s'y fier.**
> Si un outil est installé ou un point tranché, mettre cette section à jour dans le
> même commit — sinon elle ment en silence.

**Outillage**
- ESLint : installé mais **aucun fichier de configuration**. `npm run lint` échoue
  (`next lint` retiré de Next 16), `npx eslint` échoue. Aucune analyse statique ne tourne.
- gitleaks / trufflehog / semgrep / Lighthouse : absents.
- CI : aucune. Rien ne s'exécute sur un push, tout audit est manuel.
- Pas d'accès SQL hors éditeur Supabase : `pg_catalog` et `information_schema`
  ne sont pas exposés par PostgREST.

Tant qu'un outil est absent, la ligne correspondante du rapport est
« non mesurable », jamais « conforme ».

**Points de sécurité non tranchés** (retirer la ligne une fois close)
- GRANT `UPDATE` / `DELETE` de `anon` : indéterminé. La sonde REST ne distingue pas
  l'absence de GRANT du blocage RLS — voir la sonde PATCH no-op de
  `SKILL-securite-audit.md`, ou
  `information_schema.role_table_grants` dans l'éditeur SQL.
- `rls_auto_enable` : origine inconnue. Lire sa définition avant tout appel ;
  si `SECURITY DEFINER` et exécutable par `anon`, révoquer.
- Cloudflare N'est PAS en frontal : `ko-lab-center.ca` est en DNS only (nuage
  gris) sur son enregistrement Vercel — nécessaire pour le certificat SSL de
  Vercel, mais `cf-connecting-ip` ne sera donc jamais présent. Testé quand
  même le 2 août 2026 (`docs/audits/2026-08-02.md`) : 8 requêtes vers
  `/api/contact` en production avec un `x-forwarded-for` FALSIFIÉ différent à
  chaque appel se sont fait plafonner identiquement à une seule IP — Vercel
  semble réécrire cet en-tête lui-même. Observé, pas garanti contractuellement :
  ne pas construire de nouvelle défense qui en dépende sans re-tester.

---

## Méthode de travail
1. Lire le(s) skill(s) concerné(s)
2. Coder UNIQUEMENT la section demandée
3. Ne pas modifier ce qui n'est pas demandé
4. Tester en mobile ET desktop avant de valider
5. **Prouver** : lancer les tests, mesurer, reporter les chiffres bruts contre les
   cibles ci-dessus. Jamais « c'est bon ». Toute étape touchant la base, l'auth,
   le Storage ou une Server Action déclenche `SKILL-securite-audit.md` avant validation.
6. Valider avec Christian avant de passer à la suivante

---

## Pages
Les 11 pages du site marketing existent dans `src/app/(marketing)/`.
Cette section décrit l'existant, pas un reste-à-faire. Avant de créer une page,
vérifier qu'elle n'existe pas déjà.

> Règle générale : **toute liste de tâches sort de ce fichier.** Le CLAUDE.md décrit
> des invariants (stack, conventions, règles). Ce qui a une date ou un état de
> complétion vit ailleurs — sinon il pourrit sans que personne le voie.

---

## Contacts projet
- **Christian** : propriétaire, validation design et contenu
- **Moussa** : développeur principal, architecture et technique
- **Tous les comptes** (GitHub, Vercel, Cloudflare, Supabase) appartiennent à KO-LAB

## Domaine
ko-lab-center.ca (production) | develop.ko-lab-center.ca (preview)

⚠️ Corrigé le 2 août 2026 : `ko-lab.ca` n'a jamais été acheté comme site web.
Le domaine réellement enregistré (Cloudflare) est `ko-lab-center.ca` — c'est
ce qui bloquait Resend (« Domain not verified ») sur tous les courriels
sortants (confirmation de commande, changement de statut, contact).

⚠️ Précisé le 5 août 2026 — DEUX domaines, deux rôles distincts, aucun des
deux n'est une erreur :
- `ko-lab-center.ca` : le SITE WEB, et le seul domaine vérifié par Resend
  pour ENVOYER (`from:`, en dur dans les gabarits de courriel — ne jamais le
  rendre modifiable sans revérifier le domaine chez Resend).
- `ko-lab.ca` : la vraie BOÎTE COURRIEL que l'équipe consulte
  (`info@ko-lab.ca`), confirmée par Christian. C'est l'adresse affichée
  partout où on s'adresse à un humain — pied de page, pages légales, texte
  des courriels, `reply-to` — même si le site, lui, tourne sur
  `ko-lab-center.ca`. KO-LAB n'a pas le DNS de `ko-lab.ca` : impossible de le
  vérifier chez Resend, donc impossible d'y ENVOYER depuis ce domaine — d'où
  le `from` sur `ko-lab-center.ca` et un `reply-to: info@ko-lab.ca` séparé.

Si ce fichier dit encore `ko-lab-center.ca` dans un contexte de courriel
(`info@ko-lab-center.ca`, `rh@ko-lab-center.ca`) ailleurs qu'ici, c'est qu'il
ment : signaler l'écart. Une URL de site (`https://ko-lab-center.ca/...`),
elle, reste correcte.
