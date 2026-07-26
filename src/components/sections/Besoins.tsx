import Image from 'next/image'
import { getTranslations } from 'next-intl/server'

import { Reveal } from '@/components/ui/Reveal'
import { Link } from '@/i18n/navigation'
import { CADRAGES, IMAGES } from '@/lib/images'
import { cn } from '@/lib/utils/cn'
import { ROUTES } from '@/lib/routes'

/**
 * Les quatre besoins — section 3 de l'accueil.
 *
 * Reprend la formulation du document de cadrage : « Déployer une équipe •
 * Installer un projet • Fabriquer une solution • Louer de l'équipement. »
 *
 * Grille 2 colonnes en desktop avec gap franc : les images portent désormais
 * la charge visuelle, l'effet « joint » à 2px les aurait collées les unes aux
 * autres sans respiration.
 */
export async function Besoins() {
  const t = await getTranslations('Home.besoins')

  /**
   * Les photos 01 et 02 sont des contre-jours de fin de journée : leur ciel
   * ambré très saturé entrait en concurrence avec le bleu accent du site.
   * La désaturation conserve les silhouettes et la profondeur, mais ramène la
   * dominante orange au niveau des autres visuels.
   *
   * 03 et 04 n'en ont pas besoin : leur ambre vient d'une source ponctuelle
   * (étincelles, feux de camion) sur fond noir, sans aplat coloré.
   */
  const FILTRE_AMBRE = { filter: 'saturate(0.5) contrast(1.1) brightness(0.9)' }

  const besoins = [
    {
      cle: 'deployer',
      numero: '01',
      href: ROUTES.operations,
      src: IMAGES.besoinDeployer,
      cadrage: CADRAGES.besoinDeployer,
      style: FILTRE_AMBRE,
    },
    {
      cle: 'installer',
      numero: '02',
      href: ROUTES.installations,
      src: IMAGES.besoinInstaller,
      cadrage: CADRAGES.besoinInstaller,
      style: FILTRE_AMBRE,
    },
    {
      cle: 'fabriquer',
      numero: '03',
      href: ROUTES.lab,
      src: IMAGES.besoinFabriquer,
      cadrage: 'object-center',
      style: undefined,
    },
    {
      cle: 'louer',
      numero: '04',
      href: ROUTES.location,
      src: IMAGES.besoinLouer,
      cadrage: 'object-center',
      style: undefined,
    },
  ] as const

  return (
    <section className="bg-ko-white py-16 lg:py-28">
      <div className="mx-auto max-w-container px-6 lg:px-12">
        <Reveal>
          <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
            <div>
              <p className="label-mono">{t('label')}</p>
              <h2 className="ko-h2 mt-5 max-w-[20ch] text-ko-ink">{t('title')}</h2>
            </div>

            <p className="max-w-[34ch] text-sm leading-relaxed text-ko-muted lg:pb-2 lg:text-right">
              {t('note')}
            </p>
          </header>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2">
          {besoins.map(({ cle, numero, href, src, cadrage, style }) => (
            <Reveal key={cle}>
              <Link href={href} className="group block">
                {/* overflow-hidden sur le parent : c'est lui qui contient le
                    zoom de l'image, sinon le débordement casserait la grille. */}
                <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-ko-cream2">
                  {/*
                    ⚠️ TEMPORAIRE — remplacer par photo KO-LAB 2025-2026
                    Voir skill 22 pour les critères de remplacement.
                  */}
                  <Image
                    src={src}
                    alt=""
                    fill
                    quality={80}
                    sizes="(max-width: 768px) 100vw, 50vw"
                    style={style}
                    className={cn(
                      'object-cover transition-transform duration-[400ms] group-hover:scale-[1.03]',
                      // Deux des photos sont verticales : sans recentrage, le
                      // recadrage 16/9 couperait les silhouettes.
                      cadrage,
                    )}
                  />
                </div>

                <p className="label-mono mt-5 text-xs">{numero}</p>

                <h3 className="mt-2 font-serif text-[22px] leading-tight text-ko-ink">
                  {t(`${cle}_titre`)}
                </h3>

                <p className="mt-2 max-w-[46ch] text-sm leading-relaxed text-ko-muted">
                  {t(`${cle}_texte`)}
                </p>

                <span className="mt-4 inline-flex items-center gap-2 border-b border-ko-accent/30 pb-0.5 text-sm text-ko-blue transition-[gap,border-color] duration-200 group-hover:gap-3.5 group-hover:border-ko-accent">
                  {t('en_savoir_plus')}
                  <span aria-hidden="true">→</span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
