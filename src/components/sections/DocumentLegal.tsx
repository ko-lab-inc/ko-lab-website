import { Reveal } from '@/components/ui/Reveal'

/**
 * Gabarit partagé des pages légales (confidentialité, conditions
 * d'utilisation — mentions légales et politique de retour à venir).
 *
 * Un seul composant plutôt que dupliquer l'en-tête et le conteneur de prose
 * dans chaque page : ce sont les mêmes deux blocs à chaque fois, seul le
 * contenu change. `whitespace-pre-line` n'est pas nécessaire ici : chaque
 * section est un paragraphe unique, pas un texte à sauts de ligne.
 */
export function DocumentLegal({
  eyebrow,
  titre,
  intro,
  miseAJour,
  sections,
}: {
  eyebrow: string
  titre: string
  intro: string
  miseAJour: string
  sections: { titre: string; texte: string }[]
}) {
  return (
    <>
      <section className="border-b border-ko-line bg-ko-cream pb-14 pt-28 lg:pb-20 lg:pt-40">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          <span aria-hidden="true" className="block h-px w-8 bg-ko-blue" />
          <p className="label-mono mt-6">{eyebrow}</p>
          <h1 className="ko-display mt-5 max-w-[20ch] text-ko-ink">{titre}</h1>
          <p className="mt-7 max-w-[60ch] text-base leading-relaxed text-ko-muted">{intro}</p>
          <p className="mt-5 font-mono text-xs uppercase tracking-widest text-ko-muted">{miseAJour}</p>
        </div>
      </section>

      <section className="bg-ko-white py-16 lg:py-28">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          <div className="max-w-[70ch] space-y-14">
            {sections.map((s) => (
              <Reveal key={s.titre}>
                <h2 className="ko-h3 text-ko-ink">{s.titre}</h2>
                <p className="mt-4 text-sm leading-relaxed text-ko-muted">{s.texte}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
