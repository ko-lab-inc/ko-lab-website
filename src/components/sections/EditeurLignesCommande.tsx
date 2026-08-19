'use client'

import Image from 'next/image'
import { useActionState, useEffect, useMemo, useRef, useState } from 'react'
import { useFormatter, useTranslations } from 'next-intl'

import { modifierCommande, type EtatModification } from '@/app/(marketing)/[locale]/compte/commandes/[id]/actions'
import { ChampsLivraison } from '@/components/sections/ChampsLivraison'
import { buttonVariants } from '@/components/ui/Button'
import { IconeMoins, IconePlus } from '@/components/ui/Icones'
import { Link } from '@/i18n/navigation'
import { effacerMarquePourCommande, lireMarquePourCommande } from '@/lib/panier/pourCommande'
import { usePanier } from '@/lib/panier/PanierContext'
import { ROUTES } from '@/lib/routes'

type LigneEditable = {
  slug: string
  nom: string
  categorie: string
  prixIndicatif: number | null
  quantite: number
  src: string | null
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
  numero,
  locale,
  lignesInitiales,
  catalogue,
  modeLivraisonInitial,
  adresseLivraisonInitiale,
}: {
  idCommande: string
  numero: string
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
    src: string | null
  }[]
  modeLivraisonInitial: 'ramassage' | 'expedition'
  adresseLivraisonInitiale: string | null
}) {
  const t = useTranslations('Commande')
  const format = useFormatter()
  const { articles: articlesPanier, vider: viderPanier } = usePanier()

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
        // `parSlug.has(l.slug)` déjà vérifié par le `.filter()` ci-dessus —
        // l'entrée existe forcément dans le catalogue à ce stade.
        src: parSlug.get(l.slug)?.src ?? null,
      })),
  )
  const lignesIndisponibles = lignesInitiales.filter((l) => !l.slug || !parSlug.has(l.slug))

  /**
   * Fusion du panier « ajout à cette commande » — une seule fois au montage.
   *
   * ⚠️ Le marqueur doit correspondre à CETTE commande précisément : sans
   * cette vérification, ouvrir une AUTRE commande pendant que le marqueur
   * d'une précédente traîne encore fusionnerait le panier au mauvais
   * endroit. `effectue` (ref, pas state) évite une double fusion en Strict
   * Mode (montage/démontage/remontage immédiat en développement).
   */
  const effectue = useRef(false)
  useEffect(() => {
    if (effectue.current) return
    effectue.current = true

    // Fonction imbriquée, pas un appel direct dans le corps de l'effet — même
    // motif que PanierContext.tsx et BandeauPourCommande : la règle
    // react-hooks/set-state-in-effect exige un setState « en callback ».
    const fusionner = () => {
      const marque = lireMarquePourCommande()
      if (!marque || marque.id !== idCommande || articlesPanier.length === 0) return

      setLignes((actuelles) => {
        // ⚠️ NE JAMAIS MUTER `existante` — un updater passé à setState doit
        // rester pur. Muter l'objet en place a d'abord donné 1+1+1=3 au lieu
        // de 1+1=2 : le Strict Mode de React invoque deux fois l'updater en
        // développement pour détecter exactement ce genre d'impureté ; la
        // seconde invocation relisait alors l'objet déjà modifié par la
        // première. `{ ...existante, quantite: ... }` crée un objet neuf à
        // chaque fois, donc les deux invocations partent du même état et
        // produisent le même résultat.
        const parSlugActuelles = new Map(actuelles.map((l) => [l.slug, l]))
        for (const article of articlesPanier) {
          const produit = parSlug.get(article.slug)
          if (!produit) continue // produit dépublié entre-temps — ignoré, pas d'erreur silencieuse ailleurs
          const existante = parSlugActuelles.get(article.slug)
          const max = produit.quantiteDisponible
          if (existante) {
            parSlugActuelles.set(article.slug, {
              ...existante,
              quantite: Math.min(existante.quantite + article.quantite, max),
            })
          } else {
            parSlugActuelles.set(article.slug, {
              slug: article.slug,
              nom: produit.nom,
              categorie: produit.categorie,
              prixIndicatif: produit.prixIndicatif,
              quantite: Math.min(article.quantite, max),
              src: produit.src,
            })
          }
        }
        return Array.from(parSlugActuelles.values())
      })

      effacerMarquePourCommande()
      viderPanier()
    }
    fusionner()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [etat, action, enCours] = useActionState<EtatModification, FormData>(modifierCommande, {})

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
              <div className="flex min-w-0 items-center gap-4">
                {/* Même cadre que la boutique et le panier : filet 1px, blanc
                    pur — un produit ne doit pas changer d'apparence d'un
                    écran à l'autre. Emplacement vide plutôt que masqué s'il
                    n'y a pas de photo, pour garder l'alignement des lignes. */}
                <div className="relative h-16 w-16 shrink-0 overflow-hidden border border-ko-line bg-ko-photo">
                  {l.src && (
                    <Image src={l.src} alt={l.nom} fill sizes="64px" className="object-contain p-1.5" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-serif text-[18px] text-ko-ink">{l.nom}</p>
                  {l.prixIndicatif != null && (
                    <p className="mt-1 font-mono text-sm text-ko-muted">
                      {format.number(l.prixIndicatif, { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-6">
                <div className="flex items-center border border-ko-line">
                  <button
                    type="button"
                    onClick={() => changerQuantite(l.slug, l.quantite - 1)}
                    disabled={l.quantite <= 1}
                    aria-label={`${t('quantite')} −`}
                    className="flex h-11 w-10 items-center justify-center text-ko-ink transition-colors duration-200 hover:text-ko-black disabled:opacity-40"
                  >
                    <IconeMoins taille={14} />
                  </button>
                  <span className="min-w-[2.5rem] text-center font-mono text-sm text-ko-ink">{l.quantite}</span>
                  <button
                    type="button"
                    onClick={() => changerQuantite(l.slug, l.quantite + 1)}
                    disabled={l.quantite >= (parSlug.get(l.slug)?.quantiteDisponible ?? 99)}
                    aria-label={`${t('quantite')} +`}
                    className="flex h-11 w-10 items-center justify-center text-ko-ink transition-colors duration-200 hover:text-ko-black disabled:opacity-40"
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

      {/*
        Pas de sélecteur ici — demande de Christian, 2 août 2026 : un menu qui
        ne montre qu'un nom de produit n'aide pas à choisir. Ajouter un
        produit à une commande existante passe désormais par la VRAIE
        boutique (photos, prix, descriptions), pas par une liste plate
        recréée dans ce formulaire.
      */}
      <div>
        {/* `numero` porté dans l'URL uniquement pour le texte du bandeau
            (BandeauPourCommande) — la fusion elle-même s'appuie sur `id`,
            jamais sur le numéro affiché. */}
        <Link
          href={`${ROUTES.boutique}?pourCommande=${idCommande}&numero=${encodeURIComponent(numero)}`}
          className={buttonVariants({ variant: 'ghost' })}
        >
          {t('ajouter_produit')}
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      <form action={action} className="space-y-6">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="id" value={idCommande} />
        <input
          type="hidden"
          name="lignes"
          value={JSON.stringify(lignes.map((l) => ({ slug: l.slug, quantite: l.quantite })))}
        />

        <ChampsLivraison modeDefaut={modeLivraisonInitial} adresseActuelle={adresseLivraisonInitiale} />

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
