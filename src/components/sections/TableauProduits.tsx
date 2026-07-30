'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

import { basculerPublication, supprimerProduit } from '@/app/(admin)/[locale]/admin/catalogue/actions'
import {
  FormulaireProduit,
  type LibellesProduit,
  type Produit,
} from '@/components/sections/FormulaireProduit'
import { buttonVariants } from '@/components/ui/Button'
import {
  IconeAjouter,
  IconeCrayon,
  IconeFermer,
  IconeOeil,
  IconePoubelle,
} from '@/components/ui/Icones'
import { cn } from '@/lib/utils/cn'

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
 * ⚠️ Ce choix corrige aussi un défaut réel, pas seulement une préférence :
 * /boutique/[slug] lit encore `construireProduits()` (le fichier produits.ts),
 * PAS cette table. Le lien ne montrait donc jamais ce produit-ci — pour les
 * douze produits d'origine il tombait sur une fiche qui ignore les
 * modifications faites ici, et pour un produit créé depuis cet écran il
 * menait à un 404 pur et simple, puisque son slug n'existe nulle part dans
 * produits.ts.
 *
 * Pas de lien de secours vers cette même URL dans l'aperçu : ce serait
 * proposer, pour la plupart des produits, un bouton qui mène soit à un 404
 * soit à des informations obsolètes. Le jour où /boutique/[slug] lira cette
 * table, ce lien redeviendra pertinent partout — pas avant.
 *
 * Le crayon ouvre le formulaire. La corbeille supprime, après confirmation, et
 * n'apparaît que pour un admin (politique produits_suppression_admin de 0002 —
 * le masquage est du confort, la garantie est côté base).
 * ---------------------------------------------------------------------------
 */

type ProduitAvecImages = Produit & { images: unknown }

/**
 * Première image du tableau jsonb, ou null.
 *
 * Le contenu vient de la base : on ne suppose ni sa forme ni son type.
 *
 * ⚠️ Deux origines légitimes, et deux seulement. Les douze produits d'origine
 * portent un chemin local (`/images/...`) ; ceux téléversés depuis cet écran
 * portent l'URL publique du bucket Supabase. Une version antérieure n'acceptait
 * que le chemin local : toute photo téléversée depuis l'administration
 * disparaissait silencieusement de la vignette.
 *
 * Ce qui n'est ni l'un ni l'autre est écarté. `next/image` refuserait de toute
 * façon un hôte absent de `remotePatterns`, mais l'échec arriverait au rendu,
 * en cassant la ligne entière plutôt qu'une seule vignette.
 */
function premiereImage(images: unknown, hoteStockage: string): string | null {
  if (!Array.isArray(images)) return null
  const premiere = images[0]
  if (typeof premiere !== 'string') return null

  if (premiere.startsWith('/')) return premiere
  if (hoteStockage && premiere.startsWith(`${hoteStockage}/storage/v1/object/public/`)) {
    return premiere
  }
  return null
}

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
   * Pagination — 8 produits par page.
   *
   * Entièrement côté client : les douze produits (et les quelques dizaines à
   * venir) sont déjà tous chargés d'un coup par la page serveur, qui trie par
   * `ordre`. Paginer côté serveur demanderait une route dédiée et un
   * paramètre d'URL pour un gain nul à cette échelle — la liste complète tient
   * largement en mémoire.
   */
  const PAR_PAGE = 8
  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(produits.length / PAR_PAGE))
  // Se recale si une suppression fait disparaître la dernière page affichée.
  const pageActuelle = Math.min(page, totalPages - 1)
  const produitsPage = produits.slice(pageActuelle * PAR_PAGE, pageActuelle * PAR_PAGE + PAR_PAGE)

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
      <div className="mb-5 flex justify-end">
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
          <p className="p-6 text-base leading-relaxed text-ko-muted">{textes.vide}</p>
        ) : (
          <ul className="divide-y divide-ko-line">
            {produitsPage.map((p) => {
              const image = premiereImage(p.images, hoteStockage)

              return (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 transition-colors duration-200 hover:bg-ko-cream/60"
                >
                  {/* Vignette au même vocabulaire que la boutique : filet 1px,
                      fond blanc pur, `contain` ou `cover` selon le cadrage
                      enregistré. Un produit ne doit pas changer d'apparence
                      entre l'administration et la vitrine. */}
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden border border-ko-line bg-ko-photo">
                    {image ? (
                      <Image
                        src={image}
                        alt=""
                        fill
                        sizes="48px"
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

                  <span className="label-mono hidden shrink-0 text-ko-blue lg:block">
                    {libelles.categories[p.categorie] ?? p.categorie}
                  </span>

                  <span className="w-24 shrink-0 text-right font-mono text-sm text-ko-ink">
                    {p.prix === null ? '—' : `${p.prix} $`}
                  </span>

                  {/* Suivi de stock — masqué sous lg, la ligne est déjà dense
                      à cette largeur. Le détail (l'œil) reste la source
                      complète sur mobile. */}
                  <span className="label-mono hidden w-28 shrink-0 text-right text-ko-muted xl:block">
                    {p.statut_stock === 'en_stock'
                      ? `${p.quantite} ${libelles.quantite.toLowerCase()}`
                      : libellesStatutStock[p.statut_stock] ?? p.statut_stock}
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
                          ? 'text-ko-blue hover:text-ko-ink'
                          : 'text-ko-muted hover:text-ko-blue',
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
                      className="flex h-9 w-9 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-blue"
                    >
                      <IconeOeil taille={17} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setEdite(p)}
                      aria-label={`${textes.modifier} — ${p.nom_fr}`}
                      title={textes.modifier}
                      className="flex h-9 w-9 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-blue"
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
              className="group flex h-9 w-9 items-center justify-center rounded-full border-2 border-ko-ink text-ko-ink transition-colors duration-200 hover:border-ko-blue hover:text-ko-blue disabled:cursor-not-allowed disabled:border-ko-line disabled:text-ko-line"
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
              className="group flex h-9 w-9 items-center justify-center rounded-full border-2 border-ko-ink text-ko-ink transition-colors duration-200 hover:border-ko-blue hover:text-ko-blue disabled:cursor-not-allowed disabled:border-ko-line disabled:text-ko-line"
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

        ⚠️ Les deux mêmes replis qu'ailleurs dans ce fichier : `nom_en ??
        nom_fr` et `description_en ?? description_fr` retrouvent le texte
        entré quelle qu'ait été la langue choisie au formulaire — c'est
        exactement le calcul que FormulaireProduit fait pour pré-remplir ses
        propres champs, reproduit ici pour que l'aperçu affiche la même chose
        que ce que l'édition montrerait.
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
                    <Image
                      src={image}
                      alt=""
                      fill
                      sizes="320px"
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
                <span className="label-mono text-ko-blue">
                  {libelles.categories[voir.categorie] ?? voir.categorie}
                </span>
                <span
                  className={cn(
                    'label-mono',
                    voir.publie ? 'text-ko-blue' : 'text-ko-muted',
                  )}
                >
                  {voir.publie ? textes.publie : textes.horsLigne}
                </span>
              </div>

              <div>
                <h3 className="ko-h3 text-[22px] text-ko-ink">{voir.nom_en ?? voir.nom_fr}</h3>
                <p className="mt-1.5 font-mono text-base text-ko-ink">
                  {voir.prix === null ? '—' : `${voir.prix} $`}
                </p>
              </div>

              {(voir.description_en ?? voir.description_fr) && (
                <p className="whitespace-pre-line text-sm leading-relaxed text-ko-ink">
                  {voir.description_en ?? voir.description_fr}
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
                  <dd className="mt-1 text-sm text-ko-ink">
                    {libellesStatutStock[voir.statut_stock] ?? voir.statut_stock}
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
