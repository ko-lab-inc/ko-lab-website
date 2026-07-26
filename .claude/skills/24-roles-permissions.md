# Skill 24 — Rôles & Permissions (RBAC)

## Trois rôles dans KO-LAB

| Rôle    | Qui        | Accès |
|---------|------------|-------|
| `admin` | Christian  | Tout — lecture/écriture complète |
| `editor`| Moussa     | Gestion contenu + technique, pas suppression |
| `public`| Visiteurs  | Lecture uniquement (contenu publié) |

---

## Implémentation Supabase

### Table des profils utilisateurs
```sql
CREATE TABLE profils (
  id       uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  role     text NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'editor')),
  nom      text,
  email    text
);

-- Trigger : créer profil automatiquement à l'inscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profils (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();
```

### Politiques RLS par rôle
```sql
-- Helper function : obtenir le rôle de l'utilisateur connecté
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
  SELECT role FROM profils WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Admin : accès complet
CREATE POLICY "admin_full_access" ON realisations
  FOR ALL USING (get_user_role() = 'admin');

-- Editor : lecture + écriture, pas suppression
CREATE POLICY "editor_read_write" ON realisations
  FOR SELECT USING (get_user_role() IN ('admin', 'editor'));

CREATE POLICY "editor_insert" ON realisations
  FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'editor'));

CREATE POLICY "editor_update" ON realisations
  FOR UPDATE USING (get_user_role() IN ('admin', 'editor'));

-- Admin seulement pour supprimer
CREATE POLICY "admin_delete" ON realisations
  FOR DELETE USING (get_user_role() = 'admin');
```

---

## Proxy Next.js — protection des routes admin

> **Next 16 utilise `proxy.ts` au lieu de `middleware.ts` — voir `src/proxy.ts`.**
> L'ancien nom déclenche un avertissement de dépréciation. Next accepte l'export
> nommé `proxy` ou l'export par défaut.
>
> ⚠️ **Un seul proxy par projet.** `src/proxy.ts` héberge déjà le routage de
> langue next-intl. Le code ci-dessous doit y être FUSIONNÉ, pas créé à côté :
> vérifier la session d'abord, puis déléguer à `createMiddleware(routing)`.

Le proxy est le **seul endroit** capable d'écrire les cookies de session
et de poser les en-têtes de réponse. Un Server Component ne peut faire ni l'un
ni l'autre — c'est pourquoi `setAll` y est obligatoire, avec son 2ᵉ argument
`headers` (`@supabase/ssr` 0.12).

⚠️ **Sans ces en-têtes anti-cache, Cloudflare peut mettre en cache une réponse
porteuse d'un `Set-Cookie` et servir la session d'un utilisateur à un autre.**

```typescript
// src/proxy.ts
import { createServerClient, type CookieMethodsServer } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return request.cookies.getAll()
    },
    setAll(cookiesToSet, headers) {
      for (const { name, value, options } of cookiesToSet) {
        request.cookies.set(name, value)
        response.cookies.set(name, value, options)
      }
      // Cache-Control: private, no-store… — indispensable derrière Cloudflare.
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value)
      }
    },
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieMethods }
  )

  // getUser() valide le jeton auprès de Supabase ; getSession() se contente de
  // lire le cookie, qui est falsifiable. Toujours getUser() pour une décision
  // d'autorisation.
  const { data: { user } } = await supabase.auth.getUser()

  // Protéger /admin
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Vérifier le rôle
    const { data: profil } = await supabase
      .from('profils')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profil || !['admin', 'editor'].includes(profil.role)) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*']
}
```

---

## Ownership — tous les comptes appartiennent à KO-LAB

- GitHub : organisation `ko-lab-inc` — propriété de Christian
- Vercel : compte `ko-lab` — propriété de Christian
- Cloudflare : compte `ko-lab` — propriété de Christian
- Supabase : projet `ko-lab-site` — propriété de Christian
- Domaine ko-lab.ca : propriété de KO-LAB

Moussa = collaborateur avec accès technique, pas propriétaire des comptes.
