'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

/**
 * Beacon de visite — envoie une ligne à /api/stats à chaque page vue.
 *
 * Monté une seule fois dans le layout marketing : il ne suit donc QUE le site
 * public, jamais l'espace admin (son layout ne le monte pas). Ne rend rien.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI `sendBeacon`
 *
 * `navigator.sendBeacon` est fait pour ça : il part en tâche de fond, survit à
 * la navigation qui suit, et n'attend aucune réponse. Si le navigateur ne le
 * supporte pas, repli sur `fetch({ keepalive: true })`. Dans les deux cas,
 * échec silencieux : une visite manquée ne doit jamais gêner l'utilisateur.
 *
 * ---------------------------------------------------------------------------
 * UN SEUL ENVOI PAR PAGE
 *
 * `usePathname` change à chaque navigation App Router (y compris les
 * changements côté client, sans rechargement). `dejaVu` évite un double envoi
 * si l'effet se rejoue pour le même chemin (StrictMode en dev, re-rendus).
 *
 * CSP : POST vers /api/stats, même origine → couvert par `connect-src 'self'`
 * (next.config.ts), rien à ajouter.
 */
export function CaptureVisite() {
  const chemin = usePathname()
  const dejaVu = useRef<string | null>(null)

  useEffect(() => {
    if (!chemin || dejaVu.current === chemin) return
    dejaVu.current = chemin

    const corps = JSON.stringify({
      chemin,
      // Domaine de provenance seulement, extrait côté serveur. On transmet le
      // referrer brut ; le serveur n'en garde que l'hôte.
      referrer: typeof document !== 'undefined' ? document.referrer || null : null,
      // La balise <html lang> porte la locale courante (fr/en).
      locale: typeof document !== 'undefined' ? document.documentElement.lang || null : null,
    })

    try {
      const blob = new Blob([corps], { type: 'application/json' })
      if (navigator.sendBeacon && navigator.sendBeacon('/api/stats', blob)) return
      // Repli : fetch keepalive pour que la requête survive à la navigation.
      void fetch('/api/stats', {
        method: 'POST',
        body: corps,
        headers: { 'content-type': 'application/json' },
        keepalive: true,
      }).catch(() => {})
    } catch {
      /* jamais bloquant */
    }
  }, [chemin])

  return null
}
