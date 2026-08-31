import Image from 'next/image'
import { getTranslations } from 'next-intl/server'

import { buttonVariants } from '@/components/ui/Button'
import { Reveal } from '@/components/ui/Reveal'
import { Link } from '@/i18n/navigation'
import { CADRAGES, FILTRE_TERRAIN, IMAGES } from '@/lib/images'
import { cn } from '@/lib/utils/cn'
import { ROUTES } from '@/lib/routes'

/**
 * Réalisations — grille éditoriale asymétrique.
 *
 * Une grande carte à gauche (2/3) et deux petites empilées à droite (1/3) :
 * la hiérarchie visuelle évite la grille de trois vignettes identiques, qui
 * est la signature d'un template.
 *
 * ⚠️ CONTENU PROVISOIRE. Les titres sont les catégories filtrables du skill 21,
 * pas des projets réels — aucun nom n'est inventé. Ce bandeau d'accueil n'est
 * PAS branché sur Supabase (contrairement à la page /realisations, voir
 * GalerieRealisations.tsx) ; à l'arrivée des données :
 *
 *     const supabase = createStaticClient()   // JAMAIS createClient()
 *     const { data } = await supabase.from('realisations')
 *       .select('slug, titre_fr, categorie, images')
 *       .eq('publie', true).order('ordre').limit(3)
 */
export async function Realisations() {
  const t = await getTranslations('Home.realisations')
  const tFiltres = await getTranslations('Realisations')

  // La pastille porte la catégorie filtrable (skill 21), le titre décrit le
  // TYPE de projet attendu. Les trois titres différaient auparavant zéro : ils
  // affichaient tous « Réalisation à venir ».
  // Les trois cartes sont maintenant des photos réelles KO-LAB, toutes sur
  // FILTRE_TERRAIN. realisationTerrain suit toujours besoinDeployer
  // (Besoins.tsx), même photo, même filtre des deux côtés — le bug du
  // 19 août 2026 (carte orangée, « deux températures différentes » pour la
  // même photo selon la section) s'appliquait ici ; corrigé le 20 août 2026,
  // en même temps que son remplacement par une vraie photo.
  // realisationInstallation, en revanche, ne suit plus besoinInstaller depuis
  // le 20 août 2026 (revue visuelle, point 1) : cette photo apparaissait déjà
  // sur l'accueil et dans le hub /nos-capacites. Elle affiche maintenant
  // installationsGuirlandes (galerie de bureaux, décor de Noël) — une photo
  // distincte, propre à cet emplacement.
  const grande = {
    cle: 'terrain',
    tag: tFiltres('filtre_terrain'),
    titre: t('titre_terrain'),
    src: IMAGES.realisationTerrain,
    cadrage: CADRAGES.besoinDeployer,
    style: FILTRE_TERRAIN,
  }

  const petites = [
    {
      cle: 'installation',
      tag: tFiltres('filtre_installation'),
      titre: t('titre_installation'),
      alt: undefined as string | undefined,
      src: IMAGES.realisationInstallation,
      // Recadrage neutre, à revérifier par capture d'écran réelle : l'ancien
      // CADRAGES.besoinInstaller était calé sur une autre photo (Canada Day),
      // sans rapport avec installationsGuirlandes.
      cadrage: 'object-center',
      style: FILTRE_TERRAIN,
    },
    {
      cle: 'lab',
      tag: tFiltres('filtre_lab'),
      titre: t('titre_lab'),
      alt: t('alt_lab'),
      src: IMAGES.realisationLab,
      cadrage: 'object-center',
      style: FILTRE_TERRAIN,
    },
  ] as const

  return (
    <section className="bg-ko-white py-16 lg:py-28">
      <div className="mx-auto max-w-container px-6 lg:px-12">
        <Reveal>
          <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="label-mono">{t('label')}</p>
              <h2 className="ko-h2 mt-5 max-w-[18ch] text-ko-ink">{t('title')}</h2>
            </div>

            <Link
              href={ROUTES.realisations}
              className={cn('shrink-0', buttonVariants({ variant: 'text' }))}
            >
              {t('lien')}
              <span aria-hidden="true">→</span>
            </Link>
          </header>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Grande carte — 2 colonnes sur 3 */}
          <Reveal className="lg:col-span-2">
            <Carte
              tag={grande.tag}
              titre={grande.titre}
              src={grande.src}
              cadrage={grande.cadrage}
              style={grande.style}
              ratio="aspect-[3/2]"
            />
          </Reveal>

          {/* Deux petites empilées */}
          <div className="grid grid-cols-1 gap-5">
            {petites.map(({ cle, tag, titre, alt, src, cadrage, style }) => (
              <Reveal key={cle}>
                <Carte
                  tag={tag}
                  titre={titre}
                  alt={alt}
                  src={src}
                  cadrage={cadrage}
                  style={style}
                  ratio="aspect-[4/3]"
                />
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/**
 * Carte de réalisation. Pas encore cliquable : sans slug en base, un lien
 * mènerait à une 404.
 */
function Carte({
  tag,
  titre,
  alt,
  src,
  cadrage,
  style,
  ratio,
}: {
  /** Catégorie filtrable (skill 21) — affichée en pastille haut-gauche. */
  tag: string
  /** Nom du projet. Provisoirement « Réalisation à venir » : afficher de
   *  nouveau la catégorie ici ferait doublon avec la pastille. */
  titre: string
  /** Description réelle de la photo, distincte du titre — repli sur `titre`
   *  pour les cartes qui n'en ont pas encore une (voir Realisations.tsx). */
  alt?: string
  src: string
  cadrage: string
  style: { filter: string }
  ratio: string
}) {
  return (
    <article className={cn('group relative overflow-hidden rounded-xl bg-ko-cream2', ratio)}>
      {/*
        ⚠️ TEMPORAIRE — duplication en attente de la vraie photo KO-LAB 2025-2026
        Voir skill 22 pour les critères de remplacement.
      */}
      <Image
        src={src}
        alt={alt ?? titre}
        fill
        quality={80}
        sizes="(max-width: 1024px) 100vw, 66vw"
        style={style}
        className={cn(
          'object-cover transition-transform duration-[400ms] group-hover:scale-[1.01]',
          cadrage,
        )}
      />

      {/* Voile bas — lisibilité du titre. S'assombrit au survol. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-ko-scrim/80 via-ko-scrim/20 to-transparent transition-colors duration-300 group-hover:from-ko-scrim/90"
      />

      <span className="absolute left-4 top-4 rounded bg-ko-scrim/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ko-frost/90 backdrop-blur-sm">
        {tag}
      </span>

      <h3 className="absolute bottom-4 left-4 right-4 font-serif text-[20px] leading-tight text-ko-white">
        {titre}
      </h3>
    </article>
  )
}
