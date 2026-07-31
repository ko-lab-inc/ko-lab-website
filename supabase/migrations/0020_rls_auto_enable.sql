-- =============================================================================
-- 0020 — rls_auto_enable : mise sous version d'un objet créé à la main
-- =============================================================================
--
-- ⛔ NE PAS EXÉCUTER SUR LA BASE EN LIGNE. Cet objet Y EXISTE DÉJÀ.
--
-- Ce fichier ne corrige rien et ne change rien. Il existe pour une seule
-- raison : permettre à un `supabase db reset` de reconstruire une base
-- identique à la production. Sans lui, une base repartie de zéro n'aurait pas
-- ce garde-fou, et personne ne s'en apercevrait — le manque ne se voit que le
-- jour où une table est créée sans RLS.
--
-- -----------------------------------------------------------------------------
-- COMMENT ON L'A TROUVÉ
-- -----------------------------------------------------------------------------
-- Pendant l'audit du 2026-07-31, l'énumération des routes exposées par
-- PostgREST a fait apparaître deux fonctions :
--
--   /rpc/get_user_role      ← présente dans 0002
--   /rpc/rls_auto_enable    ← dans AUCUNE des 19 migrations
--
-- Une fonction en production absente du dépôt est un angle mort : personne ne
-- sait qui l'a créée, ce qu'elle fait, ni si elle survivra au prochain reset.
-- Elle n'a donc pas été appelée avant d'avoir été lue — son nom laissait
-- entendre qu'elle modifie l'état. Sa définition, relevée par
-- `pg_get_functiondef` dans l'éditeur SQL, est reproduite ci-dessous à
-- l'identique.
--
-- Verdict : bénigne, et même utile. Elle active la RLS automatiquement sur
-- toute table créée dans `public`. C'est une ceinture de sécurité contre
-- l'oubli le plus coûteux du projet — une table exposée par PostgREST sans
-- politique. On la garde, on la versionne.
--
-- -----------------------------------------------------------------------------
-- POURQUOI `SECURITY DEFINER` EST ICI LÉGITIME
-- -----------------------------------------------------------------------------
-- `alter table … enable row level security` exige d'être propriétaire de la
-- table. Un event trigger s'exécute avec les droits de celui qui a lancé le
-- DDL ; sans `SECURITY DEFINER`, la fonction échouerait dès que la table est
-- créée par un rôle non propriétaire.
--
-- Le risque habituel du `SECURITY DEFINER` — le détournement par un objet
-- homonyme placé plus tôt dans le chemin de recherche — est fermé par
-- `SET search_path TO 'pg_catalog'`.
--
-- Et surtout : une fonction `returns event_trigger` N'EST PAS appelable en
-- RPC. PostgREST expose la route, mais PostgreSQL refuse l'invocation directe
-- d'un event trigger. Il n'y a pas de chemin d'escalade par cette fonction.
--
-- -----------------------------------------------------------------------------
-- ⚠️ CE QU'ELLE NE FAIT PAS
-- -----------------------------------------------------------------------------
-- Elle active la RLS. Elle n'écrit AUCUNE politique. Une table neuve se
-- retrouve donc avec la RLS active et zéro politique — c'est-à-dire fermée à
-- tout le monde sauf `service_role`. C'est le bon défaut (fermé plutôt
-- qu'ouvert), mais cela veut dire qu'oublier les politiques donne une table
-- muette, pas une table sûre-et-fonctionnelle. Écrire les politiques reste un
-- geste explicite, à faire dans la migration qui crée la table.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- La fonction, reproduite telle que `pg_get_functiondef` la renvoie
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;


-- -----------------------------------------------------------------------------
-- L'event trigger qui la déclenche
-- -----------------------------------------------------------------------------
--
-- Relevé sur la base en ligne :
--   evtname    = ensure_rls
--   evtevent   = ddl_command_end
--   evtenabled = 'O'  (actif — origine ; ce n'est PAS « disabled »)
--   evttags    = {CREATE TABLE, CREATE TABLE AS, SELECT INTO}
--
-- `ddl_command_end` et non `ddl_command_start` : la table doit exister pour
-- qu'on puisse l'altérer, et `pg_event_trigger_ddl_commands()` n'est
-- renseignée qu'en fin de commande.
--
-- Le `drop … if exists` rend le fichier rejouable sans erreur — PostgreSQL
-- n'a pas de `create or replace event trigger`.

drop event trigger if exists ensure_rls;

create event trigger ensure_rls
  on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function public.rls_auto_enable();


-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
--
-- L'event trigger doit être présent et actif :
--
--   select evtname, evtevent, evtenabled, evttags
--   from pg_event_trigger where evtname = 'ensure_rls';
--   -- attendu : ensure_rls | ddl_command_end | O | {"CREATE TABLE","CREATE TABLE AS","SELECT INTO"}
--
-- Et le garde-fou doit MORDRE. À faire dans une transaction annulée, pour ne
-- rien laisser derrière soi :
--
--   begin;
--     create table public.zzverif_rls (id int);
--     select relrowsecurity from pg_class where relname = 'zzverif_rls';  -- attendu : true
--   rollback;
--
-- Un `false` ici signifie que l'event trigger ne se déclenche pas, malgré sa
-- présence dans le catalogue.
-- =============================================================================
