import Image from 'next/image'
import { getTranslations } from 'next-intl/server'

import {
  IconeCamion,
  IconeEquipe,
  IconeGrue,
  IconePuce,
} from '@/components/ui/Icones'
import { Reveal } from '@/components/ui/Reveal'
import { Link } from '@/i18n/navigation'
import { CADRAGES, FILTRE_TERRAIN, FILTRE_TERRAIN_CHAUD, IMAGES } from '@/lib/images'
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
   * Seule 01 (besoinDeployer, encore Unsplash) reste un contre-jour de fin de
   * journée : son ciel ambré très saturé entrait en concurrence avec le bleu
   * accent du site. FILTRE_TERRAIN_CHAUD (images.ts) conserve les silhouettes
   * et la profondeur, mais ramène la dominante orange au niveau des autres
   * visuels.
   *
   * 02, 03 et 04 sont des photos réelles KO-LAB (2025-2026) sans ciel doré à
   * corriger — 02 est un jour nuageux, 03 et 04 des scènes d'atelier/de site
   * sur fond neutre. Toutes reçoivent FILTRE_TERRAIN — jamais `undefined` —
   * pour partager le même socle colorimétrique que le reste du site.
   */
  const besoins = [
    {
      cle: 'deployer',
      numero: '01',
      href: ROUTES.operations,
      Icone: IconeEquipe,
      src: IMAGES.besoinDeployer,
      cadrage: CADRAGES.besoinDeployer,
      style: FILTRE_TERRAIN_CHAUD,
    },
    {
      cle: 'installer',
      numero: '02',
      href: ROUTES.installations,
      Icone: IconeGrue,
      src: IMAGES.besoinInstaller,
      cadrage: CADRAGES.besoinInstaller,
      // Photo réelle (Canada Day 2026) — jour nuageux, pas le contre-jour doré
      // de l'ex-photo Unsplash. FILTRE_TERRAIN_CHAUD assombrissait et
      // désaturait pour compenser un ciel ambré qui n'existe plus ici ; le
      // socle FILTRE_TERRAIN suffit, comme 03 et 04.
      style: FILTRE_TERRAIN,
    },
    {
      cle: 'fabriquer',
      numero: '03',
      href: ROUTES.lab,
      Icone: IconePuce,
      // Imprimante 3D plutôt que les étincelles de meuleuse : « Fabriquer une
      // solution » renvoie au LAB, dont l'impression 3D est l'activité phare.
      // Les étincelles restent dans images.ts sous besoinFabriquer, le soudeur
      // sous soudeur — tous deux disponibles pour d'autres pages.
      src: IMAGES.labImpression3d,
      cadrage: 'object-center',
      style: FILTRE_TERRAIN,
    },
    {
      cle: 'louer',
      numero: '04',
      href: ROUTES.location,
      Icone: IconeCamion,
      src: IMAGES.besoinLouer,
      cadrage: 'object-center',
      style: FILTRE_TERRAIN,
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
          {besoins.map(({ cle, numero, href, Icone, src, cadrage, style }, i) => (
            <Reveal key={cle}>
              {/* `-m-3 p-3` : marge négative compensée par un padding égal —
                  la mise en page ne bouge pas d'un pixel, mais le fond au
                  survol dispose de 12px de respiration autour de la carte.
                  Sans ça, un changement de fond sur un bloc sans padding se
                  résume à un rectangle collé au texte. */}
              <Link
                href={href}
                className="group -m-3 block rounded-2xl p-3 transition-colors duration-250 hover:bg-ko-cream"
              >
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
                    // À 375px, la grille passe en une colonne : cette première
                    // carte remonte juste sous le hero et Next la détecte comme
                    // élément LCP. Sans priorité elle est chargée en différé,
                    // ce qui retarde directement la mesure sur mobile.
                    priority={i === 0}
                    quality={80}
                    sizes="(max-width: 768px) 100vw, 50vw"
                    style={style}
                    className={cn(
                      'object-cover transition-transform duration-[400ms] group-hover:scale-[1.05]',
                      // Deux des photos sont verticales : sans recentrage, le
                      // recadrage 16/9 couperait les silhouettes.
                      cadrage,
                    )}
                  />
                </div>

                {/* L'icône accompagne le titre, elle ne le remplace pas —
                    d'où aria-hidden dans le composant. `rotate` au survol :
                    animation E. */}
                <Icone
                  taille={24}
                  className="mt-5 text-ko-blue transition-transform duration-300 group-hover:rotate-[5deg]"
                />

                {/*
                  Numéro agrandi — direction « écritures plus grosses » : un
                  filigrane serif pâle, même vocabulaire que le « 01 » du hero
                  et les numero-slide des pages de capacités, pas un décompte
                  à annoncer : le lien et le titre suffisent à décrire la
                  destination. -4px au survol conservé (animation E).
                */}
                <p
                  aria-hidden="true"
                  className="mt-3 select-none font-serif text-[56px] font-light leading-none text-ko-cream2 transition-transform duration-200 group-hover:-translate-y-1"
                >
                  {numero}
                </p>

                <h3 className="mt-3 font-serif text-[22px] leading-tight text-ko-ink">
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
