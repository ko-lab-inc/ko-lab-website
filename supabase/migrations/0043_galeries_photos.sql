-- =============================================================================
-- 0043 — Table galeries_photos : galeries « En photos » à nombre variable
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA DANS LE SQL EDITOR SUPABASE, projet ko-lab-site.
-- Idempotente et rejouable — chaque instruction est `if not exists` / `drop
-- policy if exists` / `on conflict do nothing`.
--
-- -----------------------------------------------------------------------------
-- CE QUE CETTE MIGRATION REMPLACE — reconnaissance du 27 août 2026
-- -----------------------------------------------------------------------------
-- Les galeries « En photos » de 4 pages (operations-terrain, equipements,
-- location, et 3 des 4 vignettes d'installations) sont des tableaux `IMAGES.*`
-- codés en dur dans chaque page.tsx — alt français uniquement, aucun lien avec
-- l'admin, aucune façon d'ajouter ou de retirer une photo sans déployer du
-- code. Seule Le LAB passe par `medias_emplacements` (clés `lab_1`..`lab_7`),
-- mais cette table est faite pour des CASES FIXES à position unique (une
-- ligne = un emplacement nommé, ni ordre ni notion de groupe, aucune policy
-- RLS d'INSERT ni de DELETE) — la relation « ces 7 clés forment la galerie du
-- LAB » n'existe nulle part en base, seulement dans un tableau
-- `const clesLab = ['lab_1', ..., 'lab_7']` côté page. Elle ne convient pas à
-- une galerie dont le nombre de photos doit varier depuis l'admin.
--
-- -----------------------------------------------------------------------------
-- PATRON SUIVI : concours_photos (0040) — MÊME FORME, DEUX ÉCARTS ASSUMÉS
-- -----------------------------------------------------------------------------
-- 1. Pas de clé étrangère vers une table parente : concours_photos référence
--    `concours.id` parce qu'une photo appartient à UN concours précis, déjà
--    identifié par UUID. Une galerie de page n'a pas d'équivalent — `page`
--    est directement la clé de regroupement, contrainte par CHECK plutôt que
--    par jointure. Une contrainte CHECK plutôt qu'un type enum Postgres :
--    ajouter une sixième page plus tard est un `alter table ... add
--    constraint`, jamais un `alter type ... add value` (qui ne peut pas être
--    exécuté à l'intérieur d'une transaction avant Postgres 12, et qui reste
--    plus lourd à faire cohabiter avec du code déployé entre-temps).
--
-- 2. Lecture publique INCONDITIONNELLE (`using (true)`), pas de policy
--    « lecture équipe » séparée — à la différence de concours_photos, dont le
--    `using` public est conditionné à `concours.publie = true` (d'où une
--    deuxième policy pour que l'équipe voie aussi les photos d'un concours
--    encore hors ligne). Une galerie de page n'a pas d'état brouillon : une
--    photo posée dans `galeries_photos` est destinée à être publique dès son
--    insertion, exactement le raisonnement déjà écrit pour
--    `medias_lecture_cachee` (0031, medias_emplacements) — CLAUDE.md liste
--    « policies using(true) sur SELECT : 0 » comme cible, avec cette même
--    exception documentée. Une policy « lecture équipe » distincte serait un
--    doublon qui n'ouvrirait aucun accès de plus : la policy publique voit
--    déjà tout. Omise pour cette raison, pas par oubli.
--
-- -----------------------------------------------------------------------------
-- LE POINT QUI A CASSÉ TROIS MIGRATIONS AVANT 0040 (ET DEPUIS, RESTE VRAI)
-- -----------------------------------------------------------------------------
-- 0017, 0019 et 0037 ont chacune posé une policy RLS sans le GRANT de table
-- correspondant — la commande échoue alors AVANT que RLS soit consultée, avec
-- `42501 permission denied for table`, message qui ressemble à un blocage RLS
-- et fait perdre du temps à chercher la mauvaise cause. Chaque section RLS
-- ci-dessous est donc suivie IMMÉDIATEMENT de ses GRANT.
--
-- -----------------------------------------------------------------------------
-- BUCKET — RÉUTILISE `medias`, AUCUNE NOUVELLE POLICY STORAGE
-- -----------------------------------------------------------------------------
-- Demandé explicitement : ne pas créer de bucket. Les quatre policies de
-- `storage.objects` posées par 0030 (`medias_lecture_publique`,
-- `medias_televersement_equipe`, `medias_remplacement_equipe`,
-- `medias_suppression_equipe`) portent sur `bucket_id = 'medias'` sans
-- condition de sous-dossier — elles couvrent déjà tout fichier déposé pour
-- une galerie, aucune policy supplémentaire à écrire ici.
--
-- Dossier de destination : PAS un nouveau dossier `galeries/`. Les 21 photos
-- reprises plus bas vivent déjà chacune dans le dossier de sa SECTION
-- (`lab/`, `operations/`, `installations/`, `deployment/`, `rental/`) —
-- c'est déjà la convention de `medias_emplacements` (lab_1..7 → lab/,
-- capacite_installations → installations/) et de `DOSSIERS_MEDIAS`
-- (lib/medias-disponibles.ts). Un futur écran d'ajout pour cette table
-- devrait donc choisir le dossier par SUJET, pas par fonctionnalité :
--
--   page 'operations-terrain' → operations/
--   page 'installations'      → installations/
--   page 'le-lab'              → lab/
--   page 'equipements'         → deployment/  (déjà le dossier des 3 photos
--                                               actuelles de cette galerie)
--   page 'location'            → rental/       (déjà le dossier des 3 photos
--                                               actuelles de cette galerie)
--
-- Un dossier `galeries/` séparerait les nouvelles photos de galerie des
-- anciennes du même sujet déjà dans `operations/`/`lab/`/etc., sans aucun
-- bénéfice — la table `galeries_photos` (colonne `page`) est déjà ce qui
-- regroupe les photos, le dossier n'a pas besoin de faire ce travail une
-- deuxième fois. Décision à confirmer à l'étape 2/3 (l'écran d'ajout),
-- non appliquée ici : cette migration ne fait que reprendre des fichiers
-- déjà en place, elle n'en dépose aucun.
-- =============================================================================


-- =============================================================================
-- 1 · TABLE
-- =============================================================================

create table if not exists public.galeries_photos (
  id           uuid primary key default gen_random_uuid(),
  page         text not null check (
    page in ('operations-terrain', 'installations', 'le-lab', 'equipements', 'location')
  ),
  url_stockage text not null,
  alt_fr       text not null,
  alt_en       text,
  ordre        integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- Empêche la même photo d'apparaître deux fois dans la galerie d'une même
  -- page — et rend l'insertion des données ci-dessous (section 5) rejouable
  -- sans dépendre d'un id stable (`gen_random_uuid()` en change à chaque
  -- exécution, un `on conflict (id)` n'aurait donc jamais pu servir ici).
  unique (page, url_stockage)
);

create index if not exists idx_galeries_photos_page_ordre on public.galeries_photos (page, ordre);


-- =============================================================================
-- 2 · updated_at — trigger réutilisé, pas redéfini
-- =============================================================================
-- `touch_updated_at()` existe depuis 0001 (déjà posé sur realisations,
-- concours...).

drop trigger if exists set_updated_at on public.galeries_photos;
create trigger set_updated_at
  before update on public.galeries_photos
  for each row execute function public.touch_updated_at();


-- =============================================================================
-- 3 · RLS
-- =============================================================================

alter table public.galeries_photos enable row level security;

-- ⚠️ `using (true)` volontaire — voir la note d'en-tête (« LECTURE PUBLIQUE
-- INCONDITIONNELLE ») : une galerie de page n'a pas d'état brouillon, même
-- raisonnement documenté que `medias_lecture_cachee` (0031).
drop policy if exists "galeries_photos_lecture_publique" on public.galeries_photos;
create policy "galeries_photos_lecture_publique"
  on public.galeries_photos for select
  using (true);

drop policy if exists "galeries_photos_insertion_equipe" on public.galeries_photos;
create policy "galeries_photos_insertion_equipe"
  on public.galeries_photos for insert
  to authenticated
  with check (public.get_user_role() in ('admin', 'editor'));

drop policy if exists "galeries_photos_maj_equipe" on public.galeries_photos;
create policy "galeries_photos_maj_equipe"
  on public.galeries_photos for update
  to authenticated
  using (public.get_user_role() in ('admin', 'editor'))
  with check (public.get_user_role() in ('admin', 'editor'));

-- ÉQUIPE, pas admin seul — même raisonnement que `concours_photos_suppression_equipe`
-- (0040) et `realisations_photos_suppression_equipe` (0012) : retirer une
-- photo mal cadrée d'une galerie est un geste d'édition courant, pas une
-- décision commerciale. Rien ici ne correspond au cas `concours` lui-même
-- (suppression admin seul) : `galeries_photos` n'a pas de table parente à
-- faire disparaître.
drop policy if exists "galeries_photos_suppression_equipe" on public.galeries_photos;
create policy "galeries_photos_suppression_equipe"
  on public.galeries_photos for delete
  to authenticated
  using (public.get_user_role() in ('admin', 'editor'));

-- GRANT — sans ces deux lignes, TOUT ce qui précède échoue en 42501 avant
-- même que RLS soit consultée. Voir la note d'en-tête.
grant select on public.galeries_photos to anon;
grant select, insert, update, delete on public.galeries_photos to authenticated;


-- =============================================================================
-- 4 · Bucket — AUCUNE ACTION
-- =============================================================================
-- Voir la note d'en-tête. `medias` (0030) couvre déjà lecture publique et
-- écriture équipe pour tout fichier du bucket, quel que soit le dossier.


-- =============================================================================
-- 5 · MIGRATION DES DONNÉES EXISTANTES
-- =============================================================================
-- `on conflict (page, url_stockage) do nothing` : rejouer ce fichier ne
-- duplique rien, et ne réécrase pas non plus un `ordre` ou un `alt_en` déjà
-- modifié depuis l'admin après une première exécution.
--
-- Chaque URL ci-dessous a été vérifiée en HTTP 200 (HEAD réel sur le bucket
-- public, les 21) avant l'écriture de cette migration — voir le rapport de
-- la conversation du 27 août 2026 pour le détail par fichier.
--
-- ⚠️ lab_1..lab_7 restent en place dans `medias_emplacements` — demandé
-- explicitement, à retirer seulement une fois que la page Le LAB lira cette
-- nouvelle table (étape 2/3 ou 3/3), jamais avant. Cette section ne fait que
-- copier, aucun `delete` sur `medias_emplacements` ici.

-- --- Le LAB — reprend lab_1..lab_7 (medias_emplacements), déjà bilingues ---
insert into public.galeries_photos (page, url_stockage, alt_fr, alt_en, ordre) values
  ('le-lab', 'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/lab/lab-machine-2026.webp',
    'Imprimante 3D en cours d''impression, atelier KO-LAB',
    '3D printer running a print job, KO-LAB workshop', 0),
  ('le-lab', 'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/lab/precision-cablage-2024.webp',
    'Câblage de précision pour un déploiement pyrotechnique',
    'Precision wiring for a pyrotechnic deployment', 10),
  ('le-lab', 'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/lab/lab-impression-3d-2026.webp',
    'Imprimante 3D Bambu Lab en cours d''impression, pièce en cours de fabrication',
    'Bambu Lab 3D printer mid-print, part being produced', 20),
  ('le-lab', 'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/lab/lab-petite-serie-2026.webp',
    'Petite série de pièces imprimées en 3D, plateau complet',
    'Small batch of 3D-printed parts, full build plate', 30),
  ('le-lab', 'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/lab/lab-precision-2026.webp',
    'Pièce imprimée en 3D de précision, tenue en main pour inspection',
    'Precision 3D-printed part held for inspection', 40),
  ('le-lab', 'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/lab/lab-principale-2026.webp',
    'Pièce imprimée en 3D, forme découpée sur le plateau de l''atelier',
    '3D-printed part, cut shape on the workshop build plate', 50),
  ('le-lab', 'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/lab/lab-structure-2026.webp',
    'Maquette imprimée en 3D d''une structure de type échafaudage',
    '3D-printed scale model of a scaffold-type structure', 60)
on conflict (page, url_stockage) do nothing;

-- --- Opérations terrain — 4 photos en dur (operations-terrain/page.tsx) ---
insert into public.galeries_photos (page, url_stockage, alt_fr, alt_en, ordre) values
  ('operations-terrain', 'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/operations/chantier-balisage-2026.webp',
    'Chantier balisé, nacelle en opération', null, 0),
  ('operations-terrain', 'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/operations/amenagement-site-2025.webp',
    'Aménagement de site public en cours', null, 10),
  ('operations-terrain', 'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/operations/chantier-preparation-2025.webp',
    'Préparation de mobilier avant transport', null, 20),
  ('operations-terrain', 'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/operations/preparation-terrain-2024.webp',
    'Équipe KO-LAB en déploiement, conditions hivernales', null, 30)
on conflict (page, url_stockage) do nothing;

-- --- Installations — 3 photos en dur + capacite_installations (bilingue réel) ---
insert into public.galeries_photos (page, url_stockage, alt_fr, alt_en, ordre) values
  ('installations', 'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/installations/enseigne-posee-2026.webp',
    'Enseigne d''un client installée sur son poteau', null, 0),
  ('installations', 'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/installations/terrasse-amenagee-2021.webp',
    'Terrasse aménagée avec pergola et mobilier sur mesure',
    'Finished patio with pergola and custom furniture', 10),
  ('installations', 'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/installations/terrasse-livraison-2021.webp',
    'Livraison de matériaux de construction sur un chantier', null, 20),
  ('installations', 'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/installations/decor-structure-2025.webp',
    'Décor et structure installés sur un site événementiel', null, 30)
on conflict (page, url_stockage) do nothing;

-- --- Équipements — 3 photos en dur (equipements/page.tsx) ---
insert into public.galeries_photos (page, url_stockage, alt_fr, alt_en, ordre) values
  ('equipements', 'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/deployment/transport-remorque-2026.webp',
    'Remorque chargée de matériel de transport', null, 0),
  ('equipements', 'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/deployment/deploiement-remorque-2026.webp',
    'Remorque de déploiement sur site', null, 10),
  ('equipements', 'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/deployment/deploiement-camion-2026.webp',
    'Camion de déploiement KO-LAB', null, 20)
on conflict (page, url_stockage) do nothing;

-- --- Location — 3 photos en dur (location/page.tsx) ---
insert into public.galeries_photos (page, url_stockage, alt_fr, alt_en, ordre) values
  ('location', 'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/rental/amenagement-salle-2023.webp',
    'Salle aménagée avec mobilier loué', null, 0),
  ('location', 'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/rental/location-structures-2026.webp',
    'Structures louées installées sur site', null, 10),
  ('location', 'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/rental/location-ambiance-2026.webp',
    'Ambiance d''un site aménagé avec du mobilier loué', null, 20)
on conflict (page, url_stockage) do nothing;


-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
--
-- 1. npm run verifier:migrations
--    -- attendu : aucun écart nouveau. Ce script extrait les colonnes via
--    `alter table ... add column`, jamais via `create table` — il ne vérifiera
--    donc pas les colonnes de galeries_photos elle-même, seulement ses GRANT
--    (parsés depuis les lignes `grant ... on public.galeries_photos ...`).
--
-- 2. select page, count(*) from public.galeries_photos group by page order by page;
--    -- attendu : 5 lignes — equipements 3, installations 4, le-lab 7,
--    location 3, operations-terrain 4.
--
-- 3. select id, page, url_stockage from public.galeries_photos;
--    -- puis HEAD réel sur chaque url_stockage : 21/21 attendues à 200 (déjà
--    vérifié avant l'écriture de cette migration, à revérifier après
--    application comme pour toute migration précédente).
--
-- 4. Sonde anonyme :
--      GET  /rest/v1/galeries_photos?select=*&limit=1        -> 200
--      POST /rest/v1/galeries_photos  (clé anon, corps {})    -> 42501
--      « permission denied for table galeries_photos » — absence de GRANT,
--      PAS un rejet RLS : anon n'a même pas le privilège INSERT, la requête
--      ne doit jamais atteindre l'évaluation de la policy. Un message
--      « row-level security policy » à la place signalerait un GRANT insert
--      accordé par erreur à anon — voir la mise en garde de
--      scripts/verifier-migrations.mjs sur cette distinction.
--
-- 5. Sonde session équipe (admin ou editor, PAS clé de service) :
--      INSERT une ligne de test (page 'location', url_stockage
--      'AUDIT_<horodatage>', alt_fr 'AUDIT') -> 201/200
--      UPDATE cette même ligne (ordre) -> 200/204
--      DELETE cette même ligne -> 200/204
--    Nettoyer immédiatement si la ligne de test n'a pas été supprimée par
--    l'étape DELETE elle-même.
-- =============================================================================
