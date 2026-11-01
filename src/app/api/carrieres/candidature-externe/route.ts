import { NextResponse, type NextRequest } from 'next/server'

import { lireReglages } from '@/lib/reglages'

/**
 * Redirection traçée vers le Google Form de candidature.
 *
 * ⚠️ DEPUIS LE 1er NOVEMBRE 2026 (demande du boss) : SEUL CANAL DE CANDIDATURE.
 * Le formulaire du site (/carrieres/postuler) est fermé — sa page redirige
 * elle-même ICI (voir son commentaire). Jusque-là, c'était un canal secondaire
 * à côté du formulaire interne (Phase 6.2) ; ce n'en est plus un.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI CETTE ROUTE EXISTE PLUTÔT QU'UN LIEN DIRECT AVEC ?utm_source=…
 *
 * Vérifié en direct avant d'écrire ce fichier : un paramètre ajouté à l'URL
 * forms.gle ne survit PAS à la redirection Google.
 *
 *   curl -so /dev/null -w '%{redirect_url}' \
 *     'https://forms.gle/s3wDqWFj3UQU13Q57?utm_source=test123'
 *   -> https://docs.google.com/forms/d/e/…/viewform?usp=send_form
 *
 * Le paramètre disparaît avant même d'atteindre le formulaire — aucune
 * chance qu'il survive jusqu'à une réponse. Sans accès aux identifiants de
 * champ internes de CE Google Form (`entry.XXXXXXX`), impossible de le
 * préremplir pour capter une source côté réponses, et hors de question de
 * soumettre une fausse candidature dans le formulaire réel de Christian pour
 * les découvrir.
 *
 * Cette route donne donc la seule traçabilité honnêtement disponible : le
 * NOMBRE DE CLICS vers le Google Form, dans les journaux Vercel — `poste`
 * (query, optionnel) indique de quelle fiche de poste vient le clic, pour
 * savoir quels rôles génèrent de l'intérêt même sans voir les réponses.
 * Imparfait (un clic n'est pas une candidature complétée), mais réel.
 * ---------------------------------------------------------------------------
 */
export async function GET(req: NextRequest) {
  const poste = req.nextUrl.searchParams.get('poste')
  console.log(
    `[carrieres] clic vers le Google Form${poste ? ` (poste: ${poste})` : ''}`,
  )

  // Depuis les réglages (migration 0051) : changer de formulaire ne doit pas
  // demander un déploiement. Le lien était figé dans le code jusqu'au
  // 2 octobre 2026.
  const { lienCandidatureExterne } = await lireReglages()
  const cible = lienCandidatureExterne.trim()

  // ⚠️ Réglage vidé — PLUS JAMAIS vers /carrieres/postuler depuis le 1er
  // novembre 2026 : cette page redirige maintenant ELLE-MÊME vers CETTE
  // route, donc y renvoyer créerait une boucle infinie. /carrieres (la liste
  // des postes) reste un atterrissage sûr, même si imparfait — mieux qu'une
  // boucle de redirections qui casse la page pour tout le monde.
  if (cible === '') {
    console.error('[carrieres] lienCandidatureExterne est vide — aucun canal de candidature actif')
    return NextResponse.redirect(new URL('/fr/carrieres', req.url))
  }
  return NextResponse.redirect(cible)
}
