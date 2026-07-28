import createNextIntlPlugin from 'next-intl/plugin'

import type { NextConfig } from 'next'

/**
 * MIGRATION Next 14 → 16 : ce fichier était next.config.mjs avec un typage
 * JSDoc, parce que Next 14 ne lisait pas les configs TypeScript. Next 15+ les
 * supporte nativement, d'où le retour au .ts et au typage réel via NextConfig.
 * Bénéfice supplémentaire : `npm run typecheck` valide désormais cette config.
 */

const isDev = process.env.NODE_ENV === 'development'

/**
 * Hôte Supabase déduit de NEXT_PUBLIC_SUPABASE_URL.
 * Next charge les fichiers .env avant d'évaluer cette config, donc la variable
 * est disponible ici. On préfère l'hôte exact au joker : CSP et remotePatterns
 * restent aussi restrictifs que possible.
 */
function getSupabaseHost(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return null
  try {
    return new URL(url).hostname
  } catch {
    console.warn('[next.config] NEXT_PUBLIC_SUPABASE_URL est invalide — repli sur *.supabase.co')
    return null
  }
}

const supabaseHost = getSupabaseHost()

/** Hôte exact si connu, sinon joker (skill 14) pour ne pas casser les images. */
const supabaseImgSrc = supabaseHost ? `https://${supabaseHost}` : 'https://*.supabase.co'
const supabaseConnectSrc = supabaseHost
  ? `https://${supabaseHost} wss://${supabaseHost}`
  : 'https://*.supabase.co wss://*.supabase.co'

/**
 * Content-Security-Policy — skill 14, resserrée sur deux points :
 * - 'unsafe-eval' uniquement en dev (rechargement à chaud). Le build n'en a pas besoin.
 * - pas de fonts.googleapis.com / fonts.gstatic.com : next/font/google (skill 12)
 *   télécharge les polices au build et les sert depuis notre propre origine.
 */
/**
 * Domaines Crisp — widget de chat.
 *
 * Ajoutés inconditionnellement : la CSP est construite au build, alors que
 * l'activation du widget dépend d'une variable d'exécution. Les autoriser en
 * permanence évite qu'activer la clé sur Vercel ne produise un widget
 * silencieusement bloqué par la CSP, symptôme difficile à relier à sa cause.
 *
 * Répartition par directive :
 *   l.js et son runtime          → script-src
 *   API et WebSocket temps réel  → connect-src
 *   avatars et pièces jointes    → img-src
 *   styles et polices de l'iframe → style-src / font-src
 */
const CRISP_SCRIPT = 'https://client.crisp.chat'
const CRISP_CONNECT = 'https://client.crisp.chat wss://client.relay.crisp.chat'
const CRISP_IMG = 'https://client.crisp.chat https://image.crisp.chat https://storage.crisp.chat'

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${CRISP_SCRIPT}${isDev ? " 'unsafe-eval'" : ''}`,
  `style-src 'self' 'unsafe-inline' ${CRISP_SCRIPT}`,
  `font-src 'self' data: ${CRISP_SCRIPT}`,
  // ⚠️ TEMPORAIRE — images.unsplash.com sert les photos de développement.
  // À RETIRER quand les vraies photos KO-LAB seront dans Supabase Storage
  // (voir skill 22, section « Images temporaires à remplacer »).
  `img-src 'self' data: blob: ${supabaseImgSrc} https://images.unsplash.com ${CRISP_IMG}`,
  `connect-src 'self' ${supabaseConnectSrc} ${CRISP_CONNECT}${isDev ? ' ws://localhost:* http://localhost:*' : ''}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ')

/** Headers appliqués à toutes les routes — skill 14. */
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Retire X-Powered-By: Next.js — moins d'empreinte pour un attaquant (skill 15).
  poweredByHeader: false,

  images: {
    formats: ['image/avif', 'image/webp'],
    // ⚠️ OBLIGATOIRE depuis Next 16 : `qualities` n'autorise que [75] par
    // défaut, et l'optimiseur répond 400 pour toute autre valeur — donc une
    // image cassée, sans erreur de build ni message explicite.
    //
    // Le skill 12 impose quality={85} sur le hero et 80/75 sur les grilles.
    // Chaque valeur utilisée dans le code DOIT figurer ici.
    qualities: [75, 80, 85],
    // Breakpoints du skill 11 : 375 (iPhone SE) est la cible mobile la plus contraignante.
    deviceSizes: [375, 640, 768, 1024, 1280, 1920],
    // MIGRATION : `images.domains` a été supprimé en Next 16. remotePatterns
    // était déjà notre choix, rien à changer — mais tout exemple de skill
    // mentionnant `domains` est désormais invalide.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: supabaseHost ?? '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        // ⚠️ TEMPORAIRE — photos de développement uniquement.
        // À RETIRER avant la mise en production, en même temps que l'entrée
        // correspondante dans la CSP (voir skill 22).
        //
        // Chemin ouvert : Unsplash sert son fonds sous DEUX formes selon
        // l'ancienneté — /photo-<id> et /reserve/<nom>.jpg. Restreindre à
        // l'une des deux écarte arbitrairement la moitié du catalogue.
        //
        // La garantie de licence ne repose pas sur le chemin mais sur l'HÔTE :
        // les visuels payants Unsplash+ sont servis depuis plus.unsplash.com,
        // qui n'apparaît nulle part dans cette liste ni dans la CSP.
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        // CORS restrictif sur les API — skill 25.
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://ko-lab.ca' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ]
  },
}

// next-intl : le plugin injecte la config de requête dans le build.
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

export default withNextIntl(nextConfig)
