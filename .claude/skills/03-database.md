# Skill 03 — Base de données Supabase

## Tables principales

### realisations
```sql
CREATE TABLE realisations (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug        text UNIQUE NOT NULL,
  titre_fr    text NOT NULL,
  titre_en    text NOT NULL,
  description_fr text,
  description_en text,
  categorie   text NOT NULL, -- 'terrain' | 'installation' | 'lab' | 'equipement'
  tags        text[],
  images      jsonb,         -- [{ url, alt_fr, alt_en, ordre }]
  publie      boolean DEFAULT false,
  ordre       integer DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Index pour les filtres de la galerie
CREATE INDEX idx_realisations_categorie ON realisations(categorie);
CREATE INDEX idx_realisations_publie    ON realisations(publie);
CREATE INDEX idx_realisations_ordre     ON realisations(ordre);
```

### produits_boutique
```sql
CREATE TABLE produits_boutique (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug         text UNIQUE NOT NULL,
  marque       text NOT NULL,          -- 'Bambu Lab' | 'xTool' | ...
  categorie    text NOT NULL,
  nom_fr       text NOT NULL,
  nom_en       text NOT NULL,
  description_fr text,
  description_en text,
  prix         numeric,                -- null = 'sur demande'
  images       jsonb,
  specs        jsonb,                  -- caractéristiques techniques
  url_externe  text,                   -- lien fabricant
  publie       boolean DEFAULT false,
  ordre        integer DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);
```

### demandes_contact
```sql
CREATE TABLE demandes_contact (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type        text NOT NULL,  -- 'mandat' | 'location' | 'boutique' | 'carriere' | 'autre'
  nom         text NOT NULL,
  email       text NOT NULL,
  telephone   text,
  organisation text,
  message     text NOT NULL,
  statut      text DEFAULT 'nouveau',  -- 'nouveau' | 'lu' | 'traite'
  created_at  timestamptz DEFAULT now()
);
```

### postes_carrieres
```sql
CREATE TABLE postes_carrieres (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  titre_fr    text NOT NULL,
  titre_en    text NOT NULL,
  departement text NOT NULL,
  type        text NOT NULL,  -- 'temps-plein' | 'temps-partiel' | 'contrat'
  description_fr text,
  description_en text,
  exigences_fr text,
  exigences_en text,
  actif       boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);
```

---

## Row Level Security (RLS) — TOUJOURS activer

```sql
-- Activer RLS sur toutes les tables
ALTER TABLE realisations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE produits_boutique ENABLE ROW LEVEL SECURITY;
ALTER TABLE demandes_contact  ENABLE ROW LEVEL SECURITY;
ALTER TABLE postes_carrieres  ENABLE ROW LEVEL SECURITY;

-- Lecture publique (site vitrine)
CREATE POLICY "public_read_realisations"
  ON realisations FOR SELECT USING (publie = true);

CREATE POLICY "public_read_produits"
  ON produits_boutique FOR SELECT USING (publie = true);

CREATE POLICY "public_read_postes"
  ON postes_carrieres FOR SELECT USING (actif = true);

-- Insertion publique (formulaire contact)
CREATE POLICY "public_insert_contact"
  ON demandes_contact FOR INSERT WITH CHECK (true);

-- Toutes les actions admin
CREATE POLICY "admin_all"
  ON realisations FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');
```

---

## Clients Supabase

### Client navigateur (Client Components)
```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Client serveur avec session (/admin, proxy)
```typescript
// src/lib/supabase/server.ts
import { createServerClient, type CookieMethodsServer } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

// ⚠️ ASYNC depuis Next 15 : cookies() renvoie une Promise.
// Les appelants doivent faire `await createClient()`.
export async function createClient() {
  const cookieStore = await cookies()

  // Annotation explicite obligatoire : createServerClient accepte une union
  // entre l'API moderne et l'API dépréciée, donc pas d'inférence contextuelle.
  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return cookieStore.getAll()
    },
    // @supabase/ssr 0.12 : setAll reçoit un 2ᵉ argument `headers` (anti-cache CDN).
    // Non déclaré ici — un Server Component ne peut poser aucun en-tête de réponse.
    // C'est au proxy de le faire — src/proxy.ts (skill 24).
    setAll(cookiesToSet) {
      try {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options)
        }
      } catch {
        // Next interdit d'écrire un cookie depuis un Server Component.
        // Le proxy rafraîchit déjà la session.
      }
    },
  }

  return createServerClient<Database>(url, anonKey, { cookies: cookieMethods })
}
```

### Client serveur SANS session (contenu public, ISR)
```typescript
// src/lib/supabase/static.ts
// cookies() rend une route dynamique et est INTERDIT dans unstable_cache.
// Ce client est le seul utilisable pour l'accueil, les réalisations,
// la boutique et les carrières. Voir skill 12.
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

export function createStaticClient() {
  return createSupabaseClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
```

### Client admin (API routes uniquement — jamais côté client)
```typescript
// src/lib/supabase/admin.ts
import 'server-only' // fait échouer le build si importé côté client
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// Initialisation PARESSEUSE, pas une constante de module : une constante
// s'évaluerait au build de chaque route handler et ferait échouer `next build`
// là où SUPABASE_SERVICE_ROLE_KEY n'est pas défini (local, CI).
let cached: SupabaseClient<Database> | null = null

export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (cached) return cached
  cached = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  return cached
}
```

Usage : `await getSupabaseAdmin().from('demandes_contact').insert(...)`

---

## Exemples de requêtes optimisées

```typescript
// Récupérer les réalisations publiées par catégorie
const { data } = await supabase
  .from('realisations')
  .select('id, slug, titre_fr, titre_en, categorie, images')
  .eq('publie', true)
  .order('ordre', { ascending: true })

// Récupérer un seul produit
const { data } = await supabase
  .from('produits_boutique')
  .select('*')
  .eq('slug', slug)
  .single()
```

---

## Migrations — toujours versionner
```
supabase/migrations/
  0001_initial_schema.sql
  0002_add_rls_policies.sql
  0003_seed_realisations.sql
```

## Générer les types TypeScript
```bash
npx supabase gen types typescript --local > src/types/supabase.ts
```
