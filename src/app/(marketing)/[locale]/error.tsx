'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'

import { buttonVariants } from '@/components/ui/Button'

/**
 * Filet d'erreur — TOUT le site public, pas une route à la fois.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI CE FICHIER N'EXISTAIT PAS AVANT (corrigé le 27 août 2026)
 *
 * Le premier filet posé ce jour-là couvrait l'admin (`(admin)/[locale]/
 * error.tsx`), après un bug de téléversement sur /admin/medias-emplacements.
 * En creusant l'erreur RÉELLE (413, pas le message de next.config.ts —
 * Vercel plafonne le corps de toute Function serverless à 4,5 Mo, en amont
 * du code Next), il est apparu que le formulaire de candidature PUBLIC
 * (`carrieres/postuler`) avait exactement le même défaut : un CV assez
 * lourd déclenche la même erreur non gérée, et RIEN ne l'attrapait — un
 * candidat externe serait tombé sur la page brute du navigateur, pire
 * expérience que ce que l'admin a montré.
 *
 * `FormulaireCandidature.tsx` valide désormais la taille du CV avant
 * l'envoi (voir TAILLE_CV_MAX) — la protection normale, qui fonctionne même
 * sans JavaScript côté serveur (`postuler/actions.ts`). Ce fichier est le
 * FILET pour tout ce qui la contournerait, ou toute autre exception non
 * prévue, n'importe où sur le site public.
 *
 * Posé à CE niveau (`(marketing)/[locale]/`), comme `not-found.tsx` dans ce
 * même dossier : Next rend ce composant à l'intérieur du layout englobant,
 * donc Nav/Footer l'enveloppent automatiquement.
 *
 * ⚠️ `error.tsx` DOIT être un Client Component (contrainte Next.js — reçoit
 * `{ error, reset }`, utilise un état de frontière d'erreur React) : à la
 * différence de `not-found.tsx` juste à côté (Server Component,
 * `getTranslations`), les libellés passent par `useTranslations`, donc par
 * le sous-ensemble `Commun.erreur_*` de la liste blanche `messagesClient`
 * du layout — jamais tout le catalogue.
 * ---------------------------------------------------------------------------
 */
export default function ErreurPublique({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('Commun')

  useEffect(() => {
    console.error('[public] erreur non gérée', error)
  }, [error])

  return (
    <section className="border-b border-ko-line bg-ko-cream pb-20 pt-28 lg:pb-28 lg:pt-40">
      <div className="mx-auto max-w-container px-6 text-center lg:px-12">
        <span aria-hidden="true" className="mx-auto block h-px w-8 bg-ko-blue" />

        <h1 className="ko-display mt-4 text-ko-ink">{t('erreur_titre')}</h1>

        <p className="mx-auto mt-7 max-w-[52ch] text-base leading-relaxed text-ko-muted lg:text-lg">
          {t('erreur_texte')}
        </p>

        <button type="button" onClick={reset} className={`mt-10 ${buttonVariants({ variant: 'primary' })}`}>
          {t('erreur_reessayer')}
        </button>
      </div>
    </section>
  )
}
