import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Image from 'next/image'
import { notFound } from 'next/navigation'

import { buttonVariants } from '@/components/ui/Button'
import { PhotoPlaceholder } from '@/components/ui/PhotoPlaceholder'
import { Reveal } from '@/components/ui/Reveal'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { FILTRE_TERRAIN } from '@/lib/images'
import { resoudreEmplacement } from '@/lib/medias-emplacements'
import { alternatesLangues, ROUTES } from '@/lib/routes'

import type { Metadata } from 'next'

type Props = { params: Promise<{ locale: string }> }

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations({ locale, namespace: 'Metadata.apropos' })

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}${ROUTES.apropos}`,
      languages: alternatesLangues(ROUTES.apropos),
    },
  }
}

export default async function AProposPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const photoEquipe = await resoudreEmplacement('apropos_1')

  const t = await getTranslations('APropos')
  const tCommun = await getTranslations('Commun')
  const tEco = await getTranslations('Home.ecosysteme')
  const tStats = await getTranslations('Home.stats')
  const tNav = await getTranslations('Nav')

  const methode = [
    { titre: t('methode_1_titre'), texte: t('methode_1_texte') },
    { titre: t('methode_2_titre'), texte: t('methode_2_texte') },
    { titre: t('methode_3_titre'), texte: t('methode_3_texte') },
  ]

  const partenaires = ['turbo', 'spartan', 'emu', 'vip'] as const

  const chiffres = [
    { valeur: tStats('heures_valeur'), label: tStats('heures_label') },
    { valeur: tStats('disciplines_valeur'), label: tStats('disciplines_label') },
    { valeur: tStats('sites_valeur'), label: tStats('sites_label') },
    { valeur: tStats('mandats_valeur'), label: tStats('mandats_label') },
  ]

  return (
    <>
      {/* ------------------------------ En-tête ------------------------------ */}
      <section className="border-b border-ko-line bg-ko-cream pb-14 pt-28 lg:pb-20 lg:pt-40">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          <span aria-hidden="true" className="block h-px w-8 bg-ko-blue" />
          <h1 className="ko-display mt-6 max-w-[14ch] text-ko-ink">{t('title')}</h1>
          <p className="mt-7 max-w-[56ch] text-base leading-relaxed text-ko-muted lg:text-lg">
            {t('intro')}
          </p>
        </div>
      </section>

      {/* --------------------------- Positionnement --------------------------- */}
      <section className="bg-ko-white py-16 lg:py-28">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          <Reveal>
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
              <div>
                <p className="label-mono">{t('positionnement_label')}</p>
                <h2 className="ko-h2 mt-5 max-w-[18ch] text-ko-ink">
                  {t('positionnement_titre')}
                </h2>
                <p className="mt-6 max-w-[50ch] text-base leading-relaxed text-ko-muted">
                  {t('positionnement_texte')}
                </p>
              </div>

              {/*
                Photo réelle depuis medias_emplacements (migration 0036, route
                A de l'architecture média). `resoudreEmplacement` retombe sur
                la même photo si la ligne est introuvable — mais renvoie
                `null` (PAS de repli) si la ligne existe avec url_stockage
                NULL : un retrait volontaire depuis l'admin, migration 0037.
                PhotoPlaceholder revient alors, mêmes dimensions.
              */}
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-ko-cream2">
                {photoEquipe === null ? (
                  <PhotoPlaceholder
                    ratio=""
                    label={tCommun('photo_placeholder')}
                    className="absolute inset-0 h-full w-full"
                  />
                ) : (
                  <Image
                    src={photoEquipe.url}
                    alt={photoEquipe.alt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    quality={80}
                    style={FILTRE_TERRAIN}
                    className="object-cover"
                  />
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ----------------------------- Culture ----------------------------- */}
      <section className="bg-ko-black py-16 lg:py-28">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          <Reveal>
            <p className="label-mono label-mono-d">{t('culture_label')}</p>
            <h2 className="ko-h2 mt-5 max-w-[22ch] text-ko-white">{t('culture_titre')}</h2>
            <p className="mt-6 max-w-[56ch] text-base leading-relaxed text-ko-frost/60 lg:text-lg">
              {t('culture_texte')}
            </p>
          </Reveal>

          {/* Chiffres en filets, sans icône ni pastille — le vocabulaire de
              lignes fines du skill 08. */}
          <Reveal groupe className="mt-14 grid grid-cols-2 gap-px bg-ko-line-d lg:grid-cols-4">
            {chiffres.map((c, i) => (
              <div
                key={c.label}
                style={{ '--delai': `${i * 150}ms` } as React.CSSProperties}
                className="cascade-stat bg-ko-black px-5 py-8"
              >
                <p className="font-serif text-[26px] font-light leading-none text-ko-white">
                  {c.valeur}
                </p>
                <p className="mt-3 font-mono text-[11px] uppercase leading-relaxed tracking-[0.14em] text-ko-muted-d">
                  {c.label}
                </p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ----------------------------- Méthode ----------------------------- */}
      <section className="bg-ko-cream py-16 lg:py-28">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          <Reveal>
            <p className="label-mono">{t('methode_label')}</p>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 gap-px bg-ko-line md:grid-cols-3">
            {methode.map((etape, i) => (
              <Reveal key={etape.titre} className="bg-ko-cream">
                <div className="h-full px-7 py-9">
                  <span className="label-mono">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="mt-5 font-serif text-[22px] leading-tight text-ko-ink">
                    {etape.titre}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-ko-muted">{etape.texte}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------- Écosystème ---------------------------- */}
      <section className="bg-ko-white py-16 lg:py-28">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          <Reveal>
            <p className="label-mono">{t('ecosysteme_titre')}</p>
            <h2 className="ko-h2 mt-5 max-w-[24ch] text-ko-ink">{t('ecosysteme_texte')}</h2>
          </Reveal>

          <Reveal>
            <ul className="mt-12 divide-y divide-ko-line border-y border-ko-line">
              {partenaires.map((cle) => (
                <li
                  key={cle}
                  className="flex flex-col gap-2 py-6 md:flex-row md:items-baseline md:gap-10"
                >
                  <span className="font-serif text-[20px] leading-tight text-ko-ink md:w-[30%] md:shrink-0">
                    {tEco(`${cle}_nom`)}
                  </span>
                  <span className="text-sm leading-relaxed text-ko-muted">
                    {tEco(`${cle}_role`)}
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal>
            <Link
              href={ROUTES.contact}
              className={`mt-12 ${buttonVariants({ variant: 'primary' })}`}
            >
              {tNav('cta')}
              <span aria-hidden="true">→</span>
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  )
}
