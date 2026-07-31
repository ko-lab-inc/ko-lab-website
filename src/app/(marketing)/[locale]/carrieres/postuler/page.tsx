import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { FormulaireCandidature, type LibellesCandidature } from '@/components/sections/FormulaireCandidature'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { lireOffresPubliees, POSTES_REPLI } from '@/lib/carrieres'
import { ROUTES } from '@/lib/routes'

import type { Metadata } from 'next'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ poste?: string }>
}

/**
 * Formulaire de candidature — le MÊME pour les neuf postes.
 *
 * Décision de Christian : « même formulaire pour tous les postes ». Le lien
 * « Postuler » de chaque fiche mène ici en passant `?poste=…`, ce qui coche
 * simplement la bonne case à l'arrivée. Rien n'empêche d'en cocher d'autres :
 * le formulaire d'origine acceptait déjà plusieurs choix.
 *
 * ⚠️ Rendu DYNAMIQUE (pas d'ISR) : la page dépend de `searchParams`, et la
 * liste des postes doit refléter l'état de la base au moment de la visite —
 * un poste fermé ne doit pas rester cochable une heure de plus.
 */
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations({ locale, namespace: 'Carrieres' })

  return {
    title: t('postuler_titre'),
    description: t('postuler_intro'),
    alternates: { canonical: `/${locale}${ROUTES.carrieresPostuler}` },
  }
}

export default async function PostulerPage({ params, searchParams }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const { poste } = await searchParams
  const t = await getTranslations('Carrieres')
  const tf = await getTranslations('Carrieres.form')

  /**
   * Les mêmes postes que la page /carrieres, dans tous les cas.
   *
   * Quand la base est vide, cette page DOIT proposer les trois postes de
   * repli qu'affiche la page publique — sinon ses boutons « Postuler »
   * mènent à un formulaire qui annonce « aucun poste ouvert ».
   */
  const offres = await lireOffresPubliees()
  const titres = offres
    ? offres.map((o) => o.titre)
    : await Promise.all(
        POSTES_REPLI.map(async (cle) =>
          (await getTranslations(`Carrieres.postes.${cle}`))('titre'),
        ),
      )

  // `?poste=` vient de l'URL, donc de n'importe qui : on ne le pré-coche que
  // s'il correspond EXACTEMENT à un poste ouvert. Sinon on l'ignore — pas
  // question d'afficher une chaîne arbitraire dans le formulaire.
  const posteInitial = poste && titres.includes(poste) ? poste : undefined

  const libelles: LibellesCandidature = {
    nom: tf('nom'),
    telephone: tf('telephone'),
    telephoneAide: tf('telephone_aide'),
    email: tf('email'),
    ville: tf('ville'),
    villeAide: tf('ville_aide'),
    postes: tf('postes'),
    postesAide: tf('postes_aide'),
    disponibilites: tf('disponibilites'),
    disponibilitesAide: tf('disponibilites_aide'),
    travailExterieur: tf('travail_exterieur'),
    aExperience: tf('a_experience'),
    experienceTexte: tf('experience_texte'),
    experienceTexteAide: tf('experience_texte_aide'),
    cv: tf('cv'),
    cvAide: tf('cv_aide'),
    source: tf('source'),
    sources: [tf('source_reseaux'), tf('source_bouche'), tf('source_site'), tf('source_autre')],
    confirmation: tf('confirmation'),
    oui: tf('oui'),
    non: tf('non'),
    envoyer: tf('envoyer'),
    enCours: tf('en_cours'),
    succesTitre: tf('succes_titre'),
    succesTexte: tf('succes_texte'),
    erreurDonnees: tf('erreur_donnees'),
    erreurCv: tf('erreur_cv'),
    erreurTrop: tf('erreur_trop'),
    erreurServeur: tf('erreur_serveur'),
    champObligatoire: t('champ_obligatoire'),
  }

  return (
    <>
      <section className="border-b border-ko-line bg-ko-cream pb-14 pt-28 lg:pb-20 lg:pt-40">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          <span aria-hidden="true" className="block h-px w-8 bg-ko-blue" />
          <h1 className="ko-display mt-6 max-w-[16ch] text-ko-ink">{t('postuler_titre')}</h1>
          <p className="mt-7 max-w-[56ch] text-base leading-relaxed text-ko-muted lg:text-lg">
            {t('postuler_intro')}
          </p>
        </div>
      </section>

      <section className="bg-ko-white py-16 lg:py-24">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          {titres.length === 0 ? (
            <p className="max-w-[52ch] text-base leading-relaxed text-ko-muted">
              {t('aucun_poste')}
            </p>
          ) : (
            <FormulaireCandidature
              postes={titres}
              posteInitial={posteInitial}
              libelles={libelles}
            />
          )}

          <Link
            href={ROUTES.carrieres}
            className="mt-12 inline-flex min-h-[44px] items-center text-sm text-ko-muted transition-colors duration-200 hover:text-ko-blue"
          >
            ← {t('postuler_retour')}
          </Link>
        </div>
      </section>
    </>
  )
}
