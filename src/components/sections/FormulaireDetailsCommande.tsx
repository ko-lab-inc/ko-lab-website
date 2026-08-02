'use client'

import { useActionState, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

import { creerCommande, type EtatCommande } from '@/app/(marketing)/[locale]/boutique/commande/details/actions'
import { buttonVariants } from '@/components/ui/Button'
import { useRouter } from '@/i18n/navigation'
import { usePanier } from '@/lib/panier/PanierContext'
import { ROUTES, routeCommande } from '@/lib/routes'
import { cn } from '@/lib/utils/cn'

/**
 * Étape 2 de la commande — téléphone, organisation, mode de livraison,
 * adresse si expédition. Remplace FormulaireCommande.tsx (supprimé) : nom et
 * courriel n'y figurent plus, tirés de la session par creerCommande.
 *
 * ---------------------------------------------------------------------------
 * PANIER LU ICI, PAS REÇU EN PROP
 *
 * Contrairement à l'ancien FormulaireCommande (monté par PagePanier, qui
 * connaît déjà les articles), cette page est atteinte par une VRAIE
 * navigation depuis /connexion ou /inscription — le composant a donc besoin
 * de son propre accès à PanierContext plutôt que de recevoir les articles en
 * prop depuis un parent qui ne les a pas non plus à ce stade.
 *
 * Un panier vide ici (lien direct, retour arrière après une commande déjà
 * confirmée) renvoie vers /boutique/demande plutôt que d'afficher un
 * formulaire pour rien à commander.
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
          <span aria-label={marqueur} className="ml-1 text-ko-blue">
            *
          </span>
        )}
      </label>
      {children}
      {aide && <p className="mt-1.5 text-xs text-ko-muted">{aide}</p>}
    </div>
  )
}

export function FormulaireDetailsCommande({ locale }: { locale: string }) {
  const t = useTranslations('Commande')
  const router = useRouter()
  const { articles, pret, vider } = usePanier()

  const [etat, action, enCours] = useActionState<EtatCommande, FormData>(creerCommande, {})
  const [modeLivraison, setModeLivraison] = useState<'expedition' | 'ramassage'>('ramassage')

  // Panier vide (lien direct, actualisation après une commande déjà
  // confirmée) : rien à livrer, retour au récapitulatif plutôt qu'un
  // formulaire orphelin.
  useEffect(() => {
    if (pret && articles.length === 0 && !etat.succes) {
      router.replace(ROUTES.boutiqueDemande)
    }
  }, [pret, articles.length, etat.succes, router])

  // Effet strictement client, déclenché UNE fois par succès — voir la note
  // d'en-tête de FormulaireCommande (supprimé) sur pourquoi ça ne peut pas
  // vivre dans la Server Action : vider() écrit dans localStorage, un
  // redirect() côté serveur empêcherait ce composant de jamais voir
  // etat.succes passer à true.
  useEffect(() => {
    if (!etat.succes || !etat.id) return
    vider()
    router.push(routeCommande(etat.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etat.succes, etat.id])

  const messages: Record<string, string> = {
    donnees: t('erreur_donnees'),
    lignes: t('erreur_lignes'),
    // Ne devrait jamais s'afficher par le parcours normal (cette page redirige
    // déjà vers /connexion si personne n'est authentifié) — message tout de
    // même fourni pour l'appel direct de l'action, voir sa note d'en-tête.
    refuse: t('erreur_refuse'),
    trop_de_requetes: t('erreur_trop'),
    serveur: t('erreur_serveur'),
  }
  const erreur = etat.erreur ? (messages[etat.erreur] ?? t('erreur_serveur')) : null

  if (!pret || articles.length === 0 || etat.succes) return null

  return (
    <form action={action} className="max-w-[520px] space-y-6">
      <input type="hidden" name="locale" value={locale} />
      <input
        type="hidden"
        name="lignes"
        value={JSON.stringify(articles.map((a) => ({ slug: a.slug, quantite: a.quantite })))}
      />

      {/* Piège à robots — même motif que postuler/actions.ts. */}
      <label className="sr-only" aria-hidden="true">
        Ne pas remplir
        <input type="text" name="_hp" tabIndex={-1} autoComplete="off" />
      </label>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Champ id="cmd-tel" libelle={t('telephone')} marqueur={t('champ_obligatoire')}>
          <input id="cmd-tel" name="telephone" type="tel" maxLength={40} autoComplete="tel" className={CHAMP} />
        </Champ>
        <Champ id="cmd-org" libelle={t('organisation')} marqueur={t('champ_obligatoire')}>
          <input id="cmd-org" name="organisation" maxLength={200} className={CHAMP} />
        </Champ>
      </div>

      <fieldset>
        <legend className="label-mono mb-2 text-ko-muted">
          {t('mode_livraison')}
          <span aria-label={t('champ_obligatoire')} className="ml-1 text-ko-blue">
            *
          </span>
        </legend>
        <div className="flex flex-col gap-3 sm:flex-row">
          {(['ramassage', 'expedition'] as const).map((valeur) => (
            <label
              key={valeur}
              className="flex min-h-[44px] flex-1 cursor-pointer items-center gap-2.5 border border-ko-line bg-ko-white px-4 text-base text-ko-ink transition-colors duration-200 hover:border-ko-blue has-[:checked]:border-ko-blue has-[:checked]:text-ko-blue"
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
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Champ id="cmd-adresse" libelle={t('adresse')} obligatoire marqueur={t('champ_obligatoire')}>
              <input id="cmd-adresse" name="adresse" required maxLength={200} autoComplete="street-address" className={CHAMP} />
            </Champ>
          </div>
          <Champ id="cmd-ville" libelle={t('ville')} obligatoire marqueur={t('champ_obligatoire')}>
            <input id="cmd-ville" name="ville" required maxLength={100} autoComplete="address-level2" className={CHAMP} />
          </Champ>
          <Champ id="cmd-province" libelle={t('province')} obligatoire marqueur={t('champ_obligatoire')}>
            <input id="cmd-province" name="province" required maxLength={100} autoComplete="address-level1" className={CHAMP} />
          </Champ>
          <Champ id="cmd-code-postal" libelle={t('code_postal')} obligatoire marqueur={t('champ_obligatoire')}>
            <input id="cmd-code-postal" name="codePostal" required maxLength={20} autoComplete="postal-code" className={CHAMP} />
          </Champ>
        </div>
      )}

      {erreur && (
        <p role="alert" className="text-base text-ko-ink">
          {erreur}
        </p>
      )}

      <button type="submit" disabled={enCours} className={cn(buttonVariants({ variant: 'primary' }))}>
        {enCours ? t('en_cours') : t('confirmer')}
        <span aria-hidden="true">→</span>
      </button>
    </form>
  )
}
