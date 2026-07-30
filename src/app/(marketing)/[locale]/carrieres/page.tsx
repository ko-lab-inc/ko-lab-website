import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { buttonVariants } from '@/components/ui/Button'
import { Reveal } from '@/components/ui/Reveal'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { lireOffresPubliees } from '@/lib/carrieres'
import { ROUTES } from '@/lib/routes'

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
  const publiees = await lireOffresPubliees()

  const libellesType: Record<string, string> = {
    'temps-plein': t('type_temps_plein'),
    'temps-partiel': t('type_temps_partiel'),
    contrat: t('type_contrat'),
    saisonnier: t('type_saisonnier'),
    etudiant: t('type_etudiant'),
  }

  let postes: { cle: string; numero: string; titre: string; departement: string; type: string; description: string; exigences: string[] }[]

  if (publiees) {
    postes = publiees.map((p, i) => ({
      cle: p.id,
      numero: String(i + 1).padStart(2, '0'),
      titre: p.titre,
      departement: p.departement,
      type: libellesType[p.type] ?? p.type,
      description: p.description,
      exigences: p.exigences,
    }))
  } else {
    // Traducteurs cadrés par poste : chaque clé est ainsi vérifiée à la
    // compilation contre son seul espace de noms.
    const [tOp, tSup, tChef] = await Promise.all([
      getTranslations('Carrieres.postes.operateur'),
      getTranslations('Carrieres.postes.superviseur'),
      getTranslations('Carrieres.postes.chef_equipe'),
    ])

    postes = [tOp, tSup, tChef].map((tp, i) => ({
      cle: ['operateur', 'superviseur', 'chef_equipe'][i] ?? String(i),
      numero: String(i + 1).padStart(2, '0'),
      titre: tp('titre'),
      departement: tp('departement'),
      type: t('type_temps_plein'),
      description: tp('description'),
      exigences: [tp('exigence_1'), tp('exigence_2'), tp('exigence_3'), tp('exigence_4')],
    }))
  }

  return (
    <>
      {/* En-tête sobre, sans photo — même traitement que Réalisations. */}
      <section className="border-b border-ko-line bg-ko-cream pb-14 pt-28 lg:pb-20 lg:pt-40">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          <span aria-hidden="true" className="block h-px w-8 bg-ko-blue" />
          <h1 className="ko-display mt-6 max-w-[16ch] text-ko-ink">{t('title')}</h1>
          <p className="mt-7 max-w-[52ch] text-base leading-relaxed text-ko-muted lg:text-lg">
            {t('intro')}
          </p>
        </div>
      </section>

      <section className="bg-ko-white py-16 lg:py-24">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          <ul className="border-t border-ko-line">
            {postes.map((poste) => (
              <li key={poste.cle}>
                <Reveal>
                  <article className="grid grid-cols-1 gap-8 border-b border-ko-line py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 lg:py-16">
                    {/* Colonne gauche : identité du poste */}
                    <div>
                      <div className="flex items-baseline gap-4">
                        <span className="font-serif text-[28px] font-light leading-none text-ko-cream2">
                          {poste.numero}
                        </span>
                        <span className="label-mono">{poste.departement}</span>
                      </div>

                      <h2 className="ko-h2 mt-4 max-w-[16ch] text-ko-ink">{poste.titre}</h2>

                      <p className="mt-4 inline-flex items-center border border-ko-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-ko-muted">
                        {poste.type}
                      </p>

                      <p className="mt-6 max-w-[46ch] text-base leading-relaxed text-ko-muted">
                        {poste.description}
                      </p>
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

                      {/* ?type=carriere présélectionne le formulaire de contact.
                          Le paramètre y est validé contre TYPES_DEMANDE — une
                          valeur d'URL reste une entrée utilisateur. */}
                      <Link
                        href={`${ROUTES.contact}?type=carriere`}
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
    </>
  )
}
