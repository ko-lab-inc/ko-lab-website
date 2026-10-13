import { hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { AnneauSegments, ListeClassee, BarresPeriode } from '@/components/admin/Visualisations'
import {
  EnteteAdmin,
  GrilleStats,
  PanneauAdmin,
  TuileStat,
} from '@/components/layout/CadreAdmin'
import { IconeHorloge, IconeProfil, IconeTendance } from '@/components/ui/Icones'
import { routing } from '@/i18n/routing'
import { lireStatistiques } from '@/lib/analytique'

import type { Viewport } from 'next'

/**
 * THÈME SOMBRE — même marqueur que les autres écrans de l'espace équipe
 * (body:has([data-theme-sombre])). Importé ICI, pas dans le layout.
 */
import '@/styles/theme-sombre.css'

type Props = { params: Promise<{ locale: string }> }

/** Fenêtre du tableau de bord, en jours. */
const JOURS = 30

/**
 * Analytique du site — trafic capturé par nous (table evenements_visite, 0058),
 * pas par un service externe.
 *
 * RBAC assuré par le layout admin (getUser + rôle équipe). La lecture passe par
 * le client de SESSION sous RLS (dans lireStatistiques) : la policy « équipe »
 * de 0058 décide, jamais le service role pour l'affichage.
 *
 * Données anonymes et sans cookie : « visiteurs » compte des visiteurs uniques
 * par jour (hash journalier), le modèle de Plausible — d'où la précision sous
 * la tuile, pour ne pas laisser croire à un suivi individuel dans le temps.
 */

export const viewport: Viewport = {
  themeColor: '#111210',
}

/** « /fr/location » → « Mobilier » n'a pas de sens ici : on garde le chemin. */
function cap(mot: string): string {
  return mot.length === 0 ? mot : mot.charAt(0).toUpperCase() + mot.slice(1)
}

export default async function AnalytiquePage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations('Admin')
  const stats = await lireStatistiques(JOURS)

  const nf = new Intl.NumberFormat(locale === 'en' ? 'en-CA' : 'fr-CA')

  return (
    <div data-theme-sombre>
      <EnteteAdmin titre={t('analytique_titre')} intro={t('analytique_intro')} />

      {stats.pagesVues === 0 && (
        <p className="mb-8 max-w-[68ch] border-l-2 border-ko-blue pl-4 text-sm leading-relaxed text-ko-muted">
          {t('analytique_demarrage')}
        </p>
      )}

      <GrilleStats>
        <TuileStat
          libelle={t('analytique_pages_30j')}
          valeur={nf.format(stats.pagesVues)}
          Icone={IconeTendance}
        />
        <TuileStat
          libelle={t('analytique_visiteurs_30j')}
          valeur={nf.format(stats.visiteurs)}
          precision={t('analytique_visiteurs_precision')}
          Icone={IconeProfil}
        />
        <TuileStat
          libelle={t('analytique_pages_jour')}
          valeur={nf.format(stats.pagesVuesAujourdhui)}
          Icone={IconeHorloge}
        />
        <TuileStat
          libelle={t('analytique_visiteurs_jour')}
          valeur={nf.format(stats.visiteursAujourdhui)}
          accent
          Icone={IconeProfil}
        />
      </GrilleStats>

      <div className="mt-6">
        <BarresPeriode
          points={stats.serie}
          libelle={t('analytique_serie', { total: nf.format(stats.pagesVues), jours: JOURS })}
          vide={t('analytique_serie_vide')}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PanneauAdmin>
          <h2 className="label-mono mb-5 text-ko-muted">{t('analytique_bloc_pages')}</h2>
          {stats.topPages.length > 0 ? (
            <ListeClassee entrees={stats.topPages} />
          ) : (
            <p className="text-sm text-ko-muted">{t('analytique_liste_vide')}</p>
          )}
        </PanneauAdmin>

        <PanneauAdmin>
          <h2 className="label-mono mb-5 text-ko-muted">{t('analytique_bloc_provenance')}</h2>
          {stats.topReferrers.length > 0 ? (
            <ListeClassee entrees={stats.topReferrers} />
          ) : (
            <p className="text-sm text-ko-muted">{t('analytique_liste_vide')}</p>
          )}
        </PanneauAdmin>

        <PanneauAdmin>
          <h2 className="label-mono mb-5 text-ko-muted">{t('analytique_bloc_pays')}</h2>
          {stats.topPays.length > 0 ? (
            <ListeClassee entrees={stats.topPays} />
          ) : (
            <p className="text-sm text-ko-muted">{t('analytique_liste_vide')}</p>
          )}
        </PanneauAdmin>

        <PanneauAdmin>
          <h2 className="label-mono mb-5 text-ko-muted">{t('analytique_bloc_appareils')}</h2>
          <AnneauSegments
            segments={stats.appareils.map((a) => ({ libelle: cap(a.libelle), valeur: a.valeur }))}
            total={stats.appareils.reduce((s, a) => s + a.valeur, 0)}
            libelleTotal={t('analytique_appareils_total')}
            vide={t('analytique_liste_vide')}
          />
        </PanneauAdmin>
      </div>

      {stats.tronque && (
        <p className="mt-6 text-sm text-ko-muted">{t('analytique_tronque')}</p>
      )}
    </div>
  )
}
