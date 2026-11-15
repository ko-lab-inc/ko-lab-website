import { getLocale } from 'next-intl/server'

import { buttonVariants } from '@/components/ui/Button'
import { JsonLd } from '@/components/ui/JsonLd'
import { Reveal } from '@/components/ui/Reveal'
import { Link } from '@/i18n/navigation'
import { contenuGeo } from '@/lib/geo/contenu'
import { jsonLdFaq } from '@/lib/geo/json-ld'
import { lireReglages } from '@/lib/reglages'
import { ROUTES } from '@/lib/routes'

import type { AppLocale } from '@/i18n/routing'
import type { CleService, Comparatif, Fait, QuestionReponse } from '@/lib/geo/contenu'

/**
 * Blocs « GEO » des pages de services : faits clés, tableaux comparatifs et
 * questions fréquentes (propositions 3, 4 et 5 du 3 novembre 2026).
 *
 * Tout est du TEXTE dans le HTML servi : pas d'image, pas d'accordéon fermé,
 * pas de contenu chargé après coup. C'est ce qu'un moteur de réponse lit, et
 * c'est aussi ce que le skill 08 autorise : lignes fines de 1px, colonnes
 * éditoriales, aucune couleur ajoutée. Les classes sont celles des sections
 * voisines (bg-ko-white, text-ko-ink, border-ko-line), donc le thème sombre
 * s'y applique sans règle nouvelle.
 *
 * Server Components : aucun JavaScript envoyé, hormis le fondu de <Reveal>
 * déjà présent partout.
 */

/** Liste de faits en clair : un terme, sa valeur, un filet entre chaque. */
export function FaitsCles({ faits }: { faits: readonly Fait[] }) {
  return (
    <dl className="divide-y divide-ko-line border-y border-ko-line">
      {faits.map((fait) => (
        <div
          key={fait.terme}
          className="grid grid-cols-1 gap-1 py-4 md:grid-cols-[minmax(0,0.32fr)_minmax(0,1fr)] md:gap-8"
        >
          <dt className="font-mono text-[11px] uppercase leading-relaxed tracking-widest text-ko-muted md:pt-1">
            {fait.terme}
          </dt>
          <dd className="text-base leading-relaxed text-ko-ink">{fait.valeur}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Tableau comparatif. Un vrai <table>, avec <caption> et en-têtes de ligne :
 * c'est la structure que lisent les lecteurs d'écran et les robots.
 *
 * Sous 768px, le tableau S'EMPILE : chaque critère devient un bloc, chaque
 * cellule passe sous son libellé de colonne. La première version défilait
 * horizontalement (min-width 560px) et, sur un téléphone, la dernière colonne
 * sortait de l'écran. Or c'est justement celle de KO-LAB (vérifié à 390px).
 * Les libellés répétés sont masqués dès que les vraies en-têtes reviennent.
 */
export function TableauComparatif({ comparatif }: { comparatif: Comparatif }) {
  const [, ...optionsEnTete] = comparatif.colonnes
  const ENTETE = 'font-mono text-[11px] font-normal uppercase tracking-widest text-ko-muted'
  return (
    <table className="block w-full border-collapse text-left md:table">
      <caption className="sr-only">{comparatif.titre}</caption>
      <thead className="hidden md:table-header-group">
        <tr className="border-b border-ko-line">
          <th scope="col" className={`w-[24%] py-3 pr-6 ${ENTETE}`}>
            {/* Première colonne : parfois sans titre (les critères parlent
                d'eux-mêmes). Un texte masqué garde l'en-tête accessible. */}
            {comparatif.colonnes[0] || <span className="sr-only">Critère</span>}
          </th>
          {optionsEnTete.map((colonne) => (
            <th key={colonne} scope="col" className={`py-3 pr-6 last:pr-0 ${ENTETE}`}>
              {colonne}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="block divide-y divide-ko-line border-y border-ko-line md:table-row-group md:border-t-0">
        {comparatif.lignes.map(([critere, ...cellules]) => (
          <tr key={critere} className="block py-5 md:table-row md:py-0">
            <th
              scope="row"
              className="block text-base font-medium leading-relaxed text-ko-ink md:table-cell md:py-4 md:pr-6 md:align-top md:text-sm"
            >
              {critere}
            </th>
            {cellules.map((cellule, i) => (
              <td
                key={`${critere}-${i}`}
                // La DERNIÈRE colonne est toujours l'option mise de l'avant
                // (KO-LAB, ou la formule décrite) : texte principal. Les
                // autres restent en texte secondaire.
                className={
                  i === cellules.length - 1
                    ? 'mt-3 block text-sm leading-relaxed text-ko-ink md:mt-0 md:table-cell md:py-4 md:align-top'
                    : 'mt-3 block text-sm leading-relaxed text-ko-muted md:mt-0 md:table-cell md:py-4 md:pr-6 md:align-top'
                }
              >
                <span aria-hidden="true" className={`mb-1 block md:hidden ${ENTETE}`}>
                  {optionsEnTete[i]}
                </span>
                {cellule}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Questions et réponses en clair, toutes dépliées. */
export function ListeFaq({ questions }: { questions: readonly QuestionReponse[] }) {
  return (
    <div className="divide-y divide-ko-line border-y border-ko-line">
      {questions.map((q) => (
        <div key={q.question} className="py-6">
          <h3 className="text-base font-medium leading-snug text-ko-ink lg:text-lg">{q.question}</h3>
          <p className="mt-3 max-w-[70ch] text-sm leading-relaxed text-ko-muted lg:text-base">
            {q.reponse}
          </p>
        </div>
      ))}
    </div>
  )
}

/**
 * Section complète d'une page de service : faits clés, comparatif(s), FAQ,
 * et le bloc FAQPage correspondant.
 *
 * Ne rend RIEN en anglais : le contenu n'existe qu'en français pour ce lot
 * (voir lib/geo/contenu.ts), et afficher du français sur /en serait pire que
 * ne rien afficher.
 */
export async function SectionGeoService({ service }: { service: CleService }) {
  const locale = (await getLocale()) as AppLocale
  const contenu = contenuGeo(locale, await lireReglages())
  if (!contenu) return null

  const { libelles } = contenu
  const { faits, comparatifs, faq } = contenu.services[service]

  return (
    <section className="border-t border-ko-line bg-ko-white py-16 lg:py-24">
      <JsonLd donnees={jsonLdFaq(faq)} />

      <div className="mx-auto max-w-container space-y-16 px-6 lg:space-y-24 lg:px-16">
        <Reveal>
          <p className="label-mono">{libelles.enBref}</p>
          <h2 className="ko-h3 mt-5 text-ko-ink">{libelles.faitsTitre}</h2>
          <div className="mt-8">
            <FaitsCles faits={faits} />
          </div>
        </Reveal>

        {comparatifs.map((comparatif) => (
          <Reveal key={comparatif.titre}>
            <p className="label-mono">{libelles.comparerLabel}</p>
            <h2 className="ko-h3 mt-5 text-ko-ink">{comparatif.titre}</h2>
            <div className="mt-8">
              <TableauComparatif comparatif={comparatif} />
            </div>
          </Reveal>
        ))}

        <Reveal>
          <p className="label-mono">{libelles.faqLabel}</p>
          <h2 className="ko-h3 mt-5 text-ko-ink">{libelles.faqTitre}</h2>
          <div className="mt-8">
            <ListeFaq questions={faq} />
          </div>
          <Link href={ROUTES.faq} className={`mt-8 ${buttonVariants({ variant: 'text' })}`}>
            {libelles.voirFaq}
            <span aria-hidden="true">→</span>
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
