'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'

import { buttonVariants } from '@/components/ui/Button'
import { IconeAccompagnement, IconeFermer } from '@/components/ui/Icones'
import { Link, usePathname } from '@/i18n/navigation'
import { ROUTES } from '@/lib/routes'
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

export function WidgetAide({ telephone }: { telephone: string | null }) {
  // Langue de la PAGE, pas un champ du formulaire — voir schemaContact.
  const locale = useLocale() as 'fr' | 'en'
  const t = useTranslations('Aide')
  // Le texte de consentement vit dans Contact.form : une seule formulation
  // pour les deux formulaires, donc une seule a maintenir.
  const tContact = useTranslations('Contact')
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

  /**
   * Rouvrir remet le formulaire à neuf.
   *
   * Sans ça, l'état `succes` survivait à la fermeture : rouvrir le panneau
   * réaffichait « Message reçu » indéfiniment, et il devenait impossible de
   * poser une deuxième question — y compris pour corriger la première, qui
   * est précisément le moment où on y revient. Signalé par Christian le
   * 2 octobre 2026, capture à l'appui.
   *
   * La remise à zéro est à l'OUVERTURE et non à la fermeture : le visiteur
   * doit avoir le temps de lire « Message reçu » avant que ça disparaisse,
   * et une fermeture par la touche Échap ne doit pas effacer la confirmation
   * sous ses yeux.
   */
  const ouvrir = useCallback(() => {
    setEtat('repos')
    setOuvert(true)
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
          // Case obligatoire du formulaire : 'on' quand elle est cochee.
          consentement: donnees.get('consentement') === 'on',
          // Voir FormulaireContact : décide de la langue de l'accusé de réception.
          locale,
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
          /*
           * `max-h` + `overflow-y-auto` : le panneau est ancré en bas et
           * grandit vers le HAUT, donc tout ce qui dépasse sort par le haut de
           * la fenêtre — en silence, sans barre de défilement, et c'est le
           * champ « Votre nom » qui disparaît en premier.
           *
           * Mesuré le 2 octobre 2026 : 606 px de haut, donc hors écran dès une
           * fenêtre de 680 px (-10 px), et de 90 px à 600 px. Sur un portable
           * de 1366×768 avec la barre d'adresse et la barre des tâches, on y
           * est. Signalé par Christian, capture à l'appui.
           *
           * `100svh` et non `100vh` : sur mobile, `vh` compte la barre
           * d'adresse rétractée, donc promet une hauteur que l'écran n'a pas
           * tant qu'on n'a pas fait défiler. 8rem couvre le lanceur (44 px),
           * l'écart `mb-3` et la marge basse du conteneur.
           */
          className="mb-3 max-h-[calc(100svh-8rem)] w-[calc(100vw-2rem)] max-w-[360px] overflow-y-auto overscroll-contain border border-ko-line bg-ko-white p-6 shadow-card"
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

                {/* Consentement — AJOUTÉ le 2 octobre 2026, et c'est la raison
                    pour laquelle ce widget n'a jamais rien envoyé.

                    `schemaContact` exige `consentement === true` depuis
                    l'audit Loi 25 du 23 août 2026 (migration 0041). Le
                    formulaire de contact a reçu sa case ce jour-là ; celui-ci
                    non. Sa charge utile partait donc sans le champ, la
                    validation la refusait en 400, et le visiteur lisait
                    « L'envoi a échoué » — signalé par Christian, prouvé en
                    production : la même requête passe à 200 dès que le champ
                    est présent.

                    Même case, même texte et mêmes liens que le formulaire
                    complet : un consentement recueilli autrement ici serait
                    plus difficile à défendre qu'un consentement unique. */}
                <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-ko-muted">
                  <input
                    type="checkbox"
                    name="consentement"
                    required
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-ko-blue"
                  />
                  <span>
                    {tContact.rich('form.consentement', {
                      lienConditions: (chunks) => (
                        <Link
                          href={ROUTES.conditionsUtilisation}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline decoration-ko-blue underline-offset-4 hover:text-ko-ink"
                        >
                          {chunks}
                        </Link>
                      ),
                      lienPolitique: (chunks) => (
                        <Link
                          href={ROUTES.politiqueConfidentialite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline decoration-ko-blue underline-offset-4 hover:text-ko-ink"
                        >
                          {chunks}
                        </Link>
                      ),
                    })}
                  </span>
                </label>

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

                {/* Téléphone — ajouté le 2 octobre 2026.
                    Un prospect pressé ne doit pas avoir à remplir trois champs
                    pour joindre quelqu'un. `tel:` sans espaces ni tirets : le
                    numéro affiché reste lisible, celui qui est composé doit
                    être valide.
                    Rendu uniquement si le réglage est renseigné — la ligne
                    disparaît si KO-LAB le vide, comme dans le pied de page. */}
                {telephone && (
                  <p className="border-t border-ko-line pt-3 text-center text-xs text-ko-muted">
                    {t('ou_appeler')}{' '}
                    <a
                      href={`tel:${telephone.replace(/[^+\d]/g, '')}`}
                      className="whitespace-nowrap font-medium text-ko-ink underline decoration-ko-blue underline-offset-4"
                    >
                      {telephone}
                    </a>
                  </p>
                )}
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
        onClick={() => (ouvert ? fermer() : ouvrir())}
        aria-expanded={ouvert}
        aria-label={t('ouvrir')}
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-sm bg-ko-black text-ko-white shadow-card transition-colors duration-200 hover:bg-ko-black2"
      >
        {ouvert ? <IconeFermer taille={22} /> : <IconeAccompagnement taille={22} />}
      </button>
    </div>
  )
}
