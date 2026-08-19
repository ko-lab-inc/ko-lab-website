import Image from 'next/image'
import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { buttonVariants } from '@/components/ui/Button'
import { Reveal } from '@/components/ui/Reveal'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { CADRAGES, FILTRE_TERRAIN, FILTRE_TERRAIN_CHAUD, IMAGES } from '@/lib/images'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils/cn'

import type { Metadata } from 'next'

type Props = { params: Promise<{ locale: string }> }

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations({ locale, namespace: 'Metadata.capacites' })

  return {
    // Pas de `absolute` ici, contrairement à l'accueil : on veut le gabarit
    // « %s — KO-LAB » du layout. Le titre complet est déjà dans le message.
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}${ROUTES.capacites}`,
    },
  }
}

/**
 * Clés des éléments de liste. `installations` en compte 7, les trois autres 8 —
 * conforme au document de cadrage.
 *
 * Ces tableaux sont typés littéralement plutôt que dérivés d'un compteur.
 * Une boucle `item_${i + 1}` produirait le type `item_${number}`, que le typage
 * des messages (global.d.ts) refuse : rien ne garantit que l'indice reste dans
 * les bornes, et le produit croisé inclurait `installations.item_8`, absente.
 */
const ITEMS_8 = [
  'item_1',
  'item_2',
  'item_3',
  'item_4',
  'item_5',
  'item_6',
  'item_7',
  'item_8',
] as const

// Déclaré littéralement et non par `ITEMS_8.slice(0, 7)` : le découpage
// conserve le type de l'original, donc `item_8` — absente de `installations`.
const ITEMS_7 = [
  'item_1',
  'item_2',
  'item_3',
  'item_4',
  'item_5',
  'item_6',
  'item_7',
] as const

export default async function CapacitesHubPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations('Capacites')

  // Un traducteur CADRÉ par capacité. C'est ce qui rend les clés vérifiables :
  // `tOps('item_1')` est validé contre Capacites.operations seul, alors qu'un
  // `t(\`${cle}.item_1\`)` global produirait le produit croisé des quatre
  // espaces de noms — dont des combinaisons inexistantes.
  const [tOps, tInst, tLab, tEquip] = await Promise.all([
    getTranslations('Capacites.operations'),
    getTranslations('Capacites.installations'),
    getTranslations('Capacites.lab'),
    getTranslations('Capacites.equipements'),
  ])

  const capacites = [
    {
      cle: 'operations',
      numero: '01',
      href: ROUTES.operations,
      label: tOps('label'),
      titre: tOps('title'),
      intro: tOps('intro'),
      items: ITEMS_8.map((k) => tOps(k)),
      src: IMAGES.besoinDeployer,
      cadrage: CADRAGES.besoinDeployer,
      desature: true,
    },
    {
      cle: 'installations',
      numero: '02',
      href: ROUTES.installations,
      label: tInst('label'),
      titre: tInst('title'),
      intro: tInst('intro'),
      items: ITEMS_7.map((k) => tInst(k)),
      src: IMAGES.besoinInstaller,
      cadrage: CADRAGES.besoinInstaller,
      // Photo réelle (Canada Day 2026, jour nuageux) — plus le contre-jour
      // doré de l'ex-photo Unsplash que `desature` (FILTRE_TERRAIN_CHAUD)
      // corrigeait. Voir Besoins.tsx pour le même correctif sur l'accueil.
      desature: false,
    },
    {
      cle: 'lab',
      numero: '03',
      href: ROUTES.lab,
      label: tLab('label'),
      titre: tLab('title'),
      intro: tLab('intro'),
      items: ITEMS_8.map((k) => tLab(k)),
      src: IMAGES.lab,
      cadrage: 'object-center',
      desature: false,
    },
    {
      cle: 'equipements',
      numero: '04',
      href: ROUTES.equipements,
      label: tEquip('label'),
      titre: tEquip('title'),
      intro: tEquip('intro'),
      items: ITEMS_8.map((k) => tEquip(k)),
      src: IMAGES.besoinLouer,
      cadrage: 'object-center',
      desature: false,
    },
  ]

  return (
    <>
      {/* ------------------------------ En-tête ------------------------------ */}
      {/* Photo + voile, comme le hero de l'accueil, mais sans conteneur arrondi :
          la page intérieure démarre à ras bord pour se distinguer de l'accueil. */}
      <section className="relative overflow-hidden bg-ko-black">
        {/*
          ⚠️ TEMPORAIRE — remplacer par photo KO-LAB 2025-2026
          Voir skill 22 pour les critères de remplacement.
        */}
        <Image
          src={IMAGES.hero}
          alt=""
          fill
          priority
          quality={85}
          sizes="100vw"
          style={FILTRE_TERRAIN}
          className="object-cover object-center"
        />

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-ko-scrim/[0.92] via-ko-scrim/70 to-ko-scrim/40"
        />

        <div className="relative z-10 mx-auto max-w-container px-6 pb-20 pt-28 lg:px-12 lg:pb-28 lg:pt-40">
          <p className="flex items-center gap-3">
            <span aria-hidden="true" className="h-px w-8 bg-ko-blue" />
            <span className="label-mono label-mono-d">{t('hub.label')}</span>
          </p>

          <h1 className="mt-6 max-w-[18ch] font-serif text-[clamp(36px,5vw,68px)] font-light leading-[1.05] tracking-[-0.025em] text-ko-white">
            {t('hub.title')}
          </h1>

          <p className="mt-8 max-w-[56ch] text-base leading-relaxed text-ko-frost/70 lg:text-lg">
            {t('hub.texte')}
          </p>
        </div>
      </section>

      {/* ---------------------------- Phrase forte ---------------------------- */}
      {/* Bande claire courte : elle sépare l'en-tête sombre des quatre blocs et
          porte la phrase de marque du document de cadrage. */}
      <section className="border-b border-ko-line bg-ko-cream py-14 lg:py-20">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          <Reveal>
            <p className="ko-h3 max-w-[38ch] text-ko-ink">{t('hub.phrase')}</p>
          </Reveal>
        </div>
      </section>

      {/* ------------------------- Les quatre capacités ------------------------- */}
      {capacites.map(({ cle, numero, href, label, titre, intro, items, src, cadrage, desature }, i) => {
        // Alternance des fonds ET du côté de la photo : sans ça, quatre blocs
        // identiques enfilés donneraient un catalogue, pas un parcours.
        const pair = i % 2 === 1

        return (
          <section
            key={cle}
            className={cn('py-16 lg:py-28', pair ? 'bg-ko-cream' : 'bg-ko-white')}
          >
            <div className="mx-auto max-w-container px-6 lg:px-12">
              <Reveal>
                <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
                  {/* Photo — passe à droite un bloc sur deux en desktop */}
                  <div className={cn('relative', pair && 'lg:order-2')}>
                    <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-ko-cream2">
                      {/*
                        ⚠️ TEMPORAIRE — remplacer par photo KO-LAB 2025-2026
                        Voir skill 22 pour les critères de remplacement.
                      */}
                      <Image
                        src={src}
                        alt=""
                        fill
                        quality={80}
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        style={desature ? FILTRE_TERRAIN_CHAUD : FILTRE_TERRAIN}
                        className={cn('object-cover', cadrage)}
                      />
                    </div>
                  </div>

                  {/* Contenu */}
                  <div className={cn(pair && 'lg:order-1')}>
                    <div className="flex items-baseline gap-4">
                      <span className="font-serif text-[38px] font-light leading-none text-ko-cream2">
                        {numero}
                      </span>
                      <span className="label-mono">{label}</span>
                    </div>

                    <h2 className="ko-h2 mt-5 max-w-[20ch] text-ko-ink">{titre}</h2>

                    <p className="mt-6 max-w-[52ch] text-base leading-relaxed text-ko-muted">
                      {intro}
                    </p>

                    {/* Liste à tiret horizontal — forme validée par le skill 08.
                        Le tiret est décoratif : aria-hidden pour ne pas le faire
                        annoncer avant chaque élément par un lecteur d'écran. */}
                    <p className="label-mono mt-9">{t('hub.ce_que_ca_couvre')}</p>

                    <ul className="mt-4 space-y-2.5">
                      {items.map((item) => (
                        <li key={item} className="flex gap-3 text-sm leading-relaxed text-ko-ink">
                          <span aria-hidden="true" className="text-ko-blue">
                            —
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>

                    <Link href={href} className={`mt-10 ${buttonVariants({ variant: 'text' })}`}>
                      {t('hub.lien_page')}
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </div>
              </Reveal>
            </div>
          </section>
        )
      })}
    </>
  )
}
