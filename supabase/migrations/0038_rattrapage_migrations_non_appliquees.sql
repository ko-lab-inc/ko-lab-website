-- =============================================================================
-- 0038 — Rattrapage de trois migrations écrites mais jamais appliquées
-- =============================================================================
--
-- ⚠️ URGENT — Moussa joue celle-ci immédiatement. Le formulaire public de
-- candidature est cassé depuis au moins le 1er août 2026 (21 jours, une seule
-- candidature enregistrée sur cette période) — ça passe avant tout le reste.
--
-- ⚠️ À EXÉCUTER PAR MOUSSA DANS LE SQL EDITOR SUPABASE, projet ko-lab-site.
--
-- -----------------------------------------------------------------------------
-- COMMENT ON L'A TROUVÉ
-- -----------------------------------------------------------------------------
-- Audit sécurité du 22 août 2026 (docs/audits/2026-08-22-audit-securite-
-- reconnaissance.md) : une sonde positive sur /carrieres/postuler a révélé que
-- `candidatures` refuse toute écriture anonyme (`42501 permission denied`)
-- malgré le `grant insert ... to anon` explicite de 0017. Preuve d'impact :
-- une seule candidature en base, datée du 1er août — 21 jours sans qu'aucune
-- n'ait pu être enregistrée depuis.
--
-- Cette découverte a déclenché une vérification systématique de TOUTES les
-- migrations à `add column`/`alter column`/`grant`/`revoke` (37 fichiers) par
-- sonde comportementale réelle, pas par lecture. Trois écarts, sur trois
-- migrations distinctes :
--
--   1. 0017 : `grant insert on candidatures to anon` — jamais appliqué.
--   2. 0028 : colonne `candidatures.canal` — jamais appliquée
--      (`42703 column does not exist`, vérifié avec la clé de service).
--   3. 0037 : `alter column url_stockage drop not null` sur
--      `medias_emplacements` — jamais appliqué. Testé par un PATCH réel vers
--      `null` sur une ligne existante (aussitôt restaurée) : `23502 not-null
--      constraint violation`. Le bouton « Retirer la photo » de
--      SelecteurPhotoEmplacement.tsx échoue donc en production depuis sa mise
--      en ligne.
--
-- -----------------------------------------------------------------------------
-- UN QUATRIÈME ÉCART EXISTE, DÉLIBÉRÉMENT ABSENT DE CE FICHIER
-- -----------------------------------------------------------------------------
-- `profils` a aussi perdu son GRANT UPDATE pour `authenticated` (revoke de
-- 0019), et `changerRole()` en dépend — mais CE N'EST PAS un rattrapage
-- mécanique comme les trois ci-dessus : c'est un changement du modèle de
-- sécurité de la table qui décide des accès admin. Ça ne voyage pas ici.
-- Traité séparément (voir rapport « ÉTAPE B » et 0039 à venir, une fois la
-- preuve par sonde faite que RLS + le trigger anti-auto-promotion suffisent
-- seuls avant de rouvrir quoi que ce soit sur cette table précise).
--
-- -----------------------------------------------------------------------------
-- POURQUOI UNE NOUVELLE MIGRATION PLUTÔT QUE RÉÉCRIRE 0017/0028/0037
-- -----------------------------------------------------------------------------
-- Les trois restent dans l'historique telles quelles — elles décrivent ce qui
-- a été DÉCIDÉ, pas ce qui s'est produit en base. 0038 rattrape l'écart entre
-- les deux, idempotente : rejouable sans erreur si une partie a déjà pris
-- effet entre-temps.
-- =============================================================================


-- =============================================================================
-- 1 · candidatures — GRANT INSERT à anon (reprend 0017)
-- =============================================================================

grant insert on public.candidatures to anon;


-- =============================================================================
-- 2 · candidatures — colonne canal (reprend 0028, mêmes contraintes)
-- =============================================================================

alter table public.candidatures
  add column if not exists canal text not null default 'interne'
  check (canal in ('interne'));

comment on column public.candidatures.canal is
  'Formulaire par lequel la candidature est arrivée. Une seule valeur possible aujourd''hui (interne) : le Google Form externe n''écrit jamais dans cette table — voir Phase 6.2.';


-- =============================================================================
-- 3 · medias_emplacements — url_stockage redevient optionnelle (reprend 0037)
-- =============================================================================

alter table public.medias_emplacements alter column url_stockage drop not null;


-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
--
-- 1. Sonde anonyme — doit maintenant réussir (était 401 avant 0038) :
--      curl -s -w '\n%{http_code}\n' -X POST \
--        "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/candidatures" \
--        -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
--        -H "Content-Type: application/json" -H "Prefer: return=minimal" \
--        -d '{"nom":"zz test","telephone":"1234567890","email":"zz@test.test",
--             "ville":"Gatineau","postes":["test"],"disponibilites":"test",
--             "travail_exterieur":false,"a_experience":false}'
--      -- attendu : 201, plus 401.
--
-- 2. select canal, count(*) from public.candidatures group by canal;
--    -- attendu : une seule ligne, canal = 'interne', sans erreur de colonne.
--
-- 3. Dans l'app, dans /admin/medias-emplacements, retirer une photo puis la
--    réassigner — ne doit plus jamais lever 23502.
-- =============================================================================
