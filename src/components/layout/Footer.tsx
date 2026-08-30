import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import { lireReglages } from '@/lib/reglages'
import { ROUTES, ROUTES_CAPACITES } from '@/lib/routes'

/**
 * Pied de page — fond sombre (CLAUDE.md, structure de page).
 *
 * Server Component : aucune interactivité, donc aucun JavaScript envoyé au
 * navigateur (skill 01, Server Components par défaut).
 *
 * Note contraste : sur --ko-black, les labels mono passent en `label-mono-d`
 * (--ko-blue-2, 6.37:1). Depuis le passage à #61b4db (Phase 2, 18 août 2026),
 * --ko-blue seul atteint déjà 8.10:1 sur ce fond — label-mono-d n'est plus une
 * nécessité de contraste, juste la variante d'état déjà en place. Voir
 * globals.css.
 */
export async function Footer() {
  const t = await getTranslations('Footer')
  const tNav = await getTranslations('Nav')

  // Coordonnées pilotées depuis l'espace équipe (réglages, 0011) plutôt que
  // depuis les fichiers de traduction : changer un courriel ne doit pas
  // demander un déploiement. `lireReglages()` est mis en cache, le pied de
  // page reste donc statique.
  const reglages = await lireReglages()

  const annee = new Date().getFullYear()

  // boutiqueActive (0029) filtre l'entrée ici, même motif que Nav.tsx.
  // Concours retiré de la nav permanente (LOT B, §32, 29 août 2026) — la
  // page et sa route restent en ligne pour un lien direct de campagne,
  // seule l'entrée de menu disparaît. `reglages.concoursActif` (0040) n'a
  // donc plus de filtre à alimenter ici — comparer `key` à 'concours'
  // n'aurait plus de sens de type une fois l'entrée retirée du tableau
  // (TS2367) — mais `reglages` continue de le porter pour tout le reste
  // (sitemap, robots, /admin/reglages).
  const liensEntreprise = (
    [
      { key: 'apropos', href: ROUTES.apropos },
      { key: 'realisations', href: ROUTES.realisations },
      { key: 'carrieres', href: ROUTES.carrieres },
      { key: 'boutique', href: ROUTES.boutique },
      { key: 'location', href: ROUTES.location },
    ] as const
  ).filter(({ key }) => key !== 'boutique' || reglages.boutiqueActive)

  const liensLegaux = [
    { key: 'confidentialite', href: ROUTES.politiqueConfidentialite },
    { key: 'conditionsUtilisation', href: ROUTES.conditionsUtilisation },
  ] as const

  return (
    <footer className="bg-ko-black text-ko-white">
      <div className="mx-auto max-w-container px-6 py-16 lg:px-12 lg:py-24">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {/* Signature */}
          <div className="lg:col-span-1">
            <p className="font-mono text-sm font-medium uppercase tracking-[0.18em]">KO-LAB</p>
            <p className="ko-h3 mt-4 text-ko-white">{t('signature')}</p>
          </div>

          {/* Capacités */}
          <nav aria-labelledby="footer-capacites">
            <p id="footer-capacites" className="label-mono label-mono-d mb-5">
              {t('capacites_titre')}
            </p>
            <ul className="space-y-3">
              {ROUTES_CAPACITES.map(({ key, href }) => (
                <li key={key}>
                  <Link
                    href={href}
                    className="inline-flex min-h-[44px] items-center text-sm text-ko-muted-d transition-colors duration-200 hover:text-ko-white"
                  >
                    {tNav(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Entreprise */}
          <nav aria-labelledby="footer-entreprise">
            <p id="footer-entreprise" className="label-mono label-mono-d mb-5">
              {t('entreprise_titre')}
            </p>
            <ul className="space-y-3">
              {liensEntreprise.map(({ key, href }) => (
                <li key={key}>
                  <Link
                    href={href}
                    className="inline-flex min-h-[44px] items-center text-sm text-ko-muted-d transition-colors duration-200 hover:text-ko-white"
                  >
                    {tNav(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact */}
          <div>
            <p className="label-mono label-mono-d mb-5">{t('contact_titre')}</p>
            <address className="space-y-3 not-italic">
              <p className="text-sm text-ko-muted-d">{reglages.contactRegion}</p>
              <a
                href={`mailto:${reglages.contactCourriel}`}
                className="inline-flex min-h-[44px] items-center text-sm text-ko-white transition-colors duration-200 hover:text-ko-blue2"
              >
                {reglages.contactCourriel}
              </a>
              {/* Le téléphone n'apparaît que s'il est renseigné : une ligne
                  vide vaudrait mieux ne pas être là. */}
              {reglages.contactTelephone && (
                <a
                  href={`tel:${reglages.contactTelephone.replace(/[^+\d]/g, '')}`}
                  className="inline-flex min-h-[44px] items-center text-sm text-ko-white transition-colors duration-200 hover:text-ko-blue2"
                >
                  {reglages.contactTelephone}
                </a>
              )}
            </address>

            <Link
              href={ROUTES.contact}
              className="mt-2 inline-flex min-h-[44px] items-center gap-2 border-b border-ko-line-d pb-0.5 text-sm text-ko-white transition-colors duration-200 hover:border-ko-blue2 hover:text-ko-blue2"
            >
              {tNav('cta')}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        {/* Filet de séparation — 1px, vocabulaire du design system */}
        <div className="mt-16 flex flex-col gap-4 border-t border-ko-line-d pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[11px] uppercase tracking-widest text-ko-muted-d">
            © {annee} {t('droits')}
          </p>

          {/* Mentions légales à venir : demande le nom légal exact, l'adresse
              d'affaires et le NEQ, absents du site aujourd'hui. Politique de
              retour à venir également — aucune politique de retour formelle
              n'existe encore (voir gabaritCommande.ts). */}
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {liensLegaux.map(({ key, href }) => (
              <li key={key}>
                <Link
                  href={href}
                  className="inline-flex min-h-[44px] items-center text-[11px] text-ko-muted-d transition-colors duration-200 hover:text-ko-white sm:min-h-0"
                >
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  )
}
