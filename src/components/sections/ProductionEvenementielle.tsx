import Image from 'next/image'
import { getTranslations } from 'next-intl/server'

import { buttonVariants } from '@/components/ui/Button'
import { PhotoPlaceholder } from '@/components/ui/PhotoPlaceholder'
import { Reveal } from '@/components/ui/Reveal'
import { Link } from '@/i18n/navigation'
import { obtenirEmplacement } from '@/lib/medias-emplacements'
import { ROUTES } from '@/lib/routes'

import type { AppLocale } from '@/i18n/routing'

/**
 * Production événementielle — section 9 de l'accueil, entre Équipements &
 * déploiement et Opérations terrain (révision du 20 septembre 2026, §5).
 *
 * Capacité NOUVELLE (§11). Le brief est explicite sur ce qu'elle ne doit pas
 * dire : « l'objectif n'est pas de repositionner KO-LAB comme agence
 * événementielle, mais de montrer que l'équipe peut concevoir et produire
 * des événements corporatifs et spéciaux lorsque le mandat le demande ».
 * D'où le titre, qui pose la condition, et le texte, qui reste sur les
 * moyens : concept, plan de site, décor, fabrication, équipements,
 * logistique, installation, coordination.
 *
 * Photo : emplacement `production_evenementielle`, vide tant que KO-LAB n'en
 * a pas choisi une dans /admin/medias-emplacements — PhotoPlaceholder occupe
 * alors exactement la même boîte. Aucune photo d'un autre projet n'est
 * recyclée ici : le §15 interdit de présenter une expérience passée comme
 * une réalisation KO-LAB, et le §18 interdit le stock générique.
 *
 * Fond sombre : elle s'intercale entre Équipements (sombre) et Opérations
 * terrain (sombre)… donc elle reste claire pour ne pas fusionner avec ses
 * deux voisines — même raison qu'Installations plus haut.
 */
export async function ProductionEvenementielle({ locale }: { locale: AppLocale }) {
  const t = await getTranslations('Home.production')
  const tCommun = await getTranslations('Commun')
  // obtenirEmplacement, PAS resoudreEmplacement : ce dernier retombe sur
  // /images/placeholder.svg quand AUCUNE ligne n'existe pour la clé — un
  // fichier absent de public/ (voir medias-repli.ts), donc une image cassée.
  // La ligne n'existera qu'une fois créée en base : pas de ligne, ou ligne
  // sans photo → PhotoPlaceholder, jamais une image morte.
  const ligne = await obtenirEmplacement('production_evenementielle')
  const photo = ligne?.url
    ? { url: ligne.url, alt: (locale === 'en' ? ligne.alt_en : null) ?? ligne.alt_fr }
    : null

  return (
    <section className="bg-ko-white py-16 lg:py-28">
      <div className="mx-auto max-w-container px-6 lg:px-16">
        <div className="grid grid-cols-1 items-stretch gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-20">
          <Reveal>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl lg:aspect-auto lg:h-full lg:min-h-[420px]">
              {photo === null ? (
                <PhotoPlaceholder ratio="" label={tCommun('photo_placeholder')} className="absolute inset-0 h-full w-full" />
              ) : (
                <Image
                  src={photo.url}
                  alt={photo.alt}
                  fill
                  quality={80}
                  sizes="(max-width: 1024px) 100vw, 55vw"
                  className="object-cover object-center"
                />
              )}
            </div>
          </Reveal>

          <Reveal className="flex flex-col justify-center">
            <p className="label-mono">{t('label')}</p>

            <h2 className="mt-5 max-w-[16ch] font-serif text-[clamp(34px,5vw,64px)] font-light leading-[1.05] tracking-[-0.02em] text-ko-ink">
              {t('title')}
            </h2>

            <p className="mt-6 max-w-[48ch] text-base leading-relaxed text-ko-muted lg:text-lg">
              {t('texte')}
            </p>

            <Link
              href={ROUTES.production}
              className={`mt-8 w-fit ${buttonVariants({ variant: 'ghost' })}`}
            >
              {t('lien')}
              <span aria-hidden="true">→</span>
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
