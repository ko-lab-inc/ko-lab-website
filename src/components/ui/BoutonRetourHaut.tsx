'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

import { IconeChevronBas } from '@/components/ui/Icones'
import { cn } from '@/lib/utils/cn'

/**
 * Bouton flottant « retour en haut » — présent sur toutes les pages publiques.
 *
 * ---------------------------------------------------------------------------
 * LE COIN INFÉRIEUR DROIT EST DÉJÀ OCCUPÉ
 *
 * Exactement un des deux widgets suivants y vit toujours (layout.tsx marketing,
 * `CRISP_CONFIGURE ? <ChatCrisp /> : <WidgetAide />`) :
 *   - WidgetAide.tsx : bouton noir 56×56, `right-4 lg:right-6`,
 *     `bottom: 1rem` (+ décalage dynamique au-dessus de la barre d'achat
 *     sticky de la fiche produit sous `lg`).
 *   - Crisp (production uniquement, NEXT_PUBLIC_CRISP_WEBSITE_ID renseigné) :
 *     lanceur hors de portée de nos tokens (iframe tierce), taille et marge
 *     par défaut proches de 60×60 avec ~20px d'air autour.
 *
 * `bottom-24` (96px) dégage les deux : ~24px d'air au-dessus de WidgetAide au
 * repos, et une marge raisonnable au-dessus du lanceur Crisp par défaut.
 *
 * ⚠️ NON VÉRIFIÉ CONTRE CRISP RÉEL. NEXT_PUBLIC_CRISP_WEBSITE_ID est vide en
 * local (voir ChatCrisp.tsx) — impossible de charger le vrai widget ici pour
 * mesurer son empreinte exacte. Le chiffre ci-dessus est un calcul raisonné,
 * pas une mesure : à confirmer à l'œil une fois en production, où Crisp est
 * réellement chargé.
 *
 * ⚠️ Angle mort assumé, pas traité ici : sur la fiche produit, sous `lg`, la
 * barre d'achat sticky pousse WidgetAide vers le haut d'une hauteur mesurée
 * dynamiquement (79 à 97px selon la largeur — voir WidgetAide.tsx). Ce bouton
 * ne suit pas ce décalage ; un chevauchement à cet endroit précis est possible
 * et resterait à vérifier séparément si observé.
 *
 * ---------------------------------------------------------------------------
 * ⚠️ BLEU SUR FOND CLAIR — ÉCART VOLONTAIRE À LA RÈGLE DE CONTRASTE, NE PAS
 * « CORRIGER » PAR RÉFLEXE
 *
 * CLAUDE.md (skill 02) mesure `--ko-blue` à 2,32:1 sur `--ko-white` — sous le
 * seuil AA — et réserve donc le bleu, sur fond clair, aux « gros éléments
 * graphiques (filets, aplats, chiffres XXL, soulignements) », jamais au texte
 * courant ni aux petits contrôles. Cette flèche EST un gros élément
 * graphique de ce genre (~30px, seule, sans texte à côté) — décision du
 * 23 août 2026, volontaire, pas un oubli de la règle.
 *
 * Si elle devient invisible à l'usage sur une section à fond blanc, la
 * corriger en repassant à `text-ko-black` — ne pas revenir au bleu par
 * défaut ailleurs sur le site pour autant : la règle CLAUDE.md reste
 * générale, cette flèche en est l'exception documentée, pas le prétexte.
 * ---------------------------------------------------------------------------
 */

const SEUIL_PX = 600

export function BoutonRetourHaut() {
  const t = useTranslations('Commun')
  const [visible, setVisible] = useState(false)
  const cadre = useRef(0)

  useEffect(() => {
    // rAF plutôt qu'un throttle à délai fixe : au plus une vérification par
    // image rendue, jamais une par pixel défilé, et aucun setTimeout à gérer.
    const surDefilement = () => {
      if (cadre.current) return
      cadre.current = requestAnimationFrame(() => {
        setVisible(window.scrollY > SEUIL_PX)
        cadre.current = 0
      })
    }

    surDefilement() // état correct dès le montage si la page est déjà défilée
    // (retour arrière du navigateur, ancre en milieu de page).
    window.addEventListener('scroll', surDefilement, { passive: true })
    return () => {
      window.removeEventListener('scroll', surDefilement)
      if (cadre.current) cancelAnimationFrame(cadre.current)
    }
  }, [])

  function remonter() {
    // La règle globale de globals.css (`scroll-behavior: auto !important`
    // sous prefers-reduced-motion) ne couvre pas un `behavior: 'smooth'`
    // demandé explicitement en JS — un `scrollTo` avec ce champ l'emporte sur
    // la propriété CSS. D'où la vérification explicite ici.
    const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: mouvementReduit ? 'auto' : 'smooth' })
  }

  return (
    <button
      type="button"
      onClick={remonter}
      aria-label={t('retour_haut')}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={cn(
        // Focus clavier : la règle globale `:focus-visible` (globals.css)
        // pose déjà l'anneau bleu, seul signal d'interaction du système —
        // rien à ajouter ici.
        //
        // Pas de fond, pas de bordure : la flèche seule porte le bouton.
        // La zone 44×44 reste pour la cible tactile (accessibilité), invisible
        // tant qu'aucun fond ne la dessine.
        'fixed bottom-24 right-4 z-40 flex h-11 w-11 items-center justify-center',
        'text-ko-blue transition duration-200 hover:text-ko-black lg:right-6',
        visible ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      <IconeChevronBas taille={30} strokeWidth={2.5} className="rotate-180" />
    </button>
  )
}
