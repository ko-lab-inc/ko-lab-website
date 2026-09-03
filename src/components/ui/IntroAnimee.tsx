'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils/cn'

const CLE_SESSION = 'kolab-intro-vue'
/**
 * Timing ralenti le 3 septembre 2026 (point 2 du prompt de corrections
 * finales) : l'animation totalisait 2,7s (4×350 + 850 + 450), jugée « trop
 * rapide » — cible du brief : environ 4 à 4,5s. Nouveau total :
 * 4×500 + 1500 + 500 = 4000ms, en bas de la fourchette demandée plutôt que
 * de la dépasser. La séquence de mots (Créer/Fabriquer/Installer/Déployer)
 * et la phrase finale restent inchangées — seule leur tenue à l'écran
 * s'allonge. Le brief liste aussi une ligne-pont « Alors, on fait quoi
 * aujourd'hui? » entre les mots et la révélation : la phrase finale
 * (`Home.hero.title`) EST déjà cette question, au mot près la « question
 * principale » de la marque (CLAUDE.md) — dupliquer une variante paraphrasée
 * juste avant aurait fait bégayer la séquence sur la même idée deux fois de
 * suite. Rien à ajouter, seulement à ralentir.
 */
/** Par mot — inclut son temps d'entrée (200ms, voir globals.css) et sa tenue. */
const DUREE_MOT = 500
const DUREE_PHRASE = 1500
const DUREE_SORTIE = 500
/** Fondu écourté quand la personne saute volontairement — pas la peine de lui
 *  faire attendre la sortie « normale » une fois la décision prise. */
const DUREE_SORTIE_RAPIDE = 200

type Etape = 'inactive' | 'mots' | 'phrase' | 'sortie'

/**
 * Intro animée — signature de marque au premier chargement de l'accueil.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI `etape === 'inactive'` REND `null` PAR DÉFAUT
 *
 * Même logique que .reveal/.mot-anime (globals.css, garde-fou
 * `@media (scripting: none)`) : sans JavaScript, ce composant ne s'active
 * JAMAIS — `useLayoutEffect` n'existe que côté client. Le rendu par défaut
 * est donc « rien », pas « l'overlay, à retirer ensuite » : une personne sans
 * JS voit le hero immédiatement, jamais un écran noir permanent. Piloter
 * l'ACTIVATION plutôt que la DÉSACTIVATION résout aussi le risque de flash
 * pour la première visite d'une session : `useLayoutEffect` s'exécute avant
 * la première peinture du navigateur, donc activer l'overlay à ce moment ne
 * laisse jamais entrevoir le hero avant que le noir ne le recouvre.
 *
 * ---------------------------------------------------------------------------
 * CE QUE CE COMPOSANT NE FAIT JAMAIS
 *
 * Il ne retarde rien : Hero.tsx (avec son <Image priority>) est monté par
 * page.tsx en même temps, normalement, en dessous. Le navigateur télécharge
 * la photo à pleine priorité pendant que l'intro joue — l'overlay se contente
 * de la cacher visuellement quelques centaines de ms, il ne bloque ni son
 * rendu ni son chargement. Mesuré : voir le rapport de Phase 4.
 */
export function IntroAnimee() {
  const t = useTranslations('Home.intro')
  const tHero = useTranslations('Home.hero')
  const [etape, setEtape] = useState<Etape>('inactive')
  const [indexMot, setIndexMot] = useState(0)
  const minuteries = useRef<ReturnType<typeof setTimeout>[]>([])
  const boutonPasserRef = useRef<HTMLButtonElement>(null)

  const programmer = (fn: () => void, delai: number) => {
    const id = setTimeout(fn, delai)
    minuteries.current.push(id)
  }

  const marquerVue = () => {
    try {
      sessionStorage.setItem(CLE_SESSION, '1')
    } catch {
      // Stockage indisponible (navigation privée stricte, quota) — sans
      // conséquence : l'intro rejouera à la prochaine visite, un désagrément
      // mineur plutôt qu'une erreur qui casserait la page.
    }
  }

  // Avant la première peinture — voir la note d'en-tête sur le flash.
  useLayoutEffect(() => {
    let dejaVue: boolean
    try {
      dejaVue = sessionStorage.getItem(CLE_SESSION) === '1'
    } catch {
      dejaVue = true
    }
    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (dejaVue || reduit) return // reste 'inactive' : le hero s'affiche direct

    setEtape('mots')
  }, [])

  // Focus posé sur le bouton « Passer » dès l'activation, pas laissé au
  // Tab : n'importe quelle touche (y compris Tab lui-même, voir l'écouteur
  // plus bas) saute déjà l'intro avant que le focus natif n'ait le temps de
  // bouger — un Tab en série n'atteindrait donc jamais le bouton. Pattern
  // standard des overlays plein écran (ARIA dialog) : poser le focus dessus
  // à l'ouverture rend le contrôle immédiatement disponible et annoncé par
  // un lecteur d'écran, sans dépendre d'une touche devinée.
  useEffect(() => {
    if (etape === 'mots') boutonPasserRef.current?.focus()
  }, [etape])

  // Enchaînement des quatre mots, puis bascule vers la phrase.
  useEffect(() => {
    if (etape !== 'mots') return

    if (indexMot < 3) {
      programmer(() => setIndexMot((i) => i + 1), DUREE_MOT)
    } else {
      programmer(() => setEtape('phrase'), DUREE_MOT)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etape, indexMot])

  // Tenue de la phrase, puis sortie.
  useEffect(() => {
    if (etape !== 'phrase') return
    programmer(() => setEtape('sortie'), DUREE_PHRASE)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etape])

  // Fondu de sortie, puis démontage complet (plus de nœud fixed en trop).
  useEffect(() => {
    if (etape !== 'sortie') return
    programmer(() => {
      marquerVue()
      setEtape('inactive')
    }, DUREE_SORTIE)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etape])

  useEffect(() => {
    return () => minuteries.current.forEach(clearTimeout)
  }, [])

  // Partagé entre les écouteurs globaux ci-dessous et le bouton « Passer »
  // du JSX : une seule logique de saut, deux façons d'y arriver.
  const passer = () => {
    // Garde-fou : le clic sur le bouton déclenche AUSSI le `pointerdown`
    // global ci-dessous (il ne cible pas d'élément précis) — sans ce retour
    // anticipé, les deux appels programmeraient chacun leur propre sortie.
    // Sans conséquence visuelle (idempotent), mais inutile.
    if (etape === 'inactive' || etape === 'sortie') return
    minuteries.current.forEach(clearTimeout)
    marquerVue()
    setEtape('sortie')
    programmer(() => setEtape('inactive'), DUREE_SORTIE_RAPIDE)
  }

  // Clic, touche ou molette n'importe où : passage immédiat. Écoute posée
  // seulement pendant que l'intro joue, jamais sur le reste du site. Le
  // bouton visible (JSX) reste la cible officielle pour le clavier ; ces
  // écouteurs couvrent en plus la personne qui clique/défile sans le voir.
  useEffect(() => {
    if (etape === 'inactive' || etape === 'sortie') return

    const surEvenement = (e: Event) => {
      // Espace/PageDown/flèches ont un comportement natif de défilement —
      // sans preventDefault, sauter l'intro à l'espace atterrissait au
      // milieu de la page plutôt qu'en haut du hero (constaté en test).
      // Pas sur `wheel` : il est `passive` (obligatoire pour ne pas bloquer
      // le défilement tactile), preventDefault y serait sans effet et
      // lèverait une erreur en mode strict.
      if (e.type !== 'wheel') e.preventDefault()
      passer()
    }

    window.addEventListener('pointerdown', surEvenement)
    window.addEventListener('keydown', surEvenement)
    window.addEventListener('wheel', surEvenement, { passive: true })
    return () => {
      window.removeEventListener('pointerdown', surEvenement)
      window.removeEventListener('keydown', surEvenement)
      window.removeEventListener('wheel', surEvenement)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etape])

  if (etape === 'inactive') return null

  const mots = [t('mot1'), t('mot2'), t('mot3'), t('mot4')]

  return (
    <div className={cn('intro-overlay', etape === 'sortie' && 'intro-overlay-sortie')}>
      {/* aria-hidden : séquence purement décorative — le hero qui suit porte
          le même texte de phrase dans un vrai <h1>, rien d'essentiel ne se
          perd pour un lecteur d'écran. Le bouton « Passer », lui, reste HORS
          de ce bloc : un contrôle réel ne doit jamais vivre sous aria-hidden. */}
      <div className="intro-scene" aria-hidden="true">
        {etape === 'mots' && (
          <p key={indexMot} className="intro-mot">
            {mots[indexMot]}
          </p>
        )}

        {(etape === 'phrase' || etape === 'sortie') && (
          <p className="intro-phrase">
            {tHero.rich('title', { em: (chunks) => <em className="italic text-ko-blue">{chunks}</em> })}
          </p>
        )}

        <span className="intro-filet" />
      </div>

      {/* Cible focalisable pour le clavier/lecteur d'écran — visuellement
          invisible depuis le 3 septembre 2026 (.intro-passer, globals.css),
          jamais retirée du DOM ni de la navigation clavier. Cliquer/Entrée/
          Espace ici appelle `passer()` directement ; les écouteurs globaux
          couvrent en plus n'importe quelle touche/tap/clic pendant que
          l'intro joue (voir plus haut) — c'est CE geste, pas ce bouton, que
          voit et vise une personne voyante. */}
      <button
        ref={boutonPasserRef}
        type="button"
        onClick={passer}
        className="intro-passer"
      >
        {t('passer')}
      </button>
    </div>
  )
}
