import { getTranslations } from 'next-intl/server'

import { Reveal } from '@/components/ui/Reveal'
import { buttonVariants } from '@/components/ui/Button'
import { Link } from '@/i18n/navigation'
import { ROUTES_CAPACITES, ROUTES } from '@/lib/routes'

/**
 * Capacités — section 4 de l'accueil, « liste éditoriale animée » (skill 19).
 *
 * Fond --ko-cream : section claire secondaire, en alternance après le blanc
 * des besoins (CLAUDE.md).
 *
 * Colonne gauche collante en desktop : le titre reste à l'écran pendant qu'on
 * parcourt les quatre capacités. Désactivée sous lg — un bloc collant sur un
 * écran de 375px mangerait la moitié de la hauteur utile (skill 11).
 */
export async function Capacites() {
  const t = await getTranslations('Home.capacites')
  const tCap = await getTranslations('Capacites')

  return (
    <section className="bg-ko-cream py-16 lg:py-28">
      <div className="mx-auto max-w-container px-6 lg:px-12">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
          {/* ------------------------------ Gauche ------------------------------ */}
          <Reveal>
            <div className="lg:sticky lg:top-28">
              <p className="label-mono">{t('label')}</p>

              <h2 className="ko-h2 mt-5 max-w-[16ch] text-ko-ink">{t('title')}</h2>

              <p className="mt-7 max-w-[44ch] text-base leading-relaxed text-ko-muted">
                {t('texte')}
              </p>

              <Link
                href={ROUTES.capacites}
                className={`mt-9 ${buttonVariants({ variant: 'text' })}`}
              >
                {t('lien')}
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </Reveal>

          {/* ------------------------------- Liste ------------------------------ */}
          <Reveal>
            {/* divide-y est sûr ici : liste à une seule colonne, contrairement
                à la grille multi-rangées de StatsBar. */}
            <ul className="divide-y divide-ko-line border-y border-ko-line">
              {ROUTES_CAPACITES.map(({ key, href }, i) => (
                <li key={key}>
                  {/*
                    `group` permet à la flèche de réagir au survol de toute la
                    ligne. Effet « avance » du skill 20 : padding-left +16px
                    en 250ms, plus un fond blanc — la section étant crème, le
                    blanc est le pas « +10% de luminosité » du skill 08.
                  */}
                  <Link
                    href={href}
                    className="group flex items-center gap-6 py-7 transition-[padding-left,background-color] duration-250 hover:bg-ko-white hover:pl-4"
                  >
                    <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ko-muted">
                      {String(i + 1).padStart(2, '0')}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block font-serif text-[24px] leading-tight text-ko-ink">
                        {tCap(`${key}.label`)}
                      </span>

                      {/* Description masquée en mobile — skill 11 : la liste
                          doit rester scannable au pouce. */}
                      <span className="mt-2 hidden max-w-[52ch] text-sm leading-relaxed text-ko-muted md:block">
                        {tCap(`${key}.intro`)}
                      </span>
                    </span>

                    {/*
                      Flèche ronde 40px — skill 20. Contour bleu au repos,
                      remplissage bleu au survol. Pas d'icône importée : un
                      simple caractère, conformément au skill 08.
                      shrink-0 : sinon le cercle s'aplatit quand le texte est long.
                    */}
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ko-blue text-sm text-ko-blue transition-colors duration-200 group-hover:bg-ko-blue group-hover:text-ko-black"
                    >
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
