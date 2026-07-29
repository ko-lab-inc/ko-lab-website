'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

import { FormulaireConnexion } from '@/components/sections/FormulaireConnexion'
import { FormulaireInscription } from '@/components/sections/FormulairesCompte'
import { IconeFermer } from '@/components/ui/Icones'
import { Link } from '@/i18n/navigation'
import { ROUTES } from '@/lib/routes'

/**
 * Compte en surimpression — connexion ET création, dans la même fenêtre.
 *
 * ---------------------------------------------------------------------------
 * LE MODAL S'AJOUTE AUX PAGES, IL NE LES REMPLACE PAS
 *
 * /connexion et /inscription restent en place, et ce n'est pas de la
 * redondance :
 *
 *   - le proxy redirige vers /connexion?suivant=… quand on tape /admin ;
 *   - le lien de réinitialisation reçu par courriel revient sur une vraie URL ;
 *   - sans JavaScript, l'icône reste un lien qui mène quelque part.
 *
 * Nav.tsx ne monte d'ailleurs PAS ce composant sur ces pages-là : le modal y
 * superposerait un second formulaire identique à celui déjà affiché.
 * ---------------------------------------------------------------------------
 *
 * Les deux vues basculent SANS naviguer : passer de « se connecter » à « créer
 * un compte » ne doit pas coûter un chargement de page, c'est le moment où
 * l'on abandonne. « Mot de passe oublié », en revanche, mène à la vraie page :
 * ce parcours s'étale sur plusieurs écrans et un aller-retour par courriel, il
 * n'a rien à faire dans une fenêtre qu'un clic à côté referme.
 *
 * <dialog> natif plutôt qu'un <div> en position fixe : showModal() apporte
 * gratuitement le piège à focus, la fermeture par Échap, l'inertie de
 * l'arrière-plan et le ::backdrop.
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
  const tIns = useTranslations('Inscription')
  const boite = useRef<HTMLDialogElement>(null)
  const [vue, setVue] = useState<'connexion' | 'inscription'>('connexion')

  useEffect(() => {
    const el = boite.current
    if (!el) return
    // showModal() lève si le dialog est déjà ouvert — d'où les deux gardes.
    if (ouvert && !el.open) el.showModal()
    if (!ouvert && el.open) el.close()
    // Réouvrir doit repartir de la connexion : garder la vue « inscription »
    // d'une session précédente surprendrait plus que ça n'aiderait.
    if (ouvert) setVue('connexion')
  }, [ouvert])

  // Échap et la fermeture native passent par l'événement `close` : sans cette
  // synchronisation, l'état du parent resterait à `true` et rouvrir le modal
  // deviendrait impossible.
  useEffect(() => {
    const el = boite.current
    if (!el) return
    el.addEventListener('close', surFermeture)
    return () => el.removeEventListener('close', surFermeture)
  }, [surFermeture])

  const inscription = vue === 'inscription'

  return (
    <dialog
      ref={boite}
      aria-labelledby="titre-modale-compte"
      // Un clic sur le fond atteint le <dialog> lui-même, jamais un enfant :
      // comparer la cible suffit à distinguer « dehors » de « dedans ».
      onClick={(e) => {
        if (e.target === boite.current) boite.current?.close()
      }}
      className="w-[calc(100vw-2rem)] max-w-[420px] border border-ko-line bg-ko-white p-0 text-ko-ink shadow-card backdrop:bg-ko-scrim/60"
    >
      <div className="max-h-[85svh] overflow-y-auto p-7 lg:p-8">
        <div className="flex items-start justify-between gap-4">
          <h2 id="titre-modale-compte" className="ko-h3 text-[24px] text-ko-ink">
            {inscription ? tIns('titre') : t('titre')}
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

        {inscription ? (
          <>
            <p className="mt-2 text-sm leading-relaxed text-ko-muted">{tIns('intro')}</p>
            <FormulaireInscription
              locale={locale}
              // Identifiants distincts de ceux des pages : le modal peut
              // s'ouvrir par-dessus n'importe quel écran, et deux `id`
              // identiques casseraient l'association libellé/champ.
              prefixe="modale-"
              libelles={{
                courriel: tIns('courriel'),
                motDePasse: tIns('mot_de_passe'),
                aideMotDePasse: tIns('aide_mot_de_passe'),
                confirmation: tIns('confirmation'),
                creer: tIns('creer'),
                enCours: tIns('en_cours'),
                succesTitre: tIns('succes_titre'),
                succesTexte: tIns('succes_texte'),
                erreurDonnees: tIns('erreur_donnees'),
                erreurConfirmation: tIns('erreur_confirmation'),
                erreurFaible: tIns('erreur_faible'),
                erreurTentatives: tIns('erreur_tentatives'),
                erreurRefuse: tIns('erreur_refuse'),
                erreurCourriel: tIns('erreur_courriel'),
                erreurServeur: tIns('erreur_serveur'),
              }}
            />
            <p className="mt-6 text-sm text-ko-muted">
              {tIns('deja_compte')}{' '}
              <button
                type="button"
                onClick={() => setVue('connexion')}
                className="text-ko-blue underline-offset-4 transition-colors duration-200 hover:underline"
              >
                {tIns('se_connecter')}
              </button>
            </p>
          </>
        ) : (
          <>
            <FormulaireConnexion
              locale={locale}
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

            <div className="mt-6 flex flex-col gap-2 text-sm">
              <Link
                href={ROUTES.motDePasseOublie}
                className="text-ko-muted underline-offset-4 transition-colors duration-200 hover:text-ko-blue hover:underline"
              >
                {t('mot_de_passe_oublie')}
              </Link>
              <p className="text-ko-muted">
                {t('pas_encore')}{' '}
                <button
                  type="button"
                  onClick={() => setVue('inscription')}
                  className="text-ko-blue underline-offset-4 transition-colors duration-200 hover:underline"
                >
                  {t('creer_compte')}
                </button>
              </p>
            </div>
          </>
        )}
      </div>
    </dialog>
  )
}
