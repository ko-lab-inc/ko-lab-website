-- =============================================================================
-- 0030 — Sécurisation du bucket medias
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA DANS LE SQL EDITOR SUPABASE, projet ko-lab-site.
--
-- -----------------------------------------------------------------------------
-- CE QUI A ÉTÉ TROUVÉ, ET COMMENT
-- -----------------------------------------------------------------------------
-- Le bucket `medias` (36 clés de src/lib/images.ts, 39 fichiers réels) est
-- public, sans limite de taille, sans restriction de type MIME — et
-- n'apparaît dans AUCUNE des 29 migrations précédentes, contrairement à
-- `produits` (0010) et `realisations` (0012), créés et contraints en SQL
-- versionné. Il a été créé le 19 août 2026, hors migration.
--
-- Vérifié dans l'éditeur SQL (`select * from pg_policies where
-- schemaname='storage' and tablename='objects'`) : sur les onze politiques de
-- `storage.objects`, AUCUNE ne mentionne `medias` — seules `cv`, `produits` et
-- `realisations` en ont. RLS est actif sur `storage.objects` (comportement par
-- défaut de Supabase, indépendant de `rls_auto_enable` qui ne vise que
-- `public`) : zéro politique pour un bucket donné veut dire tout refusé sauf
-- `service_role`, pour tous les rôles et toutes les opérations.
--
-- Confirmé par une sonde réelle (pas seulement déduit) : dépôt anonyme,
-- écrasement anonyme (`x-upsert`) et dépôt anonyme d'un `.exe` sur `medias`
-- renvoient tous les trois `403 — new row violates row-level security
-- policy`. Ce n'est donc PAS une porte ouverte à `anon` qu'on ferme ici — elle
-- l'était déjà. Le vrai trou est l'absence de tout accès pour l'ÉQUIPE : ni
-- `admin` ni `editor` n'ont de politique d'écriture sur ce bucket, d'où le
-- recours à la clé de service le 21 août 2026 pour déposer trois photos de
-- remplacement. Cette migration ouvre cet accès et pose, en plus, les
-- garde-fous de bucket que `produits`/`realisations` ont depuis leur création
-- (défense en profondeur : sans eux, une politique RLS mal réécrite plus tard
-- n'aurait aucun second filet).
--
-- -----------------------------------------------------------------------------
-- POURQUOI PAS image/svg+xml
-- -----------------------------------------------------------------------------
-- Un SVG est un document exécutable (peut embarquer du <script>). Sur un
-- bucket PUBLIC servi directement par le site, l'accepter ouvrirait un vecteur
-- XSS par téléversement — exactement le genre de trou qu'une restriction MIME
-- est censée fermer, pas en ajouter un. Logos et icônes restent dans le code
-- (`components/ui/Icones.tsx`), pas dans ce bucket.
--
-- -----------------------------------------------------------------------------
-- VÉRIFICATION DE get_user_role() AVANT D'EN DÉPENDRE
-- -----------------------------------------------------------------------------
-- Les politiques ci-dessous appellent `public.get_user_role()`, comme celles
-- de `produits` et `realisations`. Avant de s'y fier : 0026 révoque EXECUTE
-- sur trois fonctions PRÉCISES (`ajuster_stock_ligne_commande`,
-- `restaurer_stock_commande_annulee`, `interdire_auto_promotion`) —
-- `get_user_role()` n'en fait pas partie. 0027 révoque TRUNCATE/TRIGGER/
-- REFERENCES au niveau des TABLES, pas EXECUTE sur des fonctions — sans
-- rapport. Le GRANT de 0004 (`grant execute on function
-- public.get_user_role() to anon, authenticated, service_role`) n'a donc
-- jamais été touché par une migration ultérieure.
--
-- Confirmé par une sonde réelle, pas seulement par lecture des migrations :
--
--     POST /rest/v1/rpc/get_user_role  (clé anon)  ->  200, corps: null
--
-- Un `403`/`42501` signalerait un EXECUTE révoqué ; un `404` signalerait une
-- fonction absente du catalogue RPC. Ni l'un ni l'autre : la fonction répond,
-- `null` parce que `auth.uid()` est vide pour `anon` — c'est le comportement
-- attendu, pas une erreur. `authenticated` a reçu le même GRANT dans la même
-- instruction de 0004, jamais différencié depuis par aucune des 29 migrations
-- — c'est le meilleur niveau de preuve possible sans session équipe réelle
-- pour tester `authenticated` directement.
-- =============================================================================


-- =============================================================================
-- PARTIE A — Contraintes de bucket
-- =============================================================================
-- Idempotent par nature : un UPDATE répété produit le même résultat.

update storage.buckets
set
  file_size_limit    = 5242880,
  allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png', 'image/avif']
where id = 'medias';

-- `public` reste `true` — inchangé, le site public en dépend pour construire
-- les URLs de src/lib/images.ts.


-- =============================================================================
-- PARTIE B — Politiques, calquées sur `realisations` (0012)
-- =============================================================================

drop policy if exists "medias_lecture_publique" on storage.objects;
create policy "medias_lecture_publique"
  on storage.objects for select
  using (bucket_id = 'medias');

drop policy if exists "medias_televersement_equipe" on storage.objects;
create policy "medias_televersement_equipe"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'medias' and public.get_user_role() in ('admin', 'editor'));

drop policy if exists "medias_remplacement_equipe" on storage.objects;
create policy "medias_remplacement_equipe"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'medias' and public.get_user_role() in ('admin', 'editor'));

drop policy if exists "medias_suppression_equipe" on storage.objects;
create policy "medias_suppression_equipe"
  on storage.objects for delete
  to authenticated
  -- ⚠️ ÉQUIPE, pas seulement admin — modèle `realisations`, PAS `produits`.
  -- Retirer une photo mal cadrée ou remplacée est un geste d'édition courant
  -- (voir docs/audits/2026-08-21-photos-clients-non-autorisees.md, fait à la
  -- main par clé de service faute de mieux) : en faire une affaire d'admin
  -- forcerait Christian à solliciter Moussa pour chaque retrait.
  using (bucket_id = 'medias' and public.get_user_role() in ('admin', 'editor'));


-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
--
-- 1. Bucket :
--      select id, public, file_size_limit, allowed_mime_types
--      from storage.buckets where id = 'medias';
--    Attendu : public=true, file_size_limit=5242880,
--    allowed_mime_types={image/webp,image/jpeg,image/png,image/avif}.
--
-- 2. Politiques :
--      select policyname, cmd, roles from pg_policies
--      where schemaname='storage' and tablename='objects' and policyname like 'medias_%';
--    Attendu : 4 lignes (select/insert/update/delete).
--
-- 3. Fichiers existants — `file_size_limit`/`allowed_mime_types` ne sont
--    appliqués qu'À L'ÉCRITURE par l'API Storage ; ce sont des colonnes sur
--    `storage.buckets`, pas une contrainte relue sur les lignes déjà présentes
--    dans `storage.objects`. Les 39 fichiers déjà déposés (dont certains sans
--    doute proches ou au-dessus de rien de comparable ici, le plus gros
--    relevé faisant 719 Ko, 14 % de la limite posée) restent des lignes
--    valides, inchangées par cet UPDATE — mais À CONFIRMER par une lecture
--    réelle plutôt que supposé, voir le rapport de validation.
--
-- 4. Sonde anonyme — doit rester identique à avant cette migration :
--      POST /storage/v1/object/medias/<n'importe quoi>  (clé anon)  ->  403
--    Cette migration n'accorde rien à `anon` ; seul `authenticated` avec
--    `admin`/`editor` gagne un accès.
-- =============================================================================
