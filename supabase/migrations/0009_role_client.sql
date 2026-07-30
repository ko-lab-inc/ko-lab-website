-- =============================================================================
-- 0009 — « invite » devient « client »
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA DANS LE SQL EDITOR SUPABASE, projet ko-lab-site.
--
-- CE FICHIER SUFFIT, MÊME SI 0006 N'A PAS ÉTÉ EXÉCUTÉE. Il reconstruit la
-- contrainte en entier, vendeur et livreur compris. Exécuter 0006 d'abord
-- garde l'historique cohérent, mais n'est pas nécessaire.
--
-- ⚠️ COMMENT VÉRIFIER QU'UNE CONTRAINTE EST EN PLACE — j'ai eu faux le
-- 29 juillet 2026 en testant avec un UPDATE sur un identifiant inexistant :
-- zéro ligne touchée, donc AUCUNE contrainte évaluée, et Postgres renvoie un
-- 204 qui ressemble à un succès. La bonne façon :
--
--     select pg_get_constraintdef(oid) from pg_constraint
--     where conname = 'profils_role_check';
--
-- ou un UPDATE sur une ligne qui existe réellement.
--
-- Précision de Christian, 29 juillet 2026 :
--
--   « les utilisateurs sont des acheteurs et visiteurs, clients ; les vendeurs
--     et livreurs sont du personnel interne et externe de l'entreprise. »
--
-- Ça tranche une ambiguïté qui traînait. Le rôle par défaut s'appelait
-- 'invite', un nom choisi quand on croyait que seule l'équipe aurait des
-- comptes — il désignait alors « quelqu'un qui s'est inscrit mais n'a encore
-- aucun droit ». Depuis l'ouverture de l'inscription publique, ce rôle est en
-- réalité celui de TOUT VISITEUR INSCRIT, c'est-à-dire du client.
--
-- Garder 'invite' dans la base pendant que l'interface affiche « Client »
-- créerait un décalage permanent entre ce qu'on lit dans le code et ce qu'on
-- voit à l'écran. On renomme.
--
-- -----------------------------------------------------------------------------
-- LES CINQ RÔLES, ET QUI EST QUI
-- -----------------------------------------------------------------------------
--   admin     Christian — accès complet
--   editor    Moussa — contenu et technique, pas de suppression
--   vendeur   personnel, interne ou externe — droits à définir
--   livreur   personnel, interne ou externe — droits à définir
--   client    acheteurs et visiteurs inscrits — AUCUN accès à l'espace équipe
--
-- ⚠️ 'client' est la valeur par DÉFAUT. Elle ne correspond à aucune politique
-- RLS de 0002 : s'inscrire sur le site ne donne accès à rien. C'est ce qui
-- rend l'inscription publique acceptable, et ça ne doit pas changer.

-- L'ordre compte : la contrainte doit accepter 'client' AVANT que les lignes
-- existantes y basculent, et le DEFAULT ne peut pointer que sur une valeur
-- autorisée.
alter table public.profils drop constraint if exists profils_role_check;

alter table public.profils
  add constraint profils_role_check
  check (role in ('admin', 'editor', 'vendeur', 'livreur', 'client', 'invite'));

update public.profils set role = 'client' where role = 'invite';

alter table public.profils alter column role set default 'client';

-- 'invite' retiré une fois qu'aucune ligne ne le porte plus. Le laisser
-- autorisé « au cas où » garantirait qu'il réapparaisse un jour par copier-
-- coller, et on aurait deux noms pour la même chose.
alter table public.profils drop constraint profils_role_check;

alter table public.profils
  add constraint profils_role_check
  check (role in ('admin', 'editor', 'vendeur', 'livreur', 'client'));

-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
--   select role, count(*) from public.profils group by role order by role;
--
-- Attendu : plus aucune ligne en 'invite'.
--
--   select column_default from information_schema.columns
--   where table_name = 'profils' and column_name = 'role';
--
-- Attendu : 'client'::text.
