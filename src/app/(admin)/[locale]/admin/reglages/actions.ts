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

/**
 * URL facultative : vide, ou commencant par https://.
 *
 * `z.string().url()` refuserait la chaine vide, qui est pourtant la valeur
 * voulue pour « pas de lien ». Et `http://` est ecarte : ces liens partent
 * dans le pied de page d'un site en HTTPS, un lien non chiffre y declencherait
 * un avertissement de navigateur.
 */
const lienFacultatif = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((v) => v === '' || v.startsWith('https://'), { message: 'url_invalide' })

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

  /* ---------------------------------------------------------------------
   * Migration 0051. Toutes LIBRES ET VIDABLES : une chaine vide est la facon
   * de retirer l'element du site, exactement comme le telephone ci-dessus.
   *
   * Les URL ne sont pas validees par `z.string().url()` : ce schema refuserait
   * la chaine vide, qui est precisement la valeur « pas de lien ». Le controle
   * porte donc sur le prefixe, et seulement quand il y a quelque chose a
   * controler — une URL sans schema (« facebook.com/kolab ») serait
   * interpretee comme un chemin relatif par le navigateur et menerait a une
   * 404 sur notre propre site.
   * ------------------------------------------------------------------- */
  lien_rentman: lienFacultatif(400),
  lien_candidature_externe: lienFacultatif(400),
  delai_reponse_heures: z
    .string()
    .trim()
    .regex(/^[1-9][0-9]{0,3}$/, { message: 'delai_invalide' }),
  heures_ouverture: z.string().trim().max(120),
  reseau_facebook: lienFacultatif(300),
  reseau_instagram: lienFacultatif(300),
  reseau_linkedin: lienFacultatif(300),
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
    lien_rentman: donnees.get('lien_rentman') ?? '',
    lien_candidature_externe: donnees.get('lien_candidature_externe') ?? '',
    delai_reponse_heures: donnees.get('delai_reponse_heures') ?? '48',
    heures_ouverture: donnees.get('heures_ouverture') ?? '',
    reseau_facebook: donnees.get('reseau_facebook') ?? '',
    reseau_instagram: donnees.get('reseau_instagram') ?? '',
    reseau_linkedin: donnees.get('reseau_linkedin') ?? '',
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

  /**
   * ⚠️ ET LES PAGES PUBLIQUES — sans cette ligne, un réglage enregistré
   * n'apparaît sur le site qu'à l'expiration naturelle de l'ISR, soit jusqu'à
   * UNE HEURE plus tard.
   *
   * `updateTag` expire le cache de DONNÉES de `lireReglages`, pas la sortie
   * déjà rendue des pages qui l'ont consommée. Mesuré en production le
   * 2 octobre 2026 : le compte Instagram saisi dans cet écran n'apparaissait
   * toujours pas au pied de page douze minutes après — alors que la valeur
   * était bien en base et le code bien déployé (vérifié : les champs
   * existaient dans l'admin de production). Même nature que le défaut du
   * sitemap corrigé le 21 septembre.
   *
   * Le défaut existe depuis la migration 0011 ; il devient seulement visible
   * maintenant, parce qu'on vient d'ajouter des réglages qu'on remplit en
   * regardant le résultat. Quelqu'un qui saisit une adresse Facebook et ne
   * voit rien conclut que ça ne marche pas.
   *
   * `'layout'` et la racine : les coordonnées et les réseaux vivent dans le
   * PIED DE PAGE, donc sur toutes les pages des deux langues. Purger tout est
   * assommant en apparence, mais un réglage se change quelques fois par an —
   * et une invalidation partielle laisserait des pages incohérentes entre
   * elles, ce qui est pire qu'un rendu de plus.
   */
  revalidatePath('/', 'layout')
  return { succes: true }
}
