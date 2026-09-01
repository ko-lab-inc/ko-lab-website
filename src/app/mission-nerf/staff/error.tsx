'use client'

/**
 * Filet d'erreur du panneau staff — contrairement à celui du dashboard
 * (dashboard/error.tsx), pas de relance automatique : ici quelqu'un tient
 * l'écran et peut appuyer sur « Réessayer » lui-même, inutile de deviner un
 * délai. Couvre aussi le cas où une Server Action lève parce que la session
 * a expiré en cours de route (voir actions.ts, assurerSessionStaff) —
 * réessayer renvoie alors vers l'écran de connexion.
 */
export default function ErreurStaff({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0a0f1a] p-6 text-center font-mono text-white">
      <p className="text-xs uppercase tracking-[0.2em] text-amber-400">Mission NERF</p>
      <p className="text-base text-slate-300">Une erreur est survenue — la session a peut-être expiré.</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg border border-white/20 px-5 py-3 text-sm text-white"
      >
        Réessayer
      </button>
    </div>
  )
}
