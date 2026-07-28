'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import type { ReactNode } from 'react'

/**
 * Panier de DEMANDE DE PRIX — skill 21, phase 1.
 *
 * Ce n'est pas un panier de commerce : aucun paiement, aucun stock, aucun
 * total. C'est une liste de besoins que le visiteur constitue avant d'envoyer
 * UNE seule demande consolidée. Le vocabulaire suit : « demande », jamais
 * « commande » ni « achat ».
 *
 * Persistance en localStorage, sans dépendance serveur : la sélection survit à
 * un rechargement et à une visite ultérieure, ce qui compte pour un catalogue
 * où l'on compare avant de demander un devis.
 */

export type ArticlePanier = {
  slug: string
  nom: string
  /** Libellé de catégorie déjà traduit, pour l'afficher sans re-résoudre. */
  categorie: string
  quantite: number
}

type Panier = {
  articles: ArticlePanier[]
  /** Nombre d'articles distincts — pas la somme des quantités. */
  nombre: number
  /**
   * Faux tant que localStorage n'a pas été lu.
   *
   * Le serveur ne connaît pas le panier : rendre le badge dès le premier
   * passage produirait un écart d'hydratation. Les consommateurs attendent
   * `pret` avant d'afficher quoi que ce soit qui dépende du contenu.
   */
  pret: boolean
  ajouter: (article: Omit<ArticlePanier, 'quantite'>) => void
  retirer: (slug: string) => void
  changerQuantite: (slug: string, quantite: number) => void
  vider: () => void
  contient: (slug: string) => boolean
}

const CLE_STOCKAGE = 'kolab_panier'
const QUANTITE_MAX = 99

const ContextePanier = createContext<Panier | null>(null)

/** Valide ce qui sort de localStorage — le contenu est modifiable par l'utilisateur. */
function lireStockage(): ArticlePanier[] {
  try {
    const brut = window.localStorage.getItem(CLE_STOCKAGE)
    if (!brut) return []

    const analyse: unknown = JSON.parse(brut)
    if (!Array.isArray(analyse)) return []

    return analyse.filter((a): a is ArticlePanier => {
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
    // certains navigateurs). On repart d'un panier vide plutôt que de planter.
    return []
  }
}

export function PanierProvider({ children }: { children: ReactNode }) {
  const [articles, setArticles] = useState<ArticlePanier[]>([])
  const [pret, setPret] = useState(false)

  // Lecture APRÈS montage : localStorage n'existe pas côté serveur, et lire
  // pendant le rendu provoquerait une désynchronisation d'hydratation.
  useEffect(() => {
    setArticles(lireStockage())
    setPret(true)
  }, [])

  // Écriture à chaque changement, mais seulement une fois la lecture faite —
  // sinon le premier rendu écraserait le panier existant par un tableau vide.
  useEffect(() => {
    if (!pret) return
    try {
      window.localStorage.setItem(CLE_STOCKAGE, JSON.stringify(articles))
    } catch {
      // Quota dépassé ou stockage refusé : le panier reste fonctionnel en
      // mémoire pour la session. Échouer ici serait disproportionné.
    }
  }, [articles, pret])

  const ajouter = useCallback((article: Omit<ArticlePanier, 'quantite'>) => {
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
    setArticles((actuels) =>
      actuels.map((a) => (a.slug === slug ? { ...a, quantite: borne } : a)),
    )
  }, [])

  const vider = useCallback(() => setArticles([]), [])

  const valeur = useMemo<Panier>(
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

  return <ContextePanier.Provider value={valeur}>{children}</ContextePanier.Provider>
}

export function usePanier(): Panier {
  const contexte = useContext(ContextePanier)
  if (!contexte) {
    throw new Error('usePanier doit être utilisé dans un PanierProvider')
  }
  return contexte
}

/**
 * Met la sélection en forme pour le champ message du formulaire.
 *
 * Liste de besoins, PAS une facture : ni prix, ni sous-total, ni total. Le
 * catalogue fonctionne sur demande de prix, afficher un montant ici
 * contredirait tout le positionnement.
 */
export function formaterDemande(articles: readonly ArticlePanier[], entete: string): string {
  if (articles.length === 0) return ''

  const lignes = articles.map((a) => `— ${a.nom} (${a.categorie}) × ${a.quantite}`)
  return `${entete}\n\n${lignes.join('\n')}`
}
