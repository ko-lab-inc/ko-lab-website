# Skill 19 — Core Workflow

## Méthode de construction KO-LAB
Le site se construit page par page, section par section.
Ne jamais sauter d'étape. Ne jamais modifier ce qui n'est pas demandé.

---

## Ordre de construction

### Phase 1 — Fondations (faire EN PREMIER)
1. `package.json` + install dépendances
2. `tailwind.config.ts` avec tokens KO-LAB
3. `src/styles/globals.css` avec CSS custom properties
4. `src/lib/utils/cn.ts`
5. `src/lib/supabase/client.ts` + `server.ts`
6. `src/i18n/routing.ts` + `messages/fr.json` + `messages/en.json`
7. `src/components/layout/Nav.tsx`
8. `src/components/layout/Footer.tsx`
9. `src/app/(marketing)/[locale]/layout.tsx`

### Phase 2 — Page d'accueil section par section
Dans cet ordre strict :
1. Hero (photo + titre + CTA + carte flottante + numéro filigrane)
2. Stats bar (20 000+ / 6 disciplines / Multi-sites / Gouv.)
3. Les 4 besoins (grille 4 colonnes)
4. Capacités (liste éditoriale animée)
5. Le LAB (split sombre photo + texte)
6. Preuve terrain (20 000+ en grand)
7. Réalisations (galerie 3 cartes)
8. Écosystème (4 partenaires sur fond sombre)
9. Location + Boutique (2 cartes)
10. CTA final
11. Vérification mobile + desktop → validation Christian

### Phase 3 — Pages de capacités
(une par une, après validation de l'accueil)

### Phase 4 — Réalisations, Boutique, Location

### Phase 5 — Carrières, Contact, À propos

### Phase 6 — Tests, SEO, Performance

### Phase 7 — Déploiement Vercel + Cloudflare

---

## Pour chaque section

### Avant de coder
- [ ] Lire `08-anti-ia-design.md`
- [ ] Lire `02-design-system.md` pour les tokens concernés
- [ ] Confirmer le contenu exact avec les textes du document KO-LAB

### En codant
- [ ] Mobile-first (commencer par le CSS mobile)
- [ ] Server Component par défaut, `use client` seulement si nécessaire
- [ ] Utiliser les tokens CSS (`var(--ko-blue)`) pas les hex directement
- [ ] Toujours typer TypeScript (pas de `any`)
- [ ] Textes via `useTranslations()` / `getTranslations()` — jamais hardcodés

### Après avoir codé
- [ ] Vérifier mobile (375px)
- [ ] Vérifier desktop (1280px)
- [ ] Vérifier que la section ne "ressemble pas à du template IA"
- [ ] Attendre la validation avant de passer à la section suivante

---

## Gestion des photos
Les vraies photos de KO-LAB (2025-2026) seront ajoutées progressivement.
En attendant : utiliser des placeholders avec les dimensions exactes et la couleur `var(--ko-cream2)`.

```tsx
{/* Placeholder photo */}
<div className="aspect-[16/9] bg-ko-cream2 rounded flex items-center justify-center">
  <span className="text-ko-muted font-mono text-xs uppercase tracking-widest">
    Photo terrain KO-LAB
  </span>
</div>
```

---

## Commandes utiles
```bash
npm run dev          # développement local
npm run build        # build de production
npm run test         # tests Vitest
npm run test:e2e     # tests Playwright
npx supabase gen types typescript --local > src/types/supabase.ts
```
