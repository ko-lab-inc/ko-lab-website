import type { ReactNode } from 'react'

/**
 * Habillage commun des écrans de compte — connexion, inscription, mot de passe.
 *
 * Composant serveur : ces quatre écrans n'ont pas d'état propre, seul le
 * formulaire qu'ils contiennent en a un. Colonne étroite (42ch) parce qu'un
 * champ de saisie qui traverse un écran large donne l'impression qu'il attend
 * une phrase, pas un courriel.
 */
export function CadreAuth({
  titre,
  intro,
  children,
}: {
  titre: string
  intro?: string
  children: ReactNode
}) {
  return (
    <section className="flex min-h-[70svh] items-center bg-ko-cream py-24 lg:py-32">
      <div className="mx-auto w-full max-w-container px-6 lg:px-12">
        <div className="max-w-[42ch]">
          <span aria-hidden="true" className="block h-px w-8 bg-ko-blue" />
          <h1 className="ko-display mt-6 text-ko-ink">{titre}</h1>
          {intro && <p className="mt-6 text-base leading-relaxed text-ko-muted">{intro}</p>}
          {children}
        </div>
      </div>
    </section>
  )
}

/** Encart d'information — succès, refus, lien expiré. */
export function EncartAuth({ titre, texte }: { titre: string; texte: string }) {
  return (
    <div className="mt-8 border border-ko-line bg-ko-white p-5">
      <p className="label-mono">{titre}</p>
      <p className="mt-2.5 text-sm leading-relaxed text-ko-ink">{texte}</p>
    </div>
  )
}
