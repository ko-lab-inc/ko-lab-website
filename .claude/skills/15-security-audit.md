# Skill 15 — Audit Sécurité

## Checklist d'audit — à faire avant chaque déploiement majeur

### Code source
- [ ] Pas de `console.log` avec des données sensibles
- [ ] Pas de clés API dans le code source (chercher: `sk-`, `eyJ`, `service_role`)
- [ ] Pas de `TODO: fix security` laissé en production
- [ ] `npm audit` — aucune vulnérabilité critique

```bash
# Audit des dépendances
npm audit
npm audit fix

# Chercher des secrets accidentels dans le code
grep -r "service_role\|SUPABASE_SERVICE\|RESEND_API" src/ --include="*.ts" --include="*.tsx"
```

### API Routes
- [ ] Chaque route valide ses inputs avec Zod
- [ ] Chaque route a un rate limiting
- [ ] Les erreurs retournées ne divulguent pas d'infos internes
- [ ] Les routes sensibles vérifient l'authentification

```typescript
// ✅ Bon — erreur générique
return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })

// ❌ Mauvais — divulgue l'infrastructure
return NextResponse.json({ error: err.message }, { status: 500 })
```

### Supabase
- [ ] RLS vérifié sur chaque table avec `SELECT * FROM pg_policies`
- [ ] Aucune table accessible sans politique
- [ ] Test : appel avec anon key ne retourne que les données publiques

```sql
-- Vérifier les politiques RLS
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
ORDER BY tablename;

-- Vérifier que RLS est activé
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

### Headers de sécurité
```bash
# Tester les headers avec curl
curl -I https://ko-lab.ca | grep -E "X-Frame|X-Content|Referrer|Content-Security"

# Ou utiliser securityheaders.com
```

### Formulaires
- [ ] CSRF : les API routes Next.js utilisent les cookies SameSite
- [ ] Honeypot field dans les formulaires publics (anti-spam)
- [ ] Validation côté client ET côté serveur (double validation)

```tsx
{/* Honeypot — champ caché pour détecter les bots */}
<input
  type="text"
  name="_hp"
  className="hidden"
  aria-hidden="true"
  tabIndex={-1}
  autoComplete="off"
/>
```

### Côté serveur — vérifier le honeypot
```typescript
const honeypot = body._hp
if (honeypot) {
  // Bot détecté — répondre 200 sans rien faire
  return NextResponse.json({ success: true })
}
```
