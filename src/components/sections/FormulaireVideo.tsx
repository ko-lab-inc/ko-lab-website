'use client'

import { useActionState } from 'react'

import { creerVideo, modifierVideo, type EtatVideo } from '@/app/(admin)/[locale]/admin/videos/actions'
import { buttonVariants } from '@/components/ui/Button'

/**
 * Création et édition d'une vidéo — un seul formulaire pour les deux.
 *
 * Le plus court des quatre formulaires de l'espace équipe : un titre, un
 * lien, et c'est tout. La vignette se déduit du lien (lib/utils/youtube.ts)
 * — c'est précisément ce que Christian a demandé, « un espace où je pourrai
 * ajouter des liens », pas un écran où il faut aussi téléverser une image.
 */

export type Video = {
  id: string
  titre: string
  url: string
  vignette: string | null
  actif: boolean
}

export type LibellesVideo = {
  titre: string
  url: string
  urlAide: string
  vignette: string
  vignetteAide: string
  enregistrer: string
  creer: string
  enCours: string
  succes: string
  erreurDonnees: string
  erreurLien: string
  erreurRefuse: string
  erreurServeur: string
}

const CHAMP =
  'min-h-[40px] w-full border border-ko-line bg-ko-white px-3 py-2 text-sm text-ko-ink transition-colors duration-200 focus:border-ko-blue focus:outline-none'

export function FormulaireVideo({
  locale,
  video,
  libelles,
}: {
  locale: string
  /** Absent = création. */
  video?: Video
  libelles: LibellesVideo
}) {
  const [etat, action, enCours] = useActionState<EtatVideo, FormData>(
    video ? modifierVideo : creerVideo,
    {},
  )

  const messages: Record<string, string> = {
    donnees: libelles.erreurDonnees,
    lien: libelles.erreurLien,
    refuse: libelles.erreurRefuse,
    serveur: libelles.erreurServeur,
  }
  const erreur = etat.erreur ? (messages[etat.erreur] ?? libelles.erreurServeur) : null

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      {video && <input type="hidden" name="id" value={video.id} />}

      <div>
        <label htmlFor="video-titre" className="label-mono mb-1.5 block text-ko-muted">
          {libelles.titre}
        </label>
        <input
          id="video-titre"
          name="titre"
          required
          minLength={2}
          maxLength={200}
          defaultValue={video?.titre}
          className={CHAMP}
        />
      </div>

      <div>
        <label htmlFor="video-url" className="label-mono mb-1.5 block text-ko-muted">
          {libelles.url}
        </label>
        <input
          id="video-url"
          name="url"
          type="url"
          required
          maxLength={500}
          defaultValue={video?.url}
          placeholder="https://www.youtube.com/watch?v=..."
          className={CHAMP}
        />
        <p className="mt-1 text-xs text-ko-muted">{libelles.urlAide}</p>
      </div>

      <div>
        <label htmlFor="video-vignette" className="label-mono mb-1.5 block text-ko-muted">
          {libelles.vignette}
        </label>
        <input
          id="video-vignette"
          name="vignette"
          maxLength={500}
          defaultValue={video?.vignette ?? ''}
          className={CHAMP}
        />
        <p className="mt-1 text-xs text-ko-muted">{libelles.vignetteAide}</p>
      </div>

      {erreur && (
        <p role="alert" className="text-sm text-ko-ink">
          {erreur}
        </p>
      )}
      {etat.succes && (
        <p role="status" className="text-sm font-medium text-ko-ink">
          {libelles.succes}
        </p>
      )}

      <button
        type="submit"
        disabled={enCours}
        className={buttonVariants({ variant: 'primary', size: 'sm' })}
      >
        {enCours ? libelles.enCours : video ? libelles.enregistrer : libelles.creer}
      </button>
    </form>
  )
}
