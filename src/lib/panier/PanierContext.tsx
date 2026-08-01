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
  /**
   * `null` tant que /api/session n'a pas répondu, `true`/`false` ensuite.
   *
   * Sert de garde à l'envoi de la demande (skill 05, décision de Christian) :
   * passer une commande exige désormais un compte, pour qu'on retrouve la
   * personne dans /admin/utilisateurs. `null` distingue « on ne sait pas
   * encore » de « pas connecté » — un bouton qui basculerait déjà en « créez
   * un compte » avant la réponse enverrait quelqu'un de déjà connecté sur une
   * fausse piste pendant l'instant du chargement.
   */
  connecte: boolean | null
  ajouter: (article: Omit<ArticlePanier, 'quantite'>) => void
  retirer: (slug: string) => void
  changerQuantite: (slug: string, quantite: number) => void
  vider: () => void
  contient: (slug: string) => boolean
}

/**
 * Préfixe de la clé de stockage. La clé complète porte l'identifiant de la
 * personne connectée — voir `cleDe()`.
 */
const PREFIXE_STOCKAGE = 'kolab_panier'
const QUANTITE_MAX = 99

/**
 * Une clé par identité.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI, ET CE QUE ÇA CORRIGE
 *
 * Le panier vivait sous une clé unique, `kolab_panier`. Sur un poste partagé
 * — un ordinateur d'atelier, une tablette de chantier — la personne suivante
 * retrouvait la sélection de la précédente, et pouvait l'envoyer sous son
 * propre nom. Relevé par Christian.
 *
 * Chaque compte a désormais sa clé, et les visiteurs non identifiés la leur.
 * Se déconnecter ne détruit rien : en revenant, on retrouve sa sélection là où
 * on l'avait laissée.
 *
 * ⚠️ Cette séparation vaut POUR UN NAVIGATEUR. localStorage ne franchit pas
 * l'appareil : une sélection commencée au bureau ne suit pas sur le téléphone.
 * Pour ça il faudrait une table `paniers` côté Supabase — c'est la suite, pas
 * ce correctif.
 * ---------------------------------------------------------------------------
 */
const cleDe = (userId: string | null) => `${PREFIXE_STOCKAGE}:${userId ?? 'anonyme'}`

const ContextePanier = createContext<Panier | null>(null)

/** Valide ce qui sort de localStorage — le contenu est modifiable par l'utilisateur. */
function lireStockage(cle: string): ArticlePanier[] {
  try {
    const brut = window.localStorage.getItem(cle)
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
  const [cle, setCle] = useState<string | null>(null)
  const [connecte, setConnecte] = useState<boolean | null>(null)

  /**
   * Qui est là ? /api/session renvoie l'identifiant et rien d'autre.
   *
   * Pas de client Supabase ici : il alourdirait le bundle de chaque page du
   * site vitrine pour une seule information. Pas de prop depuis le layout non
   * plus — il devrait lire les cookies, ce qui basculerait tout le site en
   * rendu dynamique et supprimerait l'ISR.
   *
   * Tant que la réponse n'est pas là, le panier reste `pret: false` et
   * n'affiche rien : montrer le panier anonyme puis le remplacer par celui du
   * compte produirait un clignotement, et pire, laisserait entrevoir une
   * sélection qui n'est pas la sienne.
   */
  useEffect(() => {
    let vivant = true

    const identifier = async () => {
      let userId: string | null = null
      let identiteConnue = false

      try {
        const r = await fetch('/api/session')
        if (r.ok) {
          userId = ((await r.json()) as { userId: string | null }).userId
          identiteConnue = true
        }
      } catch {
        // Réseau coupé : traité comme une réponse en échec, ci-dessous.
      }
      if (!vivant) return

      /**
       * Identité inconnue : le panier fonctionne, mais n'est PAS enregistré.
       *
       * ⚠️ Le réflexe serait de retomber sur le panier anonyme. C'est
       * précisément ce qu'il ne faut pas faire. Un échec de la route — réseau
       * coupé, limite de débit atteinte depuis un bureau partagé — ne veut pas
       * dire « personne n'est connecté » : il veut dire « on ne sait pas ». En
       * écrivant sous la clé anonyme, on déposerait la sélection d'une
       * personne identifiée dans le seau commun du navigateur, où la suivante
       * la retrouverait. C'est exactement la fuite que la séparation par
       * compte a corrigée.
       *
       * Sans clé, l'effet d'écriture plus bas ne s'exécute pas : la sélection
       * vit en mémoire pour la visite et disparaît au rechargement. Une
       * sélection perdue est un désagrément ; la sélection de quelqu'un
       * d'autre affichée sous son nom, non.
       *
       * `connecte: false` et non `null` — un `null` durable laisserait le
       * bouton d'envoi désactivé indéfiniment (identifier() ne réessaie pas).
       * Exiger un compte dans le doute est le bon défaut : ça propose un
       * chemin (se connecter), là où rester bloqué n'en propose aucun.
       */
      if (!identiteConnue) {
        setConnecte(false)
        setPret(true)
        return
      }

      const k = cleDe(userId)

      /**
       * Reprise du panier anonyme à la connexion.
       *
       * Quelqu'un remplit son panier, puis se connecte pour l'envoyer : sans
       * cette reprise, il arriverait sur un panier vide et devrait tout
       * refaire. Les lignes déjà présentes dans le compte gagnent — c'est la
       * sélection qu'il a délibérément constituée, pas celle d'un passage
       * anonyme.
       */
      if (userId) {
        const anonyme = lireStockage(cleDe(null))
        if (anonyme.length > 0) {
          const compte = lireStockage(k)
          const slugs = new Set(compte.map((a) => a.slug))
          const fusion = [...compte, ...anonyme.filter((a) => !slugs.has(a.slug))]
          try {
            window.localStorage.setItem(k, JSON.stringify(fusion))
            window.localStorage.removeItem(cleDe(null))
          } catch {
            // Quota ou stockage refusé : la fusion est perdue, le panier du
            // compte reste intact. Échouer ici serait pire.
          }
        }
      }

      /**
       * `setArticles(prealables => ...)` et non `setArticles(stocke)`.
       *
       * ⚠️ Le remplacement direct perdait un ajout. La boutique est
       * interactive avant que /api/session ait répondu : un clic sur
       * « Ajouter » parti dans cet intervalle entrait bien dans l'état, puis
       * disparaissait sans un mot quand l'identité arrivait et écrasait tout.
       * Rien à l'écran ne le signalait — le badge se contentait de retomber.
       *
       * Ce qui vient du stockage l'emporte sur doublon : c'est la sélection
       * délibérée, avec ses quantités.
       */
      setArticles((prealables) => {
        const stocke = lireStockage(k)
        if (prealables.length === 0) return stocke
        const slugs = new Set(stocke.map((a) => a.slug))
        return [...stocke, ...prealables.filter((a) => !slugs.has(a.slug))]
      })
      setCle(k)
      setConnecte(userId !== null)
      setPret(true)
    }

    void identifier()
    return () => {
      vivant = false
    }
  }, [])

  // Écriture à chaque changement, mais seulement une fois la lecture faite —
  // sinon le premier rendu écraserait le panier existant par un tableau vide.
  useEffect(() => {
    if (!pret || !cle) return
    try {
      window.localStorage.setItem(cle, JSON.stringify(articles))
    } catch {
      // Quota dépassé ou stockage refusé : le panier reste fonctionnel en
      // mémoire pour la session. Échouer ici serait disproportionné.
    }
  }, [articles, pret, cle])

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
      connecte,
      ajouter,
      retirer,
      changerQuantite,
      vider,
      contient: (slug) => articles.some((a) => a.slug === slug),
    }),
    [articles, pret, connecte, ajouter, retirer, changerQuantite, vider],
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
