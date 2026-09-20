import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import {
  GalerieRealisations,
  type RealisationCarte,
} from '@/components/sections/GalerieRealisations'
import { Reveal } from '@/components/ui/Reveal'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { lireRealisationsPubliees, type RealisationPubliee } from '@/lib/realisations'
import { alternatesLangues, ROUTES } from '@/lib/routes'

import type { Metadata, Viewport } from 'next'

/**
 * THÈME SOMBRE — migration page par page (méthode de 73255f2, accueil).
 * Importé ICI et non dans le layout : App Router ne charge le CSS d'une page
 * que sur sa route, et ses règles sont toutes préfixées par
 * `body:has([data-theme-sombre])`, le marqueur rendu plus bas.
 */
import '@/styles/theme-sombre.css'

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

/** Barre du navigateur mobile assortie au fond sombre — voir theme-sombre.css. */
export const viewport: Viewport = {
  themeColor: '#111210',
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

  // §14 : « Ne pas forcer chaque album à devenir une réalisation. » Les
  // fiches (marquées dans l'admin, migration 0047) sont racontées en haut de
  // page, une par une, et ont chacune leur propre page. Le reste vit dans la
  // galerie, sans fiche ni récit.
  const fiches = publiees?.filter((r) => r.fiche) ?? []
  const galerie = publiees?.filter((r) => !r.fiche) ?? []

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
    <div data-theme-sombre>
      {/* ------------------------------ En-tête ------------------------------ */}
      {/* Pas de photo ici, volontairement : la page EST une galerie. Un hero
          photographique entrerait en concurrence avec les visuels du contenu.
          `pt-20`/`pb-10` et `px-4` en mobile (27 août 2026, retour visuel sur
          téléphone réel) : `pt-28`/`pb-14`/`px-6` laissaient un vide
          disproportionné au-dessus du titre et grignotaient sur la largeur
          disponible pour les photos plus bas — le desktop (`lg:`) n'est pas
          concerné, il n'était pas en cause. Même `px-4` sur le conteneur de
          la galerie plus bas, pour que les deux sections s'alignent.
          Revenu à `px-6` le 19 septembre 2026 (« trop collé au bord ») :
          le texte s'aligne sur les autres pages, 24 px du bord. */}
      <section className="border-b border-ko-line bg-ko-cream pb-10 pt-20 lg:pb-20 lg:pt-40">
        <div className="mx-auto max-w-container px-6 lg:px-16">
          {/* Pas de label mono ici : il aurait répété mot pour mot le h1.
              Le compteur vit dans la galerie, où il suit le filtre actif. */}
          <span aria-hidden="true" className="block h-px w-8 bg-ko-blue" />

          <h1 className="ko-display mt-6 max-w-[20ch] text-ko-ink">{t('title')}</h1>

          <p className="mt-7 max-w-[56ch] text-base leading-relaxed text-ko-muted lg:text-lg">
            {t('intro')}
          </p>
        </div>
      </section>

      {/* ------------------------------ Fiches ------------------------------ */}
      {fiches.length > 0 && (
        <section className="border-b border-ko-line bg-ko-white py-10 lg:py-24">
          <div className="mx-auto max-w-container px-6 lg:px-16">
            <Reveal>
              <p className="label-mono">{t('fiches_label')}</p>
              <h2 className="ko-h2 mt-5 max-w-[24ch] text-ko-ink">{t('fiches_titre')}</h2>
            </Reveal>

            <div className="mt-10 lg:mt-14">
              {fiches.map((r, i) => (
                <Reveal key={r.slug}>
                  <article className="grid grid-cols-1 gap-6 border-t border-ko-line py-8 lg:grid-cols-[4rem_minmax(0,1fr)] lg:gap-8 lg:py-10">
                    <p aria-hidden="true" className="label-mono text-ko-muted">
                      {String(i + 1).padStart(2, '0')}
                    </p>

                    <div>
                      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                        <h3 className="font-serif text-[24px] leading-tight text-ko-ink lg:text-[30px]">
                          {r.titre}
                        </h3>
                        {/* §15, même règle que dans la galerie : une série
                            qui n'est pas une réalisation KO-LAB le dit. */}
                        {r.origine === 'experience_passee' && (
                          <p className="label-mono border border-ko-line px-2.5 py-1 text-ko-muted">
                            {t('experience_passee')}
                          </p>
                        )}
                      </div>

                      {r.description && (
                        <p className="mt-5 max-w-[62ch] text-base leading-relaxed text-ko-muted lg:text-lg">
                          {r.description}
                        </p>
                      )}

                      <Link
                        href={`${ROUTES.realisations}/${r.slug}`}
                        className="mt-6 inline-flex items-center gap-2.5 border-b border-ko-accent/30 pb-0.5 text-sm text-ko-ink transition-[gap,border-color] duration-200 hover:gap-3.5 hover:border-ko-accent"
                      >
                        {t('voir_projet')}
                        <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------ Galerie ------------------------------ */}
      <section className="bg-ko-white py-10 lg:py-24">
        <div className="mx-auto max-w-container px-6 lg:px-16">
          {galerie.length > 0 ? (
            <Reveal>
              <GalerieRealisations
                realisations={galerie.map((r) => versCarte(r, t('experience_passee')))}
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
    </div>
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
function versCarte(r: RealisationPubliee, libelleExperience: string): RealisationCarte {
  const [premiere] = r.images

  return {
    cle: r.slug,
    categorie: r.categorie,
    titre: r.titre,
    // §15 : « Expérience passée » quand la série ne documente pas une
    // réalisation KO-LAB. Rien du tout sinon — pas de libellé vide.
    mention: r.origine === 'experience_passee' ? libelleExperience : undefined,
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
