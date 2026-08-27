import { getTranslations } from 'next-intl/server'

import { EnteteAdmin, EnteteTableau, PanneauAdmin } from '@/components/layout/CadreAdmin'
import { LigneUtilisateur } from '@/components/sections/LigneUtilisateur'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/types'

/**
 * Liste de comptes filtrée par rôle — le moteur des trois écrans d'équipe.
 *
 * ---------------------------------------------------------------------------
 * TROIS ÉCRANS, UNE SEULE TABLE
 *
 * Clients, vendeurs et livreurs sont tous des lignes de `profils` ; seul leur
 * rôle diffère. Précision de Christian : les utilisateurs inscrits sur le site
 * sont des ACHETEURS ET VISITEURS, tandis que vendeurs et livreurs sont du
 * PERSONNEL, interne ou externe.
 *
 * Trois pages qui recopieraient cette requête auraient fini par diverger — la
 * plus probable étant qu'une seule des trois oublie de masquer le sélecteur
 * de rôle pour un non-administrateur.
 *
 * ---------------------------------------------------------------------------
 * SÉCURITÉ
 *
 * Lecture par le client de SESSION, donc à travers le RLS. La politique
 * `profils_lecture_admin` (0002) ne renvoie la table entière qu'à un
 * administrateur ; un editor ne voit que sa propre ligne. C'est le
 * comportement voulu, pas un obstacle à contourner avec la service role key.
 *
 * Le filtre par rôle est appliqué CÔTÉ BASE (`in`), pas après coup en
 * JavaScript : filtrer en mémoire ferait transiter les autres comptes jusqu'au
 * serveur de rendu pour rien.
 * ---------------------------------------------------------------------------
 */
export async function ListeProfils({
  locale,
  titre,
  intro,
  roles,
  vide,
  origines,
  libellesOrigine,
  actionInvitation,
}: {
  locale: string
  titre: string
  intro: string
  /** Rôles à afficher. Un seul pour vendeurs/livreurs, plusieurs pour l'équipe. */
  roles: readonly Role[]
  /** Message quand aucun compte ne porte ces rôles. */
  vide: string
  /**
   * Origine (invitation/inscription) et activation par id de profil —
   * /admin/utilisateurs seulement (étape 2/3, migration 0045). `undefined`
   * pour vendeurs/livreurs : ni la colonne ni sa légende ne s'affichent,
   * comportement strictement inchangé pour ces deux écrans. Calculé en
   * amont (page.tsx) à la clé de service — `auth.users` (invited_at,
   * email_confirmed_at) n'est jamais accessible par PostgREST/RLS, cette
   * fonction-ci ne peut donc pas le lire elle-même avec le client de session.
   */
  origines?: Record<string, { viaInvitation: boolean; actif: boolean }>
  libellesOrigine?: { origineInvitation: string; origineInscription: string; statutActif: string; statutEnAttente: string }
  /** Bouton + modale d'invitation, rendu à côté du titre — /admin/utilisateurs seulement. */
  actionInvitation?: React.ReactNode
}) {
  const t = await getTranslations('Admin')
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: profils }, { data: moi }] = await Promise.all([
    supabase.from('profils').select('id, email, role').in('role', roles).order('email'),
    // Le rôle de la personne connectée est relu à part : si elle ne fait pas
    // partie des rôles filtrés — un admin sur l'écran des livreurs — elle
    // n'apparaîtrait pas dans la première requête, et on la croirait editor.
    supabase.from('profils').select('role').eq('id', user?.id ?? '').maybeSingle(),
  ])

  const estAdmin = moi?.role === 'admin'

  // Ordre du plus au moins privilégié : c'est celui du sélecteur, et il rend
  // la portée de chaque rôle lisible sans commentaire.
  const libellesRoles: Record<Role, string> = {
    admin: t('role_admin'),
    editor: t('role_editor'),
    vendeur: t('role_vendeur'),
    livreur: t('role_livreur'),
    client: t('role_client'),
  }

  return (
    <>
      <EnteteAdmin titre={titre} intro={intro} action={actionInvitation} />

      {/* Un editor voit la page mais pas les commandes. Le lui dire vaut mieux
          que de lui laisser croire à un écran incomplet. */}
      {!estAdmin && (
        <PanneauAdmin className="mb-6">
          <p className="label-mono">{t('reserve_admin_titre')}</p>
          <p className="mt-2.5 text-sm leading-relaxed text-ko-ink">{t('reserve_admin_texte')}</p>
        </PanneauAdmin>
      )}

      <PanneauAdmin sansPadding>
        {!profils || profils.length === 0 ? (
          <p className="p-6 text-base leading-relaxed text-ko-muted">{vide}</p>
        ) : (
          <>
            <EnteteTableau colonnes={[t('colonne_courriel'), t('colonne_role')]} />
            <ul className="divide-y divide-ko-line">
              {profils.map((p) => (
                <LigneUtilisateur
                  key={p.id}
                  id={p.id}
                  courriel={p.email ?? '—'}
                  role={(p.role as Role) ?? 'client'}
                  // `profils` ne porte pas de date de création : elle vit dans
                  // auth.users, hors de portée du RLS. L'identifiant tronqué
                  // est plus utile qu'une colonne vide — il distingue deux
                  // comptes dont l'adresse s'affiche tronquée de la même façon.
                  cree={p.id.slice(0, 8)}
                  estSoi={p.id === user?.id}
                  peutModifier={estAdmin}
                  locale={locale}
                  origine={origines?.[p.id]}
                  libelles={{
                    roles: libellesRoles,
                    enregistrer: t('enregistrer'),
                    soiMeme: t('soi_meme'),
                    erreurRefuse: t('reserve_admin_texte'),
                    erreurSoiMeme: t('erreur_soi_meme'),
                    erreurServeur: t('erreur_lecture'),
                    supprimer: t('action_supprimer_compte'),
                    confirmerSuppression: t('confirmer_suppression_utilisateur'),
                    ...libellesOrigine,
                  }}
                />
              ))}
            </ul>
          </>
        )}
      </PanneauAdmin>

      {/* Compteur sous le tableau : sur une liste qui défile, savoir combien
          de comptes on regarde évite de faire défiler pour les compter. */}
      {profils && profils.length > 0 && (
        <p className="mt-4 text-sm text-ko-muted">
          {t('nb_comptes', { n: profils.length })}
        </p>
      )}
    </>
  )
}
