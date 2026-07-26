import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import { ROUTES, ROUTES_CAPACITES } from '@/lib/routes'

/**
 * Pied de page — fond sombre (CLAUDE.md, structure de page).
 *
 * Server Component : aucune interactivité, donc aucun JavaScript envoyé au
 * navigateur (skill 01, Server Components par défaut).
 *
 * Note contraste : sur --ko-black, les labels mono passent en `label-mono-d`
 * (--ko-blue-2). Le bleu principal plafonne à 4.47:1 sur ce fond, sous le seuil
 * AA de 4.5:1 pour du texte de 11px — voir globals.css.
 */
export async function Footer() {
  const t = await getTranslations('Footer')
  const tNav = await getTranslations('Nav')

  const annee = new Date().getFullYear()

  const liensEntreprise = [
    { key: 'apropos', href: ROUTES.apropos },
    { key: 'realisations', href: ROUTES.realisations },
    { key: 'carrieres', href: ROUTES.carrieres },
    { key: 'boutique', href: ROUTES.boutique },
    { key: 'location', href: ROUTES.location },
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
              <p className="text-sm text-ko-muted-d">{t('region')}</p>
              <a
                href={`mailto:${t('courriel')}`}
                className="inline-flex min-h-[44px] items-center text-sm text-ko-white transition-colors duration-200 hover:text-ko-blue2"
              >
                {t('courriel')}
              </a>
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
        </div>
      </div>
    </footer>
  )
}
