import { getTranslations } from 'next-intl/server'

import { Reveal } from '@/components/ui/Reveal'

/**
 * Partenariat GM Locations — section 8 de l'accueil (Phase 5, composant créé).
 *
 * GM Locations est un partenaire stratégique EXTERNE — il ne fait PAS partie
 * de KO-LAB, contrairement aux quatre marques de l'Écosystème (section 10).
 * D'où un traitement délibérément différent des sections 4/5/7 : fond clair,
 * pas de photo pleine largeur, carte sobre — une section qui ressemblerait
 * en tout point aux capacités KO-LAB laisserait croire à une appartenance
 * qui n'existe pas. La sobriété EST le message de véracité, pas un manque de
 * soin.
 *
 * Sert aussi de respiration claire après cinq sections sombres consécutives
 * (Crédibilité, Opérations, Le LAB, Équipements) — avant que Réalisations
 * (section 9) ne revienne sur fond clair.
 *
 * Aucun lien : GM Locations n'a pas de page sur ko-lab-center.ca, et son URL
 * externe n'a pas été fournie — rien à inventer ici (voir CLAUDE.md).
 *
 * Retouchée le 20 août 2026 (revue visuelle, point 4) : « sobre » avait
 * dérivé vers « vide » — le titre tournait à `text-2xl/3xl` quand le reste
 * du site est au minimum sur l'échelle de Lab.tsx (`clamp(28px,3.4vw,44px)`),
 * et le bloc n'avait presque pas de respiration verticale. Toujours AUCUNE
 * photo, AUCUNE carte pleine largeur — seule la typographie et l'espacement
 * bougent, jamais le message de sobriété qui protège contre une apparence
 * d'appartenance à KO-LAB. Le chiffre « 08 » posé en filigrane suit le même
 * vocabulaire que les numéros de section ailleurs sur le site (Besoins.tsx,
 * hub /nos-capacites) — un repère, pas une décoration ajoutée.
 */
export async function GmLocations() {
  const t = await getTranslations('Home.gmLocations')

  return (
    <section className="bg-ko-cream py-20 lg:py-28">
      <div className="mx-auto max-w-container px-6 lg:px-12">
        <Reveal>
          <div className="flex flex-col gap-8 border-y border-ko-line py-14 lg:flex-row lg:items-center lg:justify-between lg:gap-16 lg:py-20">
            <div className="flex items-baseline gap-5 lg:gap-6">
              <span
                aria-hidden="true"
                className="select-none font-serif text-[56px] font-light leading-none text-ko-cream2 lg:text-[72px]"
              >
                08
              </span>

              <div className="max-w-[52ch]">
                <p className="label-mono">{t('label')}</p>
                <h2 className="mt-4 font-serif text-[clamp(26px,3vw,36px)] font-light leading-tight text-ko-ink">
                  {t('title')}
                </h2>
              </div>
            </div>

            <p className="max-w-[46ch] text-sm leading-relaxed text-ko-muted lg:text-right lg:text-base">
              {t('texte')}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
