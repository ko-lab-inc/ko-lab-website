import { hasLocale } from 'next-intl'
import { getFormatter, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { ListeProfils } from '@/components/sections/ListeProfils'
import { RepertoireLivreurs } from '@/components/sections/RepertoireLivreurs'
import { routing } from '@/i18n/routing'
import { POSTE_LIVREUR } from '@/lib/constantes'
import { createClient } from '@/lib/supabase/server'

type Props = { params: Promise<{ locale: string }> }

/**
 * Écran de gestion — deux sources bien distinctes.
 *
 * ---------------------------------------------------------------------------
 * COMPTES RÉELS, PUIS CANDIDATURES RETENUES
 *
 * `ListeProfils` reste le moteur partagé avec Utilisateurs et Vendeurs — un
 * compte avec identifiants et rôle. Elle n'est pas touchée par ce qui suit.
 *
 * ---------------------------------------------------------------------------
 * ⚠️ DÉCISION RENVERSÉE — étape 3/3, migration 0045 (27 août 2026, Moussa)
 *
 * En dessous, un second bloc : les candidatures au statut « retenue » pour le
 * poste de chauffeur-livreur, PAS ENCORE invitées. Jusqu'ici (migration 0045,
 * étape 1/3), ce bloc citait une décision de Christian — « un candidat retenu
 * doit apparaître ici SANS qu'on lui crée d'accès au site » — filtrait sur
 * `traite`, et n'affichait qu'un texte de suivi, sans action. Cette décision
 * est renversée : une candidature retenue PEUT désormais recevoir une
 * invitation comme livreur, depuis ce bloc (RepertoireLivreurs) ou depuis le
 * détail d'une candidature sur /admin/candidatures — même bouton, même
 * action, voir InvitationLivreur.tsx.
 *
 * Une fois invitée, la candidature disparaît de CE bloc (elle a désormais
 * `invitation_envoyee_le` renseigné) — la personne apparaît alors dans
 * `ListeProfils` juste au-dessus, avec le rôle livreur. C'est la MÊME
 * personne physique, jamais deux lignes distinctes de la même réalité.
 *
 * ---------------------------------------------------------------------------
 * poste_id, JAMAIS LE TITRE — demande explicite
 *
 * `postes_carrieres.titre_fr = POSTE_LIVREUR` ne sert qu'à retrouver
 * L'IDENTIFIANT du poste livreur, UNE fois, ici. La correspondance
 * candidature → poste passe ensuite exclusivement par `poste_id` — sauf pour
 * les candidatures dont `poste_id` est resté NULL après le rétroremplissage
 * (0045) : celles-là restent visibles ICI (`.contains('postes', ...)` les
 * retrouve par leur libellé texte, seul signal disponible), mais marquées
 * « rattachement incertain » plutôt que traitées comme une correspondance
 * sûre — voir RepertoireLivreurs.tsx.
 * ---------------------------------------------------------------------------
 */
export default async function Page({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations('Admin')
  const format = await getFormatter({ locale })
  const supabase = await createClient()

  const [{ data: posteLivreur }, { data: candidatures }] = await Promise.all([
    supabase.from('postes_carrieres').select('id').eq('titre_fr', POSTE_LIVREUR).maybeSingle(),
    // Même RLS que l'écran Candidatures (candidatures_lecture_equipe) : client
    // de session, jamais la service role key. `.contains('postes', ...)` est
    // un PRÉ-filtre grossier (par libellé, seul signal utilisable en SQL
    // sans connaître encore l'id du poste) — le filtre définitif, par
    // poste_id, se fait plus bas en JS une fois `posteLivreur.id` connu.
    supabase
      .from('candidatures')
      .select('id, nom, telephone, email, ville, created_at, poste_id, postes')
      .eq('statut', 'retenue')
      .is('invitation_envoyee_le', null)
      .contains('postes', [POSTE_LIVREUR])
      .order('created_at', { ascending: false }),
  ])

  const posteLivreurId = posteLivreur?.id ?? null

  const candidats = (candidatures ?? [])
    .filter((c) => (posteLivreurId !== null && c.poste_id === posteLivreurId) || c.poste_id === null)
    .map((c) => ({
      id: c.id,
      nom: c.nom,
      telephone: c.telephone,
      email: c.email,
      ville: c.ville,
      dateFormatee: format.dateTime(new Date(c.created_at), { dateStyle: 'medium' }),
      incertain: c.poste_id === null,
    }))

  return (
    <>
      <ListeProfils
        locale={locale}
        titre={t('livreurs_titre')}
        intro={t('livreurs_intro')}
        roles={['livreur']}
        vide={t('livreurs_vide')}
      />

      {/* Point 4 (27 août 2026) : un bloc vide n'affiche ni titre ni message
          — RepertoireLivreurs décide lui-même s'il y a quoi que ce soit à
          montrer (candidature en attente OU invitation tout juste réussie,
          voir sa propre note) et rend `null` sinon. Pas de garde ici : la
          page ne sait pas si une invitation vient de réussir dans le
          navigateur de l'admin, seulement ce que la base contenait au
          moment du rendu serveur. */}
      <RepertoireLivreurs
        candidats={candidats}
        locale={locale}
        titre={t('livreurs_candidats_titre')}
        intro={t('livreurs_candidats_intro')}
        colonnes={[t('colonne_nom'), t('colonne_telephone'), t('colonne_ville'), t('colonne_cree')]}
        invitation={{
          inviter: t('candidature_inviter_livreur'),
          confirmer: t('candidature_confirmer_invitation_livreur'),
          incertain: t('candidature_rattachement_incertain'),
          enCours: t('en_cours'),
          fermer: t('fermer'),
          succesTitre: t('invitation_envoyee_titre'),
          succesTexte: t('invitation_envoyee_texte'),
          courrielEchecTitre: t('invitation_courriel_echec_titre'),
          courrielEchecTexte: t('invitation_courriel_echec_texte'),
          lienLabel: t('invitation_lien_label'),
          lienAide: t('invitation_lien_aide'),
          lienCopier: t('invitation_lien_copier'),
          lienCopie: t('invitation_lien_copie'),
          erreurRefuse: t('reserve_admin_texte'),
          erreurExisteDeja: t('erreur_invitation_existe_deja'),
          erreurIntrouvable: t('erreur_invitation_introuvable'),
          erreurPasEligible: t('erreur_invitation_pas_eligible'),
          erreurTropDeTentatives: t('erreur_invitation_tentatives'),
          erreurServeur: t('erreur_invitation_serveur'),
        }}
      />
    </>
  )
}
