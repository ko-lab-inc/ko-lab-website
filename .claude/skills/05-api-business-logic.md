# Skill 05 — API & Logique métier

## API Routes Next.js — pattern standard

### Formulaire de contact
```typescript
// src/app/api/contact/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { Resend } from 'resend'

const schema = z.object({
  type:         z.enum(['mandat', 'location', 'boutique', 'carriere', 'autre']),
  nom:          z.string().min(2).max(100),
  email:        z.string().email(),
  telephone:    z.string().optional(),
  organisation: z.string().optional(),
  message:      z.string().min(10).max(2000),
})

export async function POST(req: NextRequest) {
  try {
    // 1. Validation
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // 2. Sauvegarder dans Supabase
    const { error } = await supabaseAdmin
      .from('demandes_contact')
      .insert(parsed.data)
    if (error) throw error

    // 3. Envoyer email de notification
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from:    'KO-LAB <site@ko-lab.ca>',
      to:      'info@ko-lab.ca',
      subject: `Nouvelle demande — ${parsed.data.type}`,
      text:    `De: ${parsed.data.nom} (${parsed.data.email})\n\n${parsed.data.message}`,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[API/contact]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
```

### Demande produit boutique
```typescript
// src/app/api/boutique/demande/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  produit_slug: z.string(),
  nom:          z.string().min(2),
  email:        z.string().email(),
  quantite:     z.number().int().min(1).max(999),
  message:      z.string().optional(),
})

export async function POST(req: NextRequest) {
  // Même pattern que contact
}
```

---

## Idempotency — éviter les doublons

Pour les formulaires, ajouter un identifiant unique côté client :
```typescript
// Générer un ID unique par soumission de formulaire
const submissionId = crypto.randomUUID()

// Envoyer avec la requête
fetch('/api/contact', {
  method: 'POST',
  body: JSON.stringify({ ...data, _idempotency_key: submissionId })
})
```

## Rate Limiting simple (sans Redis)
```typescript
// src/lib/utils/rateLimit.ts
const store = new Map<string, { count: number; reset: number }>()

export function rateLimit(
  ip: string,
  opts: { max: number; windowMs: number }
): boolean {
  const now = Date.now()
  const entry = store.get(ip)

  if (!entry || entry.reset < now) {
    store.set(ip, { count: 1, reset: now + opts.windowMs })
    return false // pas limité
  }

  if (entry.count >= opts.max) return true // limité

  entry.count++
  return false
}

// Usage dans une API route
const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
if (rateLimit(ip, { max: 5, windowMs: 60_000 })) {
  return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
}
```

## Validation côté client (formulaires React)
```typescript
// Pattern avec react-hook-form + zod
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(contactSchema)
})
```
