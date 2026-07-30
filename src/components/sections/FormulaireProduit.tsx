'use client'

import { useActionState, useState } from 'react'

import {
  creerProduit,
  modifierProduit,
  type EtatProduit,
} from '@/app/(admin)/[locale]/admin/catalogue/actions'
import { buttonVariants } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'
import { slugifier } from '@/lib/utils/slug'

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
  slugAideCreation: string
  slugAideEdition: string
  marque: string
  categorie: string
  langue: string
  langueFr: string
  langueEn: string
  langueAide: string
  nom: string
  description: string
  prix: string
  photo: string
  photoAide: string
  photoActuelle: string
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
   * Slug proposé automatiquement à partir du nom français — À LA CRÉATION
   * SEULEMENT.
   *
   * Le slug d'un produit existant vit dans une URL publique
   * (/boutique/<slug>) : le régénérer parce qu'on corrige une faute dans le
   * nom casserait tout lien déjà partagé. En édition, le champ reste ce qu'il
   * est, et c'est à la personne de décider.
   *
   * `slugTouche` gèle la proposition dès que le champ est modifié à la main :
   * sans ça, taper un slug court comme `conteneur-20-pieds` puis retoucher le
   * nom l'écraserait aussitôt.
   */
  const [slug, setSlug] = useState(produit?.slug ?? '')
  const [slugTouche, setSlugTouche] = useState(false)

  const messages: Record<string, string> = {
    donnees: libelles.erreurDonnees,
    slug_pris: libelles.erreurSlug,
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
        <Champ
          id={`${prefixe}slug`}
          libelle={libelles.slug}
          aide={produit ? libelles.slugAideEdition : libelles.slugAideCreation}
        >
          <input
            id={`${prefixe}slug`}
            name="slug"
            required
            value={slug}
            onChange={(e) => {
              setSlugTouche(true)
              setSlug(e.target.value)
            }}
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

        <Champ id={`${prefixe}langue`} libelle={libelles.langue} aide={libelles.langueAide}>
          <select
            id={`${prefixe}langue`}
            name="langue"
            defaultValue={produit?.nom_en ? 'en' : 'fr'}
            className={CHAMP}
          >
            <option value="fr">{libelles.langueFr}</option>
            <option value="en">{libelles.langueEn}</option>
          </select>
        </Champ>

        <Champ id={`${prefixe}nom`} libelle={libelles.nom}>
          <input
            id={`${prefixe}nom`}
            name="nom"
            required
            minLength={2}
            defaultValue={produit?.nom_en ?? produit?.nom_fr}
            maxLength={120}
            onChange={(e) => {
              if (!produit && !slugTouche) setSlug(slugifier(e.target.value))
            }}
            className={CHAMP}
          />
        </Champ>
      </div>

      <Champ id={`${prefixe}description`} libelle={libelles.description}>
        <textarea
          id={`${prefixe}description`}
          name="description"
          rows={3}
          defaultValue={produit?.description_en ?? produit?.description_fr ?? ''}
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
