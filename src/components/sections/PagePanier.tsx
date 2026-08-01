'use client'

import Image from 'next/image'
import { useFormatter, useTranslations } from 'next-intl'
import { useState } from 'react'

import { buttonVariants } from '@/components/ui/Button'
import { IconeMoins, IconePlus } from '@/components/ui/Icones'
import { FormulaireCommande } from '@/components/sections/FormulaireCommande'
import { ModaleAuth } from '@/components/sections/ModaleAuth'
import { Link } from '@/i18n/navigation'
import { usePanier } from '@/lib/panier/PanierContext'
import type { FichePanier } from '@/lib/produits'
import { ROUTES, routeProduit } from '@/lib/routes'
import { cn } from '@/lib/utils/cn'

/**
 * Récapitulatif de la sélection.
 *
 * Le prix indicatif par ligne est affiché — cohérent avec la boutique et la
 * fiche produit, qui le montrent déjà — de même que le total, demandé par
 * Christian une fois les prix visibles partout ailleurs dans le parcours.
 * « Indicatif » reste le mot clé, répété sur le total lui-même : la somme de
 * prix provisoires reste elle-même provisoire, jamais une facture.
 */
export function PagePanier({
  locale,
  fiches,
}: {
  locale: string
  fiches: Record<string, FichePanier>
}) {
  const t = useTranslations('Panier')
  const format = useFormatter()
  const { articles, pret, retirer, changerQuantite, connecte } = usePanier()

  // `authentifie` : succès de la modale PENDANT cette visite — voir la note
  // au-dessus du bouton de confirmation plus bas.
  const [modaleOuverte, setModaleOuverte] = useState(false)
  const [authentifie, setAuthentifie] = useState(false)

  // Somme uniquement les articles dont le prix indicatif est connu — un
  // article `null` (prix sur demande) ne doit ni fausser le total ni le
  // bloquer silencieusement. `?.` obligatoire : le panier peut contenir un
  // slug retiré du catalogue depuis, et noUncheckedIndexedAccess le rappelle.
  const total = articles.reduce((somme, a) => {
    const p = fiches[a.slug]?.prix
    return p != null ? somme + p * a.quantite : somme
  }, 0)
  const nbSansPrix = articles.filter((a) => fiches[a.slug]?.prix == null).length

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
          const fiche = fiches[article.slug]

          return (
            <li
              key={article.slug}
              className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
            >
              {/* Vignette + texte dans UNE seule ancre vers la fiche produit.
                  Son nom accessible vient du texte qu'elle contient — le nom
                  du produit — pas de l'image, qui reste en `alt=""`. Envelopper
                  les deux évite de créer deux liens voisins vers la même page,
                  le défaut qu'on vient de corriger dans la grille.

                  Le sélecteur de quantité et « Retirer » restent DEHORS : ce
                  sont des <button>, et un bouton dans un lien est du HTML
                  invalide. */}
              <Link
                href={routeProduit(article.slug)}
                className="group flex min-w-0 items-center gap-5"
              >
                {/* Vignette — même vocabulaire de cadre que la grille et la
                    fiche produit : filet 1px, blanc pur, `contain` pour un
                    visuel détouré et `cover` pour une photo de scène. Un
                    troisième traitement ici ferait lire trois boutiques
                    différentes pour un même produit.

                    80 px puis 96 px : assez pour reconnaître la machine d'un
                    coup d'œil sans transformer le récapitulatif en seconde
                    grille — le sujet de cette page reste la liste et le
                    total, pas la découverte des produits. */}
                <div className="relative h-20 w-20 shrink-0 overflow-hidden border border-ko-line bg-ko-photo transition-colors duration-200 group-hover:border-ko-blue sm:h-24 sm:w-24">
                  {fiche?.src && (
                    <Image
                      src={fiche.src}
                      // Décoratif : le nom du produit est juste à côté, le
                      // répéter en alternative ferait doublon au lecteur
                      // d'écran.
                      alt=""
                      fill
                      sizes="96px"
                      className={cn(
                        fiche.cadrage === 'cover' ? 'object-cover' : 'object-contain p-2',
                      )}
                    />
                  )}
                  {/* Pas de visuel : le cadre vide suffit. Le placeholder
                      complet (carré + libellé « photo terrain ») est illisible
                      à 80 px et attirerait l'œil sur ce qui manque. */}
                </div>

                <div className="min-w-0">
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ko-blue">
                    {article.categorie}
                  </p>
                  <p className="mt-2 font-serif text-[20px] leading-tight text-ko-ink transition-colors duration-200 group-hover:text-ko-blue">
                    {article.nom}
                  </p>
                  {fiche?.prix != null && (
                    <p className="mt-1 font-mono text-sm text-ko-muted">
                      {format.number(fiche.prix, {
                        style: 'currency',
                        currency: 'CAD',
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  )}
                </div>
              </Link>

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
                    // Plafonné au stock réel — même règle que BoutonAjouter
                    // (lib/produits.ts, quantiteDisponible). `?? Infinity` :
                    // un slug retiré du catalogue depuis n'a plus de fiche,
                    // mieux vaut ne rien bloquer qu'empêcher silencieusement
                    // toute modification d'une ligne déjà obsolète.
                    disabled={article.quantite >= (fiche?.quantiteDisponible ?? Infinity)}
                    aria-label={`${t('quantite')} +`}
                    className="flex h-11 w-10 items-center justify-center text-ko-ink transition-colors duration-200 hover:text-ko-blue disabled:opacity-40"
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

      {/*
        ⚠️ COMPTE EXIGÉ AVANT LA CONFIRMATION — décision de Christian, revue le
        1er août 2026 : authentification obligatoire, mais déclenchée à
        L'INSTANT de confirmer, jamais avant. Naviguer et remplir le panier
        restent 100% anonymes (PanierContext, inchangé) ; seule la
        confirmation exige une session.

        `connecte` vient de PanierContext (dérivé de /api/session, aucun appel
        réseau de plus ici). `authentifie` est un succès LOCAL À CETTE VISITE,
        obtenu via la modale sans quitter la page — sans cet état, revenir sur
        /boutique/demande après connexion afficherait encore l'invite, le
        temps que /api/session confirme ce qu'on vient d'apprendre autrement.
      */}
      <div className="mt-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-8">
        {connecte === true || authentifie ? (
          <FormulaireCommande locale={locale} articles={articles} />
        ) : (
          <div>
            <p className="mb-3 max-w-[46ch] text-sm leading-relaxed text-ko-muted">
              {t('compte_requis_texte')}
            </p>
            <button
              type="button"
              onClick={() => setModaleOuverte(true)}
              className={buttonVariants({ variant: 'primary' })}
            >
              {t('compte_requis_bouton')}
              <span aria-hidden="true">→</span>
            </button>
            <ModaleAuth
              ouverte={modaleOuverte}
              locale={locale}
              onFermer={() => setModaleOuverte(false)}
              onSucces={() => {
                setAuthentifie(true)
                setModaleOuverte(false)
              }}
            />
          </div>
        )}

        <Link href={ROUTES.boutique} className={buttonVariants({ variant: 'text' })}>
          {t('continuer')}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </>
  )
}
