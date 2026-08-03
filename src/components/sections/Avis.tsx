import { getTranslations } from 'next-intl/server'

import { IconeEtoile, IconeProfil } from '@/components/ui/Icones'
import { Reveal } from '@/components/ui/Reveal'

/**
 * Avis clients — accueil, entre l'écosystème (sombre) et les offres (crème).
 *
 * Contenu volontairement générique — voir `avis_1_*`, `avis_2_*`, `avis_3_*`
 * dans les traductions. Aucun vrai nom, citation ou entreprise n'est inventé :
 * un faux témoignage attribué à un client fictif serait trompeur une fois en
 * ligne, contrairement à une photo de chantier générique. Christian fournira
 * les vrais avis à coder en dur par-dessus cette structure.
 *
 * Pas d'avatar en cercle ni de guillemets géants stylisés : le skill 08 les
 * interdit nommément pour les témoignages. À la place, un carré bordé avec
 * l'icône de profil — même vocabulaire que le reste du design system.
 */
export async function Avis() {
  const t = await getTranslations('Home.avis')

  const avis = [{ cle: 'avis_1' }, { cle: 'avis_2' }, { cle: 'avis_3' }] as const

  return (
    <section className="bg-ko-white py-16 lg:py-28">
      <div className="mx-auto max-w-container px-6 lg:px-12">
        <Reveal>
          <p className="label-mono">{t('label')}</p>
          <h2 className="ko-h2 mt-5 max-w-[20ch] text-ko-ink">{t('title')}</h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {avis.map(({ cle }) => (
            <Reveal key={cle}>
              <div className="flex h-full flex-col border border-ko-line bg-ko-cream p-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-ko-line bg-ko-white">
                    <IconeProfil taille={20} className="text-ko-blue" />
                  </div>

                  <div>
                    <p className="font-serif text-base leading-tight text-ko-ink">
                      {t(`${cle}_nom`)}
                    </p>
                    <p className="label-mono text-[10px]">{t(`${cle}_role`)}</p>
                  </div>
                </div>

                <div className="mt-5 flex gap-1" aria-label={t('etoiles_aria')}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <IconeEtoile key={i} taille={14} className="text-ko-blue" />
                  ))}
                </div>

                <p className="mt-4 text-sm leading-relaxed text-ko-muted">
                  {t(`${cle}_texte`)}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
