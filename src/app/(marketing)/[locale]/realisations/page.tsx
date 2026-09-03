import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import {
  GalerieRealisations,
  type RealisationCarte,
} from '@/components/sections/GalerieRealisations'
import { Reveal } from '@/components/ui/Reveal'
import { routing } from '@/i18n/routing'
import { lireRealisationsPubliees, type RealisationPubliee } from '@/lib/realisations'
import { alternatesLangues, ROUTES } from '@/lib/routes'

import type { Metadata } from 'next'

type Props = { params: Promise<{ locale: string }> }

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations({ locale, namespace: 'Metadata.realisations' })

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}${ROUTES.realisations}`,
      languages: alternatesLangues(ROUTES.realisations),
    },
  }
}

export default async function RealisationsPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations('Realisations')

  /**
   * `lireRealisationsPubliees()` renvoie `null` tant qu'AUCUNE réalisation
   * n'a été publiée avec au moins une photo depuis /admin/realisations — les
   * quatre lignes qui occupaient la galerie ont été dépubliées le 17 août
   * 2026 : titres et descriptions génériques ("Déploiement événementiel",
   * etc.), aucune n'identifiait un client ou un projet réel malgré des
   * photos réellement téléversées. Une galerie vide et honnête vaut mieux
   * qu'une galerie de faux projets — voir la règle de véracité de
   * CLAUDE.md. Cet état s'efface de lui-même dès que Christian publie une
   * première réalisation réelle, sans changement de code.
   */
  const publiees = await lireRealisationsPubliees(locale)

  const libellesCategories = {
    terrain: t('filtre_terrain'),
    installation: t('filtre_installation'),
    lab: t('filtre_lab'),
    equipement: t('filtre_equipement'),
  }

  // Un filtre ne s'affiche que s'il a au moins une réalisation derrière —
  // corrigé le 20 août 2026 (enrichissement de la galerie) : un filtre vide
  // qui retombe sur « aucun résultat » en informe moins qu'un filtre qui
  // n'apparaît pas du tout. `installation` était le seul cas réel avant cet
  // ajout (aucune réalisation publiée dans cette catégorie) ; ce calcul reste
  // en place pour ne pas revivre la même vitrine vide si une catégorie se
  // vide à nouveau plus tard (dépublication, suppression).
  const categoriesPresentes = new Set(publiees?.map((r) => r.categorie) ?? [])

  const filtres = (
    [
      { valeur: 'all', label: t('filtre_tout') },
      { valeur: 'terrain', label: t('filtre_terrain') },
      { valeur: 'installation', label: t('filtre_installation') },
      { valeur: 'lab', label: t('filtre_lab') },
      { valeur: 'equipement', label: t('filtre_equipement') },
    ] as const
  ).filter(({ valeur }) => valeur === 'all' || categoriesPresentes.has(valeur))

  return (
    <>
      {/* ------------------------------ En-tête ------------------------------ */}
      {/* Pas de photo ici, volontairement : la page EST une galerie. Un hero
          photographique entrerait en concurrence avec les visuels du contenu.
          `pt-20`/`pb-10` et `px-4` en mobile (27 août 2026, retour visuel sur
          téléphone réel) : `pt-28`/`pb-14`/`px-6` laissaient un vide
          disproportionné au-dessus du titre et grignotaient sur la largeur
          disponible pour les photos plus bas — le desktop (`lg:`) n'est pas
          concerné, il n'était pas en cause. Même `px-4` sur le conteneur de
          la galerie plus bas, pour que les deux sections s'alignent. */}
      <section className="border-b border-ko-line bg-ko-cream pb-10 pt-20 lg:pb-20 lg:pt-40">
        <div className="mx-auto max-w-container px-4 lg:px-12">
          {/* Pas de label mono ici : il aurait répété mot pour mot le h1.
              Le compteur vit dans la galerie, où il suit le filtre actif. */}
          <span aria-hidden="true" className="block h-px w-8 bg-ko-blue" />

          <h1 className="ko-display mt-6 max-w-[20ch] text-ko-ink">{t('title')}</h1>

          <p className="mt-7 max-w-[56ch] text-base leading-relaxed text-ko-muted lg:text-lg">
            {t('intro')}
          </p>
        </div>
      </section>

      {/* ------------------------------ Galerie ------------------------------ */}
      <section className="bg-ko-white py-10 lg:py-24">
        <div className="mx-auto max-w-container px-4 lg:px-12">
          {publiees ? (
            <Reveal>
              <GalerieRealisations
                realisations={publiees.map((r) => versCarte(r))}
                filtres={filtres}
                labelFiltres={t('filtres_label')}
                aucunResultat={t('aucun_resultat')}
                libellesCategories={libellesCategories}
                libellesCarrousel={{
                  precedent: t('carrousel_precedent'),
                  suivant: t('carrousel_suivant'),
                  groupe: t('bandeau_groupe'),
                }}
              />
            </Reveal>
          ) : (
            <p className="text-base text-ko-muted">{t('aucune_realisation')}</p>
          )}
        </div>
      </section>
    </>
  )
}

/**
 * Ligne de base → carte affichable.
 *
 * ---------------------------------------------------------------------------
 * PAS DE DÉSATURATION POUR LE CONTENU RÉEL
 *
 * `desature` (le filtre chaud appliqué aux photos de nuit sous-exposées) est
 * un correctif pensé pour DES PHOTOS DE BANQUE dépareillées — elles
 * n'appartiennent pas au même reportage et n'ont donc jamais le même ton. Une
 * vraie série de photos KO-LAB, prise par la même personne le même jour, n'a
 * pas ce problème : aucun filtre suffit.
 *
 * `cadrage` (recentrage `object-position`) a disparu avec la refonte en
 * carrousels (24 août 2026) : l'ancienne grille asymétrique donnait à la
 * première carte un ratio différent des autres, qui pouvait justifier un
 * recentrage par carte. Toutes les cartes du carrousel partagent maintenant
 * le même ratio — `object-center` partout, sans variable à porter.
 */
function versCarte(r: RealisationPubliee): RealisationCarte {
  const [premiere] = r.images

  return {
    cle: r.slug,
    categorie: r.categorie,
    titre: r.titre,
    description: r.description ?? '',
    tags: r.tags,
    // `premiere` est garantie par `lireRealisationsPubliees()`, qui écarte
    // déjà toute réalisation sans la moindre image.
    src: premiere?.url ?? '',
    desature: false,
    // Couverture COMPRISE — c'est tout le sens de la refonte du 24 août 2026 :
    // la visionneuse ne montre plus seulement « les photos en plus », elle
    // montre TOUTE la série, y compris celle qui sert de couverture à la
    // carte.
    photos: r.images.map((im) => ({ src: im.url, alt: im.alt })),
  }
}
