'use client'

import { useActionState, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

import { creerCommande, type EtatCommande } from '@/app/(marketing)/[locale]/boutique/demande/actions'
import { buttonVariants } from '@/components/ui/Button'
import { useRouter } from '@/i18n/navigation'
import { usePanier, type ArticlePanier } from '@/lib/panier/PanierContext'
import { routeCommande } from '@/lib/routes'
import { cn } from '@/lib/utils/cn'

/**
 * Formulaire de confirmation — migration 0021.
 *
 * ---------------------------------------------------------------------------
 * NE REDIRIGE PAS DEPUIS LA SERVER ACTION — ET C'EST DÉLIBÉRÉ
 *
 * `creerCommande` renvoie `{ succes, token }` plutôt que d'appeler `redirect()`
 * elle-même. Un `redirect()` côté serveur interrompt le rendu AVANT que ce
 * composant ne voie jamais `etat.succes` passer à `true` — il n'y aurait donc
 * aucun moment où VIDER LE PANIER serait possible, puisque `vider()` est un
 * effet strictement client (il écrit dans localStorage). En renvoyant l'état
 * au lieu de rediriger, c'est CE composant qui enchaîne les deux effets dans
 * le bon ordre : vider, puis naviguer.
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

export function FormulaireCommande({
  locale,
  articles,
}: {
  locale: string
  articles: readonly ArticlePanier[]
}) {
  const t = useTranslations('Commande')
  const { vider } = usePanier()
  const router = useRouter()

  const [etat, action, enCours] = useActionState<EtatCommande, FormData>(creerCommande, {})
  const [modeLivraison, setModeLivraison] = useState<'expedition' | 'ramassage'>('ramassage')

  // Effet strictement client, déclenché UNE fois par succès — voir la note
  // d'en-tête sur pourquoi ça ne peut pas vivre dans la Server Action.
  useEffect(() => {
    if (!etat.succes || !etat.id) return
    vider()
    router.push(routeCommande(etat.id))
    // `vider`/`router` sont stables (useCallback / next-intl) ; les omettre
    // évite de rejouer l'effet à chaque rendu du panier qui vient de se vider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etat.succes, etat.id])

  const messages: Record<string, string> = {
    donnees: t('erreur_donnees'),
    lignes: t('erreur_lignes'),
    // Ne devrait jamais s'afficher par le parcours normal (PagePanier ne
    // montre ce formulaire qu'une fois connecté) — message tout de même
    // fourni pour l'appel direct de l'action, voir sa note d'en-tête.
    refuse: t('erreur_refuse'),
    trop_de_requetes: t('erreur_trop'),
    serveur: t('erreur_serveur'),
  }
  const erreur = etat.erreur ? (messages[etat.erreur] ?? t('erreur_serveur')) : null

  // Redirection en cours : éviter un aller-retour visuel où le formulaire
  // clignote vide avant que la navigation ne parte.
  if (etat.succes) return null

  return (
    <form action={action} className="max-w-[520px] space-y-6 border-t border-ko-line pt-8">
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
        <Champ id="cmd-nom" libelle={t('nom')} obligatoire marqueur={t('champ_obligatoire')}>
          <input id="cmd-nom" name="nom" required minLength={2} maxLength={120} autoComplete="name" className={CHAMP} />
        </Champ>
        <Champ id="cmd-email" libelle={t('email')} obligatoire marqueur={t('champ_obligatoire')}>
          <input
            id="cmd-email"
            name="email"
            type="email"
            required
            maxLength={200}
            autoComplete="email"
            className={CHAMP}
          />
        </Champ>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Champ id="cmd-tel" libelle={t('telephone')} marqueur={t('champ_obligatoire')}>
          <input id="cmd-tel" name="telephone" type="tel" maxLength={40} autoComplete="tel" className={CHAMP} />
        </Champ>
        <Champ id="cmd-org" libelle={t('organisation')} marqueur={t('champ_obligatoire')}>
          <input id="cmd-org" name="organisation" maxLength={200} className={CHAMP} />
        </Champ>
      </div>

      {/* Mode de livraison — deux segments, même vocabulaire visuel que
          ChoixOuiNon (FormulaireCandidature.tsx), sans le partager : deux
          valeurs différentes, un seul endroit qui s'en sert. */}
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
        <Champ
          id="cmd-adresse"
          libelle={t('adresse_livraison')}
          aide={t('adresse_livraison_aide')}
          obligatoire
          marqueur={t('champ_obligatoire')}
        >
          <textarea
            id="cmd-adresse"
            name="adresseLivraison"
            required
            rows={3}
            maxLength={500}
            className={cn(CHAMP, 'resize-y')}
          />
        </Champ>
      )}

      {erreur && (
        <p role="alert" className="text-base text-ko-ink">
          {erreur}
        </p>
      )}

      <button type="submit" disabled={enCours} className={buttonVariants({ variant: 'primary' })}>
        {enCours ? t('en_cours') : t('confirmer')}
        <span aria-hidden="true">→</span>
      </button>
    </form>
  )
}
