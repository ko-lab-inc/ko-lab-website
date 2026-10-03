'use client'

import { useId, useRef, useState } from 'react'

import { IconeFermer, IconePlus } from '@/components/ui/Icones'

/**
 * Liste d'adresses de courriel, une par champ, avec un bouton « + ».
 *
 * ---------------------------------------------------------------------------
 * CE QUE ÇA REMPLACE, ET POURQUOI
 *
 * Une seule zone de texte où il fallait séparer les adresses par des virgules.
 * Trois défauts, tous constatables :
 *
 *   1. Rien ne disait quel séparateur utiliser. Un point-virgule, un espace,
 *      un retour à la ligne : chacun fait un choix différent.
 *   2. Une faute de frappe faisait refuser l'enregistrement de TOUS les
 *      réglages — le formulaire les envoie en bloc — sans dire laquelle des
 *      cinq adresses était fautive.
 *   3. Le navigateur ne pouvait rien valider : une zone de texte n'est pas un
 *      champ de courriel, `type="email"` n'existe pas sur un `<textarea>`.
 *
 * Un champ par adresse règle les trois d'un coup. Le navigateur valide chaque
 * ligne avant même l'envoi, et le message d'erreur pointe la bonne.
 *
 * ---------------------------------------------------------------------------
 * ⚠️ PLUSIEURS CHAMPS, UN SEUL NOM — C'EST VOULU
 *
 * Tous les `<input>` portent le même attribut `name`. Le navigateur les envoie
 * tous, et le serveur les relit avec `FormData.getAll(nom)`. Aucune
 * concaténation côté client, donc aucun séparateur à inventer, et rien à
 * ré-analyser : le serveur reçoit un tableau.
 *
 * ⚠️ LA VALIDATION DU NAVIGATEUR NE REMPLACE RIEN. `type="email"` évite
 * l'aller-retour sur la faute de frappe la plus courante, mais elle se
 * contourne en une ligne dans la console. La vérification qui compte est celle
 * de Zod dans la Server Action, et elle reste en place.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI LES LIGNES SONT CLÉES PAR UN IDENTIFIANT, PAS PAR L'INDEX
 *
 * Retirer la deuxième de trois adresses décale toutes les suivantes. Avec
 * `key={index}`, React réutilise les champs du dessous et la valeur affichée
 * ne suit pas la ligne retirée — on croit avoir supprimé la mauvaise. Un
 * identifiant stable par ligne supprime la classe entière de ce défaut.
 */

type Ligne = { id: string; valeur: string }

let compteur = 0
const nouvelleLigne = (valeur = ''): Ligne => ({ id: `c${(compteur += 1)}`, valeur })

export type TextesChampsCourriels = {
  /**
   * Nom accessible d'un champ : `{groupe}` et `{n}` sont remplacés.
   *
   * ⚠️ Le GROUPE doit y figurer. Deux listes coexistent dans l'écran, et
   * « Adresse 1 » tout court se répète à l'identique : un lecteur d'écran
   * annoncerait deux champs portant le même nom, sans dire lequel reçoit les
   * demandes et lequel les candidatures.
   */
  adresseLabel: string
  ajouter: string
  /** Nom accessible du bouton de retrait, `{adresse}` remplacé. */
  retirer: string
  placeholder: string
  /** Affiché quand aucune adresse n'est saisie. */
  aucune: string
}

export function ChampsCourriels({
  nom,
  groupe,
  valeurInitiale,
  max = 10,
  textes,
  aideId,
}: {
  /** Attribut `name` partagé par tous les champs, relu par `getAll(nom)`. */
  nom: string
  /** Libellé de la liste, repris dans le nom accessible de chaque champ. */
  groupe: string
  /**
   * Valeur telle qu'elle est en base. Historiquement une liste séparée par des
   * virgules : on la découpe au chargement pour que les réglages déjà saisis
   * s'affichent correctement, sans migration de données.
   */
  valeurInitiale: string
  max?: number
  textes: TextesChampsCourriels
  /** `id` du texte d'aide, repris en `aria-describedby` sur chaque champ. */
  aideId?: string
}) {
  const prefixe = useId()
  const [lignes, setLignes] = useState<Ligne[]>(() => {
    const existantes = valeurInitiale
      .split(/[,;\n]/)
      .map((a) => a.trim())
      .filter((a) => a !== '')
    return existantes.length > 0 ? existantes.map((a) => nouvelleLigne(a)) : [nouvelleLigne()]
  })

  // Pour donner le focus au champ qui vient d'être ajouté : sans ça, il faut
  // aller le chercher à la souris après avoir cliqué sur « + ».
  const aAjouter = useRef<string | null>(null)

  function ajouter() {
    if (lignes.length >= max) return
    const ligne = nouvelleLigne()
    aAjouter.current = ligne.id
    setLignes((l) => [...l, ligne])
  }

  function retirer(id: string) {
    setLignes((l) => {
      const reste = l.filter((x) => x.id !== id)
      // Jamais zéro champ : l'écran deviendrait un bouton « + » isolé, sans
      // indice de ce qu'on y met. Une ligne vide vaut « aucune adresse », et
      // le serveur l'écarte.
      return reste.length > 0 ? reste : [nouvelleLigne()]
    })
  }

  function changer(id: string, valeur: string) {
    setLignes((l) => l.map((x) => (x.id === id ? { ...x, valeur } : x)))
  }

  const remplies = lignes.filter((l) => l.valeur.trim() !== '').length

  return (
    <div className="space-y-2">
      {lignes.map((ligne, i) => (
        <div key={ligne.id} className="flex items-start gap-2">
          <input
            id={`${prefixe}-${ligne.id}`}
            name={nom}
            type="email"
            autoComplete="off"
            maxLength={200}
            placeholder={textes.placeholder}
            value={ligne.valeur}
            onChange={(e) => changer(ligne.id, e.target.value)}
            aria-label={textes.adresseLabel
              .replace('{groupe}', groupe)
              .replace('{n}', String(i + 1))}
            aria-describedby={aideId}
            ref={(el) => {
              if (el && aAjouter.current === ligne.id) {
                aAjouter.current = null
                el.focus()
              }
            }}
            className="min-h-[40px] w-full border border-ko-line bg-ko-white px-3 py-2 text-sm text-ko-ink transition-colors duration-200 focus:border-ko-blue focus:outline-none invalid:border-ko-ink"
          />

          {/* Le bouton de retrait reste présent même sur une ligne unique :
              il sert alors à vider le champ. Le faire disparaître ferait
              sauter la mise en page d'une ligne à l'autre. */}
          <button
            type="button"
            onClick={() => retirer(ligne.id)}
            aria-label={textes.retirer.replace('{adresse}', ligne.valeur || String(i + 1))}
            title={textes.retirer.replace('{adresse}', ligne.valeur || String(i + 1))}
            className="flex h-10 w-10 shrink-0 items-center justify-center border border-transparent text-ko-muted transition-colors duration-200 hover:text-ko-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ko-blue"
          >
            <IconeFermer taille={15} />
          </button>
        </div>
      ))}

      <div className="flex items-center gap-3 pt-1">
        {/* Le « + » en cercle demandé par Christian. `type="button"` est
            indispensable : dans un `<form>`, un bouton sans type vaut
            `submit`, et cliquer sur « + » enregistrerait tous les réglages. */}
        <button
          type="button"
          onClick={ajouter}
          disabled={lignes.length >= max}
          aria-label={textes.ajouter}
          title={textes.ajouter}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ko-line text-ko-ink transition-colors duration-200 hover:border-ko-blue hover:text-ko-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ko-blue disabled:cursor-not-allowed disabled:opacity-40"
        >
          <IconePlus taille={16} />
        </button>

        <span className="text-sm text-ko-muted">
          {remplies === 0 ? textes.aucune : textes.ajouter}
        </span>
      </div>
    </div>
  )
}
