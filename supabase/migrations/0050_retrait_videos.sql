-- =============================================================================
-- 0050 — retrait de la fonction Vidéos
-- =============================================================================
--
-- ⚠️ DESTRUCTIVE ET IRRÉVERSIBLE. À N'EXÉCUTER QU'APRÈS CONFIRMATION.
--
-- Contrairement aux migrations précédentes, celle-ci SUPPRIME des données. Il
-- n'y a pas de « masquer plutôt que supprimer » possible ici : la table entière
-- part. Lire la section « CE QU'ON PERD » avant de l'exécuter.
--
-- -----------------------------------------------------------------------------
-- CONTEXTE
-- -----------------------------------------------------------------------------
-- Décision de Christian, 2 octobre 2026 : « je vais supprimer le lien vidéo, je
-- voudrais que tu le supprimes et nettoies complètement dans l'admin car on ne
-- va plus l'utiliser. »
--
-- La bande de vidéos de la page Le LAB était déjà MASQUÉE depuis le 30 août
-- 2026 (LOT E1, §11) : la page ne passait plus la prop, mais le composant,
-- l'écran /admin/videos et cette table restaient en place. Le code a été
-- entièrement retiré le 2 octobre 2026 — écran d'administration, entrée de
-- navigation, composants, bibliothèque, utilitaire YouTube, icône, clés de
-- traduction (27 par langue) et tests.
--
-- Cette migration finit le travail côté base. SANS ELLE, le site fonctionne
-- parfaitement : la table devient simplement une table que plus rien ne lit.
-- C'est d'ailleurs une option défendable — garder la donnée au cas où. Le seul
-- coût est une table orpheline que personne ne comprendra dans six mois.
--
-- -----------------------------------------------------------------------------
-- CE QU'ON PERD
-- -----------------------------------------------------------------------------
-- Au 2 octobre 2026, la table contenait UNE ligne : un lien YouTube vers une
-- vidéo tierce (« Is Bambu's New H2C Tool-changer Printer a REAL game-changer »),
-- qui n'est pas un contenu KO-LAB et se retrouve d'une recherche.
--
-- Vérifier soi-même avant d'exécuter, plutôt que de me croire :
--
--     select * from public.videos;
--
-- -----------------------------------------------------------------------------

-- Les policies et le GRANT partent avec la table (DROP TABLE les emporte), mais
-- on les retire explicitement : une policy orpheline qui survivrait à un rejeu
-- partiel serait plus difficile à repérer qu'une erreur franche.
drop policy if exists "videos_lecture_publique" on public.videos;
drop policy if exists "videos_insertion_equipe" on public.videos;
drop policy if exists "videos_maj_equipe" on public.videos;
drop policy if exists "videos_suppression_equipe" on public.videos;

-- `restrict` et NON `cascade` : si quelque chose dépend encore de cette table —
-- une vue, une clé étrangère oubliée — la commande doit ÉCHOUER et le dire,
-- pas emporter silencieusement ce qui s'y accroche.
drop table if exists public.videos restrict;


-- =============================================================================
-- VÉRIFICATION APRÈS EXÉCUTION
-- =============================================================================
-- 1) La table n'existe plus (doit renvoyer 0 ligne) :
--    select table_name from information_schema.tables
--    where table_schema = 'public' and table_name = 'videos';
--
-- 2) Aucune policy orpheline (doit renvoyer 0 ligne) :
--    select policyname from pg_policies where tablename = 'videos';
--
-- 3) Le site répond toujours — /fr/nos-capacites/le-lab en 200, sans bande de
--    vidéos. Elle n'y était déjà plus depuis le 30 août 2026.
