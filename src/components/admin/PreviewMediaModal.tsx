'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

import { IconeFermer, IconeGalerie } from '@/components/ui/Icones'

/**
 * Modal d'aperçu, en lecture seule — partagé entre les écrans /admin qui
 * n'ont qu'à MONTRER une image déjà résolue, pas à l'éditer.
 *
 * ---------------------------------------------------------------------------
 * TOUJOURS UNE IMAGE, MÊME POUR UNE VIDÉO
 *
 * Le brief demandait un aperçu « image ou vidéo ». Mais /admin/videos résout
 * déjà côté serveur une vignette YouTube (vignetteVideo, lib/utils/youtube.ts)
 * avant même d'atteindre ce composant — et le projet a délibérément fermé
 * `frame-src` dans la CSP pour ne jamais embarquer de lecteur tiers (voir la
 * docstring de youtube.ts) : la lecture reste toujours chez l'hébergeur, dans
 * un nouvel onglet. Ce modal n'a donc jamais à distinguer les deux formats —
 * il reçoit toujours une URL d'image (photo, ou vignette de vidéo) à afficher
 * en grand, jamais un lecteur à monter.
 * ---------------------------------------------------------------------------
 *
 * `altText` à `undefined` (pas `null`) omet complètement le bloc « texte
 * alternatif » : la table `videos` n'a pas cette colonne, l'afficher vide
 * aurait été un champ sans réponse possible plutôt qu'une vraie absence.
 */
export type TextesApercuMedia = {
  fermer: string
  texteAlt: string
  sansAlt: string
}

export function PreviewMediaModal({
  ouvert,
  onFermer,
  url,
  titre,
  altText,
  textes,
}: {
  ouvert: boolean
  onFermer: () => void
  url: string | null
  titre: string
  altText?: string | null
  textes: TextesApercuMedia
}) {
  const boite = useRef<HTMLDialogElement>(null)
  const [enErreur, setEnErreur] = useState(false)

  useEffect(() => {
    const el = boite.current
    if (!el) return
    if (ouvert && !el.open) el.showModal()
    if (!ouvert && el.open) el.close()
  }, [ouvert])

  // Réinitialise l'état d'erreur à chaque nouvelle ouverture — sinon une
  // vignette cassée vue une fois resterait affichée en placeholder pour
  // toutes les lignes suivantes, même celles dont l'image charge très bien.
  useEffect(() => {
    if (ouvert) setEnErreur(false)
  }, [ouvert, url])

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
      aria-labelledby="titre-apercu-media"
      onClick={(e) => {
        if (e.target === boite.current) boite.current?.close()
      }}
      className="w-[calc(100vw-2rem)] max-w-[420px] border border-ko-line bg-ko-white p-0 text-ko-ink shadow-card backdrop:bg-ko-scrim/60"
    >
      <div className="p-6 lg:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <h2 id="titre-apercu-media" className="ko-h3 truncate text-[20px] text-ko-ink">
            {titre}
          </h2>
          <button
            type="button"
            onClick={() => boite.current?.close()}
            aria-label={textes.fermer}
            className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink"
          >
            <IconeFermer taille={18} />
          </button>
        </div>

        {/* Grande préview, min 200×200 (demandé). */}
        <div className="relative mx-auto flex h-[200px] w-[200px] items-center justify-center overflow-hidden border border-ko-line bg-ko-cream2">
          {url && !enErreur ? (
            <Image
              src={url}
              alt={altText ?? ''}
              fill
              sizes="200px"
              className="object-cover"
              onError={() => setEnErreur(true)}
            />
          ) : (
            <IconeGalerie taille={28} className="text-ko-muted" />
          )}
        </div>

        {altText !== undefined && (
          <dl className="mt-6">
            <dt className="label-mono text-ko-muted">{textes.texteAlt}</dt>
            <dd className="mt-1 text-sm text-ko-ink">
              {altText || <span className="italic text-ko-muted">{textes.sansAlt}</span>}
            </dd>
          </dl>
        )}
      </div>
    </dialog>
  )
}
