import Image from 'next/image'
import { getTranslations } from 'next-intl/server'

import { buttonVariants } from '@/components/ui/Button'
import { Reveal } from '@/components/ui/Reveal'
import { Link } from '@/i18n/navigation'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils/cn'

/**
 * Gabarit commun aux quatre pages de capacités.
 *
 * Les quatre pages partagent exactement la même structure — seuls le contenu
 * et la photo changent. Les dupliquer aurait signifié corriger quatre fois la
 * moindre retouche de mise en page, avec la dérive que ça implique.
 *
 * Les chaînes arrivent déjà traduites : chaque page les résout avec un
 * traducteur cadré sur son propre espace de noms, ce qui permet au typage des
 * messages de vérifier les clés une à une (voir global.d.ts).
 */
type PageCapaciteProps = {
  numero: string
  label: string
  titre: string
  /** Phrase de marque du document de cadrage — affichée en grand sur la photo. */
  phrase: string
  intro: string
  items: readonly string[]
  src: string
  /** Classe object-position : deux photos sont verticales et se recadrent mal. */
  cadrage: string
  /** Désature les contre-jours ambrés, trop saturés pour la palette. */
  desature?: boolean
}

const FILTRE_AMBRE = { filter: 'saturate(0.5) contrast(1.1) brightness(0.9)' }

export async function PageCapacite({
  numero,
  label,
  titre,
  phrase,
  intro,
  items,
  src,
  cadrage,
  desature = false,
}: PageCapaciteProps) {
  const t = await getTranslations('Capacites.cta')

  return (
    <>
      {/* ------------------------------- Hero ------------------------------- */}
      {/* Pleine largeur, sans conteneur arrondi : c'est ce qui distingue une
          page intérieure du hero encarté de l'accueil. */}
      <section className="relative overflow-hidden bg-ko-black">
        {/*
          ⚠️ TEMPORAIRE — remplacer par photo KO-LAB 2025-2026
          Voir skill 22 pour les critères de remplacement.
        */}
        <Image
          src={src}
          alt=""
          fill
          priority
          quality={85}
          sizes="100vw"
          style={desature ? FILTRE_AMBRE : undefined}
          className={cn('object-cover [filter:contrast(1.05)_brightness(0.65)]', cadrage)}
        />

        {/* Voile de lisibilité uniquement — jamais décoratif (skill 08). */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-ko-scrim/[0.92] via-ko-scrim/75 to-ko-scrim/45"
        />

        <div className="relative z-10 mx-auto max-w-container px-6 pb-20 pt-28 lg:px-12 lg:pb-28 lg:pt-40">
          <p className="flex items-center gap-3">
            <span aria-hidden="true" className="h-px w-8 bg-ko-blue" />
            <span className="label-mono label-mono-d">{label}</span>
          </p>

          <h1 className="mt-6 max-w-[16ch] font-serif text-[clamp(36px,5vw,68px)] font-light leading-[1.05] tracking-[-0.025em] text-ko-white">
            {titre}
          </h1>

          {/* Filigrane du numéro de capacité, pendant de celui de l'accueil. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-[-6%] right-[2%] select-none font-serif text-[clamp(140px,20vw,340px)] font-light leading-none tracking-[-0.04em] text-ko-frost/[0.04]"
          >
            {numero}
          </span>
        </div>
      </section>

      {/* --------------------------- Phrase de marque --------------------------- */}
      <section className="border-b border-ko-line bg-ko-cream py-14 lg:py-20">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          <Reveal>
            <p className="ko-h3 max-w-[40ch] text-ko-ink">{phrase}</p>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------ Contenu ------------------------------ */}
      <section className="bg-ko-white py-16 lg:py-28">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          <Reveal>
            {/* Deux colonnes éditoriales : l'intro pose le cadre à gauche, la
                liste détaille à droite. Empilées sous lg. */}
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
              <div>
                <p className="label-mono">{label}</p>
                <p className="ko-h3 mt-5 max-w-[30ch] text-ko-ink">{intro}</p>
              </div>

              <div>
                <p className="label-mono">{numero}</p>

                {/* Liste à tiret horizontal — forme validée par le skill 08.
                    Le tiret est décoratif : aria-hidden, sinon un lecteur
                    d'écran l'annonce avant chacun des huit éléments. */}
                <ul className="mt-6 divide-y divide-ko-line border-y border-ko-line">
                  {items.map((item) => (
                    <li key={item} className="flex gap-4 py-4 text-base leading-relaxed text-ko-ink">
                      <span aria-hidden="true" className="text-ko-blue">
                        —
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------- CTA ------------------------------- */}
      <section className="bg-ko-cream py-20 lg:py-28">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className="label-mono">{t('label')}</p>
              <h2 className="ko-h2 mt-5 text-ko-ink">{t('title')}</h2>
              <p className="mx-auto mt-6 max-w-[48ch] text-base leading-relaxed text-ko-muted">
                {t('texte')}
              </p>

              <div className="mt-9 flex flex-col items-center gap-5 sm:flex-row sm:justify-center sm:gap-8">
                <Link href={ROUTES.contact} className={buttonVariants({ variant: 'primary' })}>
                  {t('bouton')}
                  <span aria-hidden="true">→</span>
                </Link>

                <Link href={ROUTES.capacites} className={buttonVariants({ variant: 'text' })}>
                  {t('retour')}
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
