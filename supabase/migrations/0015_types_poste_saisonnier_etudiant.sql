-- =============================================================================
-- 0015 — Types de poste : saisonnier et étudiant
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA DANS LE SQL EDITOR SUPABASE, projet ko-lab-site.
--
-- Décision de Christian : « on doit ajouter les postes à temps partiel,
-- saisonnière, pour les étudiants ». Temps partiel existe déjà
-- (postes_carrieres_type_check, migration 0001) ; il manquait un statut pour
-- le travail saisonnier (l'activité de KO-LAB en dépend fortement — chantiers
-- d'été, installations événementielles) et un pour les étudiants.
--
-- `drop constraint` puis `add constraint` plutôt qu'un simple ajout : Postgres
-- ne permet pas de modifier les valeurs d'un `check` existant autrement, et
-- cette forme reste rejouable (`drop if exists` avant, comme la contrainte de
-- statut de stock de la migration 0013).

alter table public.postes_carrieres drop constraint if exists postes_carrieres_type_check;
alter table public.postes_carrieres add constraint postes_carrieres_type_check
  check (type in ('temps-plein', 'temps-partiel', 'contrat', 'saisonnier', 'etudiant'));

-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
--   select conname, pg_get_constraintdef(oid)
--   from pg_constraint
--   where conname = 'postes_carrieres_type_check';
--
-- Attendu : la définition inclut les cinq valeurs, saisonnier et etudiant compris.
