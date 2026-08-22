import Image from 'next/image'
import { getTranslations } from 'next-intl/server'

import { BandeauVideos, type VignetteVideo } from '@/components/ui/BandeauVideos'
import { buttonVariants } from '@/components/ui/Button'
import { GaleriePhotos } from '@/components/ui/GaleriePhotos'
import { Parallax } from '@/components/ui/Parallax'
import { Reveal } from '@/components/ui/Reveal'
import { Link } from '@/i18n/navigation'
import { FILTRE_TERRAIN, FILTRE_TERRAIN_CHAUD } from '@/lib/images'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils/cn'

import type { VignetteBandeau } from '@/components/ui/BandeauImages'

import type { CSSProperties, ReactNode } from 'react'

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
  /**
   * Bande de vidéos, entre la liste des capacités et le CTA.
   *
   * ⚠️ C'est la PRÉSENCE de la prop qui décide, pas son contenu. Passer un
   * tableau vide affiche la section avec des emplacements réservés (voir
   * BandeauVideos) ; ne pas passer la prop du tout n'affiche rien. Seule la
   * page Le LAB en prévoit une aujourd'hui — les trois autres pages de
   * capacités omettent simplement la prop.
   */
  videos?: readonly VignetteVideo[]
  /**
   * Galerie photo, entre la liste des capacités et la bande de vidéos —
   * ajoutée le 20 août 2026 pour donner une deuxième preuve visuelle que la
   * seule photo de hero. Contrairement à `videos`, une prop absente OU un
   * tableau vide n'affichent tout simplement rien (GaleriePhotos/BandeauImages
   * n'ont pas d'emplacement réservé à montrer) : pas de section vide sur les
   * pages qui n'ont pas encore assez de photos propres pour ce sujet.
   */
  images?: readonly VignetteBandeau[]
  /**
   * Emplacement libre entre la galerie et la bande de vidéos — ajouté pour
   * la grille de 7 photos du LAB (medias_emplacements lab_1..lab_7), qui
   * suit un patron différent de `images` ci-dessus (grille responsive, pas
   * la bande + visionneuse de GaleriePhotos). Optionnel et rendu tel quel :
   * les trois autres pages de capacités ne le passent pas, rien ne change
   * pour elles.
   */
  contenuSupplementaire?: ReactNode
}

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
  videos,
  images,
  contenuSupplementaire,
}: PageCapaciteProps) {
  const t = await getTranslations('Capacites.cta')
  const tCommun = await getTranslations('Commun')

  return (
    <>
      {/* ------------------------------- Hero ------------------------------- */}
      {/* Pleine largeur, sans conteneur arrondi : c'est ce qui distingue une
          page intérieure du hero encarté de l'accueil. */}
      <section className="relative overflow-hidden bg-ko-black">
        {/*
          A — parallaxe. Le conteneur déborde de 80px en hauteur : sans cette
          marge, remonter l'image de 60px découvrirait une bande vide en bas.
          L'<Image> reste rendue côté serveur et passée en `children`, donc
          présente dans le HTML initial — la parallaxe ne retarde pas le LCP.
        */}
        <Parallax distance={60} className="absolute inset-x-0 top-0 h-[calc(100%+80px)]">
          {/*
            Les quatre pages passent désormais une photo réelle (depuis le
            20 août 2026, espaceAmenage2023 pour Opérations terrain — voir
            son fichier) : plus aucune n'attend de remplacement Unsplash.
          */}
          <Image
            src={src}
            alt=""
            fill
            priority
            quality={85}
            sizes="100vw"
            style={desature ? FILTRE_TERRAIN_CHAUD : FILTRE_TERRAIN}
            className={cn('object-cover', cadrage)}
          />
        </Parallax>

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

          {/* D — filigrane du numéro, entrée par le bas (40px, 600ms).
              Pas de compteur animé : le skill 08 l'interdit, et « 01 » à « 04 »
              portent un zéro devant qu'un décompte ferait disparaître. */}
          {/* Le positionnement absolu est porté par le CONTENEUR, pas par le
              span : un wrapper en `display: contents` n'aurait aucune boîte,
              donc l'IntersectionObserver ne l'aurait jamais vu entrer. */}
          <Reveal groupe className="pointer-events-none absolute bottom-[-6%] right-[2%]">
            <span
              aria-hidden="true"
              className="numero-slide block select-none font-serif text-[clamp(140px,20vw,340px)] font-light leading-none tracking-[-0.04em] text-ko-frost/[0.04]"
            >
              {numero}
            </span>
          </Reveal>
        </div>
      </section>

      {/* --------------------------- Phrase de marque --------------------------- */}
      <section className="border-b border-ko-line bg-ko-cream py-14 lg:py-20">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          {/* B — apparition mot par mot, 80ms d'écart, 400ms par mot.
              Le découpage se fait au rendu serveur ; seul le conteneur est
              client. Envelopper chaque mot dans un composant client aurait
              multiplié les observateurs par le nombre de mots. */}
          <Reveal groupe>
            <p className="ko-h3 max-w-[40ch] text-ko-ink">
              {phrase.split(' ').map((mot, i) => (
                <span
                  key={`${i}-${mot}`}
                  className="mot-anime"
                  style={{ '--delai': `${i * 80}ms` } as CSSProperties}
                >
                  {/* Espace insécable de fin : sans lui, `inline-block` colle
                      les mots les uns aux autres. */}
                  {mot}
                  {' '}
                </span>
              ))}
            </p>
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
                {/* C — cascade, 60ms d'écart entre items.
                    Reveal `groupe` propre à la liste : le bloc parent garde son
                    fondu d'ensemble, la liste s'échelonne à l'intérieur. */}
                <Reveal groupe>
                  <ul className="mt-6 divide-y divide-ko-line border-y border-ko-line">
                  {items.map((item, i) => (
                    <li
                      key={item}
                      className="cascade-item flex gap-4 py-4 text-base leading-relaxed text-ko-ink"
                      style={{ '--delai': `${i * 60}ms` } as CSSProperties}
                    >
                      <span aria-hidden="true" className="text-ko-blue">
                        —
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                  </ul>
                </Reveal>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------ Galerie ------------------------------ */}
      {/* Deuxième preuve visuelle, après le hero et avant les vidéos — le
          savoir-faire décrit en texte juste au-dessus, montré en photos avant
          la bande de vidéos puis le CTA. Rien ne s'affiche si `images` est
          absente ou vide (voir la note de la prop) : jamais de section vide. */}
      {images && images.length > 0 && (
        <section className="border-t border-ko-line bg-ko-cream py-16 lg:py-24">
          <div className="mx-auto max-w-container px-6 lg:px-12">
            <Reveal>
              <p className="label-mono">{tCommun('en_photos')}</p>
              <div className="mt-6">
                <GaleriePhotos images={images} titre={titre} />
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {contenuSupplementaire}

      {/* ------------------------------ Vidéos ------------------------------ */}
      {/* Rendue dès que la prop est passée, même vide — la bande affiche alors
          des emplacements réservés (voir BandeauVideos). Placée APRÈS la liste
          des capacités et AVANT le CTA : on montre le savoir-faire en images
          une fois qu'il a été énoncé, et juste avant de proposer de démarrer
          un projet. */}
      {videos !== undefined && (
        <section className="border-t border-ko-line bg-ko-white pb-16 lg:pb-24">
          <div className="mx-auto max-w-container px-6 lg:px-12">
            <Reveal>
              <p className="label-mono pt-16 lg:pt-24">{t('videos_label')}</p>
              <h2 className="ko-h3 mt-5 max-w-[28ch] text-ko-ink">{t('videos_titre')}</h2>

              <div className="mt-10">
                <BandeauVideos
                  videos={videos}
                  libelles={{
                    groupe: t('videos_titre'),
                    lire: t('videos_lire'),
                    precedent: t('videos_precedent'),
                    suivant: t('videos_suivant'),
                    aVenir: t('videos_a_venir'),
                    fermer: t('videos_fermer'),
                  }}
                />
              </div>
            </Reveal>
          </div>
        </section>
      )}

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
