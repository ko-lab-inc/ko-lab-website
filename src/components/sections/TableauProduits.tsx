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
 * L'œil ouvre la fiche PUBLIQUE dans un nouvel onglet — voir le produit tel
 * que le visiteur le voit vaut mieux qu'un aperçu reconstitué qui finirait par
 * diverger de la vraie page. Le crayon ouvre le formulaire. La corbeille
 * supprime, après confirmation, et n'apparaît que pour un admin (politique
 * produits_suppression_admin de 0002 — le masquage est du confort, la garantie
 * est côté base).
 * ---------------------------------------------------------------------------
 */

type ProduitAvecImages = Produit & { images: unknown }

/** Première image du tableau jsonb, ou null. Le contenu vient de la base : on ne
 *  suppose ni sa forme ni son type. */
function premiereImage(images: unknown): string | null {
  if (!Array.isArray(images)) return null
  const premiere = images[0]
  return typeof premiere === 'string' && premiere.startsWith('/') ? premiere : null
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
    sansImage: string
  }
}) {
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
        {produits.length === 0 ? (
          <p className="p-6 text-base leading-relaxed text-ko-muted">{textes.vide}</p>
        ) : (
          <ul className="divide-y divide-ko-line">
            {produits.map((p) => {
              const image = premiereImage(p.images)

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
                    <a
                      href={`/${locale}/boutique/${p.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${textes.voir} — ${p.nom_fr}`}
                      title={textes.voir}
                      className="flex h-9 w-9 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-blue"
                    >
                      <IconeOeil taille={17} />
                    </a>

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
    </>
  )
}
