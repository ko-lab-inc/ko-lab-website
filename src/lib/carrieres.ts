import 'server-only'

import { unstable_cache } from 'next/cache'

import { createStaticClient } from '@/lib/supabase/static'
import { TYPES_POSTE, type TypePoste } from '@/types'

import type { AppLocale } from '@/i18n/routing'

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
  /**
   * Déjà résolu dans la langue demandée. Replie sur le français si
   * titre_en/description_en/exigences_en sont vides pour ce poste — jamais
   * une chaîne inventée (Phase 9 : trois postes sur neuf n'ont pas de titre
   * anglais fourni par le brief, « Chauffeur-livreur », « Technicien 3D » et
   * « Administration & coordination » — mieux vaut un titre français exact
   * qu'un titre anglais deviné).
   */
  titre: string
  /** RAW — toujours la valeur française de la base, jamais traduit : c'est
   *  la clé que `photoPourDepartement` reconnaît. Utiliser un libellé
   *  d'affichage séparé côté page pour le texte montré à l'écran. */
  departement: string
  type: TypePoste
  description: string
  /** Une exigence par ligne — voir exigences_fr, format texte multiligne. */
  exigences: string[]
}

/** Étiquette de cache — partagée avec les actions d'administration. */
export const ETIQUETTE_CARRIERES = 'carrieres'

/**
 * Clés des trois postes de repli, dans `Carrieres.postes.*`.
 *
 * ⚠️ PARTAGÉES ENTRE LES DEUX PAGES, et c'est le point.
 *
 * La page /carrieres retombe sur ces trois postes quand la base est vide ;
 * le formulaire /carrieres/postuler doit alors proposer EXACTEMENT les mêmes
 * cases à cocher. Sans cette liste commune, les deux divergeaient : la page
 * affichait trois boutons « Postuler » qui menaient à un formulaire annonçant
 * « aucun poste ouvert » — un cul-de-sac, constaté avant la migration 0017.
 *
 * Ces trois postes disparaissent d'eux-mêmes dès qu'un poste réel est actif
 * en base (voir lireOffresPubliees, qui renvoie alors autre chose que `null`).
 */
export const POSTES_REPLI = ['operateur', 'superviseur', 'chef_equipe'] as const

async function lireDepuisBase(locale: AppLocale): Promise<PosteCarte[] | null> {
  try {
    const supabase = createStaticClient()
    const { data, error } = await supabase
      .from('postes_carrieres')
      .select(
        'id, titre_fr, titre_en, departement, type, description_fr, description_en, exigences_fr, exigences_en',
      )
      .eq('actif', true)
      .order('ordre')

    if (error || !data) return null

    const valides = data
      .filter((p): p is typeof p & { type: TypePoste } => TYPES_POSTE.some((t) => t === p.type))
      .map((p) => {
        // Replie sur le français champ par champ, pas ligne par ligne : un
        // poste peut avoir son titre traduit mais pas encore sa description
        // (exactement le cas de « Chef d'équipe terrain » avant que la
        // Phase 9 ne comble le trou laissé par la Phase 6).
        const titre = (locale === 'en' ? p.titre_en : null) ?? p.titre_fr
        const description = (locale === 'en' ? p.description_en : null) ?? p.description_fr ?? ''
        const exigencesBrutes = (locale === 'en' ? p.exigences_en : null) ?? p.exigences_fr ?? ''

        return {
          id: p.id,
          titre,
          departement: p.departement,
          type: p.type,
          description,
          exigences: exigencesBrutes
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l !== ''),
        }
      })

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
 *
 * `locale` fait partie de la clé de cache : `unstable_cache` incorpore les
 * arguments d'appel en plus de `keyParts`, donc /fr et /en ont chacun leur
 * entrée — jamais le français figé dans le cache anglais ou l'inverse.
 */
export const lireOffresPubliees = unstable_cache(lireDepuisBase, ['offres-publiees'], {
  tags: [ETIQUETTE_CARRIERES],
  revalidate: 3600,
})

/**
 * Visuel d'une fiche de poste — Phase 6.3.
 *
 * Aucune photo n'a été prise spécifiquement pour les postes : le document de
 * cadrage demande de réutiliser une photo déjà réelle (medias/) quand le
 * département y correspond thématiquement, PhotoPlaceholder sinon — jamais
 * une photo de stock (skill 22). Match par département plutôt que par titre :
 * plus stable si un titre est reformulé, et les postes d'un même département
 * partagent le même type de terrain.
 *
 * 'Opérations' et 'Logistique événementielle' ne renvoient plus
 * operationsCrew/operationsCrewVertical depuis le 20 août 2026 (revue
 * visuelle, point 1) : cette paire sert déjà OperationsTerrain.tsx (section 4
 * de l'accueil) en pleine largeur — la revoir en miniature sur /carrieres
 * était la 4ᵉ répétition d'une même photo signalée ce jour-là. chantierBalisage2026
 * et amenagementSite2025 restent thématiquement justes (chantier/opérations,
 * aménagement de site événementiel) sans dupliquer l'accueil.
 *
 * Renvoie une clé de IMAGES, pas l'URL — l'appelant importe IMAGES lui-même,
 * ce module ne dépend pas de next/image.
 */
export function photoPourDepartement(
  departement: string,
): 'chantierBalisage2026' | 'amenagementSite2025' | 'deploiementCamion' | 'labImpression3d' | null {
  switch (departement) {
    case 'Opérations':
      return 'chantierBalisage2026'
    case 'Logistique événementielle':
      return 'amenagementSite2025'
    case 'Transport & logistique':
      return 'deploiementCamion'
    case 'Lab créatif':
      return 'labImpression3d'
    // Installation, Atelier, Administration & coordination, Bureau : aucune
    // photo réelle ne correspond honnêtement — PhotoPlaceholder (voir
    // l'appelant).
    default:
      return null
  }
}
