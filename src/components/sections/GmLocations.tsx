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
 */
export async function GmLocations() {
  const t = await getTranslations('Home.gmLocations')

  return (
    <section className="bg-ko-cream py-16 lg:py-24">
      <div className="mx-auto max-w-container px-6 lg:px-12">
        <Reveal>
          <div className="flex flex-col items-start gap-6 border-y border-ko-line py-10 lg:flex-row lg:items-center lg:justify-between lg:gap-16 lg:py-12">
            <div className="max-w-[52ch]">
              <p className="label-mono">{t('label')}</p>
              <h2 className="mt-4 font-serif text-2xl font-light text-ko-ink lg:text-3xl">
                {t('title')}
              </h2>
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
