# Skill 25 — Audit Sécurité Complet

## Audit complet — à faire avant chaque release majeure

---

## 1. Audit dépendances
```bash
npm audit --audit-level=moderate
# Corriger toutes les vulnérabilités moderate et high
npm audit fix
# Si nécessaire (attention aux breaking changes) :
npm audit fix --force
```

## 2. Audit secrets dans le code
```bash
# Recherche de clés potentiellement exposées
grep -rn "eyJ\|sk-\|service_role\|secret\|password\|SUPABASE_SERVICE" \
  src/ --include="*.ts" --include="*.tsx" --include="*.js"

# Vérifier le .gitignore couvre bien .env.local
cat .gitignore | grep env
```

## 3. Audit des politiques RLS Supabase
```sql
-- Toutes les tables ont RLS ?
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Toutes les tables ont des politiques ?
SELECT DISTINCT tablename FROM pg_policies
WHERE schemaname = 'public';

-- Comparer les deux listes — aucune table sans politique
```

## 4. Audit des headers HTTP
```bash
# En production
curl -sI https://ko-lab.ca | grep -iE \
  "x-frame|x-content|referrer|permissions|content-security|strict-transport"

# Score attendu : A ou A+ sur https://securityheaders.com
```

## 5. Audit des API routes
Vérifier manuellement chaque route :
- [ ] `/api/contact` — validation Zod + rate limit + honeypot
- [ ] `/api/boutique/demande` — validation Zod + rate limit
- [ ] Aucune route ne retourne de données sensibles (role, tokens, etc.)
- [ ] Toutes les routes POST vérifient le Content-Type

## 6. Audit authentification
```bash
# Tester qu'un utilisateur non connecté ne peut pas accéder à /admin
curl -I https://ko-lab.ca/admin
# Doit retourner 302 → /login
```

## 7. Audit SSL/TLS
```bash
# Vérifier la configuration SSL
curl -sI https://ko-lab.ca | grep -i "strict-transport"
# Attendu: Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## 8. Test d'injection
```bash
# Tester SQL injection sur les formulaires (basique)
# Le champ message avec : '; DROP TABLE realisations; --
# Doit être rejeté par la validation Zod avant d'atteindre Supabase
```

## 9. Audit CORS
```typescript
// next.config.ts — vérifier que CORS est restrictif
async headers() {
  return [{
    source: '/api/:path*',
    headers: [
      { key: 'Access-Control-Allow-Origin', value: 'https://ko-lab.ca' },
      { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
    ]
  }]
}
```

## 10. Rapport d'audit
Documenter dans `docs/SECURITY-AUDIT-[DATE].md` :
- Date de l'audit
- Vulnérabilités trouvées
- Actions correctives appliquées
- Score securityheaders.com
- Score Lighthouse (security)
