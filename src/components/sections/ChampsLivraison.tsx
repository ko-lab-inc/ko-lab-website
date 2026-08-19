'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

/**
 * Mode de livraison + adresse — extrait de FormulaireDetailsCommande pour
 * être réutilisé par EditeurLignesCommande (modification d'une commande
 * existante dans sa fenêtre de 48h). Les deux partagent le même formulaire
 * HTML natif (`name="modeLivraison"`, `name="adresse"`, etc.), seul ce qui
 * les entoure diffère (création vs modification).
 *
 * ---------------------------------------------------------------------------
 * POURQUOI LES CHAMPS NE SONT PAS TOUJOURS `required`
 *
 * À la création (FormulaireDetailsCommande), il n'existe aucune adresse à
 * défaut : les champs restent obligatoires en expédition, comme avant.
 *
 * En modification (EditeurLignesCommande), la commande a déjà une adresse.
 * Rendre les champs obligatoires forcerait à la retaper intégralement pour
 * juste ajouter un produit. `adresseActuelle` rend donc les champs
 * FACULTATIFS : vides, ils signifient « garder l'adresse actuelle » — décision
 * prise côté serveur (modifierCommande), jamais ici. Le texte de référence
 * au-dessus des champs montre ce qui sera gardé si rien n'est saisi.
 * ---------------------------------------------------------------------------
 */

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

export function ChampsLivraison({
  modeDefaut = 'ramassage',
  adresseActuelle,
}: {
  modeDefaut?: 'ramassage' | 'expedition'
  /** Adresse d'expédition déjà enregistrée, si la commande en a une. */
  adresseActuelle?: string | null
}) {
  const t = useTranslations('Commande')
  const [modeLivraison, setModeLivraison] = useState<'expedition' | 'ramassage'>(modeDefaut)
  const champsObligatoires = !adresseActuelle

  return (
    <>
      <fieldset>
        <legend className="label-mono mb-2 text-ko-muted">
          {t('mode_livraison')}
          <span aria-label={t('champ_obligatoire')} className="ml-1 text-ko-ink">
            *
          </span>
        </legend>
        <div className="flex flex-col gap-3 sm:flex-row">
          {(['ramassage', 'expedition'] as const).map((valeur) => (
            <label
              key={valeur}
              className="flex min-h-[44px] flex-1 cursor-pointer items-center gap-2.5 border border-ko-line bg-ko-white px-4 text-base text-ko-ink transition-colors duration-200 hover:border-ko-blue has-[:checked]:border-ko-blue has-[:checked]:font-medium"
            >
              <input
                type="radio"
                name="modeLivraison"
                value={valeur}
                checked={modeLivraison === valeur}
                onChange={() => setModeLivraison(valeur)}
                required
                className="accent-ko-blue"
              />
              {valeur === 'ramassage' ? t('ramassage') : t('expedition')}
            </label>
          ))}
        </div>
      </fieldset>

      {modeLivraison === 'expedition' && (
        <>
          {adresseActuelle && (
            <div className="border border-ko-line bg-ko-cream p-4">
              <p className="label-mono mb-1.5 text-ko-muted">{t('adresse_actuelle')}</p>
              <p className="whitespace-pre-line text-sm text-ko-ink">{adresseActuelle}</p>
              <p className="mt-2 text-xs text-ko-muted">{t('adresse_conserver_aide')}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Champ
                id="cmd-adresse"
                libelle={t('adresse')}
                obligatoire={champsObligatoires}
                marqueur={t('champ_obligatoire')}
              >
                <input
                  id="cmd-adresse"
                  name="adresse"
                  required={champsObligatoires}
                  maxLength={200}
                  autoComplete="street-address"
                  className={CHAMP}
                />
              </Champ>
            </div>
            {/* Jamais obligatoire — signalé par Christian comme manquant, mais
                une maison ou une entreprise n'en a simplement pas besoin. */}
            <Champ id="cmd-appartement" libelle={t('appartement')} marqueur={t('champ_obligatoire')}>
              <input
                id="cmd-appartement"
                name="appartement"
                maxLength={20}
                autoComplete="address-line2"
                className={CHAMP}
              />
            </Champ>
            <Champ
              id="cmd-ville"
              libelle={t('ville')}
              obligatoire={champsObligatoires}
              marqueur={t('champ_obligatoire')}
            >
              <input
                id="cmd-ville"
                name="ville"
                required={champsObligatoires}
                maxLength={100}
                autoComplete="address-level2"
                className={CHAMP}
              />
            </Champ>
            <Champ
              id="cmd-province"
              libelle={t('province')}
              obligatoire={champsObligatoires}
              marqueur={t('champ_obligatoire')}
            >
              <input
                id="cmd-province"
                name="province"
                required={champsObligatoires}
                maxLength={100}
                autoComplete="address-level1"
                className={CHAMP}
              />
            </Champ>
            <Champ
              id="cmd-code-postal"
              libelle={t('code_postal')}
              obligatoire={champsObligatoires}
              marqueur={t('champ_obligatoire')}
            >
              <input
                id="cmd-code-postal"
                name="codePostal"
                required={champsObligatoires}
                maxLength={20}
                autoComplete="postal-code"
                className={CHAMP}
              />
            </Champ>
          </div>
        </>
      )}
    </>
  )
}
