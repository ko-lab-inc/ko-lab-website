'use client'

import { useFormatter, useTranslations } from 'next-intl'

import { buttonVariants } from '@/components/ui/Button'
import { IconeMoins, IconePlus } from '@/components/ui/Icones'
import { Link } from '@/i18n/navigation'
import { usePanier } from '@/lib/panier/PanierContext'
import { ROUTES } from '@/lib/routes'

/**
 * Récapitulatif de la sélection.
 *
 * Le prix indicatif par ligne est affiché — cohérent avec la boutique et la
 * fiche produit, qui le montrent déjà — de même que le total, demandé par
 * Christian une fois les prix visibles partout ailleurs dans le parcours.
 * « Indicatif » reste le mot clé, répété sur le total lui-même : la somme de
 * prix provisoires reste elle-même provisoire, jamais une facture.
 */
export function PagePanier({ prix }: { prix: Record<string, number | null> }) {
  const t = useTranslations('Panier')
  const format = useFormatter()
  const { articles, pret, retirer, changerQuantite } = usePanier()

  // Somme uniquement les articles dont le prix indicatif est connu — un
  // article `null` (prix sur demande) ne doit ni fausser le total ni le
  // bloquer silencieusement.
  const total = articles.reduce((somme, a) => {
    const p = prix[a.slug]
    return p != null ? somme + p * a.quantite : somme
  }, 0)
  const nbSansPrix = articles.filter((a) => prix[a.slug] == null).length

  // Rien tant que localStorage n'est pas lu : le serveur ignore le panier,
  // afficher « vide » puis le contenu produirait un clignotement.
  if (!pret) return <div className="min-h-[280px]" />

  if (articles.length === 0) {
    return (
      <div className="border border-ko-line bg-ko-cream p-8 lg:p-12">
        <p className="ko-h3 text-ko-ink">{t('vide_titre')}</p>
        <p className="mt-4 max-w-[46ch] text-base leading-relaxed text-ko-muted">
          {t('vide_texte')}
        </p>
        <Link href={ROUTES.boutique} className={`mt-8 ${buttonVariants({ variant: 'primary' })}`}>
          {t('vide_lien')}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    )
  }

  return (
    <>
      <p className="label-mono">{t('articles', { n: articles.length })}</p>

      <ul className="mt-6 divide-y divide-ko-line border-y border-ko-line">
        {articles.map((article) => {
          const prixArticle = prix[article.slug]

          return (
            <li
              key={article.slug}
              className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
            >
              <div className="min-w-0">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ko-blue">
                  {article.categorie}
                </p>
                <p className="mt-2 font-serif text-[20px] leading-tight text-ko-ink">
                  {article.nom}
                </p>
                {prixArticle != null && (
                  <p className="mt-1 font-mono text-sm text-ko-muted">
                    {format.number(prixArticle, {
                      style: 'currency',
                      currency: 'CAD',
                      maximumFractionDigits: 0,
                    })}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-6">
                {/* Même contrôle que la boutique (BoutonAjouter) : un
                    sélecteur natif <input type=number> ici brisait la
                    cohérence visuelle et dépendait du thème du navigateur
                    pour ses flèches +/-, parfois à peine visibles. */}
                <div className="flex items-center border border-ko-line">
                  <button
                    type="button"
                    onClick={() => changerQuantite(article.slug, Math.max(1, article.quantite - 1))}
                    disabled={article.quantite <= 1}
                    aria-label={`${t('quantite')} −`}
                    className="flex h-11 w-10 items-center justify-center text-ko-ink transition-colors duration-200 hover:text-ko-blue disabled:opacity-40"
                  >
                    <IconeMoins taille={14} />
                  </button>

                  <span
                    aria-live="polite"
                    className="min-w-[2.5rem] text-center font-mono text-sm text-ko-ink"
                  >
                    {article.quantite}
                  </span>

                  <button
                    type="button"
                    onClick={() => changerQuantite(article.slug, article.quantite + 1)}
                    aria-label={`${t('quantite')} +`}
                    className="flex h-11 w-10 items-center justify-center text-ko-ink transition-colors duration-200 hover:text-ko-blue"
                  >
                    <IconePlus taille={14} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => retirer(article.slug)}
                  className="min-h-[44px] border-b border-ko-line pb-0.5 text-sm text-ko-muted transition-colors duration-200 hover:border-ko-ink hover:text-ko-ink"
                >
                  {t('retirer')}
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {total > 0 && (
        <div className="mt-8 flex items-baseline justify-between border-b border-ko-line pb-8">
          <p className="font-mono text-base text-ko-ink">
            {t('total_indicatif', {
              prix: format.number(total, {
                style: 'currency',
                currency: 'CAD',
                maximumFractionDigits: 0,
              }),
            })}
          </p>
          {nbSansPrix > 0 && (
            <p className="text-sm text-ko-muted">{t('total_note_partiel')}</p>
          )}
        </div>
      )}

      <div className="mt-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-8">
        {/* `?type=boutique` sert uniquement à présélectionner le type de
            demande. La LISTE, elle, transite par le contexte — jamais par
            l'URL, qui deviendrait vite illisible et falsifiable. */}
        <Link
          href={`${ROUTES.contact}?type=boutique`}
          className={buttonVariants({ variant: 'primary' })}
        >
          {t('envoyer')}
          <span aria-hidden="true">→</span>
        </Link>

        <Link href={ROUTES.boutique} className={buttonVariants({ variant: 'text' })}>
          {t('continuer')}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </>
  )
}
