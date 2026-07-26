import { getTranslations } from 'next-intl/server'

import { Reveal } from '@/components/ui/Reveal'

/**
 * Écosystème KO-LAB — section sombre, 4 partenaires.
 *
 * Le document de cadrage est explicite : ces entreprises « ne doivent pas
 * alourdir le menu principal », elles apparaissent vers le bas de l'accueil
 * pour démontrer la portée du réseau.
 *
 * Grille à `gap-px` sur fond ko-line-d : l'effet « joint » du skill 08, ici
 * en version sombre — ce sont les interstices qui dessinent les filets.
 */
export async function Ecosysteme() {
  const t = await getTranslations('Home.ecosysteme')

  const partenaires = ['turbo', 'spartan', 'emu', 'vip'] as const

  return (
    <section className="bg-ko-black py-16 lg:py-28">
      <div className="mx-auto max-w-container px-6 lg:px-12">
        <Reveal>
          <header className="max-w-[46ch]">
            <p className="label-mono label-mono-d">{t('label')}</p>
            <h2 className="ko-h2 mt-5 text-ko-white">{t('title')}</h2>
          </header>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-px bg-ko-line-d sm:grid-cols-2 lg:grid-cols-4">
          {partenaires.map((cle) => (
            <Reveal key={cle} className="bg-ko-black">
              {/* min-h + flex-col : les noms s'alignent en bas quelle que soit
                  la longueur de la description au-dessus. */}
              <div className="flex min-h-[200px] flex-col p-8 transition-colors duration-250 hover:bg-ko-ink">
                {/* Tag propre à chaque partenaire. Répéter « Écosystème KO-LAB »
                    sur les quatre cellules n'apportait aucune information et
                    faisait de la ligne un simple motif décoratif — ce que le
                    skill 08 proscrit. Le métier, lui, situe le partenaire. */}
                <p className="label-mono label-mono-d">{t(`${cle}_tag`)}</p>

                <h3 className="mt-auto pt-8 font-serif text-[20px] leading-tight text-ko-white">
                  {t(`${cle}_nom`)}
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-ko-frost/50">{t(`${cle}_role`)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
