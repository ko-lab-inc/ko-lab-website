'use client'

import { useActionState, useMemo, useState } from 'react'
import { useFormatter, useTranslations } from 'next-intl'

import { modifierCommande, type EtatModification } from '@/app/(marketing)/[locale]/compte/commandes/[id]/actions'
import { buttonVariants } from '@/components/ui/Button'
import { IconeMoins, IconePlus } from '@/components/ui/Icones'

type LigneEditable = {
  slug: string
  nom: string
  categorie: string
  prixIndicatif: number | null
  quantite: number
}

/**
 * Éditeur des lignes d'une commande, dans la fenêtre de 48h — migration 0021.
 *
 * ---------------------------------------------------------------------------
 * REMPLACE TOUTES LES LIGNES, N'EN MODIFIE AUCUNE EN PLACE
 *
 * `modifierCommande` reçoit à chaque enregistrement la liste ENTIÈRE des
 * lignes souhaitées (slug + quantité) — jamais un delta. C'est le même
 * modèle que PanierContext avant confirmation : on décrit l'état voulu, le
 * serveur en re-dérive nom/catégorie/prix depuis le catalogue et remplace.
 *
 * ---------------------------------------------------------------------------
 * PRODUITS RETIRÉS DU CATALOGUE DEPUIS LA COMMANDE
 *
 * `lignesInitiales` peut contenir une ligne sans `slug` (produit supprimé) ou
 * dont le slug n'est plus dans `catalogue` (dépublié depuis). Ces lignes sont
 * affichées à part, en lecture seule : elles ne peuvent pas être ré-envoyées
 * au serveur (rien à leur associer dans le catalogue actuel), et enregistrer
 * une modification les retire — annoncé explicitement, pas une surprise.
 * ---------------------------------------------------------------------------
 */
export function EditeurLignesCommande({
  idCommande,
  locale,
  lignesInitiales,
  catalogue,
}: {
  idCommande: string
  locale: string
  lignesInitiales: {
    id: string
    slug: string | null
    nomProduit: string
    categorie: string
    quantite: number
    prixIndicatif: number | null
  }[]
  catalogue: {
    slug: string
    nom: string
    categorie: string
    prixIndicatif: number | null
    quantiteDisponible: number
  }[]
}) {
  const t = useTranslations('Commande')
  const format = useFormatter()

  const parSlug = useMemo(() => new Map(catalogue.map((p) => [p.slug, p])), [catalogue])

  const [lignes, setLignes] = useState<LigneEditable[]>(() =>
    lignesInitiales
      .filter((l): l is typeof l & { slug: string } => !!l.slug && parSlug.has(l.slug))
      .map((l) => ({
        slug: l.slug,
        nom: l.nomProduit,
        categorie: l.categorie,
        prixIndicatif: l.prixIndicatif,
        quantite: l.quantite,
      })),
  )
  const lignesIndisponibles = lignesInitiales.filter((l) => !l.slug || !parSlug.has(l.slug))

  const [slugAAjouter, setSlugAAjouter] = useState('')
  const [etat, action, enCours] = useActionState<EtatModification, FormData>(modifierCommande, {})

  const disponiblesAAjouter = catalogue.filter((p) => !lignes.some((l) => l.slug === p.slug))

  function ajouter() {
    const produit = parSlug.get(slugAAjouter)
    if (!produit) return
    setLignes((actuelles) => [
      ...actuelles,
      { slug: produit.slug, nom: produit.nom, categorie: produit.categorie, prixIndicatif: produit.prixIndicatif, quantite: 1 },
    ])
    setSlugAAjouter('')
  }

  function retirer(slug: string) {
    setLignes((actuelles) => actuelles.filter((l) => l.slug !== slug))
  }

  function changerQuantite(slug: string, quantite: number) {
    const produit = parSlug.get(slug)
    const max = produit?.quantiteDisponible ?? 99
    const borne = Math.max(1, Math.min(quantite, max))
    setLignes((actuelles) => actuelles.map((l) => (l.slug === slug ? { ...l, quantite: borne } : l)))
  }

  const messages: Record<string, string> = {
    donnees: t('erreur_donnees'),
    lignes: t('erreur_lignes'),
    refuse: t('erreur_refuse'),
    fenetre_fermee: t('fenetre_fermee_texte'),
    trop_de_requetes: t('erreur_trop'),
    serveur: t('erreur_serveur'),
  }
  const erreur = etat.erreur ? (messages[etat.erreur] ?? t('erreur_serveur')) : null

  return (
    <div className="space-y-8">
      {lignesIndisponibles.length > 0 && (
        <div className="border border-ko-line bg-ko-cream p-4">
          <p className="text-sm leading-relaxed text-ko-muted">{t('produits_indisponibles_texte')}</p>
          <ul className="mt-3 space-y-1">
            {lignesIndisponibles.map((l) => (
              <li key={l.id} className="text-sm text-ko-muted">
                — {l.nomProduit} × {l.quantite}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="divide-y divide-ko-line border-y border-ko-line">
        {lignes.length === 0 ? (
          <li className="py-6 text-base text-ko-muted">{t('editeur_vide')}</li>
        ) : (
          lignes.map((l) => (
            <li key={l.slug} className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-serif text-[18px] text-ko-ink">{l.nom}</p>
                {l.prixIndicatif != null && (
                  <p className="mt-1 font-mono text-sm text-ko-muted">
                    {format.number(l.prixIndicatif, { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-6">
                <div className="flex items-center border border-ko-line">
                  <button
                    type="button"
                    onClick={() => changerQuantite(l.slug, l.quantite - 1)}
                    disabled={l.quantite <= 1}
                    aria-label={`${t('quantite')} −`}
                    className="flex h-11 w-10 items-center justify-center text-ko-ink transition-colors duration-200 hover:text-ko-blue disabled:opacity-40"
                  >
                    <IconeMoins taille={14} />
                  </button>
                  <span className="min-w-[2.5rem] text-center font-mono text-sm text-ko-ink">{l.quantite}</span>
                  <button
                    type="button"
                    onClick={() => changerQuantite(l.slug, l.quantite + 1)}
                    disabled={l.quantite >= (parSlug.get(l.slug)?.quantiteDisponible ?? 99)}
                    aria-label={`${t('quantite')} +`}
                    className="flex h-11 w-10 items-center justify-center text-ko-ink transition-colors duration-200 hover:text-ko-blue disabled:opacity-40"
                  >
                    <IconePlus taille={14} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => retirer(l.slug)}
                  className="min-h-[44px] border-b border-ko-line pb-0.5 text-sm text-ko-muted transition-colors duration-200 hover:border-ko-ink hover:text-ko-ink"
                >
                  {t('retirer')}
                </button>
              </div>
            </li>
          ))
        )}
      </ul>

      {disponiblesAAjouter.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1">
            <span className="label-mono mb-2 block text-ko-muted">{t('ajouter_produit')}</span>
            <select
              value={slugAAjouter}
              onChange={(e) => setSlugAAjouter(e.target.value)}
              className="min-h-[44px] w-full border border-ko-line bg-ko-white px-4 py-3 text-base text-ko-ink focus:border-ko-blue focus:outline-none"
            >
              <option value="">—</option>
              {disponiblesAAjouter.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.nom}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={ajouter}
            disabled={!slugAAjouter}
            className={buttonVariants({ variant: 'ghost' })}
          >
            {t('ajouter')}
          </button>
        </div>
      )}

      <form action={action}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="id" value={idCommande} />
        <input
          type="hidden"
          name="lignes"
          value={JSON.stringify(lignes.map((l) => ({ slug: l.slug, quantite: l.quantite })))}
        />

        {erreur && (
          <p role="alert" className="mb-4 text-sm text-ko-ink">
            {erreur}
          </p>
        )}
        {etat.succes && (
          <p role="status" className="mb-4 text-sm text-ko-ink">
            {t('modification_enregistree')}
          </p>
        )}

        <button
          type="submit"
          disabled={enCours || lignes.length === 0}
          className={buttonVariants({ variant: 'primary' })}
        >
          {enCours ? t('en_cours') : t('enregistrer')}
          <span aria-hidden="true">→</span>
        </button>
      </form>
    </div>
  )
}
