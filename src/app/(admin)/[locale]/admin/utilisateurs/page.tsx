import { hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { EnteteAdmin, EnteteTableau, PanneauAdmin } from '@/components/layout/CadreAdmin'
import { LigneUtilisateur } from '@/components/sections/LigneUtilisateur'
import { routing } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/types'

type Props = { params: Promise<{ locale: string }> }

/**
 * Gestion des comptes et de leurs rôles.
 *
 * La liste passe par la session de la personne connectée, donc par le RLS :
 * la politique `profils_lecture_admin` (0002) ne renvoie la table entière
 * qu'à un administrateur. Un éditeur ne verra que sa propre ligne — et c'est
 * le comportement voulu, pas un bug à contourner avec la service role key.
 */
export default async function UtilisateursPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations('Admin')
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profils } = await supabase
    .from('profils')
    .select('id, email, role')
    .order('email')

  const moi = profils?.find((p) => p.id === user?.id)
  const estAdmin = moi?.role === 'admin'

  // Ordre du plus au moins privilégié : c'est celui du sélecteur, et il rend
  // la portée de chaque rôle lisible sans commentaire.
  const libellesRoles: Record<Role, string> = {
    admin: t('role_admin'),
    editor: t('role_editor'),
    vendeur: t('role_vendeur'),
    livreur: t('role_livreur'),
    invite: t('role_invite'),
  }

  return (
    <>
      <EnteteAdmin titre={t('utilisateurs_titre')} intro={t('utilisateurs_intro')} />

      {/* Un éditeur voit la page mais pas les commandes. Le lui dire vaut
          mieux que de lui laisser croire à un écran incomplet. */}
      {!estAdmin && (
        <PanneauAdmin className="mb-6">
          <p className="label-mono text-ko-blue">{t('reserve_admin_titre')}</p>
          <p className="mt-2.5 text-sm leading-relaxed text-ko-ink">{t('reserve_admin_texte')}</p>
        </PanneauAdmin>
      )}

      <PanneauAdmin sansPadding>
        {!profils || profils.length === 0 ? (
          <p className="p-6 text-base text-ko-muted">{t('aucun_utilisateur')}</p>
        ) : (
          <>
            <EnteteTableau colonnes={[t('colonne_courriel'), t('colonne_role')]} />
            <ul className="divide-y divide-ko-line">
              {profils.map((p) => (
            <LigneUtilisateur
              key={p.id}
              id={p.id}
              courriel={p.email ?? '—'}
              role={(p.role as Role) ?? 'invite'}
              // `profils` ne porte pas de date de création : elle vit dans
              // auth.users, hors de portée du RLS. Afficher l'identifiant
              // tronqué est plus utile qu'une colonne vide — il permet de
              // distinguer deux comptes en cas d'homonymie d'adresse tronquée.
              cree={p.id.slice(0, 8)}
              estSoi={p.id === user?.id}
              peutModifier={estAdmin}
              locale={locale}
              libelles={{
                roles: libellesRoles,
                enregistrer: t('enregistrer'),
                soiMeme: t('soi_meme'),
                erreurRefuse: t('reserve_admin_texte'),
                erreurSoiMeme: t('erreur_soi_meme'),
                erreurServeur: t('erreur_lecture'),
              }}
            />
              ))}
            </ul>
          </>
        )}
      </PanneauAdmin>
    </>
  )
}
