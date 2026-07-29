'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useRef } from 'react'

import { FormulaireConnexion } from '@/components/sections/FormulaireConnexion'
import { IconeFermer } from '@/components/ui/Icones'
import { Link } from '@/i18n/navigation'
import { ROUTES } from '@/lib/routes'

/**
 * Connexion en surimpression, ouverte depuis l'icône de profil.
 *
 * ---------------------------------------------------------------------------
 * LE MODAL S'AJOUTE AUX PAGES, IL NE LES REMPLACE PAS
 *
 * /connexion, /inscription et les deux écrans de mot de passe restent en
 * place, et ce n'est pas de la redondance :
 *
 *   - le proxy redirige vers /connexion?suivant=… quand on tape /admin ;
 *   - le lien de réinitialisation reçu par courriel revient sur une vraie URL ;
 *   - sans JavaScript, l'icône reste un lien qui mène quelque part.
 *
 * D'où l'ancre conservée dans la nav, dont le clic est simplement intercepté.
 * Ctrl-clic et clic du milieu continuent d'ouvrir la page dans un onglet.
 * ---------------------------------------------------------------------------
 *
 * <dialog> natif plutôt qu'un <div> en position fixe : showModal() apporte
 * gratuitement le piège à focus, la fermeture par Échap, l'inertie de
 * l'arrière-plan et le ::backdrop. Les réimplémenter à la main, c'est
 * exactement là qu'on oublie un cas — typiquement le focus qui s'échappe
 * derrière la fenêtre à la tabulation.
 */
export function ModaleConnexion({
  ouvert,
  surFermeture,
  locale,
}: {
  ouvert: boolean
  surFermeture: () => void
  locale: string
}) {
  const t = useTranslations('Connexion')
  const boite = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = boite.current
    if (!el) return

    // showModal() lève si le dialog est déjà ouvert — d'où les deux gardes.
    if (ouvert && !el.open) el.showModal()
    if (!ouvert && el.open) el.close()
  }, [ouvert])

  // Échap et le bouton de fermeture natif passent par l'événement `close` :
  // sans cette synchronisation, l'état du parent resterait à `true` et
  // rouvrir le modal deviendrait impossible.
  useEffect(() => {
    const el = boite.current
    if (!el) return
    el.addEventListener('close', surFermeture)
    return () => el.removeEventListener('close', surFermeture)
  }, [surFermeture])

  return (
    <dialog
      ref={boite}
      aria-labelledby="titre-connexion"
      // Un clic sur le fond atteint le <dialog> lui-même, jamais un enfant :
      // comparer la cible suffit à distinguer « dehors » de « dedans ».
      onClick={(e) => {
        if (e.target === boite.current) boite.current?.close()
      }}
      className="w-[calc(100vw-2rem)] max-w-[420px] border border-ko-line bg-ko-white p-0 text-ko-ink shadow-card backdrop:bg-ko-scrim/60"
    >
      <div className="p-7 lg:p-8">
        <div className="flex items-start justify-between gap-4">
          <h2 id="titre-connexion" className="ko-h3 text-[24px] text-ko-ink">
            {t('titre')}
          </h2>
          <button
            type="button"
            onClick={() => boite.current?.close()}
            aria-label={t('fermer')}
            className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink"
          >
            <IconeFermer taille={18} />
          </button>
        </div>

        <FormulaireConnexion
          locale={locale}
          // Identifiants distincts de ceux de la page /connexion : le modal
          // peut s'ouvrir par-dessus n'importe quelle page, et deux `id`
          // identiques casseraient l'association libellé/champ.
          prefixe="modale-"
          libelles={{
            courriel: t('courriel'),
            motDePasse: t('mot_de_passe'),
            seConnecter: t('se_connecter'),
            enCours: t('en_cours'),
            erreurIdentifiants: t('erreur_identifiants'),
            erreurTentatives: t('erreur_tentatives'),
            erreurServeur: t('erreur_serveur'),
          }}
        />

        {/* Les deux échappatoires mènent aux vraies pages : un parcours de
            récupération de mot de passe s'étale sur plusieurs écrans et un
            aller-retour par courriel, il n'a rien à faire dans une fenêtre
            qu'un clic à côté referme. */}
        <div className="mt-6 flex flex-col gap-2 text-sm">
          <Link
            href={ROUTES.motDePasseOublie}
            className="text-ko-muted underline-offset-4 transition-colors duration-200 hover:text-ko-blue hover:underline"
          >
            {t('mot_de_passe_oublie')}
          </Link>
          <p className="text-ko-muted">
            {t('pas_encore')}{' '}
            <Link
              href={ROUTES.inscription}
              className="text-ko-blue underline-offset-4 transition-colors duration-200 hover:underline"
            >
              {t('creer_compte')}
            </Link>
          </p>
        </div>
      </div>
    </dialog>
  )
}
