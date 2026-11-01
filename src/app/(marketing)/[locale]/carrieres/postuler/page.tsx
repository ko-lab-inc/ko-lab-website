import { hasLocale } from 'next-intl'
import { notFound, redirect } from 'next/navigation'

import { routing } from '@/i18n/routing'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ poste?: string }>
}

/**
 * ⚠️ FERMÉE depuis le 1er novembre 2026 — demande du boss (capture Messenger) :
 * toutes les candidatures passent désormais par le Google Form, « comme ça ce
 * sera facile pour lui ». Cette page ne fait plus QUE rediriger vers
 * /api/carrieres/candidature-externe (le même point d'entrée tracé que les
 * boutons de /carrieres) — même motif que /boutique/demande quand
 * panierActif est éteint (voir ce fichier).
 *
 * ---------------------------------------------------------------------------
 * « FERMÉE », PAS « SUPPRIMÉE » — CE QUI RESTE INTACT AILLEURS
 *
 * Rien de ce qui faisait fonctionner le formulaire interne n'a été touché :
 *   · actions.ts (Server Action de soumission, upload du CV) — ce dossier ;
 *   · FormulaireCandidature.tsx et son schéma de validation ;
 *   · la table `candidatures` et /admin/candidatures (candidatures déjà
 *     reçues toujours visibles et gérables) ;
 *   · lib/carrieres.ts (lecture des postes publiés).
 *
 * Réactiver ce canal un jour est donc une question de RECONSTRUIRE cette
 * page à partir de l'historique git (`git log -- ` sur ce chemin, avant le
 * commit de fermeture), pas de retrouver du code perdu — rien n'a été perdu,
 * seule la porte d'entrée est close.
 * ---------------------------------------------------------------------------
 */
export default async function PostulerPage({ params, searchParams }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  // `poste` est transmis à la route traçée pour garder la même granularité
  // qu'avant (voir cette route) ; le Google Form, lui, ne peut pas en être
  // prérempli — voir le commentaire de cette route pour pourquoi.
  const { poste } = await searchParams
  redirect(
    poste
      ? `/api/carrieres/candidature-externe?poste=${encodeURIComponent(poste)}`
      : '/api/carrieres/candidature-externe',
  )
}
