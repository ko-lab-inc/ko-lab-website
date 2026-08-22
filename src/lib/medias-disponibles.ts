import 'server-only'

import type { createClient } from '@/lib/supabase/server'

/**
 * Fichiers du bucket `medias` disponibles pour une nouvelle affectation
 * (ex. photo d'un poste de carrières) — ni déjà réservés à un emplacement
 * de `medias_emplacements`, ni sous droits incertains.
 *
 * ---------------------------------------------------------------------------
 * ⚠️ EXCLUSION DE DROITS, TOUJOURS APPLIQUÉE — INDÉPENDANTE DU CALCUL CI-DESSOUS
 *
 * Sur les 39 fichiers du bucket au 22 août 2026, exactement 3 ne sont
 * référencés NULLE PART (ni images.ts, ni medias_emplacements) : PAS parce
 * qu'ils sont libres, mais parce qu'ils montrent l'enseigne Pacini et la
 * numérotation Village Transition — deux clients réels non sollicités,
 * retirés du site le 21 août 2026 et gardés en Storage UNIQUEMENT dans
 * l'attente d'un accord (voir
 * docs/audits/2026-08-21-photos-clients-non-autorisees.md). Un calcul
 * générique « non référencé = disponible » les aurait proposés directement
 * dans le sélecteur. Deux autres fichiers, référencés par images.ts mais
 * portant le même genre de risque (logos tiers dominants), sont exclus pour
 * la même raison — voir ETAT-DU-PROJET.md §4 :
 *   - deployment/deploiement-camion-2026.webp (Gatorade, Eska)
 *   - deployment/transport-remorque-2026.webp (LOCATION GM, Banque Scotia)
 *
 * Liste explicite plutôt que de compter sur le calcul générique pour
 * continuer à les exclure : les deux derniers ne le seraient plus le jour où
 * quelqu'un retire leur clé d'images.ts.
 */
const EXCLUS_DROITS_INCERTAINS = new Set([
  'installations/enseigne-commerciale-2026.webp',
  'installations/signalisation-2026.webp',
  'installations/signalisation-alt-2026.webp',
  'deployment/deploiement-camion-2026.webp',
  'deployment/transport-remorque-2026.webp',
])

/**
 * Dossiers connus du bucket `medias`. Pas de découverte dynamique du niveau
 * racine : `storage.list('')` renvoie aussi bien des dossiers que des
 * fichiers à plat sans les distinguer par un champ fiable dans ce SDK — une
 * liste explicite, à étendre le jour où un nouveau dossier apparaît, reste
 * plus sûre qu'une heuristique.
 */
const DOSSIERS = ['boutique', 'deployment', 'home', 'installations', 'lab', 'operations', 'rental'] as const

export type FichierDisponible = { chemin: string; url: string }

/**
 * @param supabase Client de session — la lecture du bucket public et de
 * medias_emplacements passe par RLS comme le reste de l'écran admin.
 */
export async function listerFichiersDisponibles(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<FichierDisponible[]> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL

  const listes = await Promise.all(
    DOSSIERS.map((dossier) => supabase.storage.from('medias').list(dossier, { limit: 500 })),
  )

  const tousFichiers: FichierDisponible[] = []
  DOSSIERS.forEach((dossier, i) => {
    const data = listes[i]?.data
    for (const fichier of data ?? []) {
      const chemin = `${dossier}/${fichier.name}`
      if (EXCLUS_DROITS_INCERTAINS.has(chemin)) continue
      tousFichiers.push({ chemin, url: `${base}/storage/v1/object/public/medias/${chemin}` })
    }
  })

  const { data: emplacements } = await supabase.from('medias_emplacements').select('url_stockage')
  const urlsReservees = new Set((emplacements ?? []).map((e) => e.url_stockage).filter(Boolean))

  return tousFichiers
    .filter((f) => !urlsReservees.has(f.url))
    .sort((a, b) => a.chemin.localeCompare(b.chemin))
}
