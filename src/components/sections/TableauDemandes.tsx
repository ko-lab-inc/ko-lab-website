'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import {
  changerStatutDemande,
  enregistrerNoteDemande,
  envoyerDansRentman,
  supprimerDemande,
} from '@/app/(admin)/[locale]/admin/demandes/actions'
import { buttonVariants } from '@/components/ui/Button'
import { BoutonCopierRentman } from '@/components/sections/BoutonCopierRentman'
import { IconeFermer, IconeOeil, IconePoubelle } from '@/components/ui/Icones'
import { cn } from '@/lib/utils/cn'

/**
 * Tableau des demandes — table demandes_contact.
 *
 * ---------------------------------------------------------------------------
 * PREMIER ÉCRAN À TOUCHER `statut`
 *
 * Jusqu'ici, rien dans le code n'écrivait `statut` : le tableau de bord se
 * contente d'un compte « non traitées » en lecture seule. Cet écran est donc
 * le premier à fermer la boucle — changer le statut, voir le message complet
 * (le tableau de bord ne le lit même pas), supprimer un envoi de test ou de
 * pourriel.
 *
 * ---------------------------------------------------------------------------
 * PAS DE FORMULAIRE D'ÉDITION
 *
 * Contrairement au catalogue et aux réalisations, il n'y a rien à corriger
 * dans une demande : c'est un message reçu, pas un contenu géré. Deux
 * surfaces suffisent — la ligne (lecture rapide + statut) et l'aperçu
 * complet (l'œil) — là où catalogue/réalisations en ont trois.
 * ---------------------------------------------------------------------------
 */

/**
 * Une ligne d'équipement d'une demande de location (migration 0055).
 * Écrite par /api/contact, re-dérivée depuis `articles_location` : le nom
 * affiché ici vient de NOTRE base, jamais du navigateur du visiteur.
 */
export type LigneDemande = {
  rentman_id: number
  slug: string
  nom_fr: string
  nom_en: string | null
  categorie: string
  quantite: number
}

export type Demande = {
  id: string
  type: string
  nom: string
  email: string
  telephone: string | null
  organisation: string | null
  message: string
  statut: string
  /** Déjà formatée côté serveur (Intl.DateTimeFormat) — jamais une fonction
   *  en prop, voir le plantage documenté dans TableauRealisations.tsx. */
  dateFormatee: string
  /** Migration 0049. Non NULL = le courriel de notification vers l'équipe
   *  n'est jamais parti pour cette demande. */
  notificationErreur: string | null
  /** Migration 0051. Note de l'équipe. Jamais envoyée au demandeur. */
  noteInterne: string | null
  /** Migration 0051. Nom du membre ayant posé le dernier changement de statut,
   *  déjà résolu côté serveur — jamais un identifiant à l'écran. */
  traitePar: string | null
  traiteLeFormate: string | null
  /** Migration 0055 — demande de location. NULL pour toute autre demande. */
  dateDebutFormatee: string | null
  dateFinFormatee: string | null
  lignes: LigneDemande[] | null
  /** Langue du DEMANDEUR ('fr' | 'en'). À ne pas confondre avec la prop
   *  `locale` du composant, qui est celle de l'écran d'administration. */
  langueDemandeur: string
  /** Migration 0056 — numéro lisible, partagé avec Rentman. */
  numero: number
  /** id de la demande de projet Rentman. NULL = jamais déposée. */
  rentmanDemandeId: number | null
  rentmanErreur: string | null
}

export function TableauDemandes({
  locale,
  demandes,
  estAdmin,
  libelles,
  textes,
}: {
  locale: string
  demandes: Demande[]
  estAdmin: boolean
  libelles: {
    types: Record<string, string>
    statuts: Record<string, string>
  }
  textes: {
    /** Nom au singulier / pluriel pour l'en-tête compteur de la carte. */
    nomUn: string
    nomPlusieurs: string
    vide: string
    videFiltre: string
    rechercheLabel: string
    recherchePlaceholder: string
    tousTypes: string
    tousStatuts: string
    colonneNom: string
    colonneCourriel: string
    colonneType: string
    colonneStatut: string
    colonneCree: string
    colonneTelephone: string
    colonneOrganisation: string
    colonneMessage: string
    /** Migration 0055 — demande de location structurée. */
    periode: string
    equipements: string
    quantite: string
    sansDate: string
    copierRentman: string
    copie: string
    copieRepli: string
    rentmanTitre: string
    rentmanDeposee: string
    rentmanAbsente: string
    rentmanEchec: string
    rentmanEnvoyer: string
    /** Migration 0049 — intitulé de l'alerte quand notification_erreur est posée. */
    notificationEchouee: string
    /** Migration 0051 — note interne et trace de traitement. */
    noteInterne: string
    noteInterneAide: string
    noteEnregistrer: string
    traitePar: string
    voir: string
    supprimer: string
    confirmer: string
    fermer: string
    titreDetail: string
    pageGabarit: string
    pagePrecedente: string
    pageSuivante: string
  }
}) {
  const [type, setType] = useState('all')
  const [statut, setStatut] = useState('all')
  const [recherche, setRecherche] = useState('')

  const boiteDetail = useRef<HTMLDialogElement>(null)
  const [voir, setVoir] = useState<Demande | undefined>(undefined)

  useEffect(() => {
    const el = boiteDetail.current
    if (!el) return
    if (voir !== undefined && !el.open) el.showModal()
    if (voir === undefined && el.open) el.close()
  }, [voir])

  // Échap et la fermeture native passent par `close` : sans cette
  // synchronisation, l'état resterait rempli et rouvrir deviendrait impossible.
  useEffect(() => {
    const el = boiteDetail.current
    if (!el) return
    const fermer = () => setVoir(undefined)
    el.addEventListener('close', fermer)
    return () => el.removeEventListener('close', fermer)
  }, [])

  const demandesFiltrees = useMemo(() => {
    const normaliser = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')

    const terme = normaliser(recherche.trim())

    return demandes.filter((d) => {
      if (type !== 'all' && d.type !== type) return false
      if (statut !== 'all' && d.statut !== statut) return false
      if (terme === '') return true
      return normaliser(`${d.nom} ${d.email} ${d.message}`).includes(terme)
    })
  }, [demandes, type, statut, recherche])

  const PAR_PAGE = 8
  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(demandesFiltrees.length / PAR_PAGE))
  const pageActuelle = Math.min(page, totalPages - 1)
  const demandesPage = demandesFiltrees.slice(
    pageActuelle * PAR_PAGE,
    pageActuelle * PAR_PAGE + PAR_PAGE,
  )

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label htmlFor="recherche-demandes" className="sr-only">
          {textes.rechercheLabel}
        </label>
        <input
          id="recherche-demandes"
          type="search"
          value={recherche}
          onChange={(e) => {
            setPage(0)
            setRecherche(e.target.value)
          }}
          placeholder={textes.recherchePlaceholder}
          className="min-h-[40px] w-full border border-ko-line bg-ko-white px-3 py-2 text-sm text-ko-ink transition-colors duration-200 placeholder:text-ko-muted focus:border-ko-blue focus:outline-none sm:w-72"
        />

        <select
          aria-label={textes.colonneType}
          value={type}
          onChange={(e) => {
            setPage(0)
            setType(e.target.value)
          }}
          className="min-h-[40px] border border-ko-line bg-ko-white px-3 py-2 text-sm text-ko-ink transition-colors duration-200 focus:border-ko-blue focus:outline-none"
        >
          <option value="all">{textes.tousTypes}</option>
          {Object.entries(libelles.types).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>

        <select
          aria-label={textes.colonneStatut}
          value={statut}
          onChange={(e) => {
            setPage(0)
            setStatut(e.target.value)
          }}
          className="min-h-[40px] border border-ko-line bg-ko-white px-3 py-2 text-sm text-ko-ink transition-colors duration-200 focus:border-ko-blue focus:outline-none"
        >
          <option value="all">{textes.tousStatuts}</option>
          {Object.entries(libelles.statuts).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>

      <div className="border border-ko-line bg-ko-white">
        {/* En-tête de carte — même traitement que les cartes de Réglages :
            un filet sous un libellé. Le compteur reflète le FILTRE en cours,
            pas seulement la page affichée. */}
        <div className="border-b border-ko-line px-5 py-3.5 sm:px-6">
          <p className="label-mono text-ko-muted">
            {demandesFiltrees.length} {demandesFiltrees.length <= 1 ? textes.nomUn : textes.nomPlusieurs}
          </p>
        </div>
        {demandesPage.length === 0 ? (
          <p className="p-6 text-base leading-relaxed text-ko-muted">
            {demandes.length === 0 ? textes.vide : textes.videFiltre}
          </p>
        ) : (
          <ul className="divide-y divide-ko-line">
            {demandesPage.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4 transition-colors duration-200 hover:bg-ko-cream sm:px-6"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base text-ko-ink">{d.nom}</span>
                  <span className="block truncate font-mono text-xs text-ko-muted">{d.email}</span>

                  {/* Échec de notification — migration 0049. C'est CE bloc qui
                      ferme le défaut constaté : jusqu'ici l'échec partait dans
                      la console du serveur, que personne ne lit.

                      Le point est en --ko-blue : la palette n'a pas de rouge,
                      et en inventer un pour une alerte romprait la règle des
                      trois couleurs de marque. C'est le TEXTE qui alerte, pas
                      la couleur — et il reste lisible pour qui ne distingue
                      pas les teintes. */}
                  {d.notificationErreur && (
                    <span className="mt-1 flex items-start gap-1.5 text-xs leading-snug text-ko-ink">
                      <span
                        aria-hidden="true"
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ko-blue"
                      />
                      <span>
                        <strong className="font-medium">{textes.notificationEchouee}</strong>{' '}
                        <span className="text-ko-muted">{d.notificationErreur}</span>
                      </span>
                    </span>
                  )}
                </span>

                <span className="label-mono hidden w-28 shrink-0 sm:block">
                  {libelles.types[d.type] ?? d.type}
                </span>

                <span className="hidden w-32 shrink-0 font-mono text-xs text-ko-muted lg:block">
                  {d.dateFormatee}
                </span>

                {/* Auto-soumission au changement : même geste qu'un statut de
                    stock, pas de bouton « Enregistrer » à chercher. */}
                <form action={changerStatutDemande} className="w-36 shrink-0">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={d.id} />
                  {/*
                    ⚠️ `key={d.statut}` — constaté par Christian : après avoir
                    choisi « Traité », le menu revenait tout seul sur « Lu »
                    (l'écriture en base avait pourtant réussi, visible en
                    changeant d'écran puis en revenant). Cause : React
                    RÉINITIALISE un formulaire non contrôlé après qu'une
                    Server Action a résolu — mais ce reset applique le
                    `defaultValue` du rendu PRÉCÉDENT la révalidation, pas
                    encore la valeur fraîche. Un `<select>` non contrôlé
                    ignore aussi tout changement de `defaultValue` une fois
                    monté (comportement React documenté), donc rien ne le
                    corrigeait ensuite — jusqu'à un remontage complet (changer
                    d'écran). En liant `key` à la valeur, React démonte et
                    remonte le `<select>` dès que `d.statut` change réellement
                    (données fraîches après révalidation), qui applique alors
                    le bon `defaultValue` sans attendre une navigation.
                  */}
                  <select
                    key={d.statut}
                    name="statut"
                    defaultValue={d.statut}
                    onChange={(e) => e.currentTarget.form?.requestSubmit()}
                    aria-label={`${textes.colonneStatut} — ${d.nom}`}
                    className={cn(
                      'min-h-[36px] w-full border px-2 py-1 text-xs transition-colors duration-200 focus:border-ko-blue focus:outline-none',
                      d.statut === 'nouveau'
                        ? 'border-ko-blue text-ko-ink'
                        : 'border-ko-line text-ko-muted',
                    )}
                  >
                    {Object.entries(libelles.statuts).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </form>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setVoir(d)}
                    aria-label={`${textes.voir} — ${d.nom}`}
                    title={textes.voir}
                    className="flex h-9 w-9 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink"
                  >
                    <IconeOeil taille={17} />
                  </button>

                  {estAdmin && (
                    <form
                      action={supprimerDemande}
                      onSubmit={(e) => {
                        if (!confirm(`${textes.confirmer}\n\n${d.nom}`)) e.preventDefault()
                      }}
                    >
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={d.id} />
                      <button
                        type="submit"
                        aria-label={`${textes.supprimer} — ${d.nom}`}
                        title={textes.supprimer}
                        className="flex h-9 w-9 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink"
                      >
                        <IconePoubelle taille={17} />
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-4">
          <p className="label-mono text-ko-muted">
            {textes.pageGabarit
              .replace('{page}', String(pageActuelle + 1))
              .replace('{total}', String(totalPages))}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={pageActuelle === 0}
              aria-label={textes.pagePrecedente}
              title={textes.pagePrecedente}
              className="group flex h-9 w-9 items-center justify-center rounded-full border-2 border-ko-ink text-ko-ink transition-colors duration-200 hover:border-ko-blue disabled:cursor-not-allowed disabled:border-ko-line disabled:text-ko-line"
            >
              <span
                aria-hidden="true"
                className="ml-0.5 h-2.5 w-2.5 rotate-45 border-b-2 border-l-2 border-ko-ink transition-colors duration-200 group-hover:border-ko-blue group-disabled:border-ko-line"
              />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={pageActuelle >= totalPages - 1}
              aria-label={textes.pageSuivante}
              title={textes.pageSuivante}
              className="group flex h-9 w-9 items-center justify-center rounded-full border-2 border-ko-ink text-ko-ink transition-colors duration-200 hover:border-ko-blue disabled:cursor-not-allowed disabled:border-ko-line disabled:text-ko-line"
            >
              <span
                aria-hidden="true"
                className="mr-0.5 h-2.5 w-2.5 rotate-45 border-r-2 border-t-2 border-ko-ink transition-colors duration-200 group-hover:border-ko-blue group-disabled:border-ko-line"
              />
            </button>
          </div>
        </div>
      )}

      {/* Aperçu complet — seule surface qui montre le message, le téléphone
          et l'organisation. Le tableau de bord et la liste ci-dessus ne les
          lisent même pas. `showModal()` (piloté par la ref, voir plus haut)
          et non l'attribut `open` : sans lui, pas de piège de focus, pas de
          fond inerte, et `backdrop:` n'a aucun effet. */}
      <dialog
        ref={boiteDetail}
        aria-labelledby="titre-demande"
        onClick={(e) => {
          if (e.target === boiteDetail.current) boiteDetail.current?.close()
        }}
        className="w-[calc(100vw-2rem)] max-w-[640px] border border-ko-line bg-ko-white p-0 text-ko-ink shadow-card backdrop:bg-ko-scrim/60"
      >
        {voir && (
          <div className="max-h-[85svh] overflow-y-auto p-6 lg:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <h2 id="titre-demande" className="ko-h3 text-[22px] text-ko-ink">
                {textes.titreDetail}
              </h2>
              <button
                type="button"
                onClick={() => boiteDetail.current?.close()}
                aria-label={textes.fermer}
                className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center text-ko-muted transition-colors duration-200 hover:text-ko-ink"
              >
                <IconeFermer taille={18} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className="label-mono">{libelles.types[voir.type] ?? voir.type}</span>
              <span className="font-mono text-xs text-ko-muted">{voir.dateFormatee}</span>
            </div>

            <h3 className="mt-4 ko-h3 text-[20px] text-ko-ink">{voir.nom}</h3>

            <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 border-t border-ko-line pt-5 sm:grid-cols-2">
              <div>
                <dt className="label-mono text-ko-muted">{textes.colonneCourriel}</dt>
                <dd className="mt-1 truncate text-sm text-ko-ink">{voir.email}</dd>
              </div>
              <div>
                <dt className="label-mono text-ko-muted">{textes.colonneTelephone}</dt>
                <dd className="mt-1 text-sm text-ko-ink">{voir.telephone || '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="label-mono text-ko-muted">{textes.colonneOrganisation}</dt>
                <dd className="mt-1 text-sm text-ko-ink">{voir.organisation || '—'}</dd>
              </div>
            </dl>

            {/* ---------------------- Demande de location ----------------------
                Migration 0055. N'apparaît que pour une demande venue de
                /location/demande : partout ailleurs, `lignes` est NULL et ce
                bloc entier disparaît. Le message texte, lui, reste affiché
                dessous dans tous les cas — il contient la même chose en
                clair, et c'est lui qui part dans le courriel à l'équipe. */}
            {voir.lignes && voir.lignes.length > 0 && (
              <div className="mt-5 border-t border-ko-line pt-5">
                <p className="label-mono text-ko-muted">{textes.periode}</p>
                <p className="mt-2 text-sm text-ko-ink">
                  {voir.dateDebutFormatee && voir.dateFinFormatee
                    ? `${voir.dateDebutFormatee} → ${voir.dateFinFormatee}`
                    : (voir.dateDebutFormatee ?? voir.dateFinFormatee ?? textes.sansDate)}
                </p>

                <p className="label-mono mt-5 text-ko-muted">{textes.equipements}</p>
                <ul className="mt-2 divide-y divide-ko-line border-y border-ko-line">
                  {voir.lignes.map((l) => (
                    <li key={l.slug} className="flex items-baseline justify-between gap-4 py-2.5">
                      <span className="min-w-0 text-sm text-ko-ink">
                        {l.nom_fr}
                        {/* Le rentman_id est LA donnée qui supprime la
                            ressaisie : c'est l'article exact de l'inventaire,
                            pas un nom à rechercher parmi 590 pièces. */}
                        <span className="ml-2 font-mono text-[10px] text-ko-muted">
                          #{l.rentman_id}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-sm tabular-nums text-ko-ink">
                        {textes.quantite} {l.quantite}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Passerelle manuelle vers Rentman. Elle disparaîtra le jour
                    où le site pourra déposer la demande lui-même ; d'ici là,
                    c'est elle qui supprime la ressaisie. */}
                {/* ---------------------------- Rentman ----------------------------
                    Le dépôt est automatique à la réception. Ce bloc dit où en
                    est la demande, et offre deux recours quand il a échoué :
                    renvoyer, ou copier pour saisir à la main. */}
                <div className="mt-5 border-t border-ko-line pt-5">
                  <p className="label-mono text-ko-muted">{textes.rentmanTitre}</p>

                  {voir.rentmanDemandeId ? (
                    <p className="mt-2 text-sm text-ko-ink">
                      {textes.rentmanDeposee.replace('{numero}', String(voir.numero))}
                    </p>
                  ) : (
                    <>
                      <p className="mt-2 text-sm text-ko-ink">
                        {voir.rentmanErreur ? textes.rentmanEchec : textes.rentmanAbsente}
                      </p>
                      {voir.rentmanErreur && (
                        <p className="mt-1 break-words font-mono text-xs text-ko-muted">
                          {voir.rentmanErreur}
                        </p>
                      )}

                      {/* Le bouton n'apparaît que s'il y a des articles : sans
                          eux, Rentman recevrait une demande vide. */}
                      {voir.lignes && voir.lignes.length > 0 && (
                        <form action={envoyerDansRentman} className="mt-3">
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="id" value={voir.id} />
                          <button
                            type="submit"
                            className="inline-flex min-h-[44px] items-center gap-2 border border-ko-blue px-4 text-sm text-ko-ink transition-colors duration-200 hover:bg-ko-blue hover:text-ko-black"
                          >
                            {textes.rentmanEnvoyer}
                          </button>
                        </form>
                      )}
                    </>
                  )}

                  <div className="mt-3">
                  <BoutonCopierRentman
                    textes={{
                      copier: textes.copierRentman,
                      copie: textes.copie,
                      replis: textes.copieRepli,
                    }}
                    demande={{
                      nom: voir.nom,
                      email: voir.email,
                      telephone: voir.telephone,
                      organisation: voir.organisation,
                      langue: voir.langueDemandeur,
                      dateDebut: voir.dateDebutFormatee,
                      dateFin: voir.dateFinFormatee,
                      lignes: voir.lignes,
                    }}
                  />
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5 border-t border-ko-line pt-5">
              <p className="label-mono text-ko-muted">{textes.colonneMessage}</p>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ko-ink">
                {voir.message}
              </p>
            </div>

            {/* ------------------------------ Note interne ------------------------------ */}
            {/* Migration 0051. Le formulaire se soumet lui-même — pas de
                sauvegarde automatique à la frappe : une note se rédige, elle
                ne se synchronise pas mot à mot, et un enregistrement par
                lettre ferait autant d'écritures en base.

                `key={voir.id}` : sans elle, ouvrir une demande puis une autre
                garderait la note de la première dans le champ, React
                réutilisant le même textarea non contrôlé. */}
            <form
              key={voir.id}
              action={enregistrerNoteDemande}
              className="mt-5 border-t border-ko-line pt-5"
            >
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="id" value={voir.id} />

              <label htmlFor="note-interne" className="label-mono text-ko-muted">
                {textes.noteInterne}
              </label>
              <p className="mt-1.5 text-xs leading-relaxed text-ko-muted">
                {textes.noteInterneAide}
              </p>
              <textarea
                id="note-interne"
                name="note_interne"
                rows={4}
                maxLength={4000}
                defaultValue={voir.noteInterne ?? ''}
                className="mt-2.5 w-full resize-y border border-ko-line bg-ko-white px-3 py-2 text-sm leading-relaxed text-ko-ink transition-colors duration-200 focus:border-ko-blue focus:outline-none"
              />

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="submit"
                  className={buttonVariants({ variant: 'primary', size: 'sm' })}
                >
                  {textes.noteEnregistrer}
                </button>

                {/* Trace de traitement — qui a changé le statut, et quand. */}
                {voir.traiteLeFormate && (
                  <p className="font-mono text-xs text-ko-muted">
                    {textes.traitePar} {voir.traitePar ?? '—'} · {voir.traiteLeFormate}
                  </p>
                )}
              </div>
            </form>
          </div>
        )}
      </dialog>
    </>
  )
}
