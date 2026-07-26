/**
 * PostCSS — Tailwind 3.4 + Autoprefixer.
 *
 * Next.js applique lui-même la minification CSS au build de production :
 * pas de cssnano ici, il ferait doublon.
 *
 * @type {import('postcss-load-config').Config}
 */
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
