import Image from 'next/image'
import { getTranslations } from 'next-intl/server'

import { Reveal } from '@/components/ui/Reveal'
import { Link } from '@/i18n/navigation'
import { CADRAGES, FILTRE_TERRAIN, IMAGES } from '@/lib/images'
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
 *
 * Icônes retirées le 20 août 2026 (revue visuelle, point 6) : chacune ne
 * faisait que répéter en pictogramme ce que le titre juste en dessous dit
 * déjà en mots (Équipe → « Déployer », Grue → « Installer »...) — aucune
 * information propre, contrairement à celles d'Ecosysteme.tsx qui distinguent
 * quatre entités sans autre repère visuel.
 */
export async function Besoins() {
  const t = await getTranslations('Home.besoins')

  /**
   * Les quatre sont désormais des photos réelles KO-LAB (2024-2026), aucune
   * avec de ciel doré à corriger — 01 est un jour d'hiver couvert, 02 un jour
   * nuageux, 03 et 04 des scènes d'atelier/de site sur fond neutre. Toutes
   * reçoivent FILTRE_TERRAIN — jamais `undefined` — pour partager le même
   * socle colorimétrique que le reste du site. 01 utilisait encore
   * FILTRE_TERRAIN_CHAUD (pensé pour l'ex-silhouette Unsplash) jusqu'au
   * 20 août 2026 — corrigé au même moment que son remplacement par une photo
   * réelle, même bug que celui trouvé la veille sur Realisations.tsx.
   */
  const besoins = [
    {
      cle: 'deployer',
      numero: '01',
      href: ROUTES.operations,
      src: IMAGES.besoinDeployer,
      cadrage: CADRAGES.besoinDeployer,
      style: FILTRE_TERRAIN,
    },
    {
      cle: 'installer',
      numero: '02',
      href: ROUTES.installations,
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
      // Kiosque en bois fabriqué sur mesure (créations 2025) plutôt que
      // l'imprimante 3D depuis le 20 août 2026 — montre la fabrication ET
      // l'installation d'une pièce complète, plus proche du positionnement
      // élargi (Phase 7) qu'une seule machine en action. labImpression3d
      // reste le hero de la page Le LAB (nos-capacites/le-lab/page.tsx).
      // besoinFabriquer (impression 3D, pièce dorée) sert désormais IMAGES.lab
      // (section LAB de l'accueil) depuis le même jour ; le soudeur reste sous
      // soudeur, toujours disponible.
      src: IMAGES.besoinFabriquerKiosque2025,
      cadrage: 'object-center',
      style: FILTRE_TERRAIN,
    },
    {
      cle: 'louer',
      numero: '04',
      href: ROUTES.location,
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
          {besoins.map(({ cle, numero, href, src, cadrage, style }) => (
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
                    Photo réelle depuis le 20 août 2026 (les quatre le sont).
                  */}
                  <Image
                    src={src}
                    alt=""
                    fill
                    // `priority` retirée le 20 août 2026 (Phase 10, étape 2) :
                    // le hero (Hero.tsx) reste l'élément LCP mesuré même avec
                    // cette carte en priorité — vérifié par Lighthouse mobile,
                    // pas supposé. Les deux préchargements se disputaient la
                    // bande passante mobile pour rien ; la cible du chantier
                    // est un seul média préchargé (le hero), voir CLAUDE.md.
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

                {/*
                  Numéro agrandi — direction « écritures plus grosses » : un
                  filigrane serif pâle, même vocabulaire que le « 01 » du hero
                  et les numero-slide des pages de capacités, pas un décompte
                  à annoncer : le lien et le titre suffisent à décrire la
                  destination. -4px au survol conservé (animation E).
                */}
                <p
                  aria-hidden="true"
                  className="mt-6 select-none font-serif text-[56px] font-light leading-none text-ko-cream2 transition-transform duration-200 group-hover:-translate-y-1"
                >
                  {numero}
                </p>

                <h3 className="mt-3 font-serif text-[22px] leading-tight text-ko-ink">
                  {t(`${cle}_titre`)}
                </h3>

                <p className="mt-2 max-w-[46ch] text-sm leading-relaxed text-ko-muted">
                  {t(`${cle}_texte`)}
                </p>

                <span className="mt-4 inline-flex items-center gap-2 border-b border-ko-accent/30 pb-0.5 text-sm text-ko-ink transition-[gap,border-color] duration-200 group-hover:gap-3.5 group-hover:border-ko-accent">
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
