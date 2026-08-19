'use client'

import { useActionState, useState } from 'react'

import {
  creerProduit,
  modifierProduit,
  type EtatProduit,
} from '@/app/(admin)/[locale]/admin/catalogue/actions'
import { buttonVariants } from '@/components/ui/Button'
import { EtiquetteStock } from '@/components/ui/EtiquetteStock'
import { statutSuggere } from '@/lib/stock'
import { cn } from '@/lib/utils/cn'

/**
 * Création et édition d'un produit — un seul formulaire pour les deux.
 *
 * Les champs sont identiques ; seule l'action diffère. Deux composants
 * auraient garanti qu'un champ ajouté un jour n'existe que dans l'un des deux.
 *
 * ---------------------------------------------------------------------------
 * CE QUE CE FORMULAIRE NE DEMANDE PLUS — décisions de Christian
 *
 * Slug, cadrage et ordre d'affichage ont disparu. Le slug se déduit
 * automatiquement du nom côté serveur (voir actions.ts) ; le cadrage est
 * toujours le même pour tous les produits (déjà le cas pour 9 des 12
 * existants) ; l'ordre s'ajoute à la fin du catalogue à la création et ne
 * bouge plus ensuite. Les TROIS restent des colonnes réelles — visibles en
 * lecture seule dans l'aperçu (l'œil, dans TableauProduits) — simplement
 * plus des choix à faire ici.
 *
 * ⚠️ Le choix de langue a lui aussi disparu — retrait plus large que sa seule
 * simplification d'affichage : « on va retirer la traduction partout dans le
 * site [...] on garde en français pour facilité ». Le nom et la description
 * s'écrivent directement dans les colonnes françaises ; les colonnes `_en`
 * restent en base (une réintroduction future de l'anglais les retrouverait
 * intactes) mais ce formulaire ne les touche plus jamais.
 * ---------------------------------------------------------------------------
 */

export type Produit = {
  id: string
  slug: string
  marque: string
  categorie: string
  nom_fr: string
  description_fr: string | null
  prix: number | null
  cadrage: string
  ordre: number
  publie: boolean
  quantite: number
  statut_stock: string
}

export type LibellesProduit = {
  slug: string
  marque: string
  categorie: string
  nom: string
  description: string
  prix: string
  quantite: string
  statutStock: string
  statutEnStock: string
  statutRupture: string
  statutEnCommande: string
  statutEnLivraison: string
  photo: string
  photoAide: string
  ordre: string
  enregistrer: string
  creer: string
  enCours: string
  succes: string
  categories: Record<string, string>
  erreurDonnees: string
  erreurPhoto: string
  erreurRefuse: string
  erreurServeur: string
}

const CHAMP =
  'min-h-[40px] w-full border border-ko-line bg-ko-white px-3 py-2 text-sm text-ko-ink transition-colors duration-200 focus:border-ko-blue focus:outline-none'

function Champ({
  id,
  libelle,
  aide,
  children,
}: {
  id: string
  libelle: string
  aide?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="label-mono mb-1.5 block text-ko-muted">
        {libelle}
      </label>
      {children}
      {aide && <p className="mt-1 text-xs text-ko-muted">{aide}</p>}
    </div>
  )
}

export function FormulaireProduit({
  locale,
  produit,
  libelles,
}: {
  locale: string
  /** Absent = création. */
  produit?: Produit
  libelles: LibellesProduit
}) {
  const [etat, action, enCours] = useActionState<EtatProduit, FormData>(
    produit ? modifierProduit : creerProduit,
    {},
  )
  // Les `id` doivent être uniques dans le document : le formulaire du modal
  // peut coexister avec un autre.
  const [prefixe] = useState(() => (produit ? `p-${produit.id}-` : 'nouveau-'))

  /**
   * Quantité et statut, contrôlés — pas par choix, par nécessité : le badge
   * ci-dessous et la suggestion automatique de statut doivent réagir à la
   * frappe, ce que `defaultValue` ne permet pas.
   *
   * `statutSuggere` ne fait que SUGGÉRER : elle ne touche jamais un statut
   * fournisseur (en_commande, en_livraison) choisi à la main, et l'équipe
   * peut toujours changer le menu déroulant après coup — voir lib/stock.ts.
   */
  const [quantite, setQuantite] = useState(produit?.quantite ?? 0)
  const [statutStock, setStatutStock] = useState(produit?.statut_stock ?? 'en_stock')

  function surChangementQuantite(e: React.ChangeEvent<HTMLInputElement>) {
    const valeur = Math.max(0, Math.trunc(Number(e.target.value) || 0))
    setQuantite(valeur)
    setStatutStock((actuel) => statutSuggere(actuel, valeur))
  }

  const libellesStatutStock: Record<string, string> = {
    en_stock: libelles.statutEnStock,
    rupture: libelles.statutRupture,
    en_commande: libelles.statutEnCommande,
    en_livraison: libelles.statutEnLivraison,
  }

  /**
   * Statut EFFECTIF, recalculé au rendu — pas seulement à la frappe.
   *
   * Sans ça, ouvrir la fiche d'un produit déjà en base (quantité tombée à 0
   * SANS que quelqu'un ait retouché le menu déroulant depuis) afficherait
   * encore l'aperçu « En stock » au premier rendu : `statutStock` démarre à
   * la valeur brute de `produit`, et seul `surChangementQuantite` la
   * recalcule — jamais le montage initial. Recalculer ici, à chaque rendu,
   * couvre aussi ce cas sans toucher à la valeur réellement sélectionnée
   * dans le menu (donc à ce qui sera enregistré si on ne touche à rien).
   */
  const statutAffiche = statutSuggere(statutStock, quantite)

  const messages: Record<string, string> = {
    donnees: libelles.erreurDonnees,
    photo: libelles.erreurPhoto,
    refuse: libelles.erreurRefuse,
    serveur: libelles.erreurServeur,
  }
  const erreur = etat.erreur ? (messages[etat.erreur] ?? libelles.erreurServeur) : null

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      {produit && <input type="hidden" name="id" value={produit.id} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Champ id={`${prefixe}marque`} libelle={libelles.marque}>
          <input
            id={`${prefixe}marque`}
            name="marque"
            required
            defaultValue={produit?.marque}
            maxLength={80}
            className={CHAMP}
          />
        </Champ>

        <Champ id={`${prefixe}categorie`} libelle={libelles.categorie}>
          <select
            id={`${prefixe}categorie`}
            name="categorie"
            defaultValue={produit?.categorie ?? 'impression'}
            className={CHAMP}
          >
            {Object.entries(libelles.categories).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Champ>

        <Champ id={`${prefixe}prix`} libelle={libelles.prix}>
          <input
            id={`${prefixe}prix`}
            name="prix"
            type="number"
            required
            min={0}
            step="0.01"
            defaultValue={produit?.prix ?? ''}
            className={CHAMP}
          />
        </Champ>

        <Champ id={`${prefixe}quantite`} libelle={libelles.quantite}>
          <input
            id={`${prefixe}quantite`}
            name="quantite"
            type="number"
            required
            min={0}
            step={1}
            value={quantite}
            onChange={surChangementQuantite}
            className={CHAMP}
          />
        </Champ>

        <div className="sm:col-span-2">
          <Champ id={`${prefixe}statut_stock`} libelle={libelles.statutStock}>
            <select
              id={`${prefixe}statut_stock`}
              name="statut_stock"
              value={statutStock}
              onChange={(e) => setStatutStock(e.target.value)}
              className={CHAMP}
            >
              <option value="en_stock">{libelles.statutEnStock}</option>
              <option value="rupture">{libelles.statutRupture}</option>
              <option value="en_commande">{libelles.statutEnCommande}</option>
              <option value="en_livraison">{libelles.statutEnLivraison}</option>
            </select>
          </Champ>

          {/* Aperçu en direct — demande de Christian : voir l'effet du
              changement ici, sans attendre l'enregistrement. */}
          <p className="mt-2">
            <EtiquetteStock
              statut={statutAffiche}
              quantite={quantite}
              texte={
                statutAffiche === 'en_stock'
                  ? `${quantite} ${libelles.quantite.toLowerCase()}`
                  : (libellesStatutStock[statutAffiche] ?? statutAffiche)
              }
              className="label-mono"
            />
          </p>
        </div>

        <Champ id={`${prefixe}nom`} libelle={libelles.nom}>
          <input
            id={`${prefixe}nom`}
            name="nom"
            required
            minLength={2}
            defaultValue={produit?.nom_fr}
            maxLength={120}
            className={CHAMP}
          />
        </Champ>
      </div>

      <Champ id={`${prefixe}description`} libelle={libelles.description}>
        <textarea
          id={`${prefixe}description`}
          name="description"
          rows={3}
          defaultValue={produit?.description_fr ?? ''}
          maxLength={600}
          className={cn(CHAMP, 'resize-y')}
        />
      </Champ>

      {/* Téléversement de la photo. `accept` filtre le sélecteur de fichiers,
          mais ne garantit rien : le type et la taille sont revérifiés côté
          serveur, et le bucket lui-même refuse ce qui n'est pas une image
          (allowed_mime_types, migration 0010). */}
      <Champ id={`${prefixe}photo`} libelle={libelles.photo} aide={libelles.photoAide}>
        <input
          id={`${prefixe}photo`}
          name="photo"
          type="file"
          accept="image/webp,image/jpeg,image/png,image/avif"
          className="w-full text-sm text-ko-ink file:mr-4 file:min-h-[36px] file:cursor-pointer file:border file:border-ko-line file:bg-ko-cream file:px-4 file:text-sm file:text-ko-ink hover:file:border-ko-ink"
        />
      </Champ>

      {erreur && (
        <p role="alert" className="text-sm text-ko-ink">
          {erreur}
        </p>
      )}
      {etat.succes && (
        <p role="status" className="text-sm font-medium text-ko-ink">
          {libelles.succes}
        </p>
      )}

      <button
        type="submit"
        disabled={enCours}
        className={buttonVariants({ variant: 'primary', size: 'sm' })}
      >
        {enCours ? libelles.enCours : produit ? libelles.enregistrer : libelles.creer}
      </button>
    </form>
  )
}
