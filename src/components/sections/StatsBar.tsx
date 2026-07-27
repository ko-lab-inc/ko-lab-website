import { getTranslations } from 'next-intl/server'

import {
  IconeHexagone,
  IconeHorloge,
  IconeInstitution,
  IconePin,
} from '@/components/ui/Icones'
import { Reveal } from '@/components/ui/Reveal'
import { cn } from '@/lib/utils/cn'

import type { CSSProperties } from 'react'

/**
 * Stats bar — section 2 de l'accueil.
 *
 * Fond sombre (--ko-black) en rupture immédiate après le hero clair : c'est
 * l'alternance imposée par CLAUDE.md, et le contraste qui donne du poids
 * à la preuve terrain.
 *
 * Aucun compteur animé au chargement : explicitement interdit par le skill 08.
 * Les chiffres sont là dès le premier rendu.
 */
export async function StatsBar() {
  const t = await getTranslations('Home.stats')

  // Ordre du document de cadrage : heures, disciplines, sites, mandats.
  const stats = [
    { cle: 'heures', Icone: IconeHorloge, valeur: t('heures_valeur'), label: t('heures_label') },
    {
      cle: 'disciplines',
      Icone: IconeHexagone,
      valeur: t('disciplines_valeur'),
      label: t('disciplines_label'),
    },
    { cle: 'sites', Icone: IconePin, valeur: t('sites_valeur'), label: t('sites_label') },
    {
      cle: 'mandats',
      Icone: IconeInstitution,
      valeur: t('mandats_valeur'),
      label: t('mandats_label'),
    },
  ]

  return (
    <section aria-label={t('label')} className="bg-ko-black">
      <div className="mx-auto max-w-container px-6 lg:px-12">
        {/* Un SEUL observateur porté par la grille, les quatre cellules
            s'échelonnent par --delai. Quatre Reveal individuels auraient créé
            quatre observateurs et rendu la cascade dépendante de l'ordre
            d'intersection plutôt que d'un délai maîtrisé. */}
        <Reveal groupe className="grid grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <div
              key={stat.cle}
              style={{ '--delai': `${i * 150}ms` } as CSSProperties}
              className={cn(
                'cascade-stat',
                'border-ko-line-d px-4 py-10 lg:px-8 lg:py-14',
                // Filets de séparation. Calculés par index plutôt qu'avec
                // `divide-x` : en grille multi-lignes, divide-x borde aussi le
                // premier élément de la 2ᵉ rangée, ce qui produit un trait
                // flottant en bord de colonne.
                //
                // Mobile (2 colonnes) : filet à gauche des indices impairs.
                i % 2 === 1 && 'border-l',
                // Desktop (4 colonnes) : filet à gauche de tous sauf le premier.
                i > 0 && 'lg:border-l',
                // Mobile : filet horizontal entre les deux rangées.
                i >= 2 && 'border-t lg:border-t-0',
              )}
            >
              {/*
                28px en mobile plutôt que 34px : à 375px en deux colonnes, la
                cellule offre ~131px utiles et « 20 000+ » en Fraunces 34px
                déborde. Le 34px demandé est conservé à partir de lg.
              */}
              {/* ko-blue2 et non ko-blue : sur --ko-black, le bleu principal
                  plafonne à 4.47:1. `--ko-blue-mid` n'existe pas dans la
                  palette. items-center aligne l'icône sur la ligne de base
                  optique du chiffre, pas sur sa boîte. */}
              <div className="flex items-center gap-3">
                <stat.Icone taille={20} className="text-ko-blue2" />

                <p className="font-serif text-[28px] font-light leading-none text-ko-white lg:text-[34px]">
                  {stat.valeur}
                </p>
              </div>

              {/*
                Label en --ko-muted-d et non en .label-mono : le bleu accent
                plafonne à 4.47:1 sur fond noir, sous le seuil AA de 4.5:1 pour
                du 11px. --ko-muted-d atteint 8.85:1.
              */}
              <p className="mt-3 font-mono text-[11px] uppercase leading-relaxed tracking-[0.14em] text-ko-muted-d">
                {stat.label}
              </p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
