# Skill 26 — Tests

## Stack de tests
- **Unit tests** : Vitest + Testing Library React
- **E2E tests** : Playwright
- **Pattern** : TDD pour la logique métier (API routes, utils)

---

## Unit Tests — Vitest

### Configuration
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/unit/setup.ts'],
  },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
})
```

### Structure
```
tests/unit/
  setup.ts              ← configuration globale
  utils/
    formatters.test.ts
    cn.test.ts
  components/
    Button.test.tsx
    Nav.test.tsx
  api/
    contact.test.ts
```

### Exemple test composant
```typescript
// tests/unit/components/Button.test.tsx
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/Button'

describe('Button', () => {
  it('renders primary variant correctly', () => {
    render(<Button variant="primary">Cliquer</Button>)
    const btn = screen.getByRole('button', { name: /cliquer/i })
    expect(btn).toHaveClass('bg-ko-blue')
  })
})
```

---

## E2E Tests — Playwright

### Configuration
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    locale: 'fr-CA',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
})
```

### Structure
```
tests/e2e/
  home.spec.ts          ← page d'accueil complète
  navigation.spec.ts    ← liens, nav, footer
  contact.spec.ts       ← formulaire de contact
  boutique.spec.ts      ← catalogue boutique
  i18n.spec.ts          ← bascule FR/EN
```

### Exemple test E2E
```typescript
// tests/e2e/home.spec.ts
import { test, expect } from '@playwright/test'

test('hero affiche le titre principal', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('terrain')
})

test('navigation vers les capacités fonctionne', async ({ page }) => {
  await page.goto('/')
  await page.click('text=Nos capacités')
  await expect(page).toHaveURL('/nos-capacites')
})

test('formulaire de contact envoie', async ({ page }) => {
  await page.goto('/contact')
  await page.fill('[name="nom"]', 'Test User')
  await page.fill('[name="email"]', 'test@test.com')
  await page.fill('[name="message"]', 'Message test')
  await page.click('[type="submit"]')
  await expect(page.getByText(/envoyé/i)).toBeVisible()
})
```

---

## TDD — pour la logique métier

Appliquer TDD sur :
- Les API routes (`/api/contact`, `/api/boutique`)
- Les fonctions utilitaires
- La validation de formulaires

### Cycle TDD
1. Écrire le test (RED)
2. Coder le minimum pour passer (GREEN)
3. Refactoriser (REFACTOR)

```typescript
// 1. Test d'abord
it('valide un email correctement', () => {
  expect(validateEmail('test@ko-lab.ca')).toBe(true)
  expect(validateEmail('pas-un-email')).toBe(false)
})

// 2. Ensuite l'implémentation
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
```

---

## Commandes
```bash
npm run test              # unit tests en watch
npm run test:ci           # unit tests une fois (CI/CD)
npm run test:e2e          # E2E en headless
npm run test:e2e:ui       # E2E avec interface visuelle
npm run test:coverage     # rapport de couverture
```

## Couverture minimale cible
- Utils et logique métier : 90%+
- Composants UI critiques : 70%+
- API routes : 80%+
