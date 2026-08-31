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

  const photoEquipe = await resoudreEmplacement('apropos_1', locale)

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

  // Disciplines/sites/mandats retirés (LOT C, §24, révision Joe Himad,
  // 30 août 2026) : pseudo-compteurs sans valeur vérifiable ("6", "Multi",
  // "Gouv."). « 20 000+ heures de travail terrain » reste le seul chiffre
  // public approuvé (CLAUDE.md) — une seule entrée, plus un tableau de
  // quatre. Home.stats.disciplines_*/sites_*/mandats_* restent dans
  // messages/*.json, volontairement non supprimées (consigne du brief).
  const chiffre = { valeur: tStats('heures_valeur'), label: tStats('heures_label') }

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

            {/* Chiffre unique — remplace la grille de 4 (LOT C, §24, 30 août
                2026) : grid-cols-2/lg:grid-cols-4, les filets gap-px et
                l'animation cascade-stat n'avaient plus de sens à une seule
                entrée (cascade = apparition échelonnée de plusieurs cellules).
                Dans le même <Reveal> que le texte ci-dessus plutôt qu'un bloc
                à part en dessous : un chiffre isolé sous cette section
                flottait sans rattachement visuel au texte qui le précède.
                Même vocabulaire que la carte du hero et celle d'Opérations
                terrain (32px serif + légende mono 10px). */}
            <div className="mt-10 inline-flex flex-col rounded-2xl border border-ko-frost/15 bg-ko-frost/10 px-6 py-5 backdrop-blur-md">
              <p className="font-serif text-[32px] font-light leading-none text-ko-white">
                {chiffre.valeur}
              </p>
              <p className="mt-2 max-w-[16ch] font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-ko-frost/55">
                {chiffre.label}
              </p>
            </div>
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
