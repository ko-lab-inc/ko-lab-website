import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Image from 'next/image'
import { notFound } from 'next/navigation'

import { buttonVariants } from '@/components/ui/Button'
import { PhotoPlaceholder } from '@/components/ui/PhotoPlaceholder'
import { Reveal } from '@/components/ui/Reveal'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { lireOffresPubliees, photoPourDepartement, POSTES_REPLI } from '@/lib/carrieres'
import { EMAILS } from '@/lib/constantes'
import { FILTRE_TERRAIN, IMAGES } from '@/lib/images'
import { alternatesLangues, ROUTES } from '@/lib/routes'

import type { Metadata } from 'next'

type Props = { params: Promise<{ locale: string }> }

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations({ locale, namespace: 'Metadata.carrieres' })

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}${ROUTES.carrieres}`,
      languages: alternatesLangues(ROUTES.carrieres),
    },
  }
}

/**
 * Carrières.
 *
 * ---------------------------------------------------------------------------
 * BASE D'ABORD, CONTENU PROVISOIRE EN REPLI
 *
 * `lireOffresPubliees()` renvoie `null` tant qu'aucun poste actif n'a été
 * publié depuis /admin/carrieres — c'est le cas aujourd'hui. Sans repli, la
 * page se viderait le jour du déploiement de cette fonctionnalité, avant même
 * que Christian ait publié une seule offre. Les trois postes ci-dessous
 * (document de cadrage) restent donc affichés jusqu'à ce qu'un premier poste
 * réel soit publié — voir lib/carrieres.ts pour le détail du mécanisme, même
 * principe que /realisations.
 * ---------------------------------------------------------------------------
 */
export default async function CarrieresPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations('Carrieres')
  const tCommun = await getTranslations('Commun')
  const publiees = await lireOffresPubliees(locale)

  const libellesType: Record<string, string> = {
    'temps-plein': t('type_temps_plein'),
    'temps-partiel': t('type_temps_partiel'),
    contrat: t('type_contrat'),
    saisonnier: t('type_saisonnier'),
    etudiant: t('type_etudiant'),
  }

  /**
   * Libellé d'AFFICHAGE du département — jamais la valeur passée à
   * `photoPourDepartement`, qui doit rester la chaîne française brute de la
   * base (voir PosteCarte.departement dans lib/carrieres.ts). Séparer les
   * deux évite qu'une traduction ici ne casse le rattachement des photos.
   */
  const libellesDepartement: Record<string, string> =
    locale === 'en'
      ? {
          Opérations: 'Operations',
          'Logistique événementielle': 'Event Logistics',
          Installation: 'Installation',
          'Transport & logistique': 'Transport & Logistics',
          Atelier: 'Workshop',
          'Lab créatif': 'Creative Lab',
          'Administration & coordination': 'Administration & Coordination',
          Bureau: 'Office',
        }
      : {}

  let postes: {
    cle: string
    numero: string
    titre: string
    departementAffiche: string
    type: string
    description: string
    exigences: string[]
    photo: 'operationsCrew' | 'operationsCrewVertical' | 'deploiementCamion' | 'labImpression3d' | null
  }[]

  if (publiees) {
    postes = publiees.map((p, i) => ({
      cle: p.id,
      numero: String(i + 1).padStart(2, '0'),
      titre: p.titre,
      departementAffiche: libellesDepartement[p.departement] ?? p.departement,
      type: libellesType[p.type] ?? p.type,
      description: p.description,
      exigences: p.exigences,
      photo: photoPourDepartement(p.departement),
    }))
  } else {
    // Traducteurs cadrés par poste : chaque clé est ainsi vérifiée à la
    // compilation contre son seul espace de noms.
    //
    // ⚠️ POSTES_REPLI est partagé avec /carrieres/postuler, qui doit
    // proposer exactement les mêmes cases à cocher — voir lib/carrieres.ts.
    const traducteurs = await Promise.all(
      POSTES_REPLI.map((cle) => getTranslations(`Carrieres.postes.${cle}`)),
    )

    postes = traducteurs.map((tp, i) => ({
      cle: POSTES_REPLI[i] ?? String(i),
      numero: String(i + 1).padStart(2, '0'),
      titre: tp('titre'),
      departementAffiche: tp('departement'),
      type: t('type_temps_plein'),
      description: tp('description'),
      exigences: [tp('exigence_1'), tp('exigence_2'), tp('exigence_3'), tp('exigence_4')],
      photo: photoPourDepartement(tp('departement')),
    }))
  }

  return (
    <>
      {/* ---------------------------- Bannière + intro --------------------------- */}
      {/* Page de conversion (Phase 6.3) : le double CTA arrive dès le premier
          écran, avant même la liste des postes — quelqu'un déjà décidé n'a
          pas à faire défiler. */}
      <section className="border-b border-ko-line bg-ko-cream pb-14 pt-28 lg:pb-20 lg:pt-40">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          <span aria-hidden="true" className="block h-px w-8 bg-ko-blue" />
          <h1 className="ko-display mt-6 max-w-[18ch] text-ko-ink">{t('banniere_titre')}</h1>
          <p className="mt-7 max-w-[56ch] text-base leading-relaxed text-ko-muted lg:text-lg">
            {t('banniere_phrase')}
          </p>

          {/* Canal principal (formulaire interne) en avant, canal externe
              (Google Form, temporaire — Phase 6.2) nettement plus discret :
              un bouton plein contre un lien souligné, pas deux boutons de
              même poids. Le lien externe passe par /api/… pour rester
              traçable (voir cette route pour pourquoi ?utm_source= seul ne
              suffit pas). */}
          <div className="mt-9 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <Link href={ROUTES.carrieresPostuler} className={buttonVariants({ variant: 'primary' })}>
              {t('cta_principal')}
              <span aria-hidden="true">→</span>
            </Link>

            <a
              href="/api/carrieres/candidature-externe"
              className={buttonVariants({ variant: 'text' })}
            >
              {t('cta_secondaire')}
              <span aria-hidden="true">→</span>
            </a>
          </div>

          <p className="mt-12 max-w-[62ch] border-t border-ko-line pt-8 text-sm leading-relaxed text-ko-muted lg:text-base">
            {t('intro')}
          </p>
        </div>
      </section>

      <section className="bg-ko-white py-16 lg:py-24">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          {/* Combien de rôles, et comment postuler — un seul formulaire pour
              tous, décision de Christian. Le compte vient de la liste réelle,
              jamais écrit en dur : fermer un poste depuis /admin/carrieres le
              met à jour tout seul. */}
          <div className="mb-14 max-w-[56ch]">
            <p className="label-mono">{t('postes_label')}</p>
            <p className="ko-h3 mt-5 text-ko-ink">{t('postes_compte', { n: postes.length })}</p>
            <p className="mt-5 text-base leading-relaxed text-ko-muted">{t('postes_texte')}</p>
          </div>

          <ul className="border-t border-ko-line">
            {postes.map((poste) => (
              <li key={poste.cle}>
                <Reveal>
                  <article className="grid grid-cols-1 gap-8 border-b border-ko-line py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 lg:py-16">
                    {/* Colonne gauche : identité du poste */}
                    <div>
                      {/* Visuel — Phase 6.3 : aucune photo dédiée par poste,
                          une photo réelle déjà en Storage quand le
                          département correspond thématiquement
                          (lib/carrieres.ts, photoPourDepartement), sinon
                          PhotoPlaceholder. Jamais de stock (skill 22).
                          Format modeste et non pleine largeur : la page
                          reste un parcours court, pas une galerie. */}
                      {poste.photo ? (
                        <div className="relative aspect-[4/3] w-full max-w-[220px] overflow-hidden rounded-lg bg-ko-cream2">
                          <Image
                            src={IMAGES[poste.photo]}
                            alt=""
                            fill
                            quality={75}
                            sizes="220px"
                            style={FILTRE_TERRAIN}
                            className="object-cover object-center"
                          />
                        </div>
                      ) : (
                        <PhotoPlaceholder
                          ratio="aspect-[4/3]"
                          className="w-full max-w-[220px] rounded-lg"
                          label={tCommun('photo_placeholder')}
                        />
                      )}

                      <div className="mt-6 flex items-baseline gap-4">
                        <span className="font-serif text-[28px] font-light leading-none text-ko-cream2">
                          {poste.numero}
                        </span>
                        <span className="label-mono">{poste.departementAffiche}</span>
                      </div>

                      <h2 className="ko-h2 mt-4 max-w-[16ch] text-ko-ink">{poste.titre}</h2>

                      <p className="mt-4 inline-flex items-center border border-ko-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-ko-muted">
                        {poste.type}
                      </p>

                      <p className="mt-6 max-w-[46ch] text-base leading-relaxed text-ko-muted">
                        {poste.description}
                      </p>

                      {/* CTA du haut — page de conversion : quelqu'un déjà
                          convaincu par le titre seul n'a pas à lire les
                          exigences avant de pouvoir postuler. Discret
                          (variant text) : le bouton plein reste en bas,
                          après les exigences, comme confirmation finale. */}
                      <Link
                        href={`${ROUTES.carrieresPostuler}?poste=${encodeURIComponent(poste.titre)}`}
                        className={`mt-6 ${buttonVariants({ variant: 'text' })}`}
                      >
                        {t('postuler')}
                        <span aria-hidden="true">→</span>
                      </Link>
                    </div>

                    {/* Colonne droite : exigences et candidature */}
                    <div>
                      <p className="label-mono">{t('exigences_titre')}</p>

                      <ul className="mt-5 space-y-3">
                        {poste.exigences.map((exigence) => (
                          <li
                            key={exigence}
                            className="flex gap-3 text-sm leading-relaxed text-ko-ink"
                          >
                            <span aria-hidden="true" className="text-ko-blue">
                              —
                            </span>
                            <span>{exigence}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Le MÊME formulaire pour les neuf postes ; `?poste=`
                          coche simplement la bonne case à l'arrivée. Le
                          paramètre y est validé contre les postes réellement
                          ouverts — une valeur d'URL reste une entrée
                          utilisateur (voir postuler/page.tsx). */}
                      <Link
                        href={`${ROUTES.carrieresPostuler}?poste=${encodeURIComponent(poste.titre)}`}
                        className={`mt-9 ${buttonVariants({ variant: 'ghost' })}`}
                      >
                        {t('postuler')}
                        <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  </article>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------- Ressources humaines ------------------------- */}
      {/* Une question sur le recrutement n'est pas une candidature : elle a sa
          propre adresse, fournie par Christian. Un `mailto:` plutôt que le
          formulaire de contact — on écrit à quelqu'un, on ne dépose pas un
          dossier. */}
      <section className="bg-ko-cream py-20 lg:py-28">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className="label-mono">{t('rh_label')}</p>
              <h2 className="ko-h2 mt-5 text-ko-ink">{t('rh_titre')}</h2>
              <p className="mx-auto mt-6 max-w-[48ch] text-base leading-relaxed text-ko-muted">
                {t('rh_texte')}
              </p>

              <a
                href={`mailto:${EMAILS.rh}`}
                className={`mt-9 ${buttonVariants({ variant: 'ghost' })}`}
              >
                {t('rh_cta')}
                <span aria-hidden="true">→</span>
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
