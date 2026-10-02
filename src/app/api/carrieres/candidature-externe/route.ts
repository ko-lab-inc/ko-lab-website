import { NextResponse, type NextRequest } from 'next/server'

import { lireReglages } from '@/lib/reglages'

/**
 * Redirection traçée vers le Google Form de candidature — Phase 6.2.
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
 * NOMBRE DE CLICS depuis le site vers le canal externe, dans les journaux
 * Vercel — à mettre en regard de `select count(*) from candidatures where
 * canal = 'interne'` (migration 0028) pour arbitrer entre les deux canaux.
 * Imparfait (un clic n'est pas une candidature complétée), mais réel.
 * ---------------------------------------------------------------------------
 */
export async function GET(req: NextRequest) {
  console.log('[carrieres] clic vers le canal externe (Google Form)')

  // Depuis les réglages (migration 0051) : changer de formulaire ne doit pas
  // demander un déploiement. Le lien était figé dans le code jusqu'au
  // 2 octobre 2026.
  const { lienCandidatureExterne } = await lireReglages()
  const cible = lienCandidatureExterne.trim()

  // Réglage vidé = il n'y a plus de canal externe. On renvoie vers le
  // formulaire du site plutôt que vers une adresse absente : une redirection
  // vers une chaîne vide est une erreur serveur, et le visiteur qui a cliqué
  // « postuler » doit atterrir quelque part où il peut postuler.
  if (cible === '') {
    return NextResponse.redirect(new URL('/fr/carrieres/postuler', req.url))
  }
  return NextResponse.redirect(cible)
}
