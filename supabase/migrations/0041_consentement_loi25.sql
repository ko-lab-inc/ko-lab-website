-- =============================================================================
-- 0041 — Consentement Loi 25 : colonnes sur profils, candidatures,
--        demandes_contact, commandes
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA DANS LE SQL EDITOR SUPABASE, projet ko-lab-site.
-- Idempotente et rejouable — chaque instruction est `add column if not exists`.
--
-- -----------------------------------------------------------------------------
-- CONTEXTE
-- -----------------------------------------------------------------------------
-- Audit du 23 août 2026 (Consentement et Loi 25) : aucun des points de
-- collecte du site (inscription, candidature, contact, commande) n'enregistre
-- de consentement — pas de case, pas de colonne, rien à tracer. Cette
-- migration pose le stockage ; le code applicatif (parties A et B du même
-- chantier) l'alimente.
--
-- -----------------------------------------------------------------------------
-- NULLABLE PARTOUT, VOLONTAIREMENT
-- -----------------------------------------------------------------------------
-- Les lignes déjà en base (comptes existants, candidatures déjà reçues,
-- demandes de contact passées, commandes déjà passées) n'ont jamais présenté
-- de case à cocher — leur inventer un consentement rétroactif serait un
-- mensonge, pas une correction. `NULL` sur ces deux colonnes signifie
-- honnêtement « aucun consentement enregistré au moment de la collecte »,
-- distinct de toute date réelle.
--
-- -----------------------------------------------------------------------------
-- AUCUN GRANT NI POLITIQUE RLS NOUVEAUX — VÉRIFIÉ, PAS SUPPOSÉ
-- -----------------------------------------------------------------------------
-- Contrairement à une NOUVELLE table (0040 en a eu besoin), un GRANT
-- PostgreSQL porte sur la TABLE entière, jamais colonne par colonne : les
-- quatre tables ci-dessous ont déjà leurs GRANT INSERT/UPDATE pour les rôles
-- qui doivent écrire ces deux nouvelles colonnes (anon sur candidatures,
-- authenticated sur commandes, service_role — qui contourne RLS de toute
-- façon — sur demandes_contact et profils). Rien à ajouter ici pour que le
-- code applicatif puisse les écrire.
-- =============================================================================

alter table public.profils
  add column if not exists consentement_le      timestamptz,
  add column if not exists consentement_version text;

alter table public.candidatures
  add column if not exists consentement_le      timestamptz,
  add column if not exists consentement_version text;

alter table public.demandes_contact
  add column if not exists consentement_le      timestamptz,
  add column if not exists consentement_version text;

alter table public.commandes
  add column if not exists consentement_le      timestamptz,
  add column if not exists consentement_version text;

-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
--   select table_name, column_name, is_nullable, data_type
--   from information_schema.columns
--   where table_schema = 'public'
--     and column_name in ('consentement_le', 'consentement_version')
--     and table_name in ('profils', 'candidatures', 'demandes_contact', 'commandes')
--   order by table_name, column_name;
--   -- attendu : 8 lignes, is_nullable = 'YES' partout.
-- =============================================================================
