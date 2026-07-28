'use client'

import { useTranslations } from 'next-intl'

import { buttonVariants } from '@/components/ui/Button'
import { Link } from '@/i18n/navigation'
import { usePanier } from '@/lib/panier/PanierContext'
import { ROUTES } from '@/lib/routes'

/**
 * Récapitulatif de la demande de prix.
 *
 * Aucun montant, aucun sous-total, aucun total : le catalogue fonctionne sur
 * demande de prix, afficher une somme contredirait le positionnement et
 * transformerait la page en facture (skill 21, phase 1).
 */
export function PagePanier() {
  const t = useTranslations('Panier')
  const { articles, pret, retirer, changerQuantite } = usePanier()

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
        {articles.map((article) => (
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
            </div>

            <div className="flex shrink-0 items-center gap-6">
              <label className="flex items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-ko-muted">
                  {t('quantite')}
                </span>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={article.quantite}
                  onChange={(e) => changerQuantite(article.slug, Number(e.target.value))}
                  className="min-h-[44px] w-20 border border-ko-line bg-ko-white px-3 py-2 text-base text-ko-ink focus:border-ko-blue focus:outline-none"
                />
              </label>

              <button
                type="button"
                onClick={() => retirer(article.slug)}
                className="min-h-[44px] border-b border-ko-line pb-0.5 text-sm text-ko-muted transition-colors duration-200 hover:border-ko-ink hover:text-ko-ink"
              >
                {t('retirer')}
              </button>
            </div>
          </li>
        ))}
      </ul>

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
