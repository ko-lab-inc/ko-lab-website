'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import type { ReactNode } from 'react'

/**
 * Panier de DEMANDE DE LOCATION — système de location, phase 1.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI UN PANIER DISTINCT DE CELUI DE LA BOUTIQUE (PanierContext)
 *
 * Le panier de la boutique a évolué en un parcours de COMMANDE : il exige un
 * compte (`connecte`), suit un stock, et débouche sur la table `commandes`
 * (migration 0021) via /boutique/commande/details. C'est le bon modèle pour
 * acheter un produit, pas pour demander un prix de location.
 *
 * La location suit le modèle de la référence choisie (Black Tie Party Rentals,
 * propulsé par Booqable) : on constitue une liste d'équipements, puis on envoie
 * UNE seule demande de prix. Aucun paiement, aucun compte, aucun stock — c'est
 * une demande ouverte, exactement comme le formulaire de contact. Mélanger les
 * deux (une location et un achat dans le même panier, menant au parcours à
 * compte) n'aurait aucun sens : d'où ce contexte dédié, volontairement plus
 * simple.
 *
 * Persistance en localStorage : la sélection survit à un rechargement et à une
 * visite ultérieure, ce qui compte pour un catalogue où l'on compare avant de
 * demander un devis.
 *
 * ⚠️ UNE SEULE CLÉ, anonyme — contrairement au panier boutique qui porte
 * l'identifiant du compte. La location ne demande jamais de connexion : il n'y
 * a pas d'identité à laquelle rattacher la sélection. Sur un poste partagé, la
 * personne suivante pourrait voir la sélection (des noms d'équipements, aucune
 * donnée personnelle) et on la vide dès l'envoi réussi — même surface de risque
 * que le formulaire de contact, qui est lui aussi ouvert à tous.
 */

export type ArticleLocation = {
  slug: string
  nom: string
  /** Libellé de catégorie déjà traduit, pour l'afficher sans re-résoudre. */
  categorie: string
  quantite: number
}

type PanierLocation = {
  articles: ArticleLocation[]
  /** Nombre d'articles distincts — pas la somme des quantités. */
  nombre: number
  /**
   * Faux tant que localStorage n'a pas été lu. Le serveur ne connaît pas la
   * sélection : rendre un compteur dès le premier passage produirait un écart
   * d'hydratation. Les consommateurs attendent `pret` avant d'afficher quoi que
   * ce soit qui dépende du contenu.
   */
  pret: boolean
  ajouter: (article: Omit<ArticleLocation, 'quantite'>) => void
  retirer: (slug: string) => void
  changerQuantite: (slug: string, quantite: number) => void
  vider: () => void
  contient: (slug: string) => boolean
}

const CLE_STOCKAGE = 'kolab_demande_location'
const QUANTITE_MAX = 99

const ContextePanierLocation = createContext<PanierLocation | null>(null)

/** Valide ce qui sort de localStorage — le contenu est modifiable par l'utilisateur. */
function lireStockage(): ArticleLocation[] {
  try {
    const brut = window.localStorage.getItem(CLE_STOCKAGE)
    if (!brut) return []

    const analyse: unknown = JSON.parse(brut)
    if (!Array.isArray(analyse)) return []

    return analyse.filter((a): a is ArticleLocation => {
      if (typeof a !== 'object' || a === null) return false
      const o = a as Record<string, unknown>
      return (
        typeof o.slug === 'string' &&
        typeof o.nom === 'string' &&
        typeof o.categorie === 'string' &&
        typeof o.quantite === 'number' &&
        o.quantite > 0 &&
        o.quantite <= QUANTITE_MAX
      )
    })
  } catch {
    // JSON corrompu, ou localStorage indisponible (navigation privée sur
    // certains navigateurs). On repart d'une sélection vide plutôt que de planter.
    return []
  }
}

export function PanierLocationProvider({ children }: { children: ReactNode }) {
  const [articles, setArticles] = useState<ArticleLocation[]>([])
  const [pret, setPret] = useState(false)

  // Lecture au montage. `setArticles(prealables => ...)` et non
  // `setArticles(stocke)` : la page est interactive avant la fin de cet effet,
  // un clic « Ajouter » parti dans l'intervalle serait sinon écrasé.
  useEffect(() => {
    const stocke = lireStockage()
    setArticles((prealables) => {
      if (prealables.length === 0) return stocke
      const slugs = new Set(stocke.map((a) => a.slug))
      return [...stocke, ...prealables.filter((a) => !slugs.has(a.slug))]
    })
    setPret(true)
  }, [])

  // Écriture à chaque changement, mais seulement une fois la lecture faite —
  // sinon le premier rendu écraserait la sélection existante par un tableau vide.
  useEffect(() => {
    if (!pret) return
    try {
      window.localStorage.setItem(CLE_STOCKAGE, JSON.stringify(articles))
    } catch {
      // Quota dépassé ou stockage refusé : la sélection reste fonctionnelle en
      // mémoire pour la session. Échouer ici serait disproportionné.
    }
  }, [articles, pret])

  const ajouter = useCallback((article: Omit<ArticleLocation, 'quantite'>) => {
    setArticles((actuels) => {
      const existant = actuels.find((a) => a.slug === article.slug)
      // Déjà présent : on incrémente plutôt que de dupliquer la ligne.
      if (existant) {
        return actuels.map((a) =>
          a.slug === article.slug
            ? { ...a, quantite: Math.min(a.quantite + 1, QUANTITE_MAX) }
            : a,
        )
      }
      return [...actuels, { ...article, quantite: 1 }]
    })
  }, [])

  const retirer = useCallback((slug: string) => {
    setArticles((actuels) => actuels.filter((a) => a.slug !== slug))
  }, [])

  const changerQuantite = useCallback((slug: string, quantite: number) => {
    const borne = Math.max(1, Math.min(Math.round(quantite), QUANTITE_MAX))
    setArticles((actuels) => actuels.map((a) => (a.slug === slug ? { ...a, quantite: borne } : a)))
  }, [])

  const vider = useCallback(() => setArticles([]), [])

  const valeur = useMemo<PanierLocation>(
    () => ({
      articles,
      nombre: articles.length,
      pret,
      ajouter,
      retirer,
      changerQuantite,
      vider,
      contient: (slug) => articles.some((a) => a.slug === slug),
    }),
    [articles, pret, ajouter, retirer, changerQuantite, vider],
  )

  return (
    <ContextePanierLocation.Provider value={valeur}>{children}</ContextePanierLocation.Provider>
  )
}

export function usePanierLocation(): PanierLocation {
  const contexte = useContext(ContextePanierLocation)
  if (!contexte) {
    throw new Error('usePanierLocation doit être utilisé dans un PanierLocationProvider')
  }
  return contexte
}

/**
 * Met la sélection en forme pour le champ message de la demande.
 *
 * Liste de besoins, PAS une facture : ni prix, ni total. La location fonctionne
 * sur demande de prix — le tarif dépend de la durée, afficher un montant ici
 * serait trompeur.
 */
export function formaterDemandeLocation(
  articles: readonly ArticleLocation[],
  entete: string,
): string {
  if (articles.length === 0) return ''
  const lignes = articles.map((a) => `- ${a.nom} (${a.categorie}) x ${a.quantite}`)
  return `${entete}\n\n${lignes.join('\n')}`
}
