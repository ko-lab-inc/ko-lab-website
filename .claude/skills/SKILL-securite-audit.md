---
name: securite-audit
description: Procédure d'audit sécurité par sondes comportementales pour app React/Next.js + Supabase + Vercel. À EXÉCUTER avant un déploiement majeur, ou quand l'utilisateur demande un audit/pentest/vérification de sécurité. Produit un rapport daté mesuré, jamais supposé. Pour écrire du code sécurisé, utiliser plutôt « securite-reference ».
---

# Audit sécurité — procédure par sondes comportementales

> Générique : applicable à toute app de la stack. À dérouler avant chaque release majeure.

---

## Principe directeur

**La lecture des fichiers de migration ne prouve rien.** Une migration peut être écrite et n'avoir jamais pris effet. Tout constat doit venir d'une **sonde comportementale** — une requête réelle qui reçoit un refus réel — ou d'une lecture de `pg_policies` dans l'éditeur SQL. Jamais d'un `.sql` du dépôt.

Corollaire, formulation imposée dans le rapport : ne jamais écrire « la RLS est en place ». Écrire « voici la requête, voici le code HTTP reçu, voici le test qui échoue si ça régresse ». Chaque `❌` est suivi de la correction **et** de la sortie brute qui la prouve. Jamais « je pense que ».

---

## Garde-fous obligatoires (si une seule base, sans environnement de test)

Toute sonde touche alors les données réelles.

1. Par défaut, sondes **en lecture seule** (GET, HEAD, PATCH no-op à valeur identique).
2. Toute sonde écrivante crée des lignes préfixées `AUDIT_<timestamp>` et les supprime dans un `finally`. Jamais d'écriture sans nettoyage garanti.
3. Utilisateurs de test créés via l'API admin, e-mail `audit+<timestamp>@exemple.test`, supprimés en fin de run.
4. Ne jamais appeler une fonction RPC non identifiée avant de l'avoir lue.
5. Vérifier qu'aucun serveur de dev ne tourne avant Playwright (port occupé = faux échecs).

---

## Zone 0 — Outillage (bloquant, à installer en premier)

Sans ces outils, la ligne correspondante du tableau final est `❌ non mesurable`, jamais `✅`.

```bash
# Analyse statique (Next 16 a retiré `next lint` → flat config requise)
npx eslint --version && ls eslint.config.* 2>/dev/null || echo "❌ ESLint sans config"
# Scanner de secrets
npx gitleaks version 2>/dev/null || echo "❌ gitleaks absent"
# Baseline performance
npx lighthouse --version 2>/dev/null || echo "❌ lighthouse absent"
```

---

## Zone 1 — Questions tranchables uniquement en SQL

L'API REST n'expose ni `pg_catalog` ni `information_schema`. Présenter ces requêtes à l'utilisateur pour exécution dans l'éditeur SQL Supabase ; refuser de conclure sans leur sortie.

```sql
-- Policies RÉELLES (vs supposées par les migrations)
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public' order by tablename, cmd;

-- GRANT réels de anon — la sonde REST ne les distingue pas de la RLS
select table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'anon' and table_schema = 'public' order by table_name;
-- Tout UPDATE/DELETE ici = faille immédiate.

-- Tables sans RLS activée (doit renvoyer 0 ligne)
select tablename from pg_tables t where schemaname = 'public'
and not exists (select 1 from pg_class c where c.relname = t.tablename and c.relrowsecurity);

-- Toute fonction exposée par PostgREST et absente des migrations : lire avant d'appeler
select proname, prosecdef as security_definer, proacl
from pg_proc where pronamespace = 'public'::regnamespace and prosecdef;
-- SECURITY DEFINER exécutable par anon = escalade potentielle. REVOKE puis versionner ou supprimer.
```

Vigilance : une table sans policy INSERT dont l'insertion passe par un trigger — vérifier que le trigger est `SECURITY DEFINER` et ne lit jamais le rôle depuis les métadonnées utilisateur. Rôles déclarés mais absents de toute policy : soit morts, soit trou fonctionnel — trancher.

---

## Zone 2 — Matrice anon (sonde comportementale, lecture seule)

```bash
URL="$NEXT_PUBLIC_SUPABASE_URL"; KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY"
for t in <liste_des_tables>; do
  s=$(curl -s -o /dev/null -w "%{http_code}" "$URL/rest/v1/$t?select=*&limit=1" -H "apikey: $KEY")
  echo "SELECT $t -> $s"
done
```

Attendu : `401` sur les tables privées ; `200/206` sur les tables publiques — **et** vérifier que les lignes renvoyées respectent le filtre public (`publie`/`actif` = true). Une ligne non publiée qui remonte = fuite.

**Trancher UPDATE anon** — un PATCH sur filtre vide ne mesure que le SELECT. La bonne sonde : PATCH **no-op** sur une ligne visible, valeur identique, `return=representation`.

```bash
curl -s -w "\n%{http_code}\n" -X PATCH "$URL/rest/v1/<table>?id=eq.<ID>" \
  -H "apikey: $KEY" -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '{"<champ_anodin>": <valeur_actuelle>}'
```
- `401` / `permission denied` → pas de GRANT UPDATE ✅
- `200` tableau vide → GRANT présent, RLS bloque ⚠️ (le GRANT ne devrait pas exister)
- `200` avec la ligne → **anon peut écrire. Faille critique, arrêt immédiat.**

Répéter pour DELETE (filtre `id=eq.<uuid inexistant>`) et INSERT sur une table interdite à anon.

---

## Zone 3 — Accès croisé A/B et rôles (le trou le plus fréquent)

C'est la partie que l'utilisateur ne relit jamais lui-même. Fixture éphémère en try/finally :

```ts
// tests/fixtures/utilisateurs.ts
export async function creerUtilisateursAudit() {
  const admin = createClient(URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const tag = `audit+${Date.now()}`
  const faire = async (role: string) => {
    const { data } = await admin.auth.admin.createUser({
      email: `${tag}.${role}@exemple.test`, password: crypto.randomUUID(), email_confirm: true,
    })
    await admin.from('profils').update({ role }).eq('id', data.user.id)
    return data.user
  }
  const clientA = await faire('client'); const clientB = await faire('client'); const editor = await faire('editor')
  return { clientA, clientB, editor,
    nettoyer: () => Promise.all([clientA, clientB, editor].map(u => admin.auth.admin.deleteUser(u.id))) }
}
```

Chaque test doit **échouer si la sécurité échoue** :

| # | Test | Attendu |
|---|---|---|
| 1 | B lit une ligne de A (chaque table nominative) | 0 ligne |
| 2 | B modifie une ligne de A | 0 ligne / erreur |
| 3 | B supprime une ligne de A | 0 ligne / erreur |
| 4 | `client` appelle chaque Server Action protégée | refus |
| 5 | `editor` appelle une action réservée admin | refus |
| 6 | `client` met son propre `role` à `admin` | refus |
| 7 | **Inscription publique avec `role:'admin'` en métadonnées** | rôle réel = défaut |
| 8 | Sans jeton : chaque route `/admin/**` | redirection / 401 |
| 9 | Jeton expiré sur une route de session | 401 |
| 10 | B télécharge un fichier privé d'autrui (Storage) | refus |
| 11 | Dépôt anon hors format/préfixe/taille | 400 |
| 12 | IDOR : action avec l'`id` d'une ressource d'autrui | refus |

Le **test 7** est le plus important : souvent le seul chemin d'escalade ouvert au public.

---

## Zone 4 — Rate limiting (prouver le 429, pas le supposer)

```bash
seq 1 30 | xargs -P10 -I{} curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST http://localhost:3000/api/<route> -H "Content-Type: application/json" -d '{}' \
  | sort | uniq -c
# Attendu : présence de 429 au-delà du plafond
```

À documenter (pas à masquer) : compteur `Map` par instance → sur Vercel, N instances = N × plafond, remis à zéro à froid — problème réel sur les endpoints d'auth. Clé dérivée de `x-forwarded-for` falsifiable sans WAF frontal (tester `curl -H "x-forwarded-for: 1.2.3.4"` en boucle ; si le plafond ne tombe jamais, contournable). Vérifier qu'aucun endpoint d'auth (confirmation, reset) n'est sans plafond.

---

## Zone 5 — Secrets & bundle

```bash
npm run build
for pat in service_role sb_secret RESEND_API_KEY re_ sk_live sk_test eyJhbGciOi; do
  n=$(grep -rl "$pat" .next/static/ 2>/dev/null | wc -l); echo "$pat -> $n fichier(s)"
done
npx gitleaks detect --source . --no-banner -v   # chercher aussi les VALEURS de .env, pas que les noms
```

Rappel : la clé `anon` dans le bundle est normale **si la RLS est étanche** (Zone 2). C'est la Zone 2 qui protège, pas l'absence de clé.

---

## Zone 6 — Performance (baseline mesurée)

```bash
npm run build && npm run start &
npx lighthouse http://localhost:3000/ --only-categories=performance --form-factor=mobile \
  --output=json --output-path=./lh-mobile.json --chrome-flags="--headless"
node -e "const m=require('./lh-mobile.json').audits;console.log(
'LCP',m['largest-contentful-paint'].displayValue,'| CLS',m['cumulative-layout-shift'].displayValue,
'| TBT',m['total-blocking-time'].displayValue)"
```

Leviers habituels par rendement décroissant : `next/dynamic` sur le non-critique (widgets chat, lecteur vidéo, admin) ; scripts tiers différés (interaction ou après `load`) ; polices sous-ensemblées, graisses réellement utilisées ; inspecter un HTML gonflé par le payload RSC inline.

---

## Tableau final (format de rendu obligatoire)

| Contrôle | Mesuré | Cible | État | Correction + re-test |
|---|---|---|---|---|
| Lighthouse Perf mobile | | ≥ 90 | | |
| LCP / CLS / INP | | < 2,5 s / < 0,1 / < 200 ms | | |
| Bundle JS initial gzip | | < 180 Ko | | |
| `service_role` dans le bundle | | 0 | | |
| Findings gitleaks | | 0 | | |
| Tables exposées sans RLS | | 0 | | |
| Policies `using (true)` sensibles | | 0 | | |
| GRANT UPDATE/DELETE à `anon` | | 0 | | |
| Fonctions RPC non versionnées | | tranchées / révoquées | | |
| Tests d'accès croisé A/B | | ≥ 12, tous verts | | |
| Server Actions couvertes (test de rôle) | | 100 % | | |
| Escalade de rôle à l'inscription | | impossible, prouvé | | |
| 429 prouvé sous charge | | oui | | |
| Rate limit résistant à l'usurpation d'IP | | oui | | |
| ESLint opérationnel | | 0 erreur | | |
| CI (typecheck + tests + audit) | | présente | | |

Archiver le rapport rempli dans `docs/audits/<AAAA-MM-JJ>.md` — hors du dossier des skills, c'est un livrable, pas une consigne.
