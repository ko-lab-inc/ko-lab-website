'use client'

import { useActionState, useState } from 'react'

import {
  creerProduit,
  modifierProduit,
  type EtatProduit,
} from '@/app/(admin)/[locale]/admin/catalogue/actions'
import { buttonVariants } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'

/**
 * Création et édition d'un produit — un seul formulaire pour les deux.
 *
 * Les champs sont identiques ; seule l'action diffère. Deux composants
 * auraient garanti qu'un champ ajouté un jour n'existe que dans l'un des deux.
 *
 * Le formulaire d'édition est replié par défaut : douze produits ouverts en
 * même temps donneraient une page de plusieurs milliers de pixels où l'on ne
 * retrouve rien. Un `<details>` natif suffit — pas d'état, pas de JavaScript
 * pour ouvrir et fermer.
 */

export type Produit = {
  id: string
  slug: string
  marque: string
  categorie: string
  nom_fr: string
  nom_en: string
  description_fr: string | null
  description_en: string | null
  prix: number | null
  cadrage: string
  ordre: number
  publie: boolean
}

export type LibellesProduit = {
  slug: string
  marque: string
  categorie: string
  nomFr: string
  nomEn: string
  descriptionFr: string
  descriptionEn: string
  prix: string
  prixAide: string
  cadrage: string
  cadrageContain: string
  cadrageCover: string
  ordre: string
  enregistrer: string
  creer: string
  enCours: string
  succes: string
  categories: Record<string, string>
  erreurDonnees: string
  erreurSlug: string
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
  // Les `id` doivent être uniques dans le document : douze formulaires
  // d'édition coexistent sur la page, plus celui de création.
  const [prefixe] = useState(() => (produit ? `p-${produit.id}-` : 'nouveau-'))

  const messages: Record<string, string> = {
    donnees: libelles.erreurDonnees,
    slug_pris: libelles.erreurSlug,
    refuse: libelles.erreurRefuse,
    serveur: libelles.erreurServeur,
  }
  const erreur = etat.erreur ? (messages[etat.erreur] ?? libelles.erreurServeur) : null

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      {produit && <input type="hidden" name="id" value={produit.id} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Champ id={`${prefixe}slug`} libelle={libelles.slug}>
          <input
            id={`${prefixe}slug`}
            name="slug"
            required
            defaultValue={produit?.slug}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            maxLength={80}
            className={CHAMP}
          />
        </Champ>

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

        <Champ id={`${prefixe}prix`} libelle={libelles.prix} aide={libelles.prixAide}>
          <input
            id={`${prefixe}prix`}
            name="prix"
            type="number"
            min={0}
            step="0.01"
            defaultValue={produit?.prix ?? ''}
            className={CHAMP}
          />
        </Champ>

        <Champ id={`${prefixe}nom_fr`} libelle={libelles.nomFr}>
          <input
            id={`${prefixe}nom_fr`}
            name="nom_fr"
            required
            defaultValue={produit?.nom_fr}
            maxLength={120}
            className={CHAMP}
          />
        </Champ>

        <Champ id={`${prefixe}nom_en`} libelle={libelles.nomEn}>
          <input
            id={`${prefixe}nom_en`}
            name="nom_en"
            required
            defaultValue={produit?.nom_en}
            maxLength={120}
            className={CHAMP}
          />
        </Champ>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Champ id={`${prefixe}description_fr`} libelle={libelles.descriptionFr}>
          <textarea
            id={`${prefixe}description_fr`}
            name="description_fr"
            rows={3}
            defaultValue={produit?.description_fr ?? ''}
            maxLength={600}
            className={cn(CHAMP, 'resize-y')}
          />
        </Champ>

        <Champ id={`${prefixe}description_en`} libelle={libelles.descriptionEn}>
          <textarea
            id={`${prefixe}description_en`}
            name="description_en"
            rows={3}
            defaultValue={produit?.description_en ?? ''}
            maxLength={600}
            className={cn(CHAMP, 'resize-y')}
          />
        </Champ>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Champ id={`${prefixe}cadrage`} libelle={libelles.cadrage}>
          <select
            id={`${prefixe}cadrage`}
            name="cadrage"
            defaultValue={produit?.cadrage ?? 'contain'}
            className={CHAMP}
          >
            <option value="contain">{libelles.cadrageContain}</option>
            <option value="cover">{libelles.cadrageCover}</option>
          </select>
        </Champ>

        <Champ id={`${prefixe}ordre`} libelle={libelles.ordre}>
          <input
            id={`${prefixe}ordre`}
            name="ordre"
            type="number"
            min={0}
            step={10}
            defaultValue={produit?.ordre ?? 0}
            className={CHAMP}
          />
        </Champ>
      </div>

      {erreur && (
        <p role="alert" className="text-sm text-ko-ink">
          {erreur}
        </p>
      )}
      {etat.succes && (
        <p role="status" className="text-sm text-ko-blue">
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
