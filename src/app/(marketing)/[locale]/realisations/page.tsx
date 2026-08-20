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

  // Les catégories du skill 21. `equipement` est proposée dès maintenant même
  // sans réalisation associée : le message « aucun résultat » informe mieux
  // qu'un filtre absent, qui laisserait croire que la catégorie n'existe pas.
  const filtres = [
    { valeur: 'all', label: t('filtre_tout') },
    { valeur: 'terrain', label: t('filtre_terrain') },
    { valeur: 'installation', label: t('filtre_installation') },
    { valeur: 'lab', label: t('filtre_lab') },
    { valeur: 'equipement', label: t('filtre_equipement') },
  ] as const

  return (
    <>
      {/* ------------------------------ En-tête ------------------------------ */}
      {/* Pas de photo ici, volontairement : la page EST une galerie. Un hero
          photographique entrerait en concurrence avec les visuels du contenu. */}
      <section className="border-b border-ko-line bg-ko-cream pb-14 pt-28 lg:pb-20 lg:pt-40">
        <div className="mx-auto max-w-container px-6 lg:px-12">
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
      <section className="bg-ko-white py-16 lg:py-24">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          {publiees ? (
            <Reveal>
              <GalerieRealisations
                realisations={publiees.map((r) => versCarte(r, libellesCategories))}
                filtres={filtres}
                labelFiltres={t('filtres_label')}
                aucunResultat={t('aucun_resultat')}
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
 * PAS DE CADRAGE NI DE DÉSATURATION POUR LE CONTENU RÉEL
 *
 * `cadrage` (recentrage `object-position`) et `desature` (le filtre chaud
 * appliqué aux photos de nuit sous-exposées) sont des correctifs pensés pour
 * DES PHOTOS DE BANQUE dépareillées — elles n'appartiennent pas au même
 * reportage et n'ont donc jamais le même ton ni le même cadrage naturel. Une
 * vraie série de photos KO-LAB, prise par la même personne le même jour, n'a
 * pas ce problème : `object-center` et aucun filtre suffisent.
 *
 * ⚠️ Si un jour une photo réelle a besoin d'un recadrage précis, ce sera un
 * réglage PAR IMAGE dans /admin/realisations, pas une constante de ce fichier
 * — la table n'a volontairement pas cette colonne tant que le besoin ne
 * s'est pas présenté.
 */
function versCarte(
  r: RealisationPubliee,
  libellesCategories: Record<string, string>,
): RealisationCarte {
  const [premiere, ...suite] = r.images

  return {
    cle: r.slug,
    categorie: r.categorie,
    titre: r.titre,
    description: r.description ?? '',
    tag: libellesCategories[r.categorie] ?? r.categorie,
    // `premiere` est garantie par `lireRealisationsPubliees()`, qui écarte
    // déjà toute réalisation sans la moindre image.
    src: premiere?.url ?? '',
    cadrage: 'object-center',
    desature: false,
    serie: suite.map((im) => ({ src: im.url, alt: im.alt })),
  }
}
