import { defineConfig, devices } from '@playwright/test'

/**
 * Tests end-to-end — skill 26.
 *
 * Le skill omet `devices` dans ses imports et n'a pas de `webServer` : les tests
 * échouaient donc si le serveur n'était pas déjà lancé à la main. Corrigé ici.
 */
const PORT = 3000
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests/e2e',

  // En CI, un `.only` oublié ferait passer la suite en ne testant qu'un cas.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html']] : [['list'], ['html']],

  use: {
    baseURL,
    locale: 'fr-CA',
    timezoneId: 'America/Toronto',
    // Artefacts produits uniquement sur échec — sinon chaque exécution locale
    // laisse des centaines de mégaoctets de vidéos.
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      // 375px est la cible mobile la plus contraignante du skill 11.
      //
      // ⚠️ `devices['iPhone SE']` sélectionne WebKit par défaut. On force
      // Chromium : la suite tourne alors sans télécharger un second navigateur,
      // et couvre déjà l'essentiel (débordement horizontal, empilement des
      // grilles, cibles tactiles).
      //
      // À FAIRE avant la mise en production : ajouter un projet WebKit
      // (`npx playwright install webkit`). Safari a de vraies différences sur
      // les unités de viewport — le `min-h-[100svh]` du hero en dépend — et sur
      // position: sticky.
      name: 'mobile',
      use: {
        ...devices['iPhone SE'],
        browserName: 'chromium',
        // ⚠️ `devices['iPhone SE']` décrit le SE de 2016 : 320×568. Le skill 11
        // vise le SE moderne, 375px — « la cible la plus contraignante ».
        // Sans cette surcharge, on testerait une largeur que le design ne
        // prétend pas supporter.
        viewport: { width: 375, height: 667 },
      },
    },
  ],

  // Démarre le serveur automatiquement et réutilise celui déjà ouvert en local.
  webServer: {
    command: process.env.CI ? 'npm run build && npm run start' : 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
