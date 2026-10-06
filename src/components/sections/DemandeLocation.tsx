'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button, buttonVariants } from '@/components/ui/Button'
import { IconeMoins, IconePlus } from '@/components/ui/Icones'
import { Link } from '@/i18n/navigation'
import {
  formaterDemandeLocation,
  usePanierLocation,
} from '@/lib/panier/PanierLocationContext'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils/cn'

/**
 * Récapitulatif de la demande de location + formulaire d'envoi — modèle de la
 * référence (Black Tie) : la liste d'équipements retenus, puis UNE seule
 * demande groupée.
 *
 * L'envoi passe par /api/contact (type « location »), le MÊME point d'entrée
 * que le formulaire de contact : on réutilise sa validation, sa limite de
 * débit et son accusé de réception plutôt que d'en bâtir un second. La liste
 * d'articles est ajoutée au message côté client avant l'envoi ; le serveur
 * revalide tout (schemaContact).
 *
 * ---------------------------------------------------------------------------
 * Pourquoi un schéma local plutôt que schemaContact directement
 *
 * schemaContact exige `message` ≥ 10 caractères. Ici le visiteur ne saisit que
 * des PRÉCISIONS (dates, lieu) — facultatives : la liste des équipements
 * constitue déjà le message. On valide donc le formulaire avec un schéma où les
 * précisions sont optionnelles, puis on compose le message final (liste +
 * précisions), toujours bien au-delà de 10 caractères. Le serveur, lui,
 * applique schemaContact au message composé.
 */

const CHAMP =
  'w-full min-h-[44px] border border-ko-line bg-ko-white px-4 py-3 text-base text-ko-ink transition-colors duration-200 placeholder:text-ko-muted focus:border-ko-blue focus:outline-none'

// Plafond du message côté serveur (schemaContact). On réserve de la place pour
// la liste des équipements : les précisions sont bornées plus bas que 2000.
const MESSAGE_MAX = 2000

const schemaFormulaire = z.object({
  nom: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(200),
  telephone: z.string().trim().max(40).optional(),
  organisation: z.string().trim().max(150).optional(),
  precisions: z.string().trim().max(1500).optional(),
  consentement: z.boolean().refine((v) => v === true, { message: 'consentement_requis' }),
  _hp: z.string().max(200).optional(),
})

type DonneesFormulaire = z.infer<typeof schemaFormulaire>

type Etat = 'repos' | 'envoi' | 'succes' | 'erreur' | 'limite'

export function DemandeLocation({
  delaiReponseHeures,
  absence,
}: {
  delaiReponseHeures: number
  /** Message d'absence (migration 0053) ou null — résolu côté serveur. */
  absence: string | null
}) {
  const locale = useLocale() as 'fr' | 'en'
  const t = useTranslations('DemandeLocation')
  // Libellés de champ et messages d'erreur partagés avec le formulaire de
  // contact (déjà dans la liste blanche du layout) — une seule source.
  const tContact = useTranslations('Contact')
  const { articles, pret, retirer, changerQuantite, vider } = usePanierLocation()
  const [etat, setEtat] = useState<Etat>('repos')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DonneesFormulaire>({
    resolver: zodResolver(schemaFormulaire),
    defaultValues: { consentement: false, _hp: '' },
  })

  const envoyer = handleSubmit(async (donnees) => {
    if (articles.length === 0) return
    setEtat('envoi')

    const liste = formaterDemandeLocation(articles, t('entete_message'))
    const precisions = donnees.precisions?.trim()
    const message = (precisions ? `${liste}\n\n${precisions}` : liste).slice(0, MESSAGE_MAX)

    try {
      const rep = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'location',
          nom: donnees.nom,
          email: donnees.email,
          telephone: donnees.telephone,
          organisation: donnees.organisation,
          message,
          consentement: donnees.consentement,
          locale,
          _hp: donnees._hp,
        }),
      })

      if (rep.ok) {
        setEtat('succes')
        // Vidé UNIQUEMENT après un 200 : sur erreur réseau ou 500, la sélection
        // doit survivre pour que le visiteur puisse réessayer.
        vider()
        return
      }
      setEtat(rep.status === 429 ? 'limite' : 'erreur')
    } catch {
      setEtat('erreur')
    }
  })

  // Rien tant que localStorage n'est pas lu : le serveur ignore la sélection,
  // afficher « vide » puis le contenu produirait un clignotement.
  if (!pret && etat !== 'succes') return <div className="min-h-[320px]" />

  if (etat === 'succes') {
    return (
      <div className="border border-ko-line bg-ko-cream p-8 lg:p-12">
        <p className="label-mono">{tContact('succes.titre')}</p>
        <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-ko-ink">
          {absence ?? tContact('succes.texte', { heures: delaiReponseHeures })}
        </p>
        <Link href={ROUTES.location} className={`mt-8 ${buttonVariants({ variant: 'primary' })}`}>
          {t('retour_catalogue')}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    )
  }

  if (articles.length === 0) {
    return (
      <div className="border border-ko-line bg-ko-cream p-8 lg:p-12">
        <p className="ko-h3 text-ko-ink">{t('vide_titre')}</p>
        <p className="mt-4 max-w-[46ch] text-base leading-relaxed text-ko-muted">{t('vide_texte')}</p>
        <Link href={ROUTES.location} className={`mt-8 ${buttonVariants({ variant: 'primary' })}`}>
          {t('vide_lien')}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-20">
      {/* --------------------------- La sélection --------------------------- */}
      <div>
        <p className="label-mono">{t('articles', { n: articles.length })}</p>

        <ul className="mt-6 divide-y divide-ko-line border-y border-ko-line">
          {articles.map((article) => (
            <li
              key={article.slug}
              className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
            >
              <div className="min-w-0">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ko-muted">
                  {article.categorie}
                </p>
                <p className="mt-2 font-serif text-[20px] leading-tight text-ko-ink">
                  {article.nom}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-6">
                <div className="flex items-center border border-ko-line">
                  <button
                    type="button"
                    onClick={() => changerQuantite(article.slug, article.quantite - 1)}
                    disabled={article.quantite <= 1}
                    aria-label={`${t('quantite')} −`}
                    className="flex h-11 w-10 items-center justify-center text-ko-ink transition-colors duration-200 hover:text-ko-black disabled:opacity-40"
                  >
                    <IconeMoins taille={14} />
                  </button>
                  <span
                    aria-live="polite"
                    className="min-w-[2.5rem] text-center font-mono text-sm text-ko-ink"
                  >
                    {article.quantite}
                  </span>
                  <button
                    type="button"
                    onClick={() => changerQuantite(article.slug, article.quantite + 1)}
                    aria-label={`${t('quantite')} +`}
                    className="flex h-11 w-10 items-center justify-center text-ko-ink transition-colors duration-200 hover:text-ko-black"
                  >
                    <IconePlus taille={14} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => retirer(article.slug)}
                  className="min-h-[44px] border-b border-ko-line pb-0.5 text-sm text-ko-muted transition-colors duration-200 hover:border-ko-ink hover:text-ko-ink"
                >
                  {t('retirer')}
                </button>
              </div>
            </li>
          ))}
        </ul>

        <Link href={ROUTES.location} className={`mt-8 ${buttonVariants({ variant: 'text' })}`}>
          {t('continuer')}
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      {/* ----------------------------- Le formulaire ----------------------------- */}
      <form onSubmit={envoyer} noValidate className="space-y-6 lg:sticky lg:top-28 lg:self-start">
        <p className="ko-h3 text-ko-ink">{t('form_titre')}</p>
        <p className="max-w-[46ch] text-sm leading-relaxed text-ko-muted">{t('form_intro')}</p>

        {/* Honeypot — skill 15. */}
        <div aria-hidden="true" className="sr-only">
          <label htmlFor="_hp">Ne pas remplir</label>
          <input id="_hp" type="text" tabIndex={-1} autoComplete="off" {...register('_hp')} />
        </div>

        <Champ id="nom" libelle={tContact('form.nom')} erreur={errors.nom ? tContact('erreurs.nom_court') : null}>
          <input
            id="nom"
            type="text"
            autoComplete="name"
            placeholder={tContact('form.nom_placeholder')}
            aria-invalid={!!errors.nom}
            {...register('nom')}
            className={cn(CHAMP, errors.nom && 'border-ko-blue')}
          />
        </Champ>

        <Champ
          id="email"
          libelle={tContact('form.email')}
          erreur={errors.email ? tContact('erreurs.email_invalide') : null}
        >
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder={tContact('form.email_placeholder')}
            aria-invalid={!!errors.email}
            {...register('email')}
            className={cn(CHAMP, errors.email && 'border-ko-blue')}
          />
        </Champ>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Champ id="telephone" libelle={tContact('form.telephone')} note={tContact('form.telephone_optionnel')}>
            <input id="telephone" type="tel" autoComplete="tel" {...register('telephone')} className={CHAMP} />
          </Champ>
          <Champ id="organisation" libelle={tContact('form.organisation')} note={tContact('form.organisation_optionnel')}>
            <input
              id="organisation"
              type="text"
              autoComplete="organization"
              {...register('organisation')}
              className={CHAMP}
            />
          </Champ>
        </div>

        <Champ id="precisions" libelle={t('precisions')} note={tContact('form.organisation_optionnel')}>
          <textarea
            id="precisions"
            rows={4}
            placeholder={t('precisions_placeholder')}
            {...register('precisions')}
            className={cn(CHAMP, 'resize-y')}
          />
        </Champ>

        {/* Loi 25 (migration 0041) — case NON pré-cochée, obligatoire. */}
        <label className="flex cursor-pointer items-start gap-3 border-t border-ko-line pt-6 text-sm leading-relaxed text-ko-ink">
          <input
            type="checkbox"
            aria-invalid={!!errors.consentement}
            {...register('consentement')}
            className="mt-0.5 h-4 w-4 shrink-0 accent-ko-blue"
          />
          <span>
            {tContact.rich('form.consentement', {
              lienConditions: (chunks) => (
                <Link
                  href={ROUTES.conditionsUtilisation}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-ko-blue underline-offset-4 hover:text-ko-muted"
                >
                  {chunks}
                </Link>
              ),
              lienPolitique: (chunks) => (
                <Link
                  href={ROUTES.politiqueConfidentialite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-ko-blue underline-offset-4 hover:text-ko-muted"
                >
                  {chunks}
                </Link>
              ),
            })}
          </span>
        </label>
        {errors.consentement && (
          <p className="text-sm font-medium text-ko-ink">{tContact('erreurs.consentement_requis')}</p>
        )}

        {(etat === 'erreur' || etat === 'limite') && (
          <p aria-live="polite" className="border-l-2 border-ko-blue pl-4 text-sm text-ko-ink">
            {etat === 'limite' ? tContact('erreurs.trop_de_requetes') : tContact('erreurs.serveur')}
          </p>
        )}

        <Button type="submit" disabled={etat === 'envoi'} size="lg">
          {etat === 'envoi' ? tContact('form.envoi_en_cours') : t('envoyer')}
          <span aria-hidden="true">→</span>
        </Button>
      </form>
    </div>
  )
}

/** Étiquette, note facultative et message d'erreur — même mise en forme que le formulaire de contact. */
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
      {erreur && <p className="mt-2 text-sm font-medium text-ko-ink">{erreur}</p>}
    </div>
  )
}
