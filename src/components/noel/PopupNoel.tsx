'use client'

import { useEffect, useRef, useState } from 'react'

import { Link, usePathname } from '@/i18n/navigation'
import { ROUTES } from '@/lib/routes'

import styles from './PopupNoel.module.css'

/**
 * Popup saisonnier « Décor de Noël corporatif » — pousse la page /noel et la
 * LOCATION de déco des Fêtes (demande du boss, maquette validée le 16 octobre
 * 2026).
 *
 * Monté dans le layout marketing, donc présent sur tout le site public —
 * exactement le but : attirer vers l'offre de Noël depuis n'importe quelle
 * page. Deux bornes évitent qu'il soit intrusif :
 *
 *   1. SAISON — le layout ne le monte QUE pendant la saison (estSaisonNoel) ;
 *      hors saison, ce composant n'est jamais rendu, aucun JS envoyé.
 *   2. UNE FOIS PAR VISITE — une fois fermé (ou le CTA suivi), il ne
 *      réapparaît pas pendant la visite en cours, rechargements compris
 *      (sessionStorage) ; il revient à la PROCHAINE visite du visiteur
 *      (nouvelle session de navigation). Choix de Moussa le 16 octobre 2026
 *      (« à chaque nouvelle visite »). Et il ne s'affiche jamais SUR la page
 *      /noel elle-même (le visiteur y est déjà).
 *
 * Tout l'accès à sessionStorage est sous try/catch : navigation privée, stockage
 * bloqué ou vidé ne doit jamais casser la page (le popup s'affiche alors
 * simplement comme si rien n'avait été vu — comportement sûr).
 *
 * Libellés reçus en PROPS (résolus côté serveur) : modèle recommandé du layout
 * marketing, pas de namespace à ajouter à la liste blanche client.
 */

// sessionStorage (pas localStorage) : « une fois par visite ». Fermé = silence
// le reste de la session (rechargements compris), puis réapparaît à la
// prochaine visite. La clé garde le suffixe _v1 : un changement de règle
// d'affichage se ferait en _v2 pour repartir propre.
const CLE_STOCKAGE = 'kolab_noel_popup_v1'
const DELAI_AFFICHAGE_MS = 1200

type Props = {
  eyebrow: string
  titre: string
  texte: string
  cta: string
  plusTard: string
  fermer: string
  /**
   * Accroche promo « 20 % avant le 1er novembre ». OPTIONNELLE : le layout ne
   * la passe que pendant sa fenêtre (estAvant1erNovembre) ; absente, aucune
   * bannière n'est rendue. Une offre datée ne doit jamais survivre à sa date.
   */
  rabais?: string
}

function dejaVuCetteVisite(): boolean {
  try {
    return window.sessionStorage.getItem(CLE_STOCKAGE) === '1'
  } catch {
    return false
  }
}

function marquerFerme(): void {
  try {
    window.sessionStorage.setItem(CLE_STOCKAGE, '1')
  } catch {
    // Stockage indisponible : tant pis, le popup pourra réapparaître. Jamais
    // une erreur visible.
  }
}

export function PopupNoel({ eyebrow, titre, texte, cta, plusTard, fermer, rabais }: Props) {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const fermerRef = useRef<HTMLButtonElement>(null)

  // Déjà sur /noel : inutile de pousser ce qu'on regarde déjà.
  const surPageNoel = pathname === ROUTES.noel

  useEffect(() => {
    if (surPageNoel) return
    if (dejaVuCetteVisite()) return
    const minuteur = window.setTimeout(() => setVisible(true), DELAI_AFFICHAGE_MS)
    return () => window.clearTimeout(minuteur)
  }, [surPageNoel])

  // Verrouille le défilement de fond pendant que le popup occupe l'écran.
  useEffect(() => {
    if (!visible) return
    const precedent = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    fermerRef.current?.focus()
    return () => {
      document.body.style.overflow = precedent
    }
  }, [visible])

  // Échap ferme.
  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fermerPopup()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [visible])

  function fermerPopup() {
    setVisible(false)
    marquerFerme()
  }

  if (!visible) return null

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="noel-popup-titre"
    >
      <button
        type="button"
        className={styles.backdrop}
        aria-label={fermer}
        tabIndex={-1}
        onClick={fermerPopup}
      />
      <div className={styles.card}>
        <div className={styles.ribbon} aria-hidden="true" />
        <button
          ref={fermerRef}
          type="button"
          className={styles.close}
          aria-label={fermer}
          onClick={fermerPopup}
        >
          <span aria-hidden="true">×</span>
        </button>
        <div className={styles.body}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h2 id="noel-popup-titre" className={styles.title}>
            {titre}
          </h2>
          <p className={styles.text}>{texte}</p>
          {rabais && <p className={styles.promo}>{rabais}</p>}
          <div className={styles.cta}>
            <Link href={ROUTES.noel} className={styles.btnGold} onClick={fermerPopup}>
              {cta}
            </Link>
            <button type="button" className={styles.later} onClick={fermerPopup}>
              {plusTard}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
