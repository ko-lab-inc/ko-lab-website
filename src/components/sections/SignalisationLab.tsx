import { getTranslations } from 'next-intl/server'

import { Reveal } from '@/components/ui/Reveal'

/**
 * Signalisation & affichage architectural — page Le LAB.
 *
 * Révision du 20 septembre 2026, §8.2 : bloc dédié, demandé parce que
 * « les gens ne pensent pas toujours à KO-LAB pour ce type de mandat, alors
 * que le volume peut être très important dans une tour résidentielle ».
 * Le message à faire passer est le PROGRAMME complet d'un bâtiment, pas
 * l'enseigne à l'unité — d'où la chute en bas de bloc.
 *
 * Fond sombre au milieu d'une page claire : c'est le seul bloc de la page
 * qui change de registre, ce qui le détache sans ajouter de décor.
 */
const POINTS = [
  'signalisation_1',
  'signalisation_2',
  'signalisation_3',
  'signalisation_4',
  'signalisation_5',
  'signalisation_6',
] as const

export async function SignalisationLab() {
  const t = await getTranslations('Capacites.lab')

  return (
    <section className="bg-ko-black py-16 lg:py-28">
      <div className="mx-auto max-w-container px-6 lg:px-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-20">
          <Reveal>
            <p className="label-mono label-mono-d">{t('signalisation_label')}</p>
            <h2 className="mt-5 max-w-[20ch] font-serif text-[clamp(28px,3.4vw,44px)] font-light leading-[1.08] tracking-[-0.02em] text-ko-white">
              {t('signalisation_titre')}
            </h2>
            <p className="mt-6 max-w-[52ch] text-base leading-relaxed text-ko-frost/70">
              {t('signalisation_texte')}
            </p>
          </Reveal>

          <Reveal groupe>
            {/* Deux colonnes dès sm : six lignes courtes en une seule colonne
                laissaient une demi-page vide à droite sur ordinateur. */}
            <ul className="grid grid-cols-1 gap-x-10 border-t border-ko-line-d sm:grid-cols-2 lg:mt-1">
              {POINTS.map((cle, i) => (
                <li
                  key={cle}
                  className="cascade-item flex gap-4 border-b border-ko-line-d py-4 text-base leading-relaxed text-ko-white"
                  style={{ '--delai': `${i * 60}ms` } as React.CSSProperties}
                >
                  <span aria-hidden="true" className="text-ko-blue">
                    —
                  </span>
                  <span>{t(cle)}</span>
                </li>
              ))}
            </ul>

            <p className="mt-8 max-w-[46ch] font-serif text-[20px] font-light leading-snug text-ko-white lg:text-[24px]">
              {t('signalisation_chute')}
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
