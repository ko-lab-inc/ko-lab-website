-- =============================================================================
-- 0049 — notifications : rendre les envois visibles, et connaître la langue
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA DANS LE SQL EDITOR SUPABASE, projet ko-lab-site.
-- Idempotente et rejouable — `add column if not exists`, CHECK conditionnel.
--
-- -----------------------------------------------------------------------------
-- CONTEXTE — CE QUI A ÉTÉ CONSTATÉ LE 1er OCTOBRE 2026
-- -----------------------------------------------------------------------------
-- Audit du système de notification, demandé après qu'un changement de statut
-- n'ait déclenché aucun courriel. Trois trous, pas un :
--
--   1. Une CANDIDATURE déposée ne prévient personne. Ni
--      `carrieres/postuler/actions.ts` ni `api/carrieres/candidature-externe`
--      ne contiennent une seule ligne d'envoi. Le CV part dans le stockage et
--      la candidature dort jusqu'à ce que quelqu'un ouvre /admin/candidatures
--      de lui-même.
--
--   2. L'ÉCHEC D'ENVOI EST AVALÉ. `api/contact/route.ts` attrape l'erreur
--      Resend, l'écrit dans la console du serveur, et répond quand même
--      `{ succes: true }`. Le visiteur lit « message envoyé », l'équipe ne
--      reçoit rien, et personne ne l'apprend jamais. Une demande perdue est
--      silencieuse — c'est le défaut le plus coûteux des trois.
--
--   3. Le DEMANDEUR n'a aucun accusé de réception, alors que la page de
--      contact promet « On revient vers vous dans les 48 heures ».
--
-- -----------------------------------------------------------------------------
-- POURQUOI UNE COLONNE `locale`
-- -----------------------------------------------------------------------------
-- gabaritStatutCommande.ts porte une note qui vaut aveu : ce gabarit « reste
-- volontairement français » parce que la seule locale disponible au moment de
-- l'envoi est celle de la ROUTE ADMIN d'où l'équipe a cliqué — « un signal qui
-- reflète qui a cliqué dans l'équipe, pas la langue dans laquelle le client a
-- commandé. Cette langue n'est stockée nulle part (`commandes` n'a pas de
-- colonne `locale`) : sans elle, ce gabarit ne peut pas être bilingue de façon
-- fiable. »
--
-- Le même piège se referme ici : un accusé de réception et un courriel « votre
-- demande est traitée » partent vers le DEMANDEUR, qui a écrit depuis /fr ou
-- /en. Plutôt que de répéter le compromis, on enregistre la langue au moment
-- de la soumission — là où elle est connue pour de vrai.
--
-- `default 'fr'` : les demandes déjà en base n'ont pas cette information. Le
-- français est le défaut du site, et c'est la supposition la moins fausse.
-- -----------------------------------------------------------------------------


-- =============================================================================
-- 1 · demandes_contact
-- =============================================================================

alter table public.demandes_contact
  add column if not exists locale text not null default 'fr';

-- L'équipe a-t-elle été prévenue de cette demande ?
alter table public.demandes_contact
  add column if not exists notification_envoyee boolean not null default false;

-- Pourquoi l'envoi a échoué. NULL quand il n'y a rien à raconter. C'est cette
-- colonne qui rend le trou n° 2 VISIBLE : l'écran /admin/demandes l'affiche,
-- au lieu de laisser l'échec dans une console que personne ne lit.
alter table public.demandes_contact
  add column if not exists notification_erreur text;

-- Le demandeur a-t-il reçu son accusé de réception ?
alter table public.demandes_contact
  add column if not exists accuse_envoye boolean not null default false;

-- Quand le courriel « votre demande est traitée » est parti. Sert de garde-fou
-- d'idempotence : passer une demande de « traité » à « lu » puis de nouveau à
-- « traité » ne doit pas renvoyer un deuxième courriel à la même personne.
alter table public.demandes_contact
  add column if not exists traite_notifie_le timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'demandes_contact_locale_check'
      and conrelid = 'public.demandes_contact'::regclass
  ) then
    alter table public.demandes_contact
      add constraint demandes_contact_locale_check check (locale in ('fr', 'en'));
  end if;
end
$$;

comment on column public.demandes_contact.locale is
  'Langue de la page depuis laquelle la demande a été soumise. Décide de la langue de l''accusé de réception et du courriel « demande traitée ».';
comment on column public.demandes_contact.notification_erreur is
  'Message d''échec du courriel vers l''équipe. NULL = aucun échec. Affiché dans /admin/demandes — sans ça, une notification perdue ne se voit nulle part.';
comment on column public.demandes_contact.traite_notifie_le is
  'Horodatage du courriel « demande traitée ». Non NULL = déjà envoyé, on ne le renvoie pas.';


-- =============================================================================
-- 2 · candidatures
-- =============================================================================
-- Pas de colonne `locale` ici : le formulaire de candidature n'envoie rien au
-- candidat pour l'instant (trou n° 1 = prévenir l'ÉQUIPE). Si un accusé de
-- réception au candidat est ajouté un jour, il faudra une colonne `locale`
-- comme ci-dessus — et pas la locale de l'admin.

alter table public.candidatures
  add column if not exists notification_envoyee boolean not null default false;

alter table public.candidatures
  add column if not exists notification_erreur text;

comment on column public.candidatures.notification_erreur is
  'Message d''échec du courriel vers l''équipe. NULL = aucun échec. Une candidature dont la notification a échoué reste invisible si personne ne regarde cette colonne.';


-- =============================================================================
-- 3 · RLS / GRANT — rien à faire
-- =============================================================================
-- Les politiques en place portent sur la TABLE, pas sur une liste de colonnes :
-- les nouvelles en héritent. Aucun GRANT supplémentaire.
--
-- Qui écrit ces colonnes :
--   · `locale` est posée à l'INSERT, par le même chemin public que le reste de
--     la demande.
--   · Les colonnes de notification sont écrites APRÈS coup, avec la clé de
--     service (getSupabaseAdmin), côté serveur. Elles ne sont jamais soumises
--     par un navigateur, et `anon` n'a de toute façon pas le droit d'UPDATE
--     sur ces deux tables.


-- =============================================================================
-- VÉRIFICATION APRÈS EXÉCUTION
-- =============================================================================
-- 1) Les cinq colonnes de demandes_contact (doit renvoyer 5 lignes) :
--    select column_name, data_type, column_default
--    from information_schema.columns
--    where table_name = 'demandes_contact'
--      and column_name in ('locale','notification_envoyee','notification_erreur',
--                          'accuse_envoye','traite_notifie_le');
--
-- 2) Les deux colonnes de candidatures (doit renvoyer 2 lignes) :
--    select column_name, data_type
--    from information_schema.columns
--    where table_name = 'candidatures'
--      and column_name in ('notification_envoyee','notification_erreur');
--
-- 3) La contrainte de langue mord (doit ÉCHOUER avec une erreur de contrainte) :
--    update public.demandes_contact set locale = 'es' where false;
--    -- (le `where false` ne touche aucune ligne ; la contrainte se teste par
--    --  une vraie insertion depuis le site, voir scripts/verifier-notifications.mjs)
