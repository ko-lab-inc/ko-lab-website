'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { formaterDemande, usePanier } from '@/lib/panier/PanierContext'

import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'
import { schemaContact, type DonneesContact } from '@/lib/validation'
import { TYPES_DEMANDE, type TypeDemande } from '@/types'

/**
 * Formulaire de contact — skills 05, 09 et 15.
 *
 * Double validation : ce schéma est LE MÊME que celui de l'API route
 * (src/lib/validation.ts). Le client valide pour éviter un aller-retour
 * inutile ; le serveur revalide parce qu'on ne fait jamais confiance au client.
 */

const CHAMP =
  'w-full min-h-[44px] border border-ko-line bg-ko-white px-4 py-3 text-base text-ko-ink transition-colors duration-200 placeholder:text-ko-muted focus:border-ko-blue focus:outline-none'

type Etat = 'repos' | 'envoi' | 'succes' | 'erreur' | 'limite'

export function FormulaireContact() {
  const t = useTranslations('Contact')
  // Espace de noms distinct : l'en-tête de la demande groupée appartient au
  // panier, pas au formulaire. Le typage des messages refuse le mélange.
  const tPanier = useTranslations('Panier')
  const parametres = useSearchParams()
  const [etat, setEtat] = useState<Etat>('repos')

  // Type pré-sélectionné via ?type=carriere — utilisé par le bouton
  // « Postuler » des offres d'emploi. Validé contre la liste : un paramètre
  // d'URL est une entrée utilisateur comme une autre.
  const demande = parametres.get('type')
  const typeInitial: TypeDemande =
    demande && (TYPES_DEMANDE as readonly string[]).includes(demande)
      ? (demande as TypeDemande)
      : 'mandat'

  const { articles, pret, vider } = usePanier()

  /**
   * Message pré-rempli avec la demande groupée.
   *
   * Conditionné à `?type=boutique` : sans ce garde, un visiteur ayant un
   * panier en cours verrait sa liste de produits injectée dans une demande
   * de mandat ou de carrière, ce qui n'a aucun sens.
   *
   * La liste transite par le contexte, jamais par l'URL — une URL portant
   * douze produits serait illisible et falsifiable.
   */
  const messageInitial =
    pret && demande === 'boutique' ? formaterDemande(articles, tPanier('entete_message')) : ''

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DonneesContact>({
    resolver: zodResolver(schemaContact),
    defaultValues: { type: typeInitial, message: messageInitial, _hp: '' },
  })

  // `pret` bascule après la lecture de localStorage, donc APRÈS le premier
  // rendu du formulaire : sans cette resynchronisation, le champ message
  // resterait vide alors que le panier contient des produits.
  useEffect(() => {
    if (messageInitial) reset({ type: typeInitial, message: messageInitial, _hp: '' })
  }, [messageInitial, reset, typeInitial])

  const envoyer = handleSubmit(async (donnees) => {
    setEtat('envoi')
    try {
      const rep = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(donnees),
      })

      if (rep.ok) {
        setEtat('succes')
        reset({ type: typeInitial, message: '', _hp: '' })
        // Vidé UNIQUEMENT après un 200 : sur erreur réseau ou 500, la
        // sélection doit survivre pour que le visiteur puisse réessayer.
        if (articles.length > 0) vider()
        return
      }

      setEtat(rep.status === 429 ? 'limite' : 'erreur')
    } catch {
      setEtat('erreur')
    }
  })

  if (etat === 'succes') {
    return (
      <div className="border border-ko-line bg-ko-cream p-8">
        <p className="label-mono">{t('succes.titre')}</p>
        <p className="mt-3 text-base leading-relaxed text-ko-ink">{t('succes.texte')}</p>
      </div>
    )
  }

  return (
    <form onSubmit={envoyer} noValidate className="space-y-6">
      {/* Honeypot — skill 15. `sr-only` et non `display:none` : certains robots
          ignorent les champs masqués en CSS mais remplissent ceux qui restent
          dans l'arbre. tabIndex -1 et autocomplete off le tiennent hors de
          portée d'un humain au clavier. */}
      <div aria-hidden="true" className="sr-only">
        <label htmlFor="_hp">Ne pas remplir</label>
        <input id="_hp" type="text" tabIndex={-1} autoComplete="off" {...register('_hp')} />
      </div>

      <Champ id="type" libelle={t('form.type')}>
        <select id="type" {...register('type')} className={cn(CHAMP, 'appearance-none')}>
          {TYPES_DEMANDE.map((valeur) => (
            <option key={valeur} value={valeur}>
              {t(`form.type_${valeur}`)}
            </option>
          ))}
        </select>
      </Champ>

      <Champ id="nom" libelle={t('form.nom')} erreur={errors.nom ? t('erreurs.nom_court') : null}>
        <input
          id="nom"
          type="text"
          autoComplete="name"
          placeholder={t('form.nom_placeholder')}
          aria-invalid={!!errors.nom}
          {...register('nom')}
          className={cn(CHAMP, errors.nom && 'border-ko-blue')}
        />
      </Champ>

      <Champ
        id="email"
        libelle={t('form.email')}
        erreur={errors.email ? t('erreurs.email_invalide') : null}
      >
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder={t('form.email_placeholder')}
          aria-invalid={!!errors.email}
          {...register('email')}
          className={cn(CHAMP, errors.email && 'border-ko-blue')}
        />
      </Champ>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Champ id="telephone" libelle={t('form.telephone')} note={t('form.telephone_optionnel')}>
          <input
            id="telephone"
            type="tel"
            autoComplete="tel"
            {...register('telephone')}
            className={CHAMP}
          />
        </Champ>

        <Champ
          id="organisation"
          libelle={t('form.organisation')}
          note={t('form.organisation_optionnel')}
        >
          <input
            id="organisation"
            type="text"
            autoComplete="organization"
            {...register('organisation')}
            className={CHAMP}
          />
        </Champ>
      </div>

      <Champ
        id="message"
        libelle={t('form.message')}
        erreur={errors.message ? t('erreurs.message_court') : null}
      >
        <textarea
          id="message"
          rows={6}
          placeholder={t('form.message_placeholder')}
          aria-invalid={!!errors.message}
          {...register('message')}
          className={cn(CHAMP, 'resize-y', errors.message && 'border-ko-blue')}
        />
      </Champ>

      {/* aria-live : l'erreur survient après une action asynchrone, sans
          déplacement du focus — sans annonce, elle passerait inaperçue. */}
      {(etat === 'erreur' || etat === 'limite') && (
        <p aria-live="polite" className="border-l-2 border-ko-blue pl-4 text-sm text-ko-ink">
          {etat === 'limite' ? t('erreurs.trop_de_requetes') : t('erreurs.serveur')}
        </p>
      )}

      <Button type="submit" disabled={etat === 'envoi'} size="lg">
        {etat === 'envoi' ? t('form.envoi_en_cours') : t('form.envoyer')}
        <span aria-hidden="true">→</span>
      </Button>
    </form>
  )
}

/** Étiquette, note facultative et message d'erreur — mise en forme commune. */
function Champ({
  id,
  libelle,
  note,
  erreur,
  children,
}: {
  id: string
  libelle: string
  note?: string
  erreur?: string | null
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 flex items-baseline gap-2">
        <span className="label-mono">{libelle}</span>
        {note && <span className="font-mono text-[10px] text-ko-muted">({note})</span>}
      </label>

      {children}

      {/* text-ko-ink + gras, pas text-ko-blue (Phase 2) : la palette n'a pas
          de rouge d'erreur, mais le bleu échoue le contraste ici — le gras
          porte la distinction visuelle avec le texte courant. */}
      {erreur && <p className="mt-2 text-sm font-medium text-ko-ink">{erreur}</p>}
    </div>
  )
}
