import { getTranslations } from 'next-intl/server'

import {
  IconeCiseaux,
  IconeCle,
  IconeImprimante,
  IconeManette,
} from '@/components/ui/Icones'
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

  // GM Locations n'a pas de cellule ici : le document de cadrage en fait un
  // partenaire stratégique EXTERNE, présenté dans la section Équipements.
  const partenaires = [
    { cle: 'turbo', Icone: IconeImprimante },
    { cle: 'spartan', Icone: IconeCiseaux },
    { cle: 'emu', Icone: IconeManette },
    { cle: 'vip', Icone: IconeCle },
  ] as const

  return (
    <section className="bg-ko-black py-16 lg:py-28">
      <div className="mx-auto max-w-container px-6 lg:px-16">
        <Reveal>
          {/* Révision « Priorité Location » de Joe, §18 (lot 2, 17 septembre
              2026) : le H2 et son texte de soutien tiennent dans les DEUX
              champs existants, sans troisième bloc. Le <p> qui portait
              l'étiquette « Écosystème KO-LAB » porte désormais le soutien,
              sous le titre, au style du soutien de OperationsTerrain.tsx —
              la clé `label` reste dans messages/*.json, masquée, jamais
              supprimée (règle de Joe). Mots de chaque phrase du titre liés
              par des espaces insécables : il ne se coupe qu'entre ses deux
              phrases, jamais dans « Toutes les / ressources ». */}
          <header className="max-w-[46ch]">
            <h2 className="ko-h2 text-ko-white">{t('title')}</h2>
            <p className="mt-6 text-base leading-relaxed text-ko-frost/70 lg:text-lg">{t('soutien')}</p>
          </header>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-px bg-ko-line-d sm:grid-cols-2 lg:grid-cols-4">
          {partenaires.map(({ cle, Icone }) => (
            <Reveal key={cle} className="bg-ko-black">
              {/* min-h + flex-col : les noms s'alignent en bas quelle que soit
                  la longueur de la description au-dessus. */}
              {/* Survol : voile blanc à 5 %, et non hover:bg-ko-ink — la couche
                  sombre passe .hover:bg-ko-ink:hover en BLANC (règle des boutons),
                  et le titre et la description, blancs, disparaissaient au survol
                  (et au défilement, le curseur restant sur une carte). ko-frost/5
                  n’est pas remappé : même relief discret dans les deux thèmes. */}
              <div className="flex min-h-[200px] flex-col p-8 transition-colors duration-250 hover:bg-ko-frost/5">
                {/* Tag propre à chaque partenaire. Répéter « Écosystème KO-LAB »
                    sur les quatre cellules n'apportait aucune information et
                    faisait de la ligne un simple motif décoratif — ce que le
                    skill 08 proscrit. Le métier, lui, situe le partenaire. */}
                {/* ko-blue2 sur fond sombre — variante d'état, voir la note de StatsBar. */}
                <Icone taille={24} className="mb-5 text-ko-blue2" />

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
