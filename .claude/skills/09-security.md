# Skill 09 — Sécurité

## Règles fondamentales
- Jamais de secrets dans le code source
- Toujours valider côté serveur (jamais faire confiance au client)
- Row Level Security (RLS) activé sur toutes les tables Supabase
- Rate limiting sur toutes les API routes publiques

## Variables d'environnement
```bash
# .env.local (jamais commité)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=    # BACKEND ONLY — jamais exposé
RESEND_API_KEY=               # emails
```

## Validation des formulaires (Zod)
```typescript
import { z } from 'zod'

export const contactSchema = z.object({
  nom:     z.string().min(2).max(100),
  email:   z.string().email(),
  message: z.string().min(10).max(2000),
  sujet:   z.enum(['mandat', 'location', 'boutique', 'autre']),
})
```

## API Route sécurisée
```typescript
// app/api/contact/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { contactSchema } from '@/lib/validation'
import { rateLimit } from '@/lib/utils/rateLimit'

export async function POST(req: NextRequest) {
  // Rate limiting
  const limited = await rateLimit(req, { max: 5, window: '1m' })
  if (limited) return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })

  // Validation
  const body = await req.json()
  const result = contactSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 })

  // Traitement sécurisé
  // ...
}
```

## Supabase RLS
```sql
-- Toujours activer RLS sur les nouvelles tables
ALTER TABLE realisations ENABLE ROW LEVEL SECURITY;

-- Lecture publique (site vitrine)
CREATE POLICY "public_read" ON realisations
  FOR SELECT USING (publie = true);

-- Écriture admin seulement
CREATE POLICY "admin_write" ON realisations
  FOR ALL USING (auth.role() = 'admin');
```

## Headers de sécurité (next.config.ts)
```typescript
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=()' },
]
```
