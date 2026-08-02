'use client'

import { useActionState } from 'react'
import { useTranslations } from 'next-intl'

import { annulerCommande, type EtatAnnulation } from '@/app/(marketing)/[locale]/compte/commandes/[id]/actions'
import { buttonVariants } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'

/**
 * Annulation par le client — bouton distinct de EditeurLignesCommande.tsx :
 * une confirmation navigateur avant l'envoi (`window.confirm`), pas de
 * changement de quantité à valider, une seule action irréversible dans la
 * fenêtre de 48h.
 */
export function BoutonAnnulerCommande({ id, locale }: { id: string; locale: string }) {
  const t = useTranslations('Commande')
  const [etat, action, enCours] = useActionState<EtatAnnulation, FormData>(annulerCommande, {})

  const messages: Record<string, string> = {
    fenetre_fermee: t('fenetre_fermee_texte'),
    trop_de_requetes: t('erreur_trop'),
    serveur: t('erreur_serveur'),
  }
  const erreur = etat.erreur ? (messages[etat.erreur] ?? t('erreur_serveur')) : null

  return (
    <form
      action={action}
      onSubmit={(e) => {
        // eslint-disable-next-line no-alert
        if (!window.confirm(t('confirmer_annulation'))) e.preventDefault()
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="locale" value={locale} />
      {erreur && (
        <p role="alert" className="mb-3 text-sm text-ko-ink">
          {erreur}
        </p>
      )}
      <button
        type="submit"
        disabled={enCours}
        className={cn(buttonVariants({ variant: 'text' }), 'text-ko-muted hover:text-ko-ink')}
      >
        {enCours ? t('en_cours') : t('annuler_commande')}
      </button>
    </form>
  )
}
