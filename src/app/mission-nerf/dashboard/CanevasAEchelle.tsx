'use client'

import { useEffect, useState } from 'react'

/**
 * Rend le dashboard « responsive » sans retoucher une seule des mesures déjà
 * calibrées au pixel près (hauteur de carte 174px, trou caméra 1854×618,
 * taille du QR, tailles de texte des états de la carte Prochain départ...).
 *
 * ⚠️ PROBLÈME OBSERVÉ LE SOIR DU 1er SEPTEMBRE — le dashboard, ouvert
 * directement dans un onglet de navigateur normal (pas via OBS) redimensionné
 * à autre chose que 1920×1080, cassait franchement : « SESSION EN COURS »
 * tronqué et débordant de sa carte, badge « ZONE OUVERTE » retombant sur deux
 * lignes, QR code coupé par le bord de la fenêtre. Cause : toutes les tailles
 * de cet écran sont des valeurs FIXES en pixels (`text-[30px]`, `h-[174px]`,
 * `w-[420px]`…), délibérément — voir les docstrings de page.tsx et
 * ElementsEnDirect.tsx — parce que c'est ce qui garantit un rendu identique
 * au pixel près dans OBS (toujours exactement 1920×1080, fixé dans la
 * Browser Source). Ces mêmes valeurs fixes ne s'adaptent évidemment à rien
 * d'autre que 1920×1080.
 *
 * SOLUTION — pas de deuxième jeu de tailles pour « les petits écrans » (ça
 * aurait fallu recalibrer un par un tous les débordements déjà mesurés, et
 * recommencer à chaque futur ajustement). À la place : le contenu du
 * dashboard reste un canevas FIXE de 1920×1080 (voir dashboard/page.tsx,
 * `w-[1920px] h-[1080px]` au lieu de `w-full h-screen`), et CE COMPOSANT
 * applique un simple `transform: scale()` sur ce canevas entier pour le
 * faire tenir dans la fenêtre réelle, quelle qu'elle soit — en préservant le
 * ratio d'aspect (`Math.min`, jamais une distorsion séparée en largeur et en
 * hauteur).
 *
 * ⚠️ CAS OBS INTACT PAR CONSTRUCTION — la Browser Source d'OBS ouvre
 * toujours cette page dans un viewport EXACTEMENT 1920×1080 (jamais changé
 * dans ce projet). Dans ce cas précis, `Math.min(1920/1920, 1080/1080) = 1`
 * : aucune mise à l'échelle, le rendu reste PIXEL POUR PIXEL identique à
 * avant ce composant — le trou caméra (1854×618 à x33 y231) reste exact,
 * vérifié après coup, pas supposé.
 *
 * `position: fixed` sur un descendant d'un ancêtre avec `transform` se
 * comporte comme `position: absolute` par rapport à CET ancêtre (règle CSS,
 * pas un bug) — IndicateurConnexion (fixed bottom-4 right-4) reste donc
 * ancré au coin du CANEVAS 1920×1080, pas de la fenêtre réelle : exactement
 * le comportement voulu ici.
 */
export function CanevasAEchelle({ children }: { children: React.ReactNode }) {
  const [echelle, setEchelle] = useState(1)

  useEffect(() => {
    function recalculer() {
      setEchelle(Math.min(window.innerWidth / 1920, window.innerHeight / 1080))
    }
    recalculer()
    window.addEventListener('resize', recalculer)
    return () => window.removeEventListener('resize', recalculer)
  }, [])

  /**
   * ⚠️ FOND OPAQUE SEULEMENT QUAND LA PAGE EST RÉDUITE — corrigé le
   * 4 septembre 2026, en direct sur le site pendant le montage.
   *
   * Ce conteneur portait `bg-[#05070c]` en dur : utile pour remplir les bandes
   * du letterbox quand le canevas est mis à l'échelle dans un navigateur
   * normal, mais c'est un fond PLEIN ÉCRAN OPAQUE — dans OBS il recouvrait
   * la source caméra placée derrière la Browser Source, et le trou caméra
   * s'affichait noir. Symptôme constaté : désactiver la Browser Source
   * faisait réapparaître la caméra.
   *
   * Il contredisait l'intention documentée partout ailleurs dans cet écran
   * (layout.tsx force html/body transparents, PanneauCamera est vide exprès,
   * chaque panneau porte son propre fond) — jamais un fond global.
   *
   * Dans OBS la Browser Source fait exactement 1920×1080, donc `echelle === 1`
   * et le fond disparaît. Il ne réapparaît que quand la page est réellement
   * rétrécie, c'est-à-dire hors OBS, là où il sert vraiment à quelque chose.
   */
  return (
    <div
      className={`flex h-screen w-screen items-center justify-center overflow-hidden ${echelle < 1 ? "bg-[#05070c]" : ""}`}
    >
      <div style={{ transform: `scale(${echelle})`, transformOrigin: 'center center' }}>{children}</div>
    </div>
  )
}
