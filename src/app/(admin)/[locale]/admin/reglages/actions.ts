'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { z } from 'zod'

import { ETIQUETTE_REGLAGES, type CleReglage } from '@/lib/reglages'
import { exigerRole } from '@/lib/auth/garde'

/**
 * Enregistrement des réglages du site.
 *
 * ---------------------------------------------------------------------------
 * QUI PEUT, ET OÙ C'EST DÉCIDÉ
 *
 * La politique `reglages_maj_admin` de 0011 réserve l'écriture à l'admin — pas
 * à l'équipe. Un réglage gouverne le site entier : fermer la boutique ou
 * changer l'adresse qui reçoit les demandes n'est pas du même ordre que
 * corriger la fiche d'un produit.
 *
 * Cette action ne re-vérifie donc pas le rôle : elle passe par le client de
 * SESSION et le RLS refuse ce qui doit l'être. Un contrôle en TypeScript
 * par-dessus donnerait deux endroits à tenir d'accord.
 *
 * ⚠️ Ce qu'elle vérifie, c'est la FORME. Le RLS dit qui écrit, pas ce qui est
 * écrit : sans Zod, un courriel de contact invalide couperait la réception des
 * demandes sans le moindre message.
 * ---------------------------------------------------------------------------
 */

export type EtatReglages = {
  erreur?: 'donnees' | 'refuse' | 'serveur'
  succes?: boolean
}

const schema = z.object({
  /**
   * Le courriel est OBLIGATOIRE et validé.
   *
   * C'est la destination du formulaire de contact. Une adresse mal formée ne
   * se voit pas à l'écran : les demandes partent, échouent chez Resend, et
   * personne ne s'en aperçoit avant qu'un client rappelle pour dire qu'il n'a
   * jamais eu de réponse.
   */
  contact_courriel: z.string().trim().email().max(200),
  /**
   * Le téléphone est libre, y compris VIDE — c'est ainsi qu'on retire la ligne
   * de la page Contact. Pas de contrainte de format : les numéros s'écrivent
   * de dix façons au Québec, et refuser celle qu'a choisie Christian serait
   * absurde.
   */
  contact_telephone: z.string().trim().max(40),
  contact_region: z.string().trim().max(120),
  panier_actif: z.enum(['true', 'false']),
  solutions_modulaires: z.enum(['true', 'false']),
  boutique_active: z.enum(['true', 'false']),
  concours_actif: z.enum(['true', 'false']),
})

/** Une case non cochée n'est PAS envoyée par le navigateur : absente = false. */
const coche = (donnees: FormData, nom: string) => (donnees.get(nom) ? 'true' : 'false')

export async function enregistrerReglages(
  _precedent: EtatReglages,
  donnees: FormData,
): Promise<EtatReglages> {
  const locale = String(donnees.get('locale') ?? 'fr')

  const analyse = schema.safeParse({
    contact_courriel: donnees.get('contact_courriel'),
    contact_telephone: donnees.get('contact_telephone') ?? '',
    contact_region: donnees.get('contact_region') ?? '',
    panier_actif: coche(donnees, 'panier_actif'),
    solutions_modulaires: coche(donnees, 'solutions_modulaires'),
    boutique_active: coche(donnees, 'boutique_active'),
    concours_actif: coche(donnees, 'concours_actif'),
  })
  if (!analyse.success) return { erreur: 'donnees' }

  try {
    const acces = await exigerRole(['admin'])
    if (!acces) return { erreur: 'refuse' }
    const { supabase } = acces

    /**
     * Une requête par clé, et pas un `upsert` groupé.
     *
     * ⚠️ Un upsert INSÈRE quand la ligne manque. Or 0011 n'accorde aucune
     * politique INSERT : la moitié du lot passerait, l'autre serait filtrée
     * sans erreur, et le formulaire annoncerait un succès. Un UPDATE ciblé
     * échoue franchement sur une clé absente, ce qui est le comportement
     * voulu — les clés font partie du code, elles se posent par migration.
     */
    const resultats = await Promise.all(
      (Object.entries(analyse.data) as [CleReglage, string][]).map(([cle, valeur]) =>
        supabase
          .from('reglages')
          .update({ valeur, modifie_le: new Date().toISOString() })
          .eq('cle', cle)
          // PostgREST ne renvoie PAS d'erreur quand le RLS filtre une mise à
          // jour : il en modifie simplement zéro. Sans `select`, un refus
          // serait indiscernable d'un succès.
          .select('cle'),
      ),
    )

    const enErreur = resultats.find((r) => r.error)
    if (enErreur?.error) {
      console.error('[reglages] mise à jour refusée', enErreur.error.message)
      return { erreur: 'refuse' }
    }

    if (resultats.some((r) => !r.data || r.data.length === 0)) {
      console.warn('[reglages] mise à jour sans effet — RLS a filtré, ou migration 0011 non exécutée')
      return { erreur: 'refuse' }
    }
  } catch (err) {
    console.error('[reglages] échec enregistrement', err)
    return { erreur: 'serveur' }
  }

  /**
   * Invalidation par ÉTIQUETTE, pas par chemin.
   *
   * Les réglages sont lus par le layout du site vitrine, donc par toutes les
   * pages publiques. Les énumérer une à une serait une liste à maintenir, et
   * qui serait fausse dès la page suivante. L'étiquette vide le cache de
   * `lireReglages()` d'un coup, et chaque page reprend la nouvelle valeur à
   * son prochain rendu.
   *
   * ⚠️ MIGRATION Next 16 : `updateTag`, pas `revalidateTag`. Ce dernier exige
   * désormais un second argument — un profil de durée de vie — et n'expire que
   * ce qui est au moins aussi périmable que lui. `updateTag` expire
   * immédiatement, et n'est utilisable QUE depuis une Server Action, ce qui
   * est le cas ici. Les exemples des skills, écrits pour Next 14, appellent
   * encore `revalidateTag(tag)` : la forme à un seul argument est dépréciée.
   */
  updateTag(ETIQUETTE_REGLAGES)
  revalidatePath(`/${locale}/admin/reglages`)
  return { succes: true }
}
