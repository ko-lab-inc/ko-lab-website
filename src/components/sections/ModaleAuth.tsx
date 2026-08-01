'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

import {
  connecterPourCommande,
  inscrirePourCommande,
  type EtatAuthModale,
} from '@/app/(marketing)/[locale]/boutique/demande/actionsAuth'
import { buttonVariants } from '@/components/ui/Button'
import { ChampAuth } from '@/components/ui/ChampAuth'
import { ChampMotDePasse } from '@/components/ui/ChampMotDePasse'
import { IconeFermer } from '@/components/ui/Icones'

/**
 * Authentification en surimpression, déclenchée au moment de confirmer une
 * commande — migration 0021.
 *
 * ---------------------------------------------------------------------------
 * `<dialog>` NATIF — MÊME MOTIF QUE TableauCandidatures.tsx
 *
 * Piloté par un booléen (`ouverte`) plutôt qu'un état interne : c'est
 * PagePanier qui décide quand l'ouvrir, cette modale n'a pas d'opinion sur le
 * moment. `showModal()`/`close()` donnent gratuitement le piège de focus,
 * la fermeture par Échap et le fond assombri — les reconstruire à la main
 * aurait dupliqué ce que le navigateur fait déjà correctement.
 * ---------------------------------------------------------------------------
 */
export function ModaleAuth({
  ouverte,
  locale,
  onFermer,
  onSucces,
}: {
  ouverte: boolean
  locale: string
  onFermer: () => void
  onSucces: () => void
}) {
  const t = useTranslations('Commande')
  const boite = useRef<HTMLDialogElement>(null)
  const [mode, setMode] = useState<'connexion' | 'inscription'>('connexion')

  useEffect(() => {
    const el = boite.current
    if (!el) return
    if (ouverte && !el.open) el.showModal()
    if (!ouverte && el.open) el.close()
  }, [ouverte])

  useEffect(() => {
    const el = boite.current
    if (!el) return
    const fermer = () => onFermer()
    el.addEventListener('close', fermer)
    return () => el.removeEventListener('close', fermer)
  }, [onFermer])

  return (
    <dialog
      ref={boite}
      aria-label={mode === 'connexion' ? t('modale_titre_connexion') : t('modale_titre_inscription')}
      className="w-[calc(100vw-2rem)] max-w-[440px] border border-ko-line bg-ko-white p-0 text-ko-ink shadow-card backdrop:bg-ko-scrim/60"
    >
      <div className="p-6 lg:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="label-mono text-ko-blue">{t('modale_etiquette')}</p>
            <h2 className="ko-h3 mt-2 text-ko-ink">
              {mode === 'connexion' ? t('modale_titre_connexion') : t('modale_titre_inscription')}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => boite.current?.close()}
            aria-label={t('modale_fermer')}
            className="shrink-0 text-ko-muted transition-colors duration-200 hover:text-ko-ink"
          >
            <IconeFermer taille={20} />
          </button>
        </div>

        <p className="mb-6 text-sm leading-relaxed text-ko-muted">{t('modale_texte')}</p>

        {mode === 'connexion' ? (
          <FormulaireConnexionModale onSucces={onSucces} />
        ) : (
          <FormulaireInscriptionModale locale={locale} onSucces={onSucces} />
        )}

        <button
          type="button"
          onClick={() => setMode((m) => (m === 'connexion' ? 'inscription' : 'connexion'))}
          className="mt-6 text-sm text-ko-blue underline-offset-4 transition-colors duration-200 hover:underline"
        >
          {mode === 'connexion' ? t('modale_vers_inscription') : t('modale_vers_connexion')}
        </button>
      </div>
    </dialog>
  )
}

function FormulaireConnexionModale({ onSucces }: { onSucces: () => void }) {
  const t = useTranslations('Commande')
  const [etat, action, enCours] = useActionState<EtatAuthModale, FormData>(connecterPourCommande, {})

  // Effet strictement client : prévenir PagePanier une fois la session
  // établie. Aucun redirect() côté serveur ici (voir actionsAuth.ts) — c'est
  // ce useEffect, pas la Server Action, qui décide de la suite.
  useEffect(() => {
    if (etat.succes) onSucces()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etat.succes])

  const messages: Record<string, string> = {
    identifiants: t('erreur_identifiants'),
    trop_de_tentatives: t('erreur_trop_tentatives'),
    serveur: t('erreur_serveur_auth'),
  }
  const erreur = etat.erreur ? (messages[etat.erreur] ?? t('erreur_serveur_auth')) : null

  return (
    <form action={action} className="space-y-4">
      <ChampAuth id="modale-email" name="email" type="email" required maxLength={200} autoComplete="email" libelle={t('email')} />
      <ChampMotDePasse
        id="modale-mdp"
        name="motDePasse"
        required
        maxLength={200}
        autoComplete="current-password"
        libelle={t('mot_de_passe')}
        libelleAfficher={t('afficher_mot_de_passe')}
        libelleMasquer={t('masquer_mot_de_passe')}
      />
      {erreur && (
        <p role="alert" className="text-sm text-ko-ink">
          {erreur}
        </p>
      )}
      <button type="submit" disabled={enCours} className={buttonVariants({ variant: 'primary' })}>
        {enCours ? t('en_cours') : t('se_connecter')}
        <span aria-hidden="true">→</span>
      </button>
    </form>
  )
}

function FormulaireInscriptionModale({
  locale,
  onSucces,
}: {
  locale: string
  onSucces: () => void
}) {
  const t = useTranslations('Commande')
  const [etat, action, enCours] = useActionState<EtatAuthModale, FormData>(inscrirePourCommande, {})

  // Ne se déclenche que dans le cas rare d'une session immédiate (voir
  // actionsAuth.ts) : `attenteConfirmation` couvre le cas normal, affiché
  // en place ci-dessous, sans jamais prévenir le parent.
  useEffect(() => {
    if (etat.succes && !etat.attenteConfirmation) onSucces()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etat.succes, etat.attenteConfirmation])

  if (etat.succes && etat.attenteConfirmation) {
    return (
      <div className="border border-ko-line bg-ko-cream p-5">
        <p className="text-sm leading-relaxed text-ko-ink">{t('inscription_attente_texte')}</p>
      </div>
    )
  }

  const messages: Record<string, string> = {
    confirmation: t('erreur_confirmation'),
    faible: t('erreur_faible'),
    trop_de_tentatives: t('erreur_trop_tentatives'),
    refuse: t('erreur_refuse_auth'),
    courriel: t('erreur_courriel_auth'),
    serveur: t('erreur_serveur_auth'),
  }
  const erreur = etat.erreur ? (messages[etat.erreur] ?? t('erreur_serveur_auth')) : null

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <ChampAuth id="modale-i-email" name="email" type="email" required maxLength={200} autoComplete="email" libelle={t('email')} />
      <ChampMotDePasse
        id="modale-i-mdp"
        name="motDePasse"
        required
        minLength={8}
        maxLength={200}
        autoComplete="new-password"
        libelle={t('mot_de_passe')}
        aide={t('aide_mot_de_passe')}
        libelleAfficher={t('afficher_mot_de_passe')}
        libelleMasquer={t('masquer_mot_de_passe')}
      />
      <ChampMotDePasse
        id="modale-i-confirmation"
        name="confirmation"
        required
        maxLength={200}
        autoComplete="new-password"
        libelle={t('confirmation')}
        libelleAfficher={t('afficher_mot_de_passe')}
        libelleMasquer={t('masquer_mot_de_passe')}
      />
      {erreur && (
        <p role="alert" className="text-sm text-ko-ink">
          {erreur}
        </p>
      )}
      <button type="submit" disabled={enCours} className={buttonVariants({ variant: 'primary' })}>
        {enCours ? t('en_cours') : t('creer_compte')}
        <span aria-hidden="true">→</span>
      </button>
    </form>
  )
}
