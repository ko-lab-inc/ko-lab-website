'use client'

import { useState, useTransition } from 'react'

import { mettreAJourEmplacement } from '@/app/(admin)/[locale]/admin/medias-emplacements/actions'
import { buttonVariants } from '@/components/ui/Button'
import { IconeCrayon, IconeFermer } from '@/components/ui/Icones'

/**
 * Tableau des neuf emplacements médias — édition inline, pas de modal.
 *
 * Pas de création ni de suppression (les neuf clés sont fixes, posées par la
 * migration 0031) : un seul geste possible par ligne, remplacer l'URL et
 * l'alt text. D'où l'édition INLINE plutôt que le patron modal des autres
 * tableaux (TableauPostes, TableauProduits...) — ouvrir une boîte de dialogue
 * pour changer trois champs sur NEUF lignes fixes aurait ajouté une étape
 * sans rien protéger de plus.
 *
 * Deux clics pour changer une photo : le crayon ouvre l'édition avec les
 * valeurs actuelles déjà en place, Enregistrer referme la ligne sur le
 * résultat.
 */

export type EmplacementMedia = {
  cle: string
  url_stockage: string
  alt_text_fr: string
  alt_text_en: string | null
}

type Textes = {
  colonneCle: string
  colonneUrl: string
  colonneAltFr: string
  colonneAltEn: string
  champUrl: string
  altEnVide: string
  modifier: string
  enregistrer: string
  enCours: string
  fermer: string
}

const CHAMP =
  'min-h-[40px] w-full border border-ko-line bg-ko-white px-3 py-2 text-sm text-ko-ink transition-colors duration-200 focus:border-ko-blue focus:outline-none'

export function TableauEmplacements({
  emplacements,
  estAdmin,
  textes,
}: {
  emplacements: EmplacementMedia[]
  /** Le bouton Modifier ne s'affiche qu'à l'admin — confort d'affichage,
   *  comme le bouton Supprimer de TableauPostes/TableauProduits. La vraie
   *  garantie est la politique medias_maj_admin (0031) + exigerRole(['admin'])
   *  dans l'action, pas ce booléen. */
  estAdmin: boolean
  textes: Textes
}) {
  const [lignes, setLignes] = useState(emplacements)
  const [editionCle, setEditionCle] = useState<string | null>(null)

  return (
    <div className="overflow-x-auto border border-ko-line bg-ko-white">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-ko-line">
            <th className="label-mono px-4 py-3 font-normal text-ko-muted">{textes.colonneCle}</th>
            <th className="label-mono px-4 py-3 font-normal text-ko-muted">{textes.colonneUrl}</th>
            <th className="label-mono px-4 py-3 font-normal text-ko-muted">{textes.colonneAltFr}</th>
            <th className="label-mono px-4 py-3 font-normal text-ko-muted">{textes.colonneAltEn}</th>
            {estAdmin && <th className="px-4 py-3" aria-hidden="true" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-ko-line">
          {lignes.map((ligne) =>
            editionCle === ligne.cle ? (
              <LigneEdition
                key={ligne.cle}
                ligne={ligne}
                textes={textes}
                onAnnuler={() => setEditionCle(null)}
                onEnregistre={(maj) => {
                  setLignes((prev) => prev.map((l) => (l.cle === ligne.cle ? maj : l)))
                  setEditionCle(null)
                }}
              />
            ) : (
              <tr key={ligne.cle}>
                <td className="px-4 py-3 align-top font-mono text-xs text-ko-ink">{ligne.cle}</td>
                <td
                  className="max-w-[280px] truncate px-4 py-3 align-top text-ko-muted"
                  title={ligne.url_stockage}
                >
                  {ligne.url_stockage}
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
            ),
          )}
        </tbody>
      </table>
    </div>
  )
}

function LigneEdition({
  ligne,
  textes,
  onAnnuler,
  onEnregistre,
}: {
  ligne: EmplacementMedia
  textes: Textes
  onAnnuler: () => void
  onEnregistre: (maj: EmplacementMedia) => void
}) {
  const [url, setUrl] = useState(ligne.url_stockage)
  const [altFr, setAltFr] = useState(ligne.alt_text_fr)
  const [altEn, setAltEn] = useState(ligne.alt_text_en ?? '')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, demarrer] = useTransition()

  function enregistrer() {
    setErreur(null)
    demarrer(async () => {
      const resultat = await mettreAJourEmplacement(ligne.cle, url, altFr, altEn || null)
      if (!resultat.success) {
        setErreur(resultat.error ?? null)
        return
      }
      onEnregistre({
        cle: ligne.cle,
        url_stockage: url,
        alt_text_fr: altFr,
        alt_text_en: altEn || null,
      })
    })
  }

  return (
    <tr className="bg-ko-cream">
      <td className="px-4 py-3 align-top font-mono text-xs text-ko-ink">{ligne.cle}</td>
      <td className="px-4 py-3 align-top">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          aria-label={`${textes.champUrl} — ${ligne.cle}`}
          className={CHAMP}
        />
      </td>
      <td className="px-4 py-3 align-top">
        <input
          value={altFr}
          onChange={(e) => setAltFr(e.target.value)}
          aria-label={`${textes.colonneAltFr} — ${ligne.cle}`}
          className={CHAMP}
        />
      </td>
      <td className="px-4 py-3 align-top">
        <input
          value={altEn}
          onChange={(e) => setAltEn(e.target.value)}
          placeholder={textes.altEnVide}
          aria-label={`${textes.colonneAltEn} — ${ligne.cle}`}
          className={CHAMP}
        />
      </td>
      <td className="px-4 py-3 align-top">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={onAnnuler}
            aria-label={textes.fermer}
            title={textes.fermer}
            className="flex h-9 w-9 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink"
          >
            <IconeFermer taille={16} />
          </button>
          <button
            type="button"
            onClick={enregistrer}
            disabled={enCours}
            className={buttonVariants({ variant: 'primary', size: 'sm' })}
          >
            {enCours ? textes.enCours : textes.enregistrer}
          </button>
        </div>
        {erreur && (
          <p role="alert" className="mt-2 max-w-[220px] text-xs text-ko-ink">
            {erreur}
          </p>
        )}
      </td>
    </tr>
  )
}
