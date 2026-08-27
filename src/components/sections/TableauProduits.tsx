'use client'

import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'

import { basculerPublication, supprimerProduit } from '@/app/(admin)/[locale]/admin/catalogue/actions'
import {
  FormulaireProduit,
  type LibellesProduit,
  type Produit,
} from '@/components/sections/FormulaireProduit'
import { buttonVariants } from '@/components/ui/Button'
import { EtiquetteStock } from '@/components/ui/EtiquetteStock'
import {
  IconeAjouter,
  IconeCrayon,
  IconeFermer,
  IconeOeil,
  IconePoubelle,
} from '@/components/ui/Icones'
import { statutSuggere } from '@/lib/stock'
import { cn } from '@/lib/utils/cn'
import { premiereImage } from '@/lib/utils/premiereImage'

/**
 * Tableau du catalogue — vignette, informations, actions, formulaire en
 * surimpression.
 *
 * ---------------------------------------------------------------------------
 * UN SEUL <dialog>, PAS UN PAR PRODUIT
 *
 * Douze fenêtres montées d'avance, chacune avec son formulaire complet,
 * feraient douze fois les mêmes champs dans le document — et autant d'`id` à
 * rendre uniques. Une seule fenêtre, dont le contenu change selon le produit
 * choisi. La `key` sur le formulaire force React à le remonter à chaque
 * ouverture : sans elle, les champs garderaient les valeurs du produit
 * précédent, puisque `defaultValue` n'est lu qu'au montage.
 *
 * ---------------------------------------------------------------------------
 * LES TROIS ACTIONS
 *
 * L'œil ouvre un aperçu EN LECTURE SEULE, ici même — pas la fiche publique
 * dans un nouvel onglet. C'était le choix initial, corrigé par Christian.
 *
 * ⚠️ Ce choix corrigeait aussi un défaut réel, pas seulement une préférence :
 * au moment de la décision, /boutique/[slug] lisait encore `construireProduits()`
 * (le fichier produits.ts), pas cette table — un produit créé ici menait à un
 * 404 pur et simple. Depuis, lib/produits.ts lit directement produits_boutique
 * (lireProduitsPublies()) : le défaut a disparu, mais l'aperçu inline reste le
 * bon choix — pas de navigation qui ferme le tableau pour un simple coup d'œil.
 *
 * Le crayon ouvre le formulaire. La corbeille supprime, après confirmation, et
 * n'apparaît que pour un admin (politique produits_suppression_admin de 0002 —
 * le masquage est du confort, la garantie est côté base).
 * ---------------------------------------------------------------------------
 */

type ProduitAvecImages = Produit & { images: unknown }

export function TableauProduits({
  locale,
  produits,
  estAdmin,
  libelles,
  textes,
}: {
  locale: string
  produits: ProduitAvecImages[]
  estAdmin: boolean
  libelles: LibellesProduit
  textes: {
    vide: string
    publie: string
    horsLigne: string
    publier: string
    retirer: string
    voir: string
    modifier: string
    supprimer: string
    confirmer: string
    ajouter: string
    fermer: string
    titreEdition: string
    titreCreation: string
    titreDetail: string
    sansImage: string
    /**
     * Gabarit, pas une fonction — ex. « Page {page} sur {total} ».
     *
     * ⚠️ Une fonction ne traverse pas la frontière serveur → client (voir la
     * docstring de RealisationListe dans TableauRealisations.tsx pour le
     * plantage que ça a causé). La pagination, elle, vit entièrement ici,
     * côté client — impossible de précalculer « page 2 sur 3 » côté serveur
     * puisqu'on ne sait pas encore sur quelle page l'équipe cliquera. Un
     * gabarit textuel avec deux espaces réservés, complété par un simple
     * remplacement de chaîne, contourne le problème sans réintroduire une
     * fonction en prop.
     */
    pageGabarit: string
    pagePrecedente: string
    pageSuivante: string
    rechercheLabel: string
    recherchePlaceholder: string
    toutesCategories: string
    /** Distinct de `vide` : « rien du tout » n'est pas « rien pour ce filtre ». */
    videFiltre: string
  }
}) {
  // Lu une fois : NEXT_PUBLIC_* est figé à la compilation, et refaire le
  // découpage d'URL à chaque ligne du tableau n'apporte rien.
  const hoteStockage = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '')

  const libellesStatutStock: Record<string, string> = {
    en_stock: libelles.statutEnStock,
    rupture: libelles.statutRupture,
    en_commande: libelles.statutEnCommande,
    en_livraison: libelles.statutEnLivraison,
  }

  /**
   * Statut EFFECTIF, pas le statut brut de la base.
   *
   * ⚠️ Relevé par Christian sur un produit à quantité 0 : la fiche affichait
   * encore « En stock » (juste teinté de bleu), parce que le texte venait du
   * `statut_stock` STOCKÉ — resté à sa valeur par défaut de la migration 0013
   * pour tout produit jamais réenregistré depuis. `statutSuggere` (déjà
   * utilisée par le formulaire) recalcule ce que le statut DEVRAIT être
   * d'après la quantité, sans jamais toucher un statut fournisseur choisi à
   * la main — c'est cette version qu'on affiche, partout, pas la brute.
   */
  function libelleStock(statut: string, quantite: number): string {
    const effectif = statutSuggere(statut, quantite)
    return effectif === 'en_stock'
      ? `${quantite} ${libelles.quantite.toLowerCase()}`
      : (libellesStatutStock[effectif] ?? effectif)
  }

  /**
   * Recherche + filtre catégorie — même mécanique que CatalogueBoutique.tsx
   * (recherche publique) : les deux filtres SE CUMULENT, et la normalisation
   * NFD ignore les accents pour que « decoupe » trouve « découpe ».
   */
  const [categorie, setCategorie] = useState('all')
  const [recherche, setRecherche] = useState('')

  const produitsFiltres = useMemo(() => {
    const normaliser = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')

    const terme = normaliser(recherche.trim())

    return produits.filter((p) => {
      if (categorie !== 'all' && p.categorie !== categorie) return false
      if (terme === '') return true
      return normaliser(`${p.nom_fr} ${p.marque}`).includes(terme)
    })
  }, [produits, categorie, recherche])

  /**
   * Pagination — 8 produits par page.
   *
   * Entièrement côté client : les douze produits (et les quelques dizaines à
   * venir) sont déjà tous chargés d'un coup par la page serveur, qui trie par
   * `ordre`. Paginer côté serveur demanderait une route dédiée et un
   * paramètre d'URL pour un gain nul à cette échelle — la liste complète tient
   * largement en mémoire.
   *
   * Basée sur la liste FILTRÉE. Les deux champs de filtre remettent `page` à
   * 0 eux-mêmes (sinon une recherche tapée depuis la page 2 affiche une page
   * 2 qui n'a plus de sens pour ce sous-ensemble) ; le `Math.min` ci-dessous
   * reste un filet pour l'autre cas — une suppression qui fait disparaître la
   * dernière page affichée.
   */
  const PAR_PAGE = 8
  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(produitsFiltres.length / PAR_PAGE))
  // Se recale si un filtre ou une suppression fait disparaître la dernière page affichée.
  const pageActuelle = Math.min(page, totalPages - 1)
  const produitsPage = produitsFiltres.slice(
    pageActuelle * PAR_PAGE,
    pageActuelle * PAR_PAGE + PAR_PAGE,
  )

  const boite = useRef<HTMLDialogElement>(null)
  // `null` = création, un produit = édition, `undefined` = fermé.
  const [edite, setEdite] = useState<ProduitAvecImages | null | undefined>(undefined)

  useEffect(() => {
    const el = boite.current
    if (!el) return
    if (edite !== undefined && !el.open) el.showModal()
    if (edite === undefined && el.open) el.close()
  }, [edite])

  // Échap et la fermeture native passent par `close` : sans cette
  // synchronisation, l'état resterait rempli et rouvrir deviendrait impossible.
  useEffect(() => {
    const el = boite.current
    if (!el) return
    const fermer = () => setEdite(undefined)
    el.addEventListener('close', fermer)
    return () => el.removeEventListener('close', fermer)
  }, [])

  /**
   * Aperçu en lecture seule — dialogue SÉPARÉ de celui d'édition.
   *
   * Un seul état à trois positions (fermé / création / édition d'un produit
   * précis) aurait dû en accueillir une quatrième pour l'aperçu, avec un
   * risque de confondre « éditer ce produit » et « regarder ce produit » dans
   * le même type. Deux dialogues, deux états, chacun ne fait qu'une chose.
   */
  const boiteDetail = useRef<HTMLDialogElement>(null)
  const [voir, setVoir] = useState<ProduitAvecImages | undefined>(undefined)

  useEffect(() => {
    const el = boiteDetail.current
    if (!el) return
    if (voir !== undefined && !el.open) el.showModal()
    if (voir === undefined && el.open) el.close()
  }, [voir])

  useEffect(() => {
    const el = boiteDetail.current
    if (!el) return
    const fermer = () => setVoir(undefined)
    el.addEventListener('close', fermer)
    return () => el.removeEventListener('close', fermer)
  }, [])

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label htmlFor="recherche-catalogue-admin" className="sr-only">
            {textes.rechercheLabel}
          </label>
          <input
            id="recherche-catalogue-admin"
            type="search"
            value={recherche}
            onChange={(e) => {
              setPage(0)
              setRecherche(e.target.value)
            }}
            placeholder={textes.recherchePlaceholder}
            className="min-h-[40px] w-full border border-ko-line bg-ko-white px-3 py-2 text-sm text-ko-ink transition-colors duration-200 placeholder:text-ko-muted focus:border-ko-blue focus:outline-none sm:w-60"
          />

          <label htmlFor="filtre-categorie-admin" className="sr-only">
            {libelles.categorie}
          </label>
          <select
            id="filtre-categorie-admin"
            value={categorie}
            onChange={(e) => {
              setPage(0)
              setCategorie(e.target.value)
            }}
            className="min-h-[40px] border border-ko-line bg-ko-white px-3 py-2 text-sm text-ko-ink transition-colors duration-200 focus:border-ko-blue focus:outline-none"
          >
            <option value="all">{textes.toutesCategories}</option>
            {Object.entries(libelles.categories).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setEdite(null)}
          className={buttonVariants({ variant: 'primary', size: 'sm' })}
        >
          <IconeAjouter taille={16} />
          {textes.ajouter}
        </button>
      </div>

      <div className="border border-ko-line bg-ko-white">
        {produitsPage.length === 0 ? (
          <p className="p-6 text-base leading-relaxed text-ko-muted">
            {produits.length === 0 ? textes.vide : textes.videFiltre}
          </p>
        ) : (
          <ul className="divide-y divide-ko-line">
            {produitsPage.map((p) => {
              const image = premiereImage(p.images, hoteStockage)

              return (
                <li
                  key={p.id}
                  // `ko-cream` sans modificateur : cette couleur n'accepte pas
                  // l'opacité Tailwind (tailwind.config.ts) — `/60` ne
                  // générait aucune règle, la ligne ne réagissait pas au survol.
                  className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 transition-colors duration-200 hover:bg-ko-cream"
                >
                  {/* Vignette au même vocabulaire que la boutique : filet 1px,
                      fond blanc pur, `contain` ou `cover` selon le cadrage
                      enregistré. Un produit ne doit pas changer d'apparence
                      entre l'administration et la vitrine. */}
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden border border-ko-line bg-ko-photo">
                    {image ? (
                      // 64px partagé admin-wide, pas 48px — voir TableauRealisations.tsx.
                      <Image
                        src={image}
                        alt=""
                        fill
                        sizes="64px"
                        className={cn(
                          p.cadrage === 'cover' ? 'object-cover' : 'object-contain p-1',
                        )}
                      />
                    ) : (
                      <span className="sr-only">{textes.sansImage}</span>
                    )}
                  </div>

                  <span className="w-8 shrink-0 font-mono text-xs text-ko-muted">{p.ordre}</span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base text-ko-ink">{p.nom_fr}</span>
                    <span className="block truncate font-mono text-xs text-ko-muted">{p.slug}</span>
                  </span>

                  <span className="label-mono hidden shrink-0 lg:block">
                    {libelles.categories[p.categorie] ?? p.categorie}
                  </span>

                  <span className="w-24 shrink-0 text-right font-mono text-sm text-ko-ink">
                    {p.prix === null ? '—' : `${p.prix} $`}
                  </span>

                  {/* Suivi de stock — masqué sous lg, la ligne est déjà dense
                      à cette largeur. Le détail (l'œil) reste la source
                      complète sur mobile. */}
                  <span className="label-mono hidden w-28 shrink-0 xl:block">
                    <EtiquetteStock
                      statut={statutSuggere(p.statut_stock, p.quantite)}
                      quantite={p.quantite}
                      texte={libelleStock(p.statut_stock, p.quantite)}
                      className="justify-end"
                    />
                  </span>

                  {/* Publication : bouton et non simple étiquette — c'est le
                      geste le plus fréquent, il ne doit pas coûter l'ouverture
                      d'un formulaire. */}
                  <form action={basculerPublication} className="w-28 shrink-0 text-right">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="publie" value={String(p.publie)} />
                    <button
                      type="submit"
                      title={p.publie ? textes.retirer : textes.publier}
                      className={cn(
                        'label-mono min-h-[32px] px-2 transition-colors duration-200',
                        p.publie
                          ? 'text-ko-ink'
                          : 'text-ko-muted hover:text-ko-ink',
                      )}
                    >
                      {p.publie ? textes.publie : textes.horsLigne}
                    </button>
                  </form>

                  <div className="flex shrink-0 items-center gap-1">
                    {/* Icônes seules : `aria-label` pour le lecteur d'écran,
                        `title` pour la souris. Sans les deux, l'action est
                        indevinable. */}
                    <button
                      type="button"
                      onClick={() => setVoir(p)}
                      aria-label={`${textes.voir} — ${p.nom_fr}`}
                      title={textes.voir}
                      className="flex h-9 w-9 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink"
                    >
                      <IconeOeil taille={17} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setEdite(p)}
                      aria-label={`${textes.modifier} — ${p.nom_fr}`}
                      title={textes.modifier}
                      className="flex h-9 w-9 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink"
                    >
                      <IconeCrayon taille={17} />
                    </button>

                    {estAdmin && (
                      <form
                        action={supprimerProduit}
                        // Confirmation native : une suppression sans filet
                        // finit par partir d'un clic mal placé, et rien ici ne
                        // permet de revenir en arrière.
                        onSubmit={(e) => {
                          if (!confirm(`${textes.confirmer}\n\n${p.nom_fr}`)) e.preventDefault()
                        }}
                      >
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="id" value={p.id} />
                        <button
                          type="submit"
                          aria-label={`${textes.supprimer} — ${p.nom_fr}`}
                          title={textes.supprimer}
                          className="flex h-9 w-9 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink"
                        >
                          <IconePoubelle taille={17} />
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-4">
          <p className="label-mono text-ko-muted">
            {textes.pageGabarit
              .replace('{page}', String(pageActuelle + 1))
              .replace('{total}', String(totalPages))}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={pageActuelle === 0}
              aria-label={textes.pagePrecedente}
              title={textes.pagePrecedente}
              className="group flex h-9 w-9 items-center justify-center rounded-full border-2 border-ko-ink text-ko-ink transition-colors duration-200 hover:border-ko-blue disabled:cursor-not-allowed disabled:border-ko-line disabled:text-ko-line"
            >
              {/* `border-ko-ink` explicite sur le chevron : Tailwind ne colore
                  pas les bordures en `currentColor` par défaut, un
                  `border-b-2` seul retombe sur le gris clair du thème et
                  devient invisible — même défaut déjà corrigé dans
                  BandeauImages. */}
              <span
                aria-hidden="true"
                className="ml-0.5 h-2.5 w-2.5 rotate-45 border-b-2 border-l-2 border-ko-ink transition-colors duration-200 group-hover:border-ko-blue group-disabled:border-ko-line"
              />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={pageActuelle >= totalPages - 1}
              aria-label={textes.pageSuivante}
              title={textes.pageSuivante}
              className="group flex h-9 w-9 items-center justify-center rounded-full border-2 border-ko-ink text-ko-ink transition-colors duration-200 hover:border-ko-blue disabled:cursor-not-allowed disabled:border-ko-line disabled:text-ko-line"
            >
              <span
                aria-hidden="true"
                className="mr-0.5 h-2.5 w-2.5 rotate-45 border-r-2 border-t-2 border-ko-ink transition-colors duration-200 group-hover:border-ko-blue group-disabled:border-ko-line"
              />
            </button>
          </div>
        </div>
      )}

      <dialog
        ref={boite}
        aria-labelledby="titre-produit"
        onClick={(e) => {
          if (e.target === boite.current) boite.current?.close()
        }}
        className="w-[calc(100vw-2rem)] max-w-[760px] border border-ko-line bg-ko-white p-0 text-ko-ink shadow-card backdrop:bg-ko-scrim/60"
      >
        <div className="max-h-[85svh] overflow-y-auto p-6 lg:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <h2 id="titre-produit" className="ko-h3 text-[22px] text-ko-ink">
              {edite ? textes.titreEdition : textes.titreCreation}
            </h2>
            <button
              type="button"
              onClick={() => boite.current?.close()}
              aria-label={textes.fermer}
              className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink"
            >
              <IconeFermer taille={18} />
            </button>
          </div>

          {/* `key` : force le remontage à chaque changement de produit, sinon
              les `defaultValue` gardent les valeurs du précédent. */}
          {edite !== undefined && (
            <FormulaireProduit
              key={edite?.id ?? 'nouveau'}
              locale={locale}
              produit={edite ?? undefined}
              libelles={libelles}
            />
          )}
        </div>
      </dialog>

      {/*
        Aperçu en lecture seule.

        Même gabarit que le dialogue d'édition — filet 1px, en-tête avec titre
        et croix — pour que passer de l'un à l'autre ne dépayse pas. Le corps,
        lui, n'a aucun champ : uniquement du texte, à l'image de ce qu'un
        visiteur verrait sur une fiche produit.
      */}
      <dialog
        ref={boiteDetail}
        aria-labelledby="titre-detail-produit"
        onClick={(e) => {
          if (e.target === boiteDetail.current) boiteDetail.current?.close()
        }}
        className="w-[calc(100vw-2rem)] max-w-[560px] border border-ko-line bg-ko-white p-0 text-ko-ink shadow-card backdrop:bg-ko-scrim/60"
      >
        <div className="max-h-[85svh] overflow-y-auto p-6 lg:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <h2 id="titre-detail-produit" className="ko-h3 text-[22px] text-ko-ink">
              {textes.titreDetail}
            </h2>
            <button
              type="button"
              onClick={() => boiteDetail.current?.close()}
              aria-label={textes.fermer}
              className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink"
            >
              <IconeFermer taille={18} />
            </button>
          </div>

          {voir && (
            <div className="space-y-6">
              <div className="relative mx-auto h-64 w-full max-w-[320px] overflow-hidden border border-ko-line bg-ko-photo">
                {(() => {
                  const image = premiereImage(voir.images, hoteStockage)
                  return image ? (
                    // 256px partagé admin-wide, pas 320px — voir TableauRealisations.tsx.
                    <Image
                      src={image}
                      alt=""
                      fill
                      sizes="256px"
                      className={cn(
                        voir.cadrage === 'cover' ? 'object-cover' : 'object-contain p-5',
                      )}
                    />
                  ) : (
                    <span className="sr-only">{textes.sansImage}</span>
                  )
                })()}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <span className="label-mono">
                  {libelles.categories[voir.categorie] ?? voir.categorie}
                </span>
                <span
                  className={cn(
                    'label-mono',
                    voir.publie ? 'text-ko-ink' : 'text-ko-muted',
                  )}
                >
                  {voir.publie ? textes.publie : textes.horsLigne}
                </span>
              </div>

              <div>
                <h3 className="ko-h3 text-[22px] text-ko-ink">{voir.nom_fr}</h3>
                <p className="mt-1.5 font-mono text-base text-ko-ink">
                  {voir.prix === null ? '—' : `${voir.prix} $`}
                </p>
              </div>

              {voir.description_fr && (
                <p className="whitespace-pre-line text-sm leading-relaxed text-ko-ink">
                  {voir.description_fr}
                </p>
              )}

              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-ko-line pt-5 sm:grid-cols-3">
                <div>
                  <dt className="label-mono text-ko-muted">{libelles.marque}</dt>
                  <dd className="mt-1 text-sm text-ko-ink">{voir.marque}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="label-mono text-ko-muted">{libelles.slug}</dt>
                  <dd className="mt-1 truncate font-mono text-sm text-ko-ink">{voir.slug}</dd>
                </div>
                <div>
                  <dt className="label-mono text-ko-muted">{libelles.ordre}</dt>
                  <dd className="mt-1 text-sm text-ko-ink">{voir.ordre}</dd>
                </div>
                <div>
                  <dt className="label-mono text-ko-muted">{libelles.quantite}</dt>
                  <dd className="mt-1 text-sm text-ko-ink">{voir.quantite}</dd>
                </div>
                <div>
                  <dt className="label-mono text-ko-muted">{libelles.statutStock}</dt>
                  <dd className="mt-1 text-sm">
                    <EtiquetteStock
                      statut={statutSuggere(voir.statut_stock, voir.quantite)}
                      quantite={voir.quantite}
                      texte={libelleStock(voir.statut_stock, voir.quantite)}
                    />
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </dialog>
    </>
  )
}
