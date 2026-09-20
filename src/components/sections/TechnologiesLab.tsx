import { getTranslations } from 'next-intl/server'

import { Reveal } from '@/components/ui/Reveal'

/**
 * Les technologies du LAB — volontairement EN BAS de la page.
 *
 * Révision du 20 septembre 2026, §8.5 : « Présenter seulement après les
 * solutions et les projets. Les technologies doivent apparaître comme
 * moyens de production. » D'où l'ordre de la page (capacités → signalisation
 * → projets → galerie → technologies → processus) et le titre, qui dit
 * explicitement le rapport de subordination.
 *
 * Les clés `item_1` à `item_10` de Capacites.lab, qui servaient l'ancienne
 * liste du haut de page, ne sont plus lues nulle part. Elles restent dans
 * messages/*.json : masquer, jamais supprimer.
 */
const TECHNOS = [
  'techno_1',
  'techno_2',
  'techno_3',
  'techno_4',
  'techno_5',
  'techno_6',
  'techno_7',
] as const

export async function TechnologiesLab() {
  const t = await getTranslations('Capacites.lab')

  return (
    <section className="border-t border-ko-line bg-ko-cream py-16 lg:py-24">
      <div className="mx-auto max-w-container px-6 lg:px-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
          <Reveal>
            <p className="label-mono">{t('technologies_label')}</p>
            <p className="ko-h3 mt-5 max-w-[26ch] text-ko-ink">{t('technologies_titre')}</p>
          </Reveal>

          <Reveal groupe>
            <ul className="grid grid-cols-1 gap-x-10 border-t border-ko-line sm:grid-cols-2">
              {TECHNOS.map((cle, i) => (
                <li
                  key={cle}
                  className="cascade-item flex gap-4 border-b border-ko-line py-4 text-base leading-relaxed text-ko-ink"
                  style={{ '--delai': `${i * 60}ms` } as React.CSSProperties}
                >
                  <span aria-hidden="true" className="text-ko-blue">
                    —
                  </span>
                  <span>{t(cle)}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
