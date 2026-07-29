'use client'

import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'

import { buttonVariants } from '@/components/ui/Button'
import { IconeAccompagnement, IconeFermer } from '@/components/ui/Icones'
import { usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils/cn'

/**
 * Bulle d'aide — panneau de question courte, sur toutes les pages publiques.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI PAS CRISP
 *
 * ChatCrisp existe déjà et reste en place : s'il est configuré, c'est LUI qui
 * s'affiche et ce composant ne rend rien (voir layout.tsx). Mais il suppose un
 * compte tiers ouvert au nom de KO-LAB Inc., un script chargé depuis
 * client.crisp.chat, un iframe hors de portée de nos tokens, et un bandeau de
 * consentement le jour où il dépose ses cookies.
 *
 * Ce widget-ci ne coûte rien de tout ça : aucun script externe, aucun cookie,
 * il réutilise /api/contact qui valide, limite le débit et piège les robots
 * depuis le début. Le jour où KO-LAB veut du vrai clavardage en direct, il
 * suffit de renseigner NEXT_PUBLIC_CRISP_WEBSITE_ID et celui-ci s'efface.
 *
 * ⚠️ `type: 'autre'` et non 'aide' : TYPES_DEMANDE (src/types) alimente une
 * contrainte CHECK en base. Ajouter une valeur demande une migration SQL, que
 * Moussa exécute lui-même — à faire si on veut distinguer ces demandes dans le
 * futur tableau de bord.
 * ---------------------------------------------------------------------------
 */

type Etat = 'repos' | 'envoi' | 'succes' | 'erreur'

export function WidgetAide() {
  const t = useTranslations('Aide')
  const pathname = usePathname()
  const [ouvert, setOuvert] = useState(false)
  const [etat, setEtat] = useState<Etat>('repos')
  const [decalage, setDecalage] = useState(0)

  const panneau = useRef<HTMLDivElement>(null)
  const lanceur = useRef<HTMLButtonElement>(null)

  /**
   * Remonte la bulle au-dessus de la barre d'achat collante de la fiche
   * produit, quand elle est visible (sous lg).
   *
   * Mesuré plutôt que codé en dur : la barre fait 97 px à 375 px mais 79 px à
   * 768 px, le prix et le contrôle de quantité passant sur une ou deux lignes
   * selon la largeur. Une valeur fixe laisserait la bulle chevaucher le bouton
   * « Ajouter au panier » sur l'un des deux formats.
   */
  useEffect(() => {
    const mesurer = () => {
      const barre = document.querySelector<HTMLElement>('[data-barre-achat]')
      // ⚠️ PAS `offsetParent !== null` pour tester la visibilité : la barre est
      // en `position: fixed`, et pour un élément fixe offsetParent vaut TOUJOURS
      // null, visible ou non. Le test échouait donc systématiquement et la bulle
      // se posait sur le bouton « Ajouter au panier ». La hauteur du rectangle,
      // elle, tombe bien à 0 quand `lg:hidden` s'applique.
      const hauteur = barre?.getBoundingClientRect().height ?? 0
      setDecalage(hauteur > 0 ? hauteur + 12 : 0)
    }
    mesurer()
    window.addEventListener('resize', mesurer)
    return () => window.removeEventListener('resize', mesurer)
    // `pathname` : le layout persiste d'une page à l'autre, la barre d'achat
    // n'existe que sur la fiche produit. Sans cette dépendance, le décalage
    // resterait figé sur la valeur de la première page chargée.
  }, [pathname])

  const fermer = useCallback(() => {
    setOuvert(false)
    // Le focus doit revenir au lanceur, sinon il retombe sur <body> et la
    // navigation au clavier repart du haut de la page.
    lanceur.current?.focus()
  }, [])

  // Échap ferme, comme le menu de la nav.
  useEffect(() => {
    if (!ouvert) return
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fermer()
    }
    window.addEventListener('keydown', surTouche)
    return () => window.removeEventListener('keydown', surTouche)
  }, [ouvert, fermer])

  // Premier champ focalisé à l'ouverture : au clavier, ouvrir un panneau dont
  // le focus reste dehors revient à ne pas l'avoir ouvert.
  //
  // ⚠️ Ciblé par id, PAS par `querySelector('input')` : le premier <input> du
  // panneau est le honeypot. Le focus y atterrissait, et comme `sr-only` reste
  // annoncé aux lecteurs d'écran, un visiteur au clavier pouvait taper sa
  // question dans le piège — auquel cas l'API répond 200 sans rien enregistrer,
  // et le message disparaît en silence.
  useEffect(() => {
    if (ouvert) panneau.current?.querySelector<HTMLInputElement>('#aide-nom')?.focus()
  }, [ouvert])

  async function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const donnees = new FormData(e.currentTarget)
    setEtat('envoi')

    try {
      const reponse = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'autre',
          nom: donnees.get('nom'),
          email: donnees.get('email'),
          message: donnees.get('message'),
          _hp: donnees.get('_hp'),
        }),
      })
      setEtat(reponse.ok ? 'succes' : 'erreur')
    } catch {
      // Réseau coupé : même message que pour un 500. Distinguer les deux
      // n'aiderait pas le visiteur, qui n'a qu'une action possible — réessayer.
      setEtat('erreur')
    }
  }

  return (
    <div
      className="fixed right-4 z-40 lg:right-6"
      style={{ bottom: `calc(1rem + ${decalage}px)` }}
    >
      {ouvert && (
        <div
          ref={panneau}
          role="dialog"
          aria-modal="false"
          aria-label={t('titre')}
          // w-[calc(100vw-2rem)] : à 375 px un panneau de largeur fixe
          // dépassait à droite. Plafonné à 360 px au-delà.
          className="mb-3 w-[calc(100vw-2rem)] max-w-[360px] border border-ko-line bg-ko-white p-6 shadow-card"
        >
          <div className="flex items-start justify-between gap-4">
            <p className="ko-h3 text-[20px] text-ko-ink">{t('titre')}</p>
            <button
              type="button"
              onClick={fermer}
              aria-label={t('fermer')}
              className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink"
            >
              <IconeFermer taille={18} />
            </button>
          </div>

          {etat === 'succes' ? (
            <div className="mt-4">
              <p className="text-base leading-relaxed text-ko-ink">{t('succes_titre')}</p>
              <p className="mt-2 text-sm leading-relaxed text-ko-muted">{t('succes_texte')}</p>
            </div>
          ) : (
            <>
              <p className="mt-2 text-sm leading-relaxed text-ko-muted">{t('intro')}</p>

              <form onSubmit={envoyer} className="mt-5 space-y-3">
                {/* Piège à robots — même mécanique que le formulaire de
                    contact. `sr-only` et non `display:none` : certains robots
                    ignorent les champs réellement masqués. tabIndex -1 et
                    autoComplete off le gardent hors de portée d'un humain. */}
                <input
                  type="text"
                  name="_hp"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="sr-only"
                />

                <div>
                  <label htmlFor="aide-nom" className="sr-only">
                    {t('nom')}
                  </label>
                  <input
                    id="aide-nom"
                    name="nom"
                    required
                    minLength={2}
                    maxLength={100}
                    placeholder={t('nom')}
                    className="min-h-[44px] w-full border border-ko-line bg-ko-white px-3.5 py-2.5 text-base text-ko-ink transition-colors duration-200 placeholder:text-ko-muted focus:border-ko-blue focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="aide-email" className="sr-only">
                    {t('courriel')}
                  </label>
                  <input
                    id="aide-email"
                    name="email"
                    type="email"
                    required
                    maxLength={200}
                    placeholder={t('courriel')}
                    className="min-h-[44px] w-full border border-ko-line bg-ko-white px-3.5 py-2.5 text-base text-ko-ink transition-colors duration-200 placeholder:text-ko-muted focus:border-ko-blue focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="aide-message" className="sr-only">
                    {t('message')}
                  </label>
                  <textarea
                    id="aide-message"
                    name="message"
                    required
                    minLength={10}
                    maxLength={2000}
                    rows={4}
                    placeholder={t('message')}
                    className="w-full resize-none border border-ko-line bg-ko-white px-3.5 py-2.5 text-base text-ko-ink transition-colors duration-200 placeholder:text-ko-muted focus:border-ko-blue focus:outline-none"
                  />
                </div>

                {etat === 'erreur' && (
                  <p role="alert" className="text-sm leading-relaxed text-ko-ink">
                    {t('erreur')}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={etat === 'envoi'}
                  className={cn('w-full', buttonVariants({ variant: 'primary', size: 'sm' }))}
                >
                  {etat === 'envoi' ? t('envoi') : t('envoyer')}
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/*
        Lanceur en NOIR, pas en bleu — la décision était déjà écrite dans
        ChatCrisp.tsx pour le lanceur Crisp : le bleu est notre unique signal
        d'interaction, une bulle bleue flottant en permanence entrerait en
        concurrence avec « Ajouter au panier ». Carré à coins légèrement
        adoucis plutôt qu'un cercle vert : le rond coloré est précisément le
        marqueur de widget générique que le skill 08 écarte.
      */}
      <button
        ref={lanceur}
        type="button"
        onClick={() => (ouvert ? fermer() : setOuvert(true))}
        aria-expanded={ouvert}
        aria-label={t('ouvrir')}
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-sm bg-ko-black text-ko-white shadow-card transition-colors duration-200 hover:bg-ko-black2"
      >
        {ouvert ? <IconeFermer taille={22} /> : <IconeAccompagnement taille={22} />}
      </button>
    </div>
  )
}
