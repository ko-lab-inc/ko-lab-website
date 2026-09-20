import { getTranslations } from 'next-intl/server'

import { Reveal } from '@/components/ui/Reveal'

/**
 * Les quatre capacités du LAB — page Le LAB, juste après l'intro.
 *
 * Révision du 20 septembre 2026, §8.1 : « Le LAB ne doit plus être perçu
 * comme une liste de machines. » Ce bloc arrive donc AVANT les technologies
 * (TechnologiesLab, plus bas dans la page) et dit ce que le LAB résout, pas
 * avec quoi.
 *
 * Forme : une liste de quatre entrées numérotées séparées par des filets —
 * le vocabulaire des listes du site (voir PageCapacite, Lab.tsx). Pas une
 * grille de quatre cartes identiques : le §18 demande explicitement d'éviter
 * « l'effet SaaS / grille de cartes répétitives ».
 */
const CAPACITES = ['capacite_1', 'capacite_2', 'capacite_3', 'capacite_4'] as const

export async function CapacitesLab() {
  const t = await getTranslations('Capacites.lab')

  return (
    <section className="border-t border-ko-line bg-ko-cream py-16 lg:py-24">
      <div className="mx-auto max-w-container px-6 lg:px-16">
        <Reveal>
          <p className="label-mono">{t('capacites_label')}</p>
          <h2 className="ko-h2 mt-5 max-w-[24ch] text-ko-ink">{t('capacites_titre')}</h2>
        </Reveal>

        <Reveal groupe>
          <dl className="mt-12 border-t border-ko-line">
            {CAPACITES.map((cle, i) => (
              <div
                key={cle}
                className="cascade-item grid grid-cols-1 gap-2 border-b border-ko-line py-7 lg:grid-cols-[4rem_minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-baseline lg:gap-8 lg:py-9"
                style={{ '--delai': `${i * 80}ms` } as React.CSSProperties}
              >
                <span aria-hidden="true" className="label-mono text-ko-muted">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <dt className="font-serif text-[22px] leading-tight text-ko-ink lg:text-[26px]">
                  {t(`${cle}_titre`)}
                </dt>
                <dd className="max-w-[46ch] text-base leading-relaxed text-ko-muted">
                  {t(`${cle}_texte`)}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  )
}
