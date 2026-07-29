-- =============================================================================
-- 0006 — Rôles vendeur et livreur
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA DANS LE SQL EDITOR SUPABASE, projet ko-lab-site.
--
-- Décision de Christian, 29 juillet 2026 : vendeur et livreur sont des RÔLES
-- portés par un compte, pas des entités séparées rattachées à des produits ou
-- à des tournées. Ce fichier les ajoute à la contrainte de profils.role.
--
-- -----------------------------------------------------------------------------
-- CE QUE CES DEUX RÔLES OUVRENT AUJOURD'HUI : RIEN
-- -----------------------------------------------------------------------------
-- Et c'est volontaire. Les politiques de 0002 nomment explicitement 'admin' et
-- 'editor' ; 'vendeur' et 'livreur' ne correspondent à aucune, ils se
-- comportent donc comme 'invite' — le compte existe, il n'ouvre aucune donnée.
--
-- Leur donner des droits demande de répondre d'abord à des questions qui n'ont
-- pas encore de réponse, et dont dépend le SCHÉMA, pas seulement le RLS :
--
--   Vendeur — voit-il toutes les demandes, ou seulement celles portant sur
--   « ses » produits ? La seconde réponse suppose une colonne vendeur_id sur
--   produits_boutique, et une jointure dans chaque politique.
--
--   Livreur — il n'existe AUCUNE commande en base. La boutique fonctionne en
--   demande de prix : pas de paiement, pas de stock, pas d'expédition. Un
--   livreur n'a donc rien à se voir attribuer tant qu'une table `commandes`
--   n'existe pas.
--
-- Écrire des politiques maintenant reviendrait à deviner. Les rôles existent,
-- ils sont assignables depuis /admin/utilisateurs, et leurs droits arriveront
-- avec le modèle de données qui les rend utiles.
--
-- ⚠️ NE PAS les ajouter à ROLES_EQUIPE (src/types) tant que ce n'est pas fait :
-- cette constante gouverne l'accès à l'espace de gestion, et y verser un rôle
-- sans politique donnerait l'accès complet d'un editor.

alter table public.profils drop constraint if exists profils_role_check;

alter table public.profils
  add constraint profils_role_check
  check (role in ('admin', 'editor', 'vendeur', 'livreur', 'invite'));

-- La valeur par défaut reste 'invite' (0004) : une inscription publique ne
-- doit jamais fabriquer un vendeur.

-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
--   select conname, pg_get_constraintdef(oid)
--   from pg_constraint where conrelid = 'public.profils'::regclass;
--
-- Attendu : profils_role_check avec les cinq valeurs.
--
--   select role, count(*) from public.profils group by role;
--
-- Attendu : aucun compte en 'vendeur' ni 'livreur' avant assignation manuelle.
