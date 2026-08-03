import { getTranslations } from 'next-intl/server'

import { IconeBadgeOfficiel, IconeProfil } from '@/components/ui/Icones'
import { Reveal } from '@/components/ui/Reveal'

/**
 * Avis clients — accueil, entre l'écosystème (sombre) et les offres (crème).
 *
 * Trois vrais mandats (PCH — Fête du Canada et Bal de Neige, Bluesfest,
 * Devcore — DevFest Cornwall), tous confirmés par Christian. Pas de citation
 * mise dans la bouche du client : aucun des trois n'a fourni de phrase écrite
 * exacte, seulement un bon retour informel. Attribuer une citation inventée à
 * une vraie organisation identifiable serait trompeur d'une façon différente
 * — mais tout aussi réelle — qu'un faux client fictif. D'où un texte factuel
 * à la 3e personne plutôt qu'un guillemet, et un badge « mandat confirmé »
 * plutôt qu'une note en étoiles jamais donnée par ces clients.
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

                <div className="mt-5 flex items-center gap-2">
                  <IconeBadgeOfficiel taille={14} className="text-ko-blue" />
                  <p className="label-mono text-[10px]">{t('mandat_confirme')}</p>
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
