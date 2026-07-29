import type { Config } from 'tailwindcss'

/**
 * Design system KO-LAB — skill 02.
 *
 * Toutes les couleurs pointent vers les custom properties définies dans
 * src/styles/globals.css. Aucune valeur hexadécimale ici : globals.css reste
 * la source unique de vérité, et les CSS des skills 20 (`background: var(--ko-blue)`)
 * partagent exactement les mêmes tokens que les classes Tailwind.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],

  // Le site n'utilise jamais `dark:` — les sections sombres sont explicites
  // (bg-ko-black). En 'class' sans classe .dark, aucun utilitaire dark: ne peut
  // se déclencher depuis les préférences OS et altérer la palette validée.
  darkMode: 'class',

  theme: {
    extend: {
      colors: {
        'ko-black': 'var(--ko-black)',
        'ko-black2': 'var(--ko-black-2)',
        'ko-ink': 'var(--ko-ink)',
        'ko-white': 'var(--ko-white)',
        'ko-cream': 'var(--ko-cream)',
        'ko-cream2': 'var(--ko-cream-2)',
        'ko-blue': 'var(--ko-blue)',
        'ko-blue2': 'var(--ko-blue-2)',
        'ko-blue-bg': 'var(--ko-blue-bg)',
        'ko-muted': 'var(--ko-muted)',
        // Texte secondaire sur fond sombre. Un token dédié et non `ko-white/70` :
        // les couleurs mappées en var() ne supportent pas les modificateurs
        // d'opacité de Tailwind. Même logique que ko-line-d.
        'ko-muted-d': 'var(--ko-muted-d)',
        'ko-line': 'var(--ko-line)',
        'ko-line-d': 'var(--ko-line-d)',
        // Blanc pur — RÉSERVÉ aux cadres de photo produit (voir globals.css).
        // Pour un fond clair de section, c'est ko-white qu'il faut.
        'ko-photo': 'var(--ko-photo)',
        // Voiles translucides sur photo — les SEULS tokens acceptant un
        // modificateur d'opacité (bg-ko-scrim/70, text-ko-frost/60…).
        // Réservés aux dégradés de lisibilité et au glassmorphism du hero ;
        // pour tout le reste, utiliser les tokens opaques ci-dessus.
        'ko-scrim': 'rgb(var(--ko-black-rgb) / <alpha-value>)',
        'ko-frost': 'rgb(var(--ko-white-rgb) / <alpha-value>)',
        // Bleu accent translucide — soulignés discrets, bordures d'appui.
        'ko-accent': 'rgb(var(--ko-blue-rgb) / <alpha-value>)',
      },

      // Les variables --font-* sont produites par next/font/google (skill 12),
      // qui auto-héberge les fichiers. Les fallbacks couvrent le rendu avant
      // chargement et les environnements de test sans next/font.
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'Courier New', 'monospace'],
      },

      // Conteneur standard du skill 02 : max-w-container mx-auto px-6 lg:px-12
      maxWidth: {
        container: '1280px',
      },

      // La SEULE ombre autorisée (carte flottante du hero). Le skill 08 interdit
      // les ombres marquées : la nommer rend la contrainte explicite.
      boxShadow: {
        card: '0 4px 20px rgba(0, 0, 0, 0.06)',
      },

      // Durées du skill 20 absentes de l'échelle Tailwind par défaut.
      transitionDuration: {
        '250': '250ms',
        '650': '650ms',
      },
    },
  },

  plugins: [],
}

export default config
