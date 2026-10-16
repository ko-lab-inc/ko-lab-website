import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Image from 'next/image'
import { notFound } from 'next/navigation'

import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { lireReglages } from '@/lib/reglages'
import { alternatesLangues, ROUTES } from '@/lib/routes'
import { telephoneAffiche } from '@/lib/utils/telephone'

import type { Metadata, Viewport } from 'next'

/**
 * Page SAISONNIÈRE — décor de Noël corporatif (demande du boss, 16 octobre
 * 2026 ; maquette validée). Bâtie à partir du portfolio PDF « KO-LAB NOËL
 * 2026 ». L'URL reste accessible toute l'année ; seule sa mise en avant (popup,
 * lien de pied) est bornée par la saison — voir src/lib/noel.ts.
 *
 * THÈME : réutilise la Nav et le Footer sombres du site via `data-theme-sombre`
 * (même mécanique que la page d'accueil et /location). Le contenu propre à Noël
 * est habillé par theme-noel.css, scopé sous `.noel-page`. Les couleurs de Noël
 * (or, vert, bourgogne) sont une exception assumée et cantonnée — voir l'en-tête
 * de theme-noel.css.
 *
 * Images : `unoptimized` comme ailleurs (optimiseur Vercel à quota 402, voir
 * Location.tsx) ; ce sont des webp déjà détourés et optimisés (~40 Ko chacun).
 */
import '@/styles/theme-sombre.css'
import '@/styles/theme-noel.css'

type Props = { params: Promise<{ locale: string }> }

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations({ locale, namespace: 'Metadata.noel' })

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}${ROUTES.noel}`,
      languages: alternatesLangues(ROUTES.noel),
    },
  }
}

/** Barre du navigateur mobile assortie au fond sombre. */
export const viewport: Viewport = {
  themeColor: '#111210',
}

const IMG = '/images/noel'

export default async function NoelPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations('Noel')
  const reglages = await lireReglages()

  const palettes = [
    { nom: t('pal1_nom'), sous: t('pal1_sous'), couleurs: ['#f3ece0', '#e5d6b8', '#c9a86a', '#d9b45e'] },
    { nom: t('pal2_nom'), sous: t('pal2_sous'), couleurs: ['#1f3d2f', '#3a5e49', '#ebe6d6', '#c9a86a'] },
    { nom: t('pal3_nom'), sous: t('pal3_sous'), couleurs: ['#6e2230', '#8f2f3d', '#b07a82', '#c9a86a'] },
    { nom: t('pal4_nom'), sous: t('pal4_sous'), couleurs: ['#141210', '#3a2f22', '#c9a86a', '#e3c87f'] },
  ]

  const galerie = [
    { img: 'accueil_larocque', cap: t('gal_accueil'), alt: t('alt_accueil') },
    { img: 'boutique', cap: t('gal_boutiques'), alt: t('alt_boutiques') },
    { img: 'facade', cap: t('gal_facades'), alt: t('alt_facades') },
    { img: 'entree_1250', cap: t('gal_illuminations'), alt: t('alt_illuminations') },
    { img: 'accent_wreath', cap: t('gal_accents'), alt: t('alt_accents') },
    { img: 'accueil_honda', cap: t('gal_bureaux'), alt: t('alt_bureaux') },
  ]

  const etapes = [
    { t: t('step1_t'), d: t('step1_d') },
    { t: t('step2_t'), d: t('step2_d') },
    { t: t('step3_t'), d: t('step3_d') },
    { t: t('step4_t'), d: t('step4_d') },
  ]

  const tags = [t('tag1'), t('tag2'), t('tag3'), t('tag4'), t('tag5')]

  return (
    <div className="noel-page" data-theme-sombre>
      {/* ===================== HERO ===================== */}
      <header className="np-hero">
        <div className="np-hero__bg">
          <Image
            unoptimized
            src={`${IMG}/hero_dark.webp`}
            alt={t('alt_hero')}
            fill
            priority
            sizes="100vw"
          />
        </div>
        <div className="np-wrap np-hero__inner">
          <p className="np-eyebrow np-eyebrow--gold">{t('hero_eyebrow')}</p>
          <h1>
            {t('hero_titre_1')}
            <br />
            <em>{t('hero_titre_2')}</em>
          </h1>
          <p className="np-lead">{t('hero_lead')}</p>
          <div className="np-hero__cta">
            <Link href={ROUTES.contact} className="np-btn np-btn--gold">
              {t('cta_soumission')}
            </Link>
            <a href="#np-offre" className="np-btn np-btn--ghost">
              {t('cta_offre')}
            </a>
          </div>
          <div className="np-hero__services">
            <span>
              <b>{t('service_creation')}</b>
            </span>
            <span>
              <b>{t('service_location')}</b>
            </span>
            <span>
              <b>{t('service_installation')}</b>
            </span>
            <span>
              <b>{t('service_entreposage')}</b>
            </span>
          </div>
        </div>
      </header>

      {/* ===================== INTRO ===================== */}
      <section className="np-band np-band--cream" id="np-offre">
        <div className="np-wrap">
          <p className="np-eyebrow np-eyebrow--muted">{t('intro_eyebrow')}</p>
          <div className="np-intro-grid">
            <div>
              <h2>{t('intro_titre')}</h2>
              <p className="np-lead np-muted" style={{ marginTop: '20px' }}>
                {t('intro_texte')}
              </p>
            </div>
            <ul className="np-chips">
              <li className="np-chip">
                <span className="np-n">01</span>
                <span>
                  <span className="np-t">{t('chip1_t')}</span>
                  <span className="np-d">{t('chip1_d')}</span>
                </span>
              </li>
              <li className="np-chip">
                <span className="np-n">02</span>
                <span>
                  <span className="np-t">{t('chip2_t')}</span>
                  <span className="np-d">{t('chip2_d')}</span>
                </span>
              </li>
              <li className="np-chip">
                <span className="np-n">03</span>
                <span>
                  <span className="np-t">{t('chip3_t')}</span>
                  <span className="np-d">{t('chip3_d')}</span>
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ===================== GALERIE ===================== */}
      <section className="np-band np-band--dark">
        <div className="np-wrap">
          <div className="np-sec-head">
            <p className="np-eyebrow np-eyebrow--gold">{t('gal_eyebrow')}</p>
            <h2>{t('gal_titre')}</h2>
          </div>
          <div className="np-grid-gal">
            {galerie.map((g) => (
              <figure className="np-tile" key={g.img}>
                <Image
                  unoptimized
                  src={`${IMG}/${g.img}.webp`}
                  alt={g.alt}
                  fill
                  sizes="(min-width: 860px) 33vw, (min-width: 480px) 50vw, 100vw"
                />
                <figcaption>{g.cap}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== PALETTES ===================== */}
      <section className="np-band np-band--cream">
        <div className="np-wrap">
          <div className="np-sec-head">
            <p className="np-eyebrow np-eyebrow--muted">{t('pal_eyebrow')}</p>
            <h2>{t('pal_titre')}</h2>
          </div>
          <div className="np-grid-pal">
            {palettes.map((p) => (
              <div className="np-pal" key={p.nom}>
                <div className="np-pal__sw" aria-hidden="true">
                  {p.couleurs.map((c) => (
                    <span key={c} style={{ background: c }} />
                  ))}
                </div>
                <p className="np-pal__name">
                  {p.nom}
                  <small>{p.sous}</small>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== CRÉATIONS ===================== */}
      <section className="np-band np-band--dark">
        <div className="np-wrap np-split">
          <div>
            <p className="np-eyebrow np-eyebrow--gold">{t('crea_eyebrow')}</p>
            <h2 style={{ margin: '14px 0 18px' }}>{t('crea_titre')}</h2>
            <p className="np-lead" style={{ color: '#dcdad2' }}>
              {t('crea_texte')}
            </p>
            <ul className="np-tags">
              {tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          </div>
          <div className="np-split__media">
            <div className="np-photo">
              <Image
                unoptimized
                src={`${IMG}/creation_ornement.webp`}
                alt={t('alt_creation')}
                fill
                sizes="(min-width: 860px) 25vw, 50vw"
              />
            </div>
            <div className="np-photo">
              <Image
                unoptimized
                src={`${IMG}/cadeau_ornements.webp`}
                alt={t('alt_cadeaux')}
                fill
                sizes="(min-width: 860px) 25vw, 50vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===================== PROCESSUS ===================== */}
      <section className="np-band np-band--cream">
        <div className="np-wrap">
          <div className="np-sec-head">
            <p className="np-eyebrow np-eyebrow--muted">{t('proc_eyebrow')}</p>
            <h2>{t('proc_titre')}</h2>
          </div>
          <div className="np-steps">
            {etapes.map((e, i) => (
              <div className="np-step" key={e.t}>
                <span className="np-step__n">{i + 1}</span>
                <h3>{e.t}</h3>
                <p>{e.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== CTA FINAL ===================== */}
      <section className="np-final">
        <div className="np-final__bg">
          <Image unoptimized src={`${IMG}/facade.webp`} alt="" fill sizes="100vw" />
        </div>
        <div className="np-wrap np-final__inner">
          <p className="np-eyebrow np-eyebrow--gold">{t('final_eyebrow')}</p>
          <h2>{t('final_titre')}</h2>
          <p className="np-lead" style={{ color: '#e9e7df' }}>
            {t('final_lead')}
          </p>
          <Link href={ROUTES.contact} className="np-btn np-btn--gold">
            {t('final_cta')}
          </Link>
          <div className="np-contacts">
            <span>
              <b>{t('contact_courriel')}</b>&nbsp;&nbsp;{reglages.contactCourriel}
            </span>
            {reglages.contactTelephone && (
              <span>
                <b>{t('contact_telephone')}</b>&nbsp;&nbsp;
                {telephoneAffiche(reglages.contactTelephone)}
              </span>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
