'use client'

import { useActionState, useEffect, useRef, useState } from 'react'

import { inviterUtilisateur, type EtatInvitation } from '@/app/(admin)/[locale]/admin/utilisateurs/actions'
import { buttonVariants } from '@/components/ui/Button'
import { IconeAjouter, IconeFermer } from '@/components/ui/Icones'
import type { Role } from '@/types'

type Libelles = {
  ouvrir: string
  titre: string
  fermer: string
  champCourriel: string
  champRole: string
  roles: Record<Role, string>
  envoyer: string
  enCours: string
  succesTitre: string
  succesTexte: string
  erreurDonnees: string
  erreurExisteDeja: string
  erreurRefuse: string
  erreurTropDeTentatives: string
  erreurServeur: string
}

/**
 * Bouton + modale d'invitation — /admin/utilisateurs seulement (étape 2/3,
 * migration 0045). Ni /admin/vendeurs ni /admin/livreurs ne l'affichent :
 * l'écran unifié est le seul endroit d'où inviter, quel que soit le rôle
 * choisi dans la modale — filtrer la liste sur « Vendeurs » n'y change rien,
 * le rôle de l'invitation reste un choix explicite du formulaire.
 *
 * Même patron que FormulaireConcours (dialog natif, reste ouvert après
 * succès avec un message plutôt que de se fermer tout seul) : l'admin peut
 * vérifier le courriel avant de fermer.
 *
 * ⚠️ `ContenuInvitation` REMONTÉ à chaque ouverture (`key={cle}`) — même
 * patron que `key={edite?.id ?? 'nouveau'}` dans TableauConcours.tsx. Le
 * `<dialog>` ne démonte jamais son arbre React quand on le cache (`.close()`
 * imperatif, pas un retrait du DOM) : sans ce remontage, `useActionState`
 * garderait l'état `succes` de la PREMIÈRE invitation, et fermer/rouvrir
 * pour en envoyer une deuxième afficherait encore le message de succès de
 * la précédente plutôt qu'un formulaire vide — trouvé en écrivant le test
 * qui enchaîne deux invitations dans la même session.
 */
export function ModaleInvitation({ locale, libelles }: { locale: string; libelles: Libelles }) {
  const boite = useRef<HTMLDialogElement>(null)
  const [ouverte, setOuverte] = useState(false)
  const [cle, setCle] = useState(0)

  useEffect(() => {
    const el = boite.current
    if (!el) return
    if (ouverte && !el.open) el.showModal()
    if (!ouverte && el.open) el.close()
  }, [ouverte])

  useEffect(() => {
    const el = boite.current
    if (!el) return
    const fermer = () => setOuverte(false)
    el.addEventListener('close', fermer)
    return () => el.removeEventListener('close', fermer)
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setCle((c) => c + 1)
          setOuverte(true)
        }}
        className={buttonVariants({ variant: 'primary', size: 'sm' })}
      >
        <IconeAjouter taille={16} />
        {libelles.ouvrir}
      </button>

      <dialog
        ref={boite}
        aria-labelledby="titre-invitation"
        className="w-[calc(100vw-2rem)] max-w-[480px] border border-ko-line bg-ko-white p-0 text-ko-ink shadow-card backdrop:bg-ko-scrim/60"
      >
        <div className="p-6 lg:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <h2 id="titre-invitation" className="ko-h3 text-[20px] text-ko-ink">
              {libelles.titre}
            </h2>
            <button
              type="button"
              onClick={() => boite.current?.close()}
              aria-label={libelles.fermer}
              className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink"
            >
              <IconeFermer taille={18} />
            </button>
          </div>

          <ContenuInvitation key={cle} locale={locale} libelles={libelles} onFermer={() => boite.current?.close()} />
        </div>
      </dialog>
    </>
  )
}

function ContenuInvitation({
  locale,
  libelles,
  onFermer,
}: {
  locale: string
  libelles: Libelles
  onFermer: () => void
}) {
  const [etat, action, enCours] = useActionState<EtatInvitation, FormData>(inviterUtilisateur, {})

  const messages: Record<string, string> = {
    donnees: libelles.erreurDonnees,
    existe_deja: libelles.erreurExisteDeja,
    refuse: libelles.erreurRefuse,
    trop_de_tentatives: libelles.erreurTropDeTentatives,
    serveur: libelles.erreurServeur,
  }
  const erreur = etat.erreur ? (messages[etat.erreur] ?? libelles.erreurServeur) : null

  if (etat.succes) {
    return (
      <div className="space-y-5">
        <p className="ko-h3 text-[18px] text-ko-ink">{libelles.succesTitre}</p>
        <p className="text-base leading-relaxed text-ko-ink">{libelles.succesTexte}</p>
        <button type="button" onClick={onFermer} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          {libelles.fermer}
        </button>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <div>
        <label htmlFor="invitation-courriel" className="label-mono mb-1.5 block text-ko-muted">
          {libelles.champCourriel}
        </label>
        <input
          id="invitation-courriel"
          name="email"
          type="email"
          required
          maxLength={200}
          autoComplete="email"
          className="min-h-[44px] w-full border border-ko-line bg-ko-white px-3 text-sm text-ko-ink focus:border-ko-blue focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="invitation-role" className="label-mono mb-1.5 block text-ko-muted">
          {libelles.champRole}
        </label>
        <select
          id="invitation-role"
          name="role"
          defaultValue="client"
          className="min-h-[44px] w-full border border-ko-line bg-ko-white px-3 text-sm text-ko-ink focus:border-ko-blue focus:outline-none"
        >
          {(Object.keys(libelles.roles) as Role[]).map((r) => (
            <option key={r} value={r}>
              {libelles.roles[r]}
            </option>
          ))}
        </select>
      </div>

      {erreur && (
        <p role="alert" className="text-sm leading-relaxed text-ko-ink">
          {erreur}
        </p>
      )}

      <button type="submit" disabled={enCours} className={buttonVariants({ variant: 'primary', size: 'sm' })}>
        {enCours ? libelles.enCours : libelles.envoyer}
      </button>
    </form>
  )
}
