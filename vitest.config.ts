import path from 'node:path'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

/**
 * Tests unitaires — skill 26.
 *
 * `exclude` doit reprendre les valeurs par défaut de Vitest EN PLUS de tests/e2e :
 * les redéfinir écrase la liste au lieu de l'étendre, et Vitest tenterait alors
 * d'exécuter les specs Playwright — qui échouent hors de leur runner.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/unit/setup.ts'],
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.next', 'tests/e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Seuils du skill 26. `all: false` : on ne mesure que ce qui est testé,
      // sinon les composants de page non couverts écraseraient la moyenne et
      // le seuil deviendrait inatteignable dès la première section.
      include: ['src/lib/**/*.ts', 'src/hooks/**/*.ts', 'src/components/ui/**/*.tsx'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
  resolve: {
    // Reproduit l'alias @/* du tsconfig — Vitest ne lit pas les `paths`.
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
