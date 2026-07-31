import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'

/**
 * Configuration ESLint — flat config.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI CE FICHIER N'EXISTAIT PAS
 *
 * Next 16 a retiré la commande `next lint`. Le projet gardait le script
 * `"lint": "next lint"` dans package.json, qui échouait en croyant qu'on lui
 * passait un répertoire (« Invalid project directory provided, no such
 * directory: …/lint »), et aucun `.eslintrc` n'a jamais été écrit. Résultat :
 * ESLint était installé et n'a jamais analysé une seule ligne.
 *
 * ---------------------------------------------------------------------------
 * PAS DE NOUVELLE DÉPENDANCE
 *
 * `eslint-config-next` 16.2.11 expose déjà ses préréglages au format flat —
 * `core-web-vitals` et `typescript` sont des TABLEAUX de blocs, à étaler
 * directement. Le second embarque `typescript-eslint` (dépendance directe de
 * `eslint-config-next`, v8.65.0 résolue). Rien à installer.
 *
 * ---------------------------------------------------------------------------
 * TYPE-AWARE : NON, ET C'EST UN CHOIX
 *
 * `typescript-eslint` sait analyser en s'appuyant sur le typage
 * (`projectService`), ce qui débloque des règles comme
 * `no-floating-promises`. On s'en passe : `npm run typecheck` fait déjà tourner
 * `tsc --noEmit` en strict avec `noUncheckedIndexedAccess`,
 * `noUnusedLocals` et `noUnusedParameters`. Activer le mode type-aware ici
 * ferait un second passage complet du compilateur à chaque lint, pour un
 * recouvrement large. À rouvrir le jour où une CI existe et où le temps de
 * lint cesse d'être payé par la personne qui code.
 * ---------------------------------------------------------------------------
 */

const racine = dirname(fileURLToPath(import.meta.url))

export default [
  {
    // Artefacts de build et sorties d'outils : jamais du code qu'on écrit.
    // `next-env.d.ts` est généré par Next et sa première ligne interdit de
    // l'éditer — le linter n'a rien à y dire.
    ignores: [
      '.next/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'coverage/**',
      'next-env.d.ts',
      'tsconfig.tsbuildinfo',
    ],
  },

  ...nextCoreWebVitals,
  ...nextTypeScript,

  {
    // Scripts d'audit et de maintenance : du Node en ligne de commande, pas du
    // code d'application. Ils écrivent volontairement dans la console — c'est
    // leur seule sortie — et `src/` reste, lui, tenu à `console.error` /
    // `console.warn` uniquement.
    files: ['scripts/**/*.mjs', '*.config.{js,mjs,ts}'],
    rules: {
      'no-console': 'off',
    },
  },

  {
    settings: {
      next: { rootDir: racine },

      /**
       * ⚠️ VERSION DE REACT ÉCRITE EN DUR — NE PAS REMETTRE `'detect'`.
       *
       * `eslint-plugin-react` 7.37.5 (tiré par `eslint-config-next`) détecte la
       * version de React en appelant `contextOrFilename.getFilename()`, API
       * retirée par ESLint 10. Avec `'detect'`, ou sans réglage du tout, le
       * lint ne produit aucun diagnostic : il PLANTE, dès le premier fichier.
       *
       *   TypeError: Error while loading rule 'react/display-name':
       *   contextOrFilename.getFilename is not a function
       *       at resolveBasedir (eslint-plugin-react/lib/util/version.js:31)
       *       at detectReactVersion (…/version.js:85)
       *
       * Une version explicite fait sortir `getReactVersionFromContext` avant
       * l'appel à `detectReactVersion` (…/version.js:113-117) — le plantage
       * disparaît sans toucher aux dépendances.
       *
       * À garder synchronisé avec `react` dans package.json. Le jour où
       * `eslint-plugin-react` gère ESLint 10, on pourra revenir à `'detect'`.
       */
      react: { version: '19.2.8' },
    },
  },
]
