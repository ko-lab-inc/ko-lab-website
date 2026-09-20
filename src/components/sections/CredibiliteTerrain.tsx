import Image from 'next/image'
import { getTranslations } from 'next-intl/server'

import { Parallax } from '@/components/ui/Parallax'
import { Reveal } from '@/components/ui/Reveal'
import { FILTRE_TERRAIN, IMAGES } from '@/lib/images'

/**
 * Crédibilité terrain — section 3 de l'accueil (Phase 5).
 *
 * Fusion de StatsBar.tsx et de l'ancienne PreuveTerrain.tsx : le document de
 * cadrage veut UNE seule preuve (20 000+ heures), pas quatre chiffres étalés
 * sur deux sections consécutives. Les trois autres stats (disciplines, sites,
 * mandats) ne disparaissent pas du site — elles restent dans la carte du hero
 * et reviennent, une à une et là où elles ont un sens, dans les sections 4/7
 * (voir OperationsTerrain.tsx).
 *
 * Le chiffre est rendu tel quel, jamais animé : le skill 08 interdit
 * explicitement le compteur au chargement.
 *
 * Révision « Priorité Location » de Joe, §10 (lot 2, 17 septembre 2026) :
 * nouveau titre, chiffre reformulé, et cinq mentions éditoriales SANS
 * compteur ni chiffre (`mentions`, une seule ligne à points médians, dans le
 * paragraphe qui portait `phrase` — aucun bloc ajouté). Le libellé du
 * chiffre a sa propre clé, `chiffre_label` : Home.stats.heures_label est
 * aussi lu par le hero et /a-propos, qui ne changent pas. La VALEUR reste
 * lue dans Home.stats, source unique du « 20 000+ ». `phrase` et `detail`
 * restent dans messages/*.json, inutilisées — masquer, jamais supprimer
 * (règle de Joe). Les mentions séparent leurs mots par des espaces
 * insécables : une ligne ne se coupe qu'après un point médian, jamais au
 * milieu d'une mention.
 */
export async function CredibiliteTerrain() {
  const t = await getTranslations('Home.credibilite')
  const tAlt = await getTranslations('Alt')
  const tStats = await getTranslations('Home.stats')

  return (
    // vague-haut : le haut de la section ondule et monte dans Le LAB
    // (globals.css). EXCEPTION ASSUMÉE au skill 08 (« ondulations / vagues
    // SVG décoratives » interdites) : demandée explicitement par le
    // propriétaire, maquette à l'appui, après rappel de la règle. Une seule
    // sur le site ; ne pas l'étendre sans nouvelle demande.
    <section className="vague-haut relative overflow-hidden bg-ko-black">
      {/*
        Photo réelle depuis le 20 août 2026 (structureEclairee2024, dôme
        gonflable éclairé de nuit) — ne reprend plus l'image du hero : elle y
        apparaissait déjà, plus dans deux pages capacités (revue visuelle,
        point 1). Section 3 de l'accueil, deux sections sous le hero :
        priorité absolue pour une photo distincte, voir images.ts.
      */}
      <Parallax distance={0} zoom={0.1} mode="traversee" className="absolute inset-0">
        <Image
          src={IMAGES.preuveTerrain}
          // alt descriptif : voir Hero.tsx (§19.2).
          alt={tAlt('preuve_terrain')}
          fill
          quality={80}
          sizes="100vw"
          style={FILTRE_TERRAIN}
          className="object-cover object-center"
        />
      </Parallax>

      {/* Voile dégradé (19 septembre 2026, « réduis l'assombrissement ») :
          30 % en haut, sous la vague — la photo s'y voit —, 60 % dès 30 % de la hauteur, 70 % en bas, où sont les
          textes. Mesuré autour des lettres, FR/EN, 1440/390 : tous au-dessus
          du seuil ; un voile uniforme à 55 % faisait déjà tomber le libellé
          du chiffre à 4,48:1 en mobile. */}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-ko-scrim/30 via-ko-scrim/60 via-30% to-ko-scrim/70" />

      <div className="relative z-10 mx-auto max-w-container px-6 py-24 text-center lg:px-16 lg:py-36">
        <Reveal>
          <p className="label-mono label-mono-d">{t('label')}</p>

          {/* Titre du document de cadrage — direction « typographie nettement
              plus grande » : plus large que ko-h1 (58px max), à la mesure
              d'une section qui porte maintenant le titre ET le chiffre. */}
          <h2 className="mx-auto mt-6 max-w-[20ch] font-serif text-[clamp(34px,5vw,64px)] font-light leading-[1.06] tracking-[-0.02em] text-ko-white">
            {t('title')}
          </h2>

          <p className="mt-10 font-serif text-[clamp(90px,13vw,200px)] font-light leading-[0.85] tracking-[-0.03em] text-ko-white">
            {/* Le « + » en bleu : il porte l'idée d'« au-delà », c'est le seul
                endroit du chiffre qui mérite l'accent. */}
            {tStats('heures_valeur').replace('+', '')}
            <span className="text-ko-blue">+</span>
          </p>
          {/* Libellé du chiffre, élargi par le §10 — deux corrections mesurées :
              1. Pastille (bg-ko-scrim/60 + backdrop-blur), même règle que le
                 label de OperationsTerrain.tsx. Plus large, le libellé en
                 bleu-2 nu sur la photo voilée tombait à 4,17:1 à 1440 et
                 3,27:1 à 390 (pire pixel, fond mesuré texte masqué ; 5,53 et
                 3,97:1 avec l'ancien libellé, en production).
              2. Marge : la queue de la virgule de « 20,000+ » descend sous
                 la ligne du chiffre (leading-[0.85]) et touchait le libellé
                 (0 px à 1280 et 1440 avec mt-3). Seul l'anglais a une
                 virgule : [&:lang(en)] lui donne 8 px de plus que le
                 français, qui garde mt-3 lg:mt-5 — le chiffre ne s'éloigne
                 pas de son libellé là où rien ne l'exige. */}
          <p className="label-mono label-mono-d mx-auto mt-3 w-fit rounded bg-ko-scrim/60 px-3 py-1.5 backdrop-blur-sm lg:mt-5 [&:lang(en)]:mt-5 lg:[&:lang(en)]:mt-7">
            {t('chiffre_label')}
          </p>

          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-ko-frost/70">
            {t('mentions')}
          </p>
        </Reveal>
      </div>
    </section>
  )
}
