# Audit sécurité — reconnaissance, 22 août 2026

Lecture seule. Aucune correction appliquée dans ce chantier. Toute sonde
écrivante a été préfixée `AUDIT_`/`audit+<timestamp>@ko-lab.test` et nettoyée
en `finally` (clé de service), conformément à `SKILL-securite-audit.md`.

---

## 0. Finding critique trouvé en cours de route — formulaire de candidature cassé

Sonde positive (INSERT anon sur `candidatures`, censé fonctionner d'après
0017 et le code de `envoyerCandidature`) :

```
POST /rest/v1/candidatures (clé anon)
-> 401 { "code": "42501", "message": "permission denied for table candidatures",
         "hint": "Grant the required privileges to the current role with:
                   GRANT SELECT ON public.candidatures TO anon;" }
```

Or la migration 0017 contient explicitement `grant insert on public.candidatures
to anon;`. **Le GRANT écrit dans le dépôt n'est pas celui qui existe en base**
— exactement le scénario que le CLAUDE.md cite en précédent avec la migration
0008.

Deuxième sonde, sur la colonne ajoutée par 0028 :

```
select id, canal from candidatures limit 1;  (clé de service)
-> 42703 column candidatures.canal does not exist
```

`0028_candidatures_canal.sql` n'a pas non plus pris effet. Le code de
production insère pourtant `canal: 'interne'` sans condition à chaque
soumission — même si le GRANT était rétabli, cette ligne échouerait encore.

**Preuve d'impact réel** : `select id, created_at from candidatures order by
created_at desc limit 5` (clé de service) ne renvoie **qu'une seule ligne**,
datée du **1er août 2026**. Aujourd'hui : 22 août. **21 jours sans une seule
candidature enregistrée**, cohérent avec un formulaire public qui échoue à
chaque tentative depuis cette date.

Non corrigé ici (instruction : lecture seule). Deux migrations à rejouer dans
l'éditeur SQL : le `grant insert ... to anon` de 0017, et le
`alter table ... add column canal ...` de 0028.

---

## 1. RLS — toutes les tables

**Ce que je ne peux pas trancher moi-même** : `pg_policies` et `pg_tables`
(colonne `relrowsecurity`) ne sont pas exposés par PostgREST — confirmé par
un vrai appel : `GET /rest/v1/` avec la clé anon renvoie `401`, pas
l'OpenAPI attendu. Zone 1 de `SKILL-securite-audit.md` exige ces requêtes en
SQL Editor. À faire exécuter à Moussa :

```sql
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public' order by tablename, cmd;

select tablename from pg_tables t where schemaname = 'public'
and not exists (select 1 from pg_class c where c.relname = t.tablename and c.relrowsecurity);
-- attendu : 0 ligne
```

**Ce que j'ai pu prouver par sonde comportementale**, sur les 11 tables
réelles de `public` (`candidatures, commandes, demandes_contact,
lignes_commande, medias_emplacements, postes_carrieres, produits_boutique,
profils, realisations, reglages, videos`) :

| Table | SELECT anon | INSERT anon | UPDATE anon (no-op) | DELETE anon (id inexistant) |
|---|---|---|---|---|
| candidatures | 401 (permission denied) | **401 — voir §0, régression** | 401 | 401 |
| commandes | 401 | 401 | 401 | 401 |
| demandes_contact | 401 | 401 | — | — |
| lignes_commande | 401 | — | — | — |
| profils | 401 | 401 | 401 | 401 |
| medias_emplacements | 200, filtré | — | 401 | — |
| postes_carrieres | 200, filtré | — | 401 | — |
| produits_boutique | 200, filtré | 401 | 401 | 401 |
| realisations | 200, **1 brouillon caché sur 7** | 401 | 401 | 401 |
| reglages | 200, filtré | — | 401 | — |
| videos | 200, filtré | 401 | 401 | 401 |

Chaque `401` ci-dessus est un vrai `42501 permission denied`, avec le
message PostgREST nommant explicitement le GRANT manquant — pas une
politique RLS qui filtre en silence. C'est la preuve la plus forte
disponible sans accès SQL direct : **zéro GRANT UPDATE, zéro GRANT DELETE,
zéro GRANT INSERT (hors candidatures, actuellement régressé) accordé à
`anon`, sur aucune des 11 tables.**

Le filtre public a aussi été vérifié en vrai, pas supposé — comparaison
anon vs clé de service :

```
realisations : anon voit 6 lignes, la base en a 7 -> le brouillon reste invisible.
postes_carrieres, produits_boutique, videos : anon voit exactement autant de lignes
  que la base en contient de publiées/actives (aucun brouillon détecté à sonder).
```

**Point du CLAUDE.md à trancher, maintenant résolu** : la section « points de
sécurité non tranchés » dit *« GRANT UPDATE/DELETE de anon : indéterminé »*.
Ce n'est plus vrai — la sonde ci-dessus tranche dans les deux sens (UPDATE et
DELETE), sur des tables publiques et privées. Je recommande de retirer cette
ligne du CLAUDE.md dans le même commit que la correction du §0.

---

## 2. Storage — les 4 buckets, et vérification qu'il n'y en a pas d'autres

Interrogé en direct via l'API Storage (clé de service, lecture seule,
`GET /storage/v1/bucket`) — **exactement 4 buckets, aucun non documenté** :

| Bucket | Public | Taille max | Types MIME | Créé le |
|---|---|---|---|---|
| `produits` | oui | 5 Mo | webp, jpeg, png, avif | 2026-07-30 |
| `realisations` | oui | 5 Mo | webp, jpeg, png, avif | 2026-07-30 |
| `cv` | **non** | 10 Mo | pdf, doc, docx | 2026-07-31 |
| `medias` | oui | 5 Mo | webp, jpeg, png, avif | 2026-08-19 |

Conforme aux migrations 0010, 0012, 0017, 0030 — et confirmé par sonde, pas
seulement lu :

```
POST anon sur medias/produits/realisations -> 403 "new row violates row-level security policy"
POST anon sur cv avec un .png              -> 415 "mime type not supported" (rejeté avant même RLS)
POST anon sur cv avec un vrai PDF          -> 200 (dépôt public accepté, comme prévu — 0017)
GET  public de ce PDF juste déposé         -> 400 (bucket privé, aucune lecture publique)
```

Le dépôt-CV public fonctionne (contrairement à l'INSERT `candidatures`, voir
§0 — deux mécanismes distincts pour le même formulaire, un seul est cassé).

---

## 3. Fonctions SECURITY DEFINER

**Liste complète**, obtenue en lisant les `create function` de tout
`supabase/migrations/*.sql` (10 fonctions au total) :

| Fonction | SECURITY DEFINER | `search_path` fixé | Appelable par anon (sondé aujourd'hui) |
|---|---|---|---|
| `touch_updated_at()` | non (trigger normal) | — | n/a, trigger |
| `handle_new_user()` | oui | `''` | trigger, pas de RPC direct |
| `get_user_role()` | oui | `''` | **oui**, `200 null` — voulu, voir 0004 |
| `interdire_auto_promotion()` | oui | `''` | `404 PGRST202` (fonction trigger, exclue du catalogue RPC) |
| `statut_stock_suggere()` | non | — | n/a, SQL pur, immutable |
| `ajuster_stock_ligne_commande()` | oui | `''` | `404 PGRST202` |
| `restaurer_stock_commande_annulee()` | oui | `''` | `404 PGRST202` |
| `rls_auto_enable()` | oui | `'pg_catalog'` | `401 permission denied for function` |

Les 7 fonctions `SECURITY DEFINER` ont toutes un `search_path` fixé — aucune
n'est vulnérable au détournement par objet homonyme. Les 3 fonctions
déclencheurs ont eu leur `EXECUTE` explicitement révoqué de `anon`/
`authenticated`/`public` par la migration 0026 ; sondé aujourd'hui, elles
répondent `404` (exclusion PostgREST des fonctions `RETURNS TRIGGER`, pas
seulement le revoke) — défense en profondeur confirmée sur deux couches
indépendantes.

**`rls_auto_enable()` : le point « origine inconnue » du CLAUDE.md est
résolu**, et l'était déjà avant cet audit — la migration `0020_rls_auto_enable.sql`
documente et versionne cette fonction en détail (event trigger `ensure_rls`,
`SECURITY DEFINER` légitime car `alter table ... enable row level security`
exige l'appartenance de la table, `search_path` fermé sur `pg_catalog`,
non invocable en RPC car `returns event_trigger`). Sondé aujourd'hui :
`401 permission denied for function rls_auto_enable` — encore plus fermé que
documenté. **Le CLAUDE.md ment en silence sur ce point** : sa section
« points non tranchés » dit toujours *« origine inconnue »* alors que 0020
existe. À corriger dans le même commit que le §0/§1.

**Ce que je n'ai pas pu vérifier moi-même** : le `proacl` exact de chaque
fonction (qui a EXECUTE, littéralement) exige `pg_proc`, hors de portée de
PostgREST. À faire confirmer en SQL Editor :

```sql
select proname, prosecdef as security_definer, proconfig, proacl
from pg_proc where pronamespace = 'public'::regnamespace and prosecdef;
```

---

## 4. Server Actions

**38 fonctions exportées au total**, sur 17 fichiers `'use server'` :

- **28 dans l'admin** (10 fichiers `admin/*/actions.ts`) — 26 passent par
  `exigerRole()` (`lib/auth/garde.ts`). Les 2 restantes
  (`changerRole`, `supprimerUtilisateur` dans `admin/utilisateurs/actions.ts`)
  n'utilisent pas l'helper mais font le contrôle équivalent à la main
  (`getUser()` + lecture `profils.role`, refus si pas `admin`, refus si
  auto-modification) — lu et vérifié ligne par ligne, correct, mais c'est
  une divergence de convention : un futur éditeur de ce fichier n'a pas le
  garde-fou d'import `exigerRole` pour lui rappeler le contrôle. Cosmétique,
  pas une faille.
- **8 côté client/public**, aucune ne passe par `exigerRole` — et c'est
  approprié à chacune : `creerCommande`/`modifierCommande`/`annulerCommande`
  vérifient une session (`getUser()`) puis s'appuient sur le filtre RLS
  `client_id = auth.uid()` pour l'appartenance (relu sous RLS, jamais
  supposé) ; `envoyerCandidature` est un dépôt public par conception (RLS
  `with check (true)`, actuellement cassé — voir §0) ; `inscrire`,
  `demanderReinitialisation`, `changerMotDePasse`, `connecter` sont les
  actions du parcours d'authentification lui-même, chacune limitée en débit.
- **2 actions de déconnexion en ligne** (`(admin)/layout.tsx`,
  `compte/page.tsx`) — `auth.signOut()` uniquement, aucune écriture de
  donnée, aucun contrôle de rôle nécessaire.

**Aucune Server Action de ce projet n'écrit sans un contrôle approprié à son
contexte** (rôle, session+RLS, ou dépôt public assumé). La seule action dont
le contrôle EST correct mais dont le comportement RÉEL diverge de ce que le
code suppose est `envoyerCandidature` — pas un défaut de contrôle d'accès,
un défaut de schéma/grant en base (§0).

**Escalade de rôle à l'inscription — testée en vrai, pas supposée** :

```
POST /auth/v1/signup  (clé anon), data: { nom: 'Audit Escalade', role: 'admin' }
-> 200, compte créé
SELECT profils.role pour ce compte (clé de service) -> 'client'
```

`handle_new_user()` (0001) n'insère que `id` et `email` — il ne lit jamais
`raw_user_meta_data`. Le rôle vient uniquement de la valeur par défaut de la
colonne (`'client'` depuis 0009). Escalade impossible, prouvé, compte de
test supprimé après vérification.

---

## 5. Clés et secrets

- **`SUPABASE_SERVICE_ROLE_KEY`** : un seul point d'usage dans tout `src/`,
  `lib/supabase/admin.ts`, derrière `import 'server-only'` et un garde
  d'exécution (`typeof window !== 'undefined'` → exception explicite).
  Scanné dans le bundle de production réel (`npm run build` puis
  `grep -rl service_role .next/static/`) : **0 fichier**. Idem pour
  `sb_secret`, `RESEND_API_KEY`, `sk_live`, `sk_test`, un JWT littéral
  (`eyJhbGciOi`) : **0 occurrence partout**. Les 5 fichiers remontés par le
  motif `re_` sont tous des faux positifs (`titre_fr`, minifié) — vérifié un
  par un, aucune clé Resend (`re_...`) réelle dans le bundle.
- **Secrets en dur dans le code source** : recherche des motifs
  `sk_live|sk_test|re_[A-Za-z0-9]{15,}|sk-ant-|BEGIN (RSA|EC|OPENSSH) PRIVATE KEY`
  sur `src/` et `supabase/` : **0 résultat**.
- **`.env.local` gitignoré** : oui — `.gitignore` liste `.env` + `.env.*`
  avec `!.env.example` en exception, dans cet ordre (l'ordre compte, et il
  est correct).
- **Historique git** : `git log --all --diff-filter=A --name-only | grep
  '^\.env'` ne remonte que `.env.example`. **Aucun `.env` réel n'a jamais
  été commité**, sur aucune branche, à aucun moment de l'historique.

---

## 6. Validation des entrées

Les trois points d'entrée public écrivant en base ont chacun : validation
Zod serveur, honeypot, et rate limiting — lus fichier par fichier, pas
supposés :

| Formulaire | Zod serveur | Honeypot | Rate limit |
|---|---|---|---|
| `/api/contact` | `schemaContact` | oui (`_hp`, 200 silencieux) | `contact:${ip}`, 5/min |
| `/carrieres/postuler` | `schemaCandidature` (incl. type MIME + taille du CV) | oui | `candidature:${ip}`, 3/10 min |
| `/boutique/commande/details` | `schemaCommande` | oui | `commande:${ip}`, 5/10 min |
| `inscrire` (compte) | `schemaInscription` | — (pas un vecteur de spam typique) | `inscription:${ip}`, 5/h |
| `/api/auth/confirmer` | type OTP restreint à une liste blanche | — | `confirmer:${ip}`, 10/min |

Aucune validation **côté client uniquement** trouvée sur un point d'écriture
serveur — chaque action revalide indépendamment du formulaire qui l'appelle
(cohérent avec le principe « une Server Action est invocable hors de l'écran
qui la déclare », documenté dans `lib/auth/garde.ts` et repris dans
`creerCommande`).

**Limite déjà connue et déjà documentée dans le code, pas une découverte** :
le rate limit est un `Map` en mémoire de processus — sur Vercel, N instances
= N × plafond, remis à zéro à froid. `RateLimit.ts` le dit lui-même en
commentaire de tête, avec le renvoi vers un store partagé (Upstash/Vercel
KV) si une garantie stricte devient nécessaire. Confirmé par le CLAUDE.md :
testé en production le 2 août 2026 avec un `x-forwarded-for` falsifié, sans
contournement observé (Vercel semble réécrire l'en-tête) — observation, pas
garantie contractuelle.

---

## 7. En-têtes HTTP — vérifiés en production, pas en local

```
curl -sD - https://ko-lab-center.ca/fr
```

| En-tête | Présent | Valeur |
|---|---|---|
| `Content-Security-Policy` | ✅ | stricte, `frame-ancestors 'none'`, `object-src 'none'`, `upgrade-insecure-requests` |
| `X-Frame-Options` | ✅ | `DENY` |
| `X-Content-Type-Options` | ✅ | `nosniff` |
| `Referrer-Policy` | ✅ | `strict-origin-when-cross-origin` |
| `Strict-Transport-Security` | ✅ | `max-age=31536000; includeSubDomains; preload` |
| `Permissions-Policy` | ✅ | `camera=(), microphone=(), geolocation=()` |

**Aucun des 6 en-têtes demandés ne manque.** Cohérent avec `next.config.ts`
et avec l'audit du 2026-07-30 déjà documenté dans ce fichier (le seul
compromis assumé, `script-src 'unsafe-inline'`, est documenté en commentaire
avec sa justification et ce sur quoi repose la protection XSS réelle —
inchangé depuis, toujours vrai : recherché à nouveau dans `src/`,
`dangerouslySetInnerHTML`/`innerHTML`/`eval`/`new Function` = 0 occurrence).

Note à part, pas une faille : `Access-Control-Allow-Origin: *` est présent
sur cette page HTML publique. Sans incidence sur une page GET sans données
de session dans le corps — mais si une route API authentifiée devait un
jour hériter du même en-tête via une config globale, ce serait un problème.
À surveiller si de nouvelles routes API apparaissent.

---

## 8. Dépendances — `npm audit`

```
metadata.vulnerabilities: { info: 0, low: 0, moderate: 0, high: 2, critical: 0 }
```

| Paquet | Sévérité | Vient de | Exécuté en production ? |
|---|---|---|---|
| `brace-expansion` | high | `eslint` → `minimatch` (chaîne ESLint) | **non** — outillage de développement, `next lint` est de toute façon retiré de Next 16 et aucune config ESLint n'existe encore (voir CLAUDE.md, section outillage) |
| `nanoid` | high | `postcss` (traitement CSS au build) | **non** — s'exécute pendant `next build`, jamais dans une requête servie |

**Les deux vulnérabilités confirmées `high` touchent des chemins qui ne
s'exécutent jamais en production** (`npm ls` : les deux ne sont atteintes
qu'via des devDependencies). `fixAvailable: true` sur les deux — correctif
possible sans rien casser, mais hors périmètre de « lecture seule ».

---

## Tableau final

| Contrôle | Mesuré | Cible | État |
|---|---|---|---|
| Tables exposées sans RLS | non mesurable directement (PostgREST bloque `pg_tables`) ; 0 indice contraire par sonde | 0 | ⚠️ à confirmer en SQL Editor (requête fournie §1) |
| Policies `using (true)` sensibles | non mesurable directement ; RLS confirmée étanche par sonde sur les 11 tables | 0 | ⚠️ à confirmer en SQL Editor |
| GRANT UPDATE/DELETE à `anon` | **0, prouvé par sonde réelle sur 11 tables** | 0 | ✅ |
| GRANT INSERT à `anon` sur `candidatures` | **absent alors que 0017 l'accorde explicitement** | présent | ❌ régression, voir §0 |
| Fonctions SECURITY DEFINER | 7/7 avec `search_path` fixé ; 3/3 fonctions trigger confirmées non invocables en RPC | tranchées | ✅ |
| Buckets Storage | 4, tous conformes à leurs migrations, aucun non documenté | conformes | ✅ |
| Server Actions couvertes (contrôle adapté au contexte) | 38/38 | 100 % | ✅ |
| Escalade de rôle à l'inscription | impossible, prouvé par test réel | impossible | ✅ |
| Secrets dans le bundle de production | 0 occurrence (6 motifs testés) | 0 | ✅ |
| `.env` dans l'historique git | 0 | 0 | ✅ |
| En-têtes de sécurité en production | 6/6 présents | 6/6 | ✅ |
| `npm audit` high/critical touchant la prod | 0 (2 `high`, tous deux devDependencies) | 0 | ✅ |
| Rate limiting | présent sur les 5 points d'écriture publics ; limite connue (mémoire de processus) déjà documentée | oui | ⚠️ limite connue, pas une découverte |

---

## Liste priorisée

**Critique**
1. **`candidatures` : GRANT INSERT anon absent en base malgré 0017, et
   colonne `canal` (0028) absente malgré la migration versionnée — le
   formulaire public de candidature échoue à 100 % depuis au moins le
   1er août 2026 (21 jours, 0 candidature reçue depuis).** À corriger en
   rejouant les deux instructions manquantes dans l'éditeur SQL, puis en
   reprouvant par une vraie soumission de bout en bout.

**Important**
2. CLAUDE.md contient deux affirmations maintenant fausses dans sa section
   « points de sécurité non tranchés » : le GRANT UPDATE/DELETE anon (tranché
   aujourd'hui, §1) et l'origine de `rls_auto_enable` (tranchée depuis la
   migration 0020, §3). Les deux mentent en silence à qui les relit — à
   corriger dans le même commit que le point 1.
3. `changerRole`/`supprimerUtilisateur` (admin/utilisateurs/actions.ts)
   dupliquent à la main le contrôle que `exigerRole()` centralise partout
   ailleurs — correct aujourd'hui, mais sans le garde-fou d'import qui
   rappellerait le contrôle à un futur éditeur du fichier.
4. Confirmer en SQL Editor les deux points que PostgREST ne peut pas
   trancher lui-même (RLS activée sur les 11 tables, `proacl` exact des 7
   fonctions `SECURITY DEFINER`) — requêtes fournies §1 et §3.

**Cosmétique**
5. `Access-Control-Allow-Origin: *` sur les pages HTML publiques — sans
   risque en l'état, à surveiller si une route API authentifiée hérite un
   jour de la même configuration globale.
6. Les 2 vulnérabilités `npm audit` (`brace-expansion`, `nanoid`) ne
   touchent aucun code de production, mais `fixAvailable: true` sur les
   deux — un `npm audit fix` sans risque quand une prochaine fenêtre de
   maintenance s'ouvre.
