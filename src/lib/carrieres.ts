import 'server-only'

import { unstable_cache } from 'next/cache'

import { createStaticClient } from '@/lib/supabase/static'
import { TYPES_POSTE, type TypePoste } from '@/types'

/**
 * Offres d'emploi publiées — lecture publique, mise en cache, avec repli.
 *
 * ---------------------------------------------------------------------------
 * CE QUE CE MODULE REMPLACE
 *
 * La page /carrieres affichait trois postes codés en dur (le document de
 * cadrage), pendant que `postes_carrieres` existe depuis le tout premier
 * schéma sans jamais être lue ni écrite. Même trou que réalisations/produits
 * avant leur branchement respectif cette session.
 *
 * ---------------------------------------------------------------------------
 * ⚠️ LE REPLI N'EST PAS UNE PRÉCAUTION DÉCORATIVE
 *
 * Comme réalisations (et à la différence de produits_boutique, peuplée dès
 * la migration 0007) : la table EXISTE, ses politiques sont en vigueur, mais
 * elle est VIDE de contenu réel. `lireOffresPubliees()` renvoie donc `null` —
 * pas un tableau vide — tant qu'aucun poste actif n'est publié depuis
 * /admin/carrieres. La page appelante retombe alors sur les trois postes du
 * document de cadrage. Dès qu'un premier poste réel est publié, cette
 * fonction cesse de renvoyer `null` et le contenu provisoire disparaît de
 * lui-même — aucun redéploiement, aucun changement de code.
 * ---------------------------------------------------------------------------
 */

export type PosteCarte = {
  id: string
  titre: string
  departement: string
  type: TypePoste
  description: string
  /** Une exigence par ligne — voir exigences_fr, format texte multiligne. */
  exigences: string[]
}

/** Étiquette de cache — partagée avec les actions d'administration. */
export const ETIQUETTE_CARRIERES = 'carrieres'

async function lireDepuisBase(): Promise<PosteCarte[] | null> {
  try {
    const supabase = createStaticClient()
    const { data, error } = await supabase
      .from('postes_carrieres')
      .select('id, titre_fr, departement, type, description_fr, exigences_fr')
      .eq('actif', true)
      .order('ordre')

    if (error || !data) return null

    const valides = data
      .filter((p): p is typeof p & { type: TypePoste } => TYPES_POSTE.some((t) => t === p.type))
      .map((p) => ({
        id: p.id,
        titre: p.titre_fr,
        departement: p.departement,
        type: p.type,
        description: p.description_fr ?? '',
        exigences: (p.exigences_fr ?? '')
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l !== ''),
      }))

    return valides.length > 0 ? valides : null
  } catch {
    // Supabase injoignable au moment du rendu : `null` déclenche le même
    // repli qu'une table vide, le site reste debout.
    return null
  }
}

/**
 * ⚠️ Ne JAMAIS appeler depuis un composant client — le module importe
 * `server-only`, l'erreur arrive à la compilation plutôt qu'en production.
 */
export const lireOffresPubliees = unstable_cache(lireDepuisBase, ['offres-publiees'], {
  tags: [ETIQUETTE_CARRIERES],
  revalidate: 3600,
})
