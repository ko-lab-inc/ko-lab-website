'use client'

import Image from 'next/image'
import { useState } from 'react'

import {
  SelecteurPhotoEmplacement,
  type FichierDisponible,
  type TextesSelecteurEmplacement,
} from '@/components/sections/SelecteurPhotoEmplacement'
import { IconeCrayon, IconeGalerie } from '@/components/ui/Icones'
import { cn } from '@/lib/utils/cn'

/**
 * Tableau des emplacements médias — plus de saisie d'URL, plus d'édition
 * inline : la vignette et le crayon ouvrent tous les deux la même modale de
 * sélection (SelecteurPhotoEmplacement), sur le patron d'une grille de
 * photos disponibles plutôt qu'un champ texte. Aucune URL Supabase n'est
 * jamais affichée dans cet écran — demande explicite, l'ancien tableau
 * exposait l'URL complète (identifiant de projet, arborescence du bucket)
 * et n'était de toute façon utilisable que par quelqu'un sachant où trouver
 * cette URL.
 */

export type EmplacementMedia = {
  cle: string
  /** Nullable depuis la migration 0037 — vide assumé, aucune photo assignée. */
  url_stockage: string | null
  alt_text_fr: string
  alt_text_en: string | null
}

type Textes = TextesSelecteurEmplacement & {
  colonneCle: string
  colonneApercu: string
  voirApercu: string
  colonneAltFr: string
  colonneAltEn: string
  altEnVide: string
  modifier: string
}

export function TableauEmplacements({
  emplacements,
  estAdmin,
  fichiersDisponibles,
  dossiers,
  textes,
}: {
  emplacements: EmplacementMedia[]
  /** Le bouton Modifier ne s'affiche qu'à l'admin — confort d'affichage,
   *  comme le bouton Supprimer de TableauPostes/TableauProduits. La vraie
   *  garantie est la politique medias_maj_admin (0031) + exigerRole(['admin'])
   *  dans l'action, pas ce booléen. */
  estAdmin: boolean
  fichiersDisponibles: FichierDisponible[]
  /** Dossiers connus du bucket `medias` (lib/medias-disponibles.ts,
   *  `DOSSIERS_MEDIAS`) — le module d'origine est `server-only`, cette page
   *  ne peut donc pas l'importer elle-même. */
  dossiers: readonly string[]
  textes: Textes
}) {
  const [lignes, setLignes] = useState(emplacements)
  const [editionCle, setEditionCle] = useState<string | null>(null)

  return (
    <div className="overflow-x-auto border border-ko-line bg-ko-white">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead>
          <tr className="border-b border-ko-line">
            <th className="label-mono px-4 py-3 font-normal text-ko-muted">{textes.colonneCle}</th>
            <th className="label-mono px-4 py-3 font-normal text-ko-muted">{textes.colonneApercu}</th>
            <th className="label-mono px-4 py-3 font-normal text-ko-muted">{textes.colonneAltFr}</th>
            <th className="label-mono px-4 py-3 font-normal text-ko-muted">{textes.colonneAltEn}</th>
            {estAdmin && <th className="px-4 py-3" aria-hidden="true" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-ko-line">
          {lignes.map((ligne) => (
            <tr key={ligne.cle}>
              <td className="px-4 py-3 align-top font-mono text-xs text-ko-ink">{ligne.cle}</td>
              <td className="px-4 py-3 align-top">
                <VignetteEmplacement
                  ligne={ligne}
                  label={`${textes.voirApercu} — ${ligne.cle}`}
                  // Interactive seulement à l'admin : l'écriture est
                  // exigerRole(['admin']) dans l'action (medias_maj_admin,
                  // 0031), un editor qui l'ouvrirait ne pourrait de toute
                  // façon jamais enregistrer — même logique que le crayon.
                  onClick={estAdmin ? () => setEditionCle(ligne.cle) : undefined}
                />
              </td>
              <td className="max-w-[220px] px-4 py-3 align-top text-ko-ink">{ligne.alt_text_fr}</td>
              <td className="max-w-[220px] px-4 py-3 align-top text-ko-muted">
                {ligne.alt_text_en ?? <span className="italic">{textes.altEnVide}</span>}
              </td>
              {estAdmin && (
                <td className="px-4 py-3 align-top text-right">
                  <button
                    type="button"
                    onClick={() => setEditionCle(ligne.cle)}
                    aria-label={`${textes.modifier} — ${ligne.cle}`}
                    title={textes.modifier}
                    className="flex h-9 w-9 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink"
                  >
                    <IconeCrayon taille={17} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Une modale par ligne, une seule jamais `open` à la fois — plus
          simple que de faire suivre une seule instance partagée à travers
          15 jeux de valeurs différents (photo, alt FR, alt EN) à chaque
          changement de ligne éditée. */}
      {lignes.map((ligne) => (
        <SelecteurPhotoEmplacement
          key={ligne.cle}
          ouvert={editionCle === ligne.cle}
          onFermer={() => setEditionCle(null)}
          cle={ligne.cle}
          photoActuelle={ligne.url_stockage}
          altFrActuel={ligne.alt_text_fr}
          altEnActuel={ligne.alt_text_en}
          fichiersDisponibles={fichiersDisponibles}
          dossiers={dossiers}
          textes={textes}
          onEnregistre={(maj) => {
            setLignes((prev) =>
              prev.map((l) => (l.cle === ligne.cle ? { ...l, ...maj } : l)),
            )
          }}
        />
      ))}
    </div>
  )
}

/**
 * Vignette 80×80 — ouvre la modale de sélection au clic, comme le crayon.
 * Simple image sans rôle interactif quand `onClick` est absent (editor) :
 * l'écriture est réservée à l'admin, un bouton qui échouerait toujours à
 * l'enregistrement n'aurait rien de « discret », juste trompeur.
 */
function VignetteEmplacement({
  ligne,
  label,
  onClick,
}: {
  ligne: EmplacementMedia
  label: string
  onClick?: () => void
}) {
  const [enErreur, setEnErreur] = useState(false)

  const contenu =
    ligne.url_stockage && !enErreur ? (
      <Image
        src={ligne.url_stockage}
        alt=""
        fill
        sizes="80px"
        className="object-cover"
        onError={() => setEnErreur(true)}
      />
    ) : (
      <IconeGalerie taille={20} className="text-ko-muted" />
    )

  const CLASSE = 'relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden border border-ko-line bg-ko-cream2'

  if (!onClick) {
    return <div className={CLASSE}>{contenu}</div>
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(CLASSE, 'transition-opacity duration-200 hover:opacity-80')}
    >
      {contenu}
    </button>
  )
}
