'use client'

import { useActionState } from 'react'

import {
  envoyerCandidature,
  type EtatCandidature,
} from '@/app/(marketing)/[locale]/carrieres/postuler/actions'
import { buttonVariants } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'

/**
 * Formulaire de candidature — un seul, pour les neuf postes.
 *
 * ---------------------------------------------------------------------------
 * REPREND LE FORMULAIRE GOOGLE, CHAMP POUR CHAMP
 *
 * Christian a fourni son formulaire existant ; c'est lui qui sait ce dont il
 * a besoin pour trier une candidature. On ne retire rien et on n'ajoute rien
 * — mêmes questions, mêmes obligatoires, même liste de postes à cocher. La
 * seule différence est l'endroit où ça atterrit : sa base plutôt qu'un
 * Google Sheets.
 *
 * ---------------------------------------------------------------------------
 * `<form action={…}>` NATIF, PAS DE react-hook-form
 *
 * Le formulaire de contact utilise react-hook-form parce qu'il valide au fil
 * de la frappe. Ici, une Server Action branchée sur un `<form>` natif
 * fonctionne MÊME SANS JAVASCRIPT : on ne refuse pas un candidat parce qu'un
 * script a été bloqué. La validation reste entière côté serveur (Zod), et le
 * navigateur assure le premier filtre avec `required` / `type=email`.
 * ---------------------------------------------------------------------------
 */

export type LibellesCandidature = {
  nom: string
  telephone: string
  telephoneAide: string
  email: string
  ville: string
  villeAide: string
  postes: string
  postesAide: string
  disponibilites: string
  disponibilitesAide: string
  travailExterieur: string
  aExperience: string
  experienceTexte: string
  experienceTexteAide: string
  cv: string
  cvAide: string
  source: string
  sources: string[]
  confirmation: string
  oui: string
  non: string
  envoyer: string
  enCours: string
  succesTitre: string
  succesTexte: string
  erreurDonnees: string
  erreurCv: string
  erreurTrop: string
  erreurServeur: string
  champObligatoire: string
}

const CHAMP =
  'min-h-[44px] w-full border border-ko-line bg-ko-white px-4 py-3 text-base text-ko-ink transition-colors duration-200 placeholder:text-ko-muted focus:border-ko-blue focus:outline-none'

function Champ({
  id,
  libelle,
  aide,
  obligatoire = false,
  marqueur,
  children,
}: {
  id: string
  libelle: string
  aide?: string
  obligatoire?: boolean
  marqueur: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="label-mono mb-2 block text-ko-muted">
        {libelle}
        {obligatoire && (
          <span aria-label={marqueur} className="ml-1 text-ko-ink">
            *
          </span>
        )}
      </label>
      {children}
      {aide && <p className="mt-1.5 text-xs text-ko-muted">{aide}</p>}
    </div>
  )
}

/** Question fermée oui/non — deux boutons radio, présentés en segments. */
function ChoixOuiNon({
  nom,
  libelle,
  marqueur,
  oui,
  non,
}: {
  nom: string
  libelle: string
  marqueur: string
  oui: string
  non: string
}) {
  return (
    <fieldset>
      <legend className="label-mono mb-2 text-ko-muted">
        {libelle}
        <span aria-label={marqueur} className="ml-1 text-ko-ink">
          *
        </span>
      </legend>
      <div className="flex gap-3">
        {[
          { valeur: 'oui', texte: oui },
          { valeur: 'non', texte: non },
        ].map(({ valeur, texte }) => (
          <label
            key={valeur}
            className="flex min-h-[44px] cursor-pointer items-center gap-2.5 border border-ko-line bg-ko-white px-4 text-base text-ko-ink transition-colors duration-200 hover:border-ko-blue has-[:checked]:border-ko-blue has-[:checked]:font-medium"
          >
            <input type="radio" name={nom} value={valeur} required className="accent-ko-blue" />
            {texte}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function FormulaireCandidature({
  postes,
  posteInitial,
  libelles,
}: {
  /** Intitulés des postes ouverts — lus en base, jamais codés en dur. */
  postes: readonly string[]
  /** Poste pré-coché, depuis `?poste=` sur le lien « Postuler ». */
  posteInitial?: string
  libelles: LibellesCandidature
}) {
  const [etat, action, enCours] = useActionState<EtatCandidature, FormData>(envoyerCandidature, {})

  const messages: Record<string, string> = {
    donnees: libelles.erreurDonnees,
    cv: libelles.erreurCv,
    trop_de_requetes: libelles.erreurTrop,
    serveur: libelles.erreurServeur,
  }
  const erreur = etat.erreur ? (messages[etat.erreur] ?? libelles.erreurServeur) : null

  if (etat.succes) {
    return (
      <div className="border border-ko-line bg-ko-cream p-8 lg:p-12">
        <p className="ko-h3 text-ko-ink">{libelles.succesTitre}</p>
        <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-ko-muted">
          {libelles.succesTexte}
        </p>
      </div>
    )
  }

  return (
    // ⚠️ `encType` EXPLICITE — sans lui le CV n'arrive jamais. Un envoi en
    // `application/x-www-form-urlencoded` (le défaut) ne transmet que le NOM
    // du fichier, pas son contenu : la candidature s'enregistrait avec
    // `cv_chemin` à NULL, sans la moindre erreur. Constaté sur un envoi de
    // test réel — le formulaire affichait « Candidature envoyée » et le CV
    // avait disparu en silence. C'est aussi ce qui rend l'envoi possible
    // sans JavaScript.
    <form
      action={action}
      encType="multipart/form-data"
      className="max-w-[640px] space-y-7"
    >
      {/* Piège à robots : hors flux visuel et hors tabulation, mais rempli
          par les remplisseurs automatiques. Le serveur répond « succès »
          sans rien écrire quand il est rempli. */}
      <label className="sr-only" aria-hidden="true">
        Ne pas remplir
        <input type="text" name="_hp" tabIndex={-1} autoComplete="off" />
      </label>

      <Champ id="c-nom" libelle={libelles.nom} obligatoire marqueur={libelles.champObligatoire}>
        <input id="c-nom" name="nom" required minLength={2} maxLength={120} autoComplete="name" className={CHAMP} />
      </Champ>

      <div className="grid grid-cols-1 gap-7 sm:grid-cols-2">
        <Champ
          id="c-tel"
          libelle={libelles.telephone}
          aide={libelles.telephoneAide}
          obligatoire
          marqueur={libelles.champObligatoire}
        >
          <input
            id="c-tel"
            name="telephone"
            type="tel"
            required
            maxLength={40}
            autoComplete="tel"
            className={CHAMP}
          />
        </Champ>

        <Champ id="c-email" libelle={libelles.email} obligatoire marqueur={libelles.champObligatoire}>
          <input
            id="c-email"
            name="email"
            type="email"
            required
            maxLength={200}
            autoComplete="email"
            className={CHAMP}
          />
        </Champ>
      </div>

      <Champ
        id="c-ville"
        libelle={libelles.ville}
        aide={libelles.villeAide}
        obligatoire
        marqueur={libelles.champObligatoire}
      >
        <input
          id="c-ville"
          name="ville"
          required
          maxLength={120}
          autoComplete="address-level2"
          className={CHAMP}
        />
      </Champ>

      {/* Postes souhaités — cases à cocher, plusieurs choix possibles.
          La liste vient de la BASE : un poste fermé disparaît d'ici sans
          qu'on touche au formulaire. */}
      <fieldset>
        <legend className="label-mono mb-2 text-ko-muted">
          {libelles.postes}
          <span aria-label={libelles.champObligatoire} className="ml-1 text-ko-ink">
            *
          </span>
        </legend>
        <p className="mb-3 text-xs text-ko-muted">{libelles.postesAide}</p>

        <div className="space-y-1">
          {postes.map((poste) => (
            <label
              key={poste}
              className="flex min-h-[44px] cursor-pointer items-center gap-3 text-base text-ko-ink"
            >
              <input
                type="checkbox"
                name="postes"
                value={poste}
                defaultChecked={poste === posteInitial}
                className="h-4 w-4 shrink-0 accent-ko-blue"
              />
              {poste}
            </label>
          ))}
        </div>
      </fieldset>

      <Champ
        id="c-dispo"
        libelle={libelles.disponibilites}
        aide={libelles.disponibilitesAide}
        obligatoire
        marqueur={libelles.champObligatoire}
      >
        <input id="c-dispo" name="disponibilites" required maxLength={500} className={CHAMP} />
      </Champ>

      <ChoixOuiNon
        nom="travail_exterieur"
        libelle={libelles.travailExterieur}
        marqueur={libelles.champObligatoire}
        oui={libelles.oui}
        non={libelles.non}
      />

      <ChoixOuiNon
        nom="a_experience"
        libelle={libelles.aExperience}
        marqueur={libelles.champObligatoire}
        oui={libelles.oui}
        non={libelles.non}
      />

      <Champ id="c-exp" libelle={libelles.experienceTexte} aide={libelles.experienceTexteAide} marqueur={libelles.champObligatoire}>
        <textarea
          id="c-exp"
          name="experience_texte"
          rows={3}
          maxLength={2000}
          className={cn(CHAMP, 'resize-y')}
        />
      </Champ>

      <Champ id="c-cv" libelle={libelles.cv} aide={libelles.cvAide} marqueur={libelles.champObligatoire}>
        <input
          id="c-cv"
          name="cv"
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="w-full text-sm text-ko-ink file:mr-4 file:min-h-[40px] file:cursor-pointer file:border file:border-ko-line file:bg-ko-cream file:px-4 file:text-sm file:text-ko-ink hover:file:border-ko-ink"
        />
      </Champ>

      <Champ id="c-source" libelle={libelles.source} marqueur={libelles.champObligatoire}>
        <select id="c-source" name="source" defaultValue="" className={CHAMP}>
          <option value="">—</option>
          {libelles.sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Champ>

      <label className="flex cursor-pointer items-start gap-3 border-t border-ko-line pt-7 text-base leading-relaxed text-ko-ink">
        <input
          type="checkbox"
          name="confirmation"
          value="oui"
          required
          className="mt-1 h-4 w-4 shrink-0 accent-ko-blue"
        />
        <span>
          {libelles.confirmation}
          <span aria-label={libelles.champObligatoire} className="ml-1 text-ko-ink">
            *
          </span>
        </span>
      </label>

      {erreur && (
        <p role="alert" className="text-base text-ko-ink">
          {erreur}
        </p>
      )}

      <button
        type="submit"
        disabled={enCours}
        className={buttonVariants({ variant: 'primary' })}
      >
        {enCours ? libelles.enCours : libelles.envoyer}
        <span aria-hidden="true">→</span>
      </button>
    </form>
  )
}
