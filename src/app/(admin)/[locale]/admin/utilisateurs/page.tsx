import { hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ListeProfils } from '@/components/sections/ListeProfils'
import { ModaleInvitation } from '@/components/sections/ModaleInvitation'
import { routing } from '@/i18n/routing'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { cn } from '@/lib/utils/cn'
import { ROLES, ROLES_EQUIPE, type Role } from '@/types'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ role?: string }>
}

/**
 * Écran unifié — étape 2/3 (migration 0045).
 *
 * ---------------------------------------------------------------------------
 * TROIS ÉCRANS RESTENT, CELUI-CI DEVIENT LE HUB
 *
 * /admin/vendeurs et /admin/livreurs gardent leur entrée de nav et leur
 * `ListeProfils` inchangée, un seul rôle, aucun filtre, aucune invitation —
 * la demande est explicite : « ajoute SUR /admin/utilisateurs ». Cet écran-ci
 * peut désormais tout montrer (filtre par rôle) et tout créer (invitation),
 * sans empêcher les deux autres de rester les raccourcis directs qu'ils
 * étaient déjà.
 *
 * ---------------------------------------------------------------------------
 * FILTRE EN PARAMÈTRE D'URL — même patron que l'onglet de /admin/medias-emplacements
 *
 * `?role=` survit à un rechargement, pas un état React local. Défaut
 * 'client' : le comportement de CETTE page sans paramètre reste exactement
 * celui d'avant cette étape, personne n'est surpris par un écran qui
 * changerait de contenu par défaut du jour au lendemain.
 *
 * ---------------------------------------------------------------------------
 * ORIGINE ET ACTIVATION — depuis auth.users, à la clé de service
 *
 * `invited_at` et `email_confirmed_at` vivent dans `auth.users`, jamais
 * exposé par PostgREST/RLS — aucune requête `.from('profils')` ne peut les
 * lire, quel que soit le rôle de l'appelant. Seule l'API Admin
 * (`auth.admin.listUsers`) les donne, d'où la clé de service ICI SEULEMENT
 * pour cette lecture-là : le reste de la page (les profils eux-mêmes)
 * continue de passer par ListeProfils et le client de SESSION, RLS inchangé.
 *
 * Vérifié en amont (rapport de reconnaissance du 27 août 2026, sondes
 * réelles sur les comptes existants) : `invited_at` est ABSENT (jamais
 * `null`, absent du JSON) pour un compte créé par inscription publique, posé
 * uniquement par `createUser`/`generateLink(type:'invite')` — c'est le seul
 * signal utilisé pour distinguer les deux origines, pas une supposition sur
 * la forme générique du type `User`.
 *
 * `listUsers({ perPage: 1000 })` en un seul appel : l'échelle réelle du
 * projet le permet très largement (3 comptes au moment d'écrire ce fichier).
 * Au-delà de 1000, cet appel ne verrait plus tout le monde — à revoir avec
 * une vraie pagination si l'équipe grandit dans ces proportions, pas avant.
 * ---------------------------------------------------------------------------
 */

const FILTRES = ['tous', 'client', 'vendeur', 'livreur', 'equipe'] as const
type Filtre = (typeof FILTRES)[number]

function rolesPourFiltre(filtre: Filtre): readonly Role[] {
  switch (filtre) {
    case 'tous':
      return ROLES
    case 'equipe':
      return ROLES_EQUIPE
    default:
      return [filtre]
  }
}

export default async function Page({ params, searchParams }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const { role } = await searchParams
  const filtreActif: Filtre = FILTRES.some((f) => f === role) ? (role as Filtre) : 'client'

  const t = await getTranslations('Admin')

  const introParFiltre: Record<Filtre, string> = {
    tous: t('utilisateurs_intro_tous'),
    client: t('utilisateurs_intro'),
    vendeur: t('vendeurs_intro'),
    livreur: t('livreurs_intro'),
    equipe: t('utilisateurs_intro_equipe'),
  }

  // Une seule lecture Admin API, pour TOUS les comptes — la page ne
  // reconstruit pas cet appel par filtre : ListeProfils ne pioche que les
  // entrées correspondant aux profils qu'elle affiche réellement, les autres
  // sont simplement ignorées, sans coût de requête supplémentaire.
  const { data: utilisateursAuth, error: erreurAuth } = await getSupabaseAdmin().auth.admin.listUsers({
    perPage: 1000,
  })
  if (erreurAuth) console.error('[admin/utilisateurs] lecture auth.users refusée', erreurAuth.message)

  const origines: Record<string, { viaInvitation: boolean; actif: boolean }> = {}
  for (const u of utilisateursAuth?.users ?? []) {
    origines[u.id] = { viaInvitation: Boolean(u.invited_at), actif: Boolean(u.email_confirmed_at) }
  }

  const libellesRoles: Record<Role, string> = {
    admin: t('role_admin'),
    editor: t('role_editor'),
    vendeur: t('role_vendeur'),
    livreur: t('role_livreur'),
    client: t('role_client'),
  }

  const libellesFiltre: Record<Filtre, string> = {
    tous: t('filtre_tous'),
    client: t('filtre_clients'),
    vendeur: t('filtre_vendeurs'),
    livreur: t('filtre_livreurs'),
    equipe: t('filtre_equipe'),
  }

  return (
    <>
      <nav aria-label={t('nav_filtre_utilisateurs')} className="mb-8 flex flex-wrap gap-2 border-b border-ko-line">
        {FILTRES.map((f) => (
          <Link
            key={f}
            href={`/${locale}/admin/utilisateurs?role=${f}`}
            aria-current={filtreActif === f ? 'page' : undefined}
            className={cn(
              'min-h-[44px] border-b-2 px-1 pb-3 text-sm transition-colors duration-200',
              filtreActif === f
                ? 'border-ko-blue font-medium text-ko-ink'
                : 'border-transparent text-ko-muted hover:text-ko-ink',
            )}
          >
            {libellesFiltre[f]}
          </Link>
        ))}
      </nav>

      <ListeProfils
        locale={locale}
        titre={t('utilisateurs_titre')}
        intro={introParFiltre[filtreActif]}
        roles={rolesPourFiltre(filtreActif)}
        vide={t('utilisateurs_vide')}
        origines={origines}
        libellesOrigine={{
          origineInvitation: t('origine_invitation'),
          origineInscription: t('origine_inscription'),
          statutActif: t('statut_actif'),
          statutEnAttente: t('statut_en_attente'),
        }}
        actionInvitation={
          <ModaleInvitation
            locale={locale}
            libelles={{
              ouvrir: t('inviter_utilisateur'),
              titre: t('inviter_utilisateur'),
              fermer: t('fermer'),
              champCourriel: t('colonne_courriel'),
              champRole: t('colonne_role'),
              roles: libellesRoles,
              envoyer: t('envoyer_invitation'),
              enCours: t('en_cours'),
              succesTitre: t('invitation_envoyee_titre'),
              succesTexte: t('invitation_envoyee_texte'),
              erreurDonnees: t('erreur_invitation_donnees'),
              erreurExisteDeja: t('erreur_invitation_existe_deja'),
              erreurRefuse: t('reserve_admin_texte'),
              erreurTropDeTentatives: t('erreur_invitation_tentatives'),
              erreurServeur: t('erreur_invitation_serveur'),
            }}
          />
        }
      />
    </>
  )
}
