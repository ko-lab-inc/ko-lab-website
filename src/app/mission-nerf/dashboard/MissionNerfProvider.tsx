'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'

import type { ReactNode } from 'react'

export type DerniereInscription = { prenom: string; heure: string; statut: string }

export type EtatMissionNerf = {
  zoneOuverte: boolean
  prochainDepart: string | null
  participants: number
  decharges: number
  dernieres: readonly DerniereInscription[]
}

type Valeur = {
  /** `null` tant qu'aucune lecture n'a encore réussi — jamais réinitialisé à
   *  `null` après un premier succès, y compris pendant une coupure réseau :
   *  voir la docstring de MissionNerfProvider, point « chiffres jamais faux ». */
  donnees: EtatMissionNerf | null
  /** `true` après ECHECS_AVANT_ALERTE échecs consécutifs — voir plus bas. */
  connexionPerdue: boolean
}

const Contexte = createContext<Valeur>({ donnees: null, connexionPerdue: false })

/** À utiliser par tout composant client affichant une donnée en direct du
 *  dashboard — jamais un fetch séparé, un seul cycle de lecture pour toute
 *  la page (voir MissionNerfProvider). */
export function useMissionNerf(): Valeur {
  return useContext(Contexte)
}

/**
 * Intervalle de rafraîchissement — 10 secondes.
 *
 * Ni une fréquence de compteur temps réel (personne ne lit un chiffre sur
 * une TV à la seconde près), ni assez lent pour que l'écran paraisse figé.
 * Sur une soirée de 10 h, ça fait environ 3 600 appels à
 * /api/mission-nerf/etat, chacun 4 petites requêtes Supabase (voir cette
 * route) — un volume négligeable, aucune raison de descendre plus bas.
 */
const INTERVALLE_MS = 10_000

/**
 * Nombre d'échecs CONSÉCUTIFS avant d'afficher l'indicateur de connexion
 * perdue. 2, pas 1 : un blip réseau isolé (cold start Vercel, coupure Wi-Fi
 * d'une seconde) ne doit pas faire clignoter un badge à chaque cycle en
 * fonctionnement normal — seule une coupure qui PERSISTE doit s'afficher.
 */
const ECHECS_AVANT_ALERTE = 2

/**
 * Fournit l'état du dashboard Mission NERF à tous ses composants enfants —
 * UN SEUL cycle de lecture pour toute la page, plutôt qu'un fetch par carte.
 *
 * ---------------------------------------------------------------------------
 * TENUE SUR 10 HEURES SANS INTERVENTION — les quatre points du brief
 * ---------------------------------------------------------------------------
 * 1. REPRISE APRÈS COUPURE, SANS PAGE BLANCHE : le polling est une boucle
 *    `setInterval` simple, pas une connexion persistante (WebSocket/SSE) à
 *    reconnecter — chaque tick est une tentative indépendante. Une coupure
 *    réseau fait simplement échouer quelques ticks ; dès que le réseau
 *    revient, le tick SUIVANT réussit tout seul, sans logique de
 *    reconnexion à écrire. Rien ne peut laisser une page blanche : ce
 *    composant ne lève jamais, `donnees` reste ce qu'il était avant l'échec.
 *
 * 2. AUCUNE ACCUMULATION MÉMOIRE : chaque tick REMPLACE `donnees` en entier
 *    (`setDonnees(json)`), jamais un tableau qui grossirait à chaque appel.
 *    Le seul état qui persiste entre les ticks est un compteur d'échecs
 *    (`useRef`, une seule valeur scalaire). `clearInterval` au démontage
 *    évite une minuterie fantôme — sans effet réel ici puisque cette page ne
 *    démonte jamais en usage normal, mais correct par principe.
 *
 * 3. INDICATEUR DISCRET : voir IndicateurConnexion (ElementsEnDirect.tsx) —
 *    ce composant-ci se contente d'exposer `connexionPerdue`, jamais
 *    d'imposer lui-même un habillage visuel.
 *
 * 4. JAMAIS DE CHIFFRE FAUX NI D'ERREUR BRUTE : en cas d'échec, `donnees`
 *    n'est PAS remis à `null` ni à zéro — les derniers chiffres connus
 *    restent affichés (plus honnête qu'un 0 qui ressemblerait à une vraie
 *    lecture « zéro participant »). Le `try/catch` empêche toute exception
 *    de fetch de remonter jusqu'à React — rien à attraper par error.tsx
 *    pour cette cause précise. error.tsx reste un filet pour tout AUTRE
 *    problème (une erreur de rendu, par exemple).
 */
export function MissionNerfProvider({ children }: { children: ReactNode }) {
  const [donnees, setDonnees] = useState<EtatMissionNerf | null>(null)
  const [connexionPerdue, setConnexionPerdue] = useState(false)
  const echecsConsecutifs = useRef(0)

  useEffect(() => {
    let annule = false

    async function recharger() {
      try {
        const reponse = await fetch('/api/mission-nerf/etat', { cache: 'no-store' })
        if (!reponse.ok) throw new Error('statut HTTP ' + reponse.status)

        const json = (await reponse.json()) as EtatMissionNerf
        if (annule) return

        echecsConsecutifs.current = 0
        setConnexionPerdue(false)
        setDonnees(json)
      } catch (err) {
        if (annule) return

        echecsConsecutifs.current += 1
        if (echecsConsecutifs.current >= ECHECS_AVANT_ALERTE) {
          setConnexionPerdue(true)
        }
        // console.warn, pas console.error : une coupure réseau ponctuelle
        // n'est pas une panne applicative, et 10 h de ticks ne doivent pas
        // remplir la console d'un niveau qui déclencherait une alerte.
        console.warn('[mission-nerf] échec de rafraîchissement', err)
      }
    }

    recharger()
    const id = setInterval(recharger, INTERVALLE_MS)

    return () => {
      annule = true
      clearInterval(id)
    }
  }, [])

  return <Contexte.Provider value={{ donnees, connexionPerdue }}>{children}</Contexte.Provider>
}
